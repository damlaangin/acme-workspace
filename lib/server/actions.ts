"use server";

import { fetchFromAPI } from "@/lib/services/apiClient";
import { API_CONFIG } from "@/lib/config/api-config";
import { AUTH_TOKEN_COOKIE } from "@/lib/constants/auth";
import { cookies } from "next/headers";
import type {
  AcmeProperty,
  AcmeWorkspace,
  AcmeWorkspaceUser,
  FormActionState,
} from "@/lib/types";

const getAuthToken = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
};

const authenticatedFetch = async (endpoint: string, init?: Parameters<typeof fetchFromAPI>[1]) => {
  const authToken = await getAuthToken();
  return fetchFromAPI(endpoint, {
    ...(init ?? {}),
    authToken,
  });
};

const normalizePrefixedFormData = (formData: FormData): FormData => {
  const normalized = new FormData();
  const rawKeys = new Set<string>();

  formData.forEach((value, key) => {
    if (!/^\d+_/.test(key) && key !== "0") {
      rawKeys.add(key);
    }
  });

  formData.forEach((value, key) => {
    if (key === "0") return;
    const match = key.match(/^\d+_(.+)$/);
    const normalizedKey = match ? match[1] : key;

    if (match && rawKeys.has(normalizedKey)) {
      return;
    }

    if (value instanceof File && value.size === 0) {
      return;
    }

    normalized.set(normalizedKey, value);
  });

  return normalized;
};

const extractWorkspaceUserPayload = (formData: FormData) => {
  const payload: Record<string, unknown> = {};
  const user: Record<string, string> = {};

  const firstName = formData.get("first_name")?.toString().trim();
  const lastName = formData.get("last_name")?.toString().trim();
  const phoneNumber = formData.get("phone_number")?.toString().trim();
  const username = formData.get("username")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const roleIdValue = formData.get("role_id")?.toString().trim();
  const userType = formData.get("user_type")?.toString().trim();
  const isActive = formData.get("is_active")?.toString().trim();

  if (firstName) {
    user.first_name = firstName;
  }
  if (lastName) {
    user.last_name = lastName;
  }
  if (phoneNumber) {
    user.phone = phoneNumber;
  }
  if (username) {
    user.username = username;
  }
  if (email) {
    user.email = email;
  }

  if (Object.keys(user).length) payload.user = user;
  if (roleIdValue) {
    const roleId = Number(roleIdValue);
    if (!Number.isNaN(roleId)) {
      payload.groups = [roleId];
    }
  }
  if (userType) payload.user_type = userType;
  if (isActive) payload.is_active = isActive === "true";

  return payload;
};

const getApiErrorMessage = (body: unknown, fallback: string) => {
  if (!body) return fallback;
  if (typeof body === "string") return body || fallback;

  if (typeof body === "object") {
    const record = body as Record<string, unknown>;
    const directMessage =
      (record.message as string | undefined) ??
      (record.errorMessage as string | undefined) ??
      (record.error as string | undefined) ??
      (record.detail as string | undefined);
    if (directMessage) return directMessage;

    const fieldMessages: string[] = [];
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string" && value.trim()) {
        fieldMessages.push(`${key}: ${value}`);
      } else if (Array.isArray(value) && value.length) {
        const joined = value
          .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
          .join(", ");
        if (joined.trim()) fieldMessages.push(`${key}: ${joined}`);
      } else if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        const nested = Object.entries(value as Record<string, unknown>)
          .map(([nestedKey, nestedValue]) => {
            if (typeof nestedValue === "string") {
              return `${nestedKey}: ${nestedValue}`;
            }
            if (Array.isArray(nestedValue)) {
              return `${nestedKey}: ${nestedValue
                .map((item) =>
                  typeof item === "string" ? item : JSON.stringify(item)
                )
                .join(", ")}`;
            }
            return null;
          })
          .filter(Boolean)
          .join("; ");
        if (nested.trim()) fieldMessages.push(`${key}: ${nested}`);
      }
    }

    if (fieldMessages.length) return fieldMessages.join(" | ");
  }

  try {
    return JSON.stringify(body);
  } catch {
    return fallback;
  }
};

type CreateWorkspaceState = FormActionState<
  AcmeWorkspace | { message: string }
>;

export const createWorkspace = async (
  prevState: CreateWorkspaceState,
  formData: FormData
): Promise<CreateWorkspaceState> => {
  const response = await authenticatedFetch(API_CONFIG.ENDPOINTS.WORKSPACES, {
    method: "POST",
    body: formData,
  });

  const body = JSON.parse(response.body!);

  if (response.statusCode == 200) {
    return {
      success: true,
      data: body as AcmeWorkspace,
    };
  }

  return {
    success: false,
    data: {
      message:
        body.message ?? body.errorMessage ?? "Failed to create workspace",
    },
  };
};

type CreateWorkspaceUserState = FormActionState<
  AcmeWorkspaceUser | { message: string }
>;

