// workspace.ts
"use server";

import { cookies } from "next/headers";

import type {
  CleaningAppSurveyData,
  CleaningAppSurveyResultVerificationData,
  AcmeProperty,
  AcmeUser,
  AcmeUserRole,
  AcmeUserRolePermissions,
  AcmeWorkspace,
  AcmeWorkspaceUser,
} from "@/lib/types";
import { fetchFromAPI } from "@/lib/services/apiClient";
import { API_CONFIG } from "@/lib/config/api-config";
import { AUTH_COOKIE_DOMAIN, AUTH_TOKEN_COOKIE } from "@/lib/constants/auth";

type UserWorkspaceState = {
  currentWorkspace: AcmeWorkspace;
  availableWorkspaces: AcmeWorkspace[];
};

const getAuthToken = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
};

const authenticatedFetch = async (
  endpoint: string,
  init?: Parameters<typeof fetchFromAPI>[1]
) => {
  const authToken = await getAuthToken();

  return fetchFromAPI(endpoint, {
    ...(init ?? {}),
    authToken,
  });
};

const getAvailableWorkspaces = async (): Promise<AcmeWorkspace[]> => {
  const response = await authenticatedFetch(API_CONFIG.ENDPOINTS.WORKSPACES);

  if (response.statusCode === 200) {
    const body = JSON.parse(response.body ?? "{}");
    return Array.isArray(body) ? body : body.results ?? [];
  }

  throw Error("Failed to retrieve workspaces");
};

export const setCurrentWorkspace = async (workspaceId: number) => {
  const cookieStore = await cookies();

  cookieStore.set({
    name: "workspaceId",
    value: workspaceId.toString(),
    path: "/",
    sameSite: "lax",
    domain: AUTH_COOKIE_DOMAIN,
  });
};

export const retrieveUserWorkspaceState =
  async (): Promise<UserWorkspaceState> => {
    const availableWorkspaces = await getAvailableWorkspaces();
    const cookieStore = await cookies();
    const workspaceIdValue = cookieStore.get("workspaceId")?.value;
    const workspaceId = workspaceIdValue ? Number(workspaceIdValue) : null;

    console.log("availableWorkspaces: ", availableWorkspaces);

    if (!availableWorkspaces || availableWorkspaces.length === 0) {
      throw new Error("No workspaces returned for current user");
    }

    const currentWorkspaceIndex = availableWorkspaces.findIndex(
      (item) => item.id === workspaceId
    );

    if (currentWorkspaceIndex >= 0) {
      return {
        availableWorkspaces,
        currentWorkspace: availableWorkspaces[currentWorkspaceIndex],
      };
    } else {
      cookieStore.set({
        name: "workspaceId",
        value: availableWorkspaces[0].id.toString(),
        path: "/",
        sameSite: "lax",
        domain: AUTH_COOKIE_DOMAIN,
      });

      return {
        availableWorkspaces,
        currentWorkspace: availableWorkspaces[0],
      };
    }
  };

/**
 * Queries the users in a workspace.
 *
 * @property {number} `workspaceId` The workspace ID to query users from
 * @property {string[]} `search_field` The fields(columns) to use when searching for the search_value
 * @property {string} `search_value` The value to search for in the search_fields(columns)
 * @property {string} `sort_field` The field to sort the results by
 * @property {"ASC", "DESC"} `sort_direction` The direction to sort the results by (ASC or DESC)
 * @property {number} `offset` The offset to start the query from
 * @property {number} `limit` The maximum number of results to return
 */
interface ApiQueryProps {
  workspaceId: number;
  search_field?: string[];
  search_value?: string;
  sort_field?: string;
  sort_direction?: "ASC" | "DESC"; // Default (ASC)
  offset?: number; // Offset = (PAGE_NUMBER - 1) * ROWS_PER_PAGE
  limit?: number;
}

/**
 * The result of a query to the API.
 * @property {T[]} items The items returned by the query
 * @property {number} total_rows The total number of rows returned by the query
 */
interface ApiQueryResult<T> {
  items: T[];
  total_rows: number;
}

/**
 * Generates the query parameters for the API query.
 * @param {ApiQueryProps} queryProps
 * @returns {string[]} The query parameters for the API query
 */
const generateQueryParameters = ({
  workspaceId,
  search_field,
  search_value,
  sort_field,
  sort_direction,
  offset,
  limit,
}: ApiQueryProps) => {
  let queryParameters: string[] = [`workspace_id=${workspaceId}`];

  if (
    search_field &&
    search_field.length > 0 &&
    search_value &&
    search_value.length > 0
  ) {
    for (const field of search_field) {
      queryParameters.push(`search_field=${field}`);
    }

    queryParameters.push(`search_value=${search_value}`);
  }

  if (sort_field) {
    queryParameters.push(`sort_field=${sort_field}`);

    if (sort_direction) {
      queryParameters.push(`sort_direction=${sort_direction}`);
    }
  }

  if (offset) {
    queryParameters.push(`offset=${offset}`);
  }

  if (limit) {
    queryParameters.push(`limit=${limit}`);
  }

  return queryParameters;
};

/**
 * Queries the users in a workspace.
 * @param queryProps The properties to query.
 * @returns {Promise<ApiQueryResult<AcmeUser> | null>} The users in the workspace or null if the retrieval failed.
 */
export const queryWorkspaceUsers = async (
  queryProps: ApiQueryProps
): Promise<ApiQueryResult<AcmeWorkspaceUser> | null> => {
  const queryParameters = generateQueryParameters(queryProps);

  const response = await authenticatedFetch(
    `workspace/user?${queryParameters.join("&")}`,
    {  }
  );

  if (response.statusCode == 200) {
    const body = JSON.parse(response.body!);

    return {
      items: body.items,
      total_rows: body.total_rows as number,
    };
  } else {
    console.error(response.body);
  }

  return null;
};

/**
 * Queries the properties in a workspace.
 * @param queryProps The properties to query. Props attributes:
 * - `workspaceId`: number
 * - `search_field`?: string[]
 * - `search_value`?: string
 * - `sort_field`?: string
 * - `sort_direction`?: "ASC" | "DESC"
 * - `offset`?: number
 * - `limit`?: number
 */
export const queryWorkspaceProperties = async (
  queryProps: ApiQueryProps
): Promise<ApiQueryResult<AcmeProperty> | null> => {
  const queryParameters = generateQueryParameters(queryProps);

  const response = await authenticatedFetch(
    `workspace/property?${queryParameters.join("&")}`,
    {  }
  );

  if (response.statusCode == 200) {
    const body = JSON.parse(response.body!);

    return {
      items: body.items,
      total_rows: body.total_rows,
    };
  } else {
    console.error(response.body);
  }

  return null;
};

/**
 * Retrieves roles in a workspace using the workspace ID.
 * @param workspaceId Workspace ID to retrieve roles from
 * @returns {Promise<AcmeUserRole[] | null>} The roles in the workspace or null if the retrieval failed
 */
export const retrieveWorkspaceUserRoles = async (
  workspaceId: number
): Promise<AcmeUserRole[] | null> => {
  const response = await authenticatedFetch(
    `workspace/role?workspace_id=${workspaceId}`,
    {  }
  );

  if (response.statusCode == 200) {
    return JSON.parse(response.body!);
  } else {
    console.error(response.body);
  }

  return null;
};

/**
 * Retrieves a user role from a workspace using its role ID.
 * @param roleId Role ID to retrieve
 * @param queryProps
 */
export const queryWorkspaceUserRoleMembers = async (
  roleId: number,
  queryProps: ApiQueryProps
): Promise<ApiQueryResult<AcmeUser> | null> => {
  const queryParameters = generateQueryParameters(queryProps);

  const response = await authenticatedFetch(
    `workspace/role/members?role_id=${roleId}&${queryParameters.join("&")}`,
    {  }
  );

  if (response.statusCode == 200) {
    const body = JSON.parse(response.body!);

    return {
      items: body.items,
      total_rows: body.total_rows,
    };
  } else {
    console.error(response.body);
  }

  return null;
};

/**
 * Adds a user to a workspace using their user ID.
 *
 * @param userId User ID to add
 * @param roleId Role ID to add the user as a member of
 * @param workspaceId Current workspace ID
 * @returns {Promise<boolean>} True if the user was added, false otherwise.
 * @throws Will throw an error if the API request fails.
 */
export const addWorkspaceUserRoleMember = async (
  userId: number,
  roleId: number,
  workspaceId: number
) => {
  const response = await authenticatedFetch("workspace/role/members", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      role_id: roleId,
      workspace_id: workspaceId,
    }),
  });

  if (response.statusCode != 200) {
    console.error(response.body);
  }
};