export const createWorkspaceUser = async (
  prevState: CreateWorkspaceUserState,
  formData: FormData
): Promise<CreateWorkspaceUserState> => {
  const normalizedFormData = normalizePrefixedFormData(formData);
  const workspaceIdValue = normalizedFormData.get("workspace_id")?.toString();
  const workspaceId = workspaceIdValue ? Number(workspaceIdValue) : null;

  if (!workspaceId || Number.isNaN(workspaceId)) {
    return {
      success: false,
      data: {
        message: "workspace_id is required",
      },
    };
  }

  normalizedFormData.delete("workspace_id");
  normalizedFormData.delete("id");

  const payload = extractWorkspaceUserPayload(normalizedFormData);
  if (!("user_type" in payload)) {
    payload.user_type = "app_user";
  }
  if (!("is_active" in payload)) {
    payload.is_active = true;
  }

  const response = await authenticatedFetch(`${API_CONFIG.ENDPOINTS.WORKSPACES}/${workspaceId}/users`, {
    method: "POST",
    json: payload,
  });

  let body: any = null;
  if (response.body) {
    try {
      body = JSON.parse(response.body);
    } catch {
      body = response.body;
    }
  }

  if ([200, 201, 204].includes(response.statusCode)) {
    return {
      success: true,
      data: (body ?? {}) as AcmeWorkspaceUser,
    };
  }

  return {
    success: false,
    data: {
      message: getApiErrorMessage(body, "Failed to create workspace user"),
    },
  };
};

type UpdateWorkspaceUserState = CreateWorkspaceUserState;

export const updateWorkspaceUser = async (
  prevState: UpdateWorkspaceUserState,
  formData: FormData
): Promise<UpdateWorkspaceUserState> => {
  const normalizedFormData = normalizePrefixedFormData(formData);
  const userIdValue = normalizedFormData.get("id")?.toString();
  const workspaceIdValue = normalizedFormData.get("workspace_id")?.toString();
  const userId = userIdValue ? Number(userIdValue) : null;
  const workspaceId = workspaceIdValue ? Number(workspaceIdValue) : null;

  if (!workspaceId || !userId || Number.isNaN(workspaceId) || Number.isNaN(userId)) {
    return {
      success: false,
      data: {
        message: "workspace_id and id are required",
      },
    };
  }

  normalizedFormData.delete("workspace_id");
  normalizedFormData.delete("id");
  const payload = extractWorkspaceUserPayload(normalizedFormData);

  const response = await authenticatedFetch(
    `${API_CONFIG.ENDPOINTS.WORKSPACES}/${workspaceId}/users/${userId}`,
    {
      method: "PATCH",
      json: payload,
    }
  );

  let body: any = null;
  if (response.body) {
    try {
      body = JSON.parse(response.body);
    } catch {
      body = response.body;
    }
  }

  if ([200, 201, 204].includes(response.statusCode)) {
    return {
      success: true,
      data: (body ?? {}) as AcmeWorkspaceUser,
    };
  }

  return {
    success: false,
    data: {
      message: getApiErrorMessage(body, "Failed to update workspace user"),
    },
  };
};

type CreatePropertyState = FormActionState<
  AcmeProperty | { message: string }
>;

export const createProperty = async (
  formData: FormData
): Promise<CreatePropertyState> => {
  const workspaceIdValue = formData.get("workspace_id")?.toString();
  const workspaceId = workspaceIdValue ? Number(workspaceIdValue) : null;

  if (!workspaceId || Number.isNaN(workspaceId)) {
    return {
      success: false,
      data: {
        message: "workspace_id is required",
      },
    };
  }

  formData.delete("workspace_id");

  const response = await authenticatedFetch(`${API_CONFIG.ENDPOINTS.WORKSPACES}/${workspaceId}/properties`, {
    method: "POST",
    body: formData,
  });

  const body = JSON.parse(response.body!);

  if (response.statusCode == 200 || response.statusCode == 201) {
    return {
      success: true,
      data: body as AcmeProperty,
    };
  } else {
    // Log full error in development
    if (process.env.NODE_ENV !== "production") {
      console.error("Property creation failed:", {
        statusCode: response.statusCode,
        body,
      });
    }
    
    // Extract error message from various Django REST Framework formats
    let errorMessage = "Failed to create property";
    if (body.message) {
      errorMessage = body.message;
    } else if (body.errorMessage) {
      errorMessage = body.errorMessage;
    } else if (body.detail) {
      errorMessage = body.detail;
    } else if (typeof body === "object") {
      // Handle field-specific errors from DRF
      const fieldErrors = Object.entries(body)
        .filter(([key]) => key !== "non_field_errors")
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
        .join("; ");
      if (fieldErrors) {
        errorMessage = fieldErrors;
      } else if (body.non_field_errors) {
        errorMessage = Array.isArray(body.non_field_errors) 
          ? body.non_field_errors.join(", ") 
          : body.non_field_errors;
      }
    }
    
    return {
      success: false,
      data: {
        message: errorMessage,
      },
    };
  }
};

type UpdatePropertyState = CreatePropertyState;

export const updateProperty = async (formData: FormData): Promise<UpdatePropertyState> => {
  const propertyIdValue = formData.get("id")?.toString();
  const workspaceIdValue = formData.get("workspaceId")?.toString();
  const propertyId = propertyIdValue ? Number(propertyIdValue) : null;
  const workspaceId = workspaceIdValue ? Number(workspaceIdValue) : null;
  if (!workspaceId || !propertyId || Number.isNaN(workspaceId) || Number.isNaN(propertyId)) {
    return {
      success: false,
      data: { message: "workspaceId and id are required" },
    };
  }

  formData.delete("workspaceId");
  formData.delete("id");

  const response = await authenticatedFetch(
    `${API_CONFIG.ENDPOINTS.WORKSPACES}/${workspaceId}/properties/${propertyId}`,
    {
      method: "PATCH",
      body: formData,
    }
  );

  const body = JSON.parse(response.body!);
  if (response.statusCode === 200) {
    return { success: true, data: body as AcmeProperty };
  } else {
    return {
      success: false,
      data: { message: body.message ?? "Failed to update property" },
    };
  }
};