/**
 * Removes a user from a workspace using their user ID.
 *
 * @property {string} `workspaceId` Current workspace ID
 * @property {string} `name` The name of the role
 * @property {string} `description` The description of the role
 * @property {AcmeUserRolePermissions} `permissions` The permissions of the role. Inside types.ts
 * @property {boolean} `has_dashboard_access` Whether the role has dashboard access
 */
type AcmeUserRoleCreateProps = {
  workspace_id: number;
  name: string;
  description?: string | null;
  permissions: AcmeUserRolePermissions;
  has_dashboard_access: boolean;
};

/**
 * Updates an existing user role in a workspace.
 *
 * @property {string} `role_id` The role ID to update
 * @property {string} `workspace_id` The workspace ID to update the role in
 * @property {string} `name` The new name of the role
 * @property {string} `description` The new description of the role
 * @property {AcmeUserRolePermissions} `permissions` The new permissions of the role
 * @property {boolean} `has_dashboard_access` Whether the role has dashboard access
 */
type AcmeUserRoleUpdateProps = {
  role_id: number;
  workspace_id: number;
  name?: string | null;
  description?: string | null;
  permissions?: AcmeUserRolePermissions | null;
  has_dashboard_access?: boolean | null;
};

/**
 * Creates a new user role in a workspace.
 *
 * @param {AcmeUserRoleCreateProps} props The properties to create the user role with. Props attributes:
 * - workspace_id: number
 * - name: string
 * - description?: string | null
 * - permissions: AcmeUserRolePermissions
 * - has_dashboard_access: boolean
 *
 * @returns {Promise<AcmeUserRole | null>} The created user role or null if the creation failed.
 */
export const createWorkspaceUserRole = async (
  props: AcmeUserRoleCreateProps
): Promise<AcmeUserRole | null> => {
  const response = await authenticatedFetch(
    `workspace/role?workspace_id=${props.workspace_id}`,
    {
      method: "POST",
      body: JSON.stringify({
        name: props.name,
        description: props.description,
        permissions: props.permissions,
        has_dashboard_access: props.has_dashboard_access,
      }),
    }
  );

  if (response.statusCode == 200) {
    return JSON.parse(response.body!);
  } else {
    console.error(response.body);
  }

  return null;
};

/**
 * Deletes a user role from a workspace using its role ID.
 * @param roleId Role id to delete
 * @param workspaceId Current workspace ID
 * @returns Promise<boolean> True if the role was deleted, false otherwise.
 */
export const deleteWorkspaceUserRole = async (
  roleId: number,
  workspaceId: number
): Promise<boolean> => {
  const response = await authenticatedFetch(
    `workspace/role?id=${roleId}&workspace_id=${workspaceId}`,
    { method: "DELETE" }
  );

  if (response.statusCode == 200) {
    return true;
  } else {
    console.error(response.body);
  }

  return false;
};

/**
 * Updates an existing user role in a workspace.
 *
 * @param {AcmeUserRoleUpdateProps} props The properties to update the user role with. Props attributes:
 * - role_id: number
 * - workspace_id: number
 * - name?: string | null
 * - description?: string | null
 * - permissions?: AcmeUserRolePermissions | null
 * - has_dashboard_access?: boolean | null
 *
 * @returns {Promise<AcmeUserRole | null>} The updated user role or null if the update failed.
 * @throws Will throw an error if the API request fails.
 */
export const updateWorkspaceUserRole = async (
  props: AcmeUserRoleUpdateProps
): Promise<AcmeUserRole | null> => {
  if (
    "name" in props ||
    "description" in props ||
    "permissions" in props ||
    "has_dashboard_access" in props
  ) {
    const response = await authenticatedFetch(
      `workspace/role?workspace_id=${props.workspace_id}&role_id=${props.role_id}`,
      {
        method: "PATCH",
        body: JSON.stringify(props),
      }
    );

    if (response.statusCode == 200) {
      return JSON.parse(response.body!);
    } else {
      console.error(response.body);
    }
  } else {
    console.warn("Didn't update user role. At least 1 field wasn't defined");
  }

  return null;
};

type UserUpdateProps = {
  id: number;
  workspace_id: number;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  country?: string | null;
  image?: null;
};

/**
 * Updates an existing user in a workspace.
 * @param {UserUpdateProps} props The properties to update the user with. Props attributes:
 * - id: number
 * - workspace_id: number
 * - first_name?: string | null
 * - last_name?: string | null
 * - phone_number?: string | null
 * - country?: string | null
 * - image?: null
 *
 * @returns {Promise<AcmeUser | null>} The updated user or null if the update failed.
 */
export const updateWorkspaceUser = async (
  props: UserUpdateProps
): Promise<AcmeWorkspaceUser | null> => {
  const response = await authenticatedFetch(
    `workspace/user?id=${props.id}&workspace_id=${props.workspace_id}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        first_name: props.first_name,
        last_name: props.last_name,
        phone_number: props.phone_number,
        country: props.country,
        image: props.image,
      }),
    }
  );

  if (response.statusCode == 200) {
    return JSON.parse(response.body!);
  } else {
    console.error(response.body);
  }

  return null;
};

/**
 * Deletes a user from a workspace using their user ID.
 * @param userId User ID to delete
 * @param workspaceId Current workspace ID
 * @returns {Promise<boolean>} True if the user was deleted, false otherwise.
 */
export const deleteWorkspaceUser = async (
  userId: number,
  workspaceId: number
): Promise<boolean> => {
  const response = await authenticatedFetch(
    `workspace/user?id=${userId}&workspace_id=${workspaceId}`,
    {
      method: "DELETE",
    }
  );

  if (response.statusCode == 200) {
    return true;
  } else {
    console.error(response.body);

    return false;
  }
};

type PropertyCreateProps = {
  workspace_id: number;
  name: string;
  room_count: number;
  bathroom_count: number;
  guest_count: number;
  cleaning_fee?: number;
  cleaning_fee_currency?: string;
  address?: string;
  cleaning_complete_duration?: string;
  airbnb_url?: string;
  form?: string | null;
  is_active?: boolean;
  images?: string[] | null;
};

export const createProperty = async (
  props: PropertyCreateProps
): Promise<AcmeProperty | null> => {
  const response = await authenticatedFetch("workspace/property", {
    method: "POST",
    body: JSON.stringify(props),
  });

  if (response.statusCode == 200) {
    return JSON.parse(response.body!);
  } else {
    console.error(response.body);
  }

  return null;
};

type PropertyUpdateProps = {
  id: number;
  workspace_id: number;
  name?: string;
  room_count?: number;
  bathroom_count?: number;
  guest_count?: number;
  cleaning_fee?: number;
  cleaning_fee_currency?: string;
  address?: string;
  cleaning_complete_duration?: string;
  airbnb_url?: string;
  form?: string | null;
  images?: string[] | null;
  is_active?: boolean;
};

export const updateProperty = async (
  props: PropertyUpdateProps
): Promise<AcmeProperty | null> => {
  // console.log("Updating property with props: ");
  // const jsonifiedProps = JSON.stringify(props);
  // console.log(jsonifiedProps);
  const response = await authenticatedFetch(
    `workspace/property?id=${props.id}&workspace_id=${props.workspace_id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(props),
    }
  );

  if (response.statusCode == 200) {
    return JSON.parse(response.body!);
  } else {
    console.error(response.body);
  }

  return null;
};

export const deleteProperty = async (
  id: number,
  workspaceId: number
): Promise<boolean> => {
  const response = await authenticatedFetch(
    `workspace/property?id=${id}&workspace_id=${workspaceId}`,
    {
      method: "DELETE",
    }
  );

  if (response.statusCode == 200) {
    return true;
  } else {
    console.error(response.body);

    return false;
  }
};

export const listSurveyData = async (
  workspaceId: number
): Promise<CleaningAppSurveyData | null> => {
  const response = await authenticatedFetch(
    `tools/cleaning_app/list_survey_data?workspace_id=${workspaceId}`,
    {
      method: "GET",
    }
  );

  if (response.statusCode == 200) {
    console.log("Survey data: ", response.body);
    return JSON.parse(response.body!);
  } else {
    console.error(response.body);

    return null;
  }
};

export const verifySurveyResult = async (
  surveyResultId: number
): Promise<CleaningAppSurveyResultVerificationData | null> => {
  const response = await authenticatedFetch(
    `tools/cleaning_app/verify_survey_result?survey_result_id=${surveyResultId}`,
    {
      method: "GET",
    }
  );

  if (response.statusCode == 200) {
    return JSON.parse(response.body!);
  } else {
    console.error(
      "Failed to verify survey result with status code: ",
      response.statusCode
    );

    return null;
  }
};
