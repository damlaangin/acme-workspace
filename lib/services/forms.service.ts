import {
  ApiResponse,
  Form,
  FormListResponse,
  FormQuestionFilters,
  FormQuestionListResponse,
  FormSubmission,
  FormSubmissionFull,
  FormSubmissionListResponse,
  FormSubmissionStatus,
  Question,
  QuestionCreate,
  QuestionUpdate,
} from "@/types/api";
import { proxyAuthService } from "./proxy-auth.service";

interface FormSubmissionFilters {
  status?: FormSubmissionStatus;
  page?: number;
  page_size?: number;
  country_id?: number;
  state_id?: number;
  city_id?: number;
}

class FormsService {
  private baseURL = "/api/proxy";

  // GET: List all forms in a workspace
  async getForms(workspaceId: number): Promise<ApiResponse<FormListResponse>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) headers["Authorization"] = `Token ${token}`;

      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/forms/`, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || "Failed to fetch forms",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // GET: Retrieve a single form by ID
  async getForm(workspaceId: number, formId: number): Promise<ApiResponse<Form>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) headers["Authorization"] = `Token ${token}`;

      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/forms/${formId}/`, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || "Failed to fetch form",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // POST: Create a new form
  async createForm(workspaceId: number, formData: any): Promise<ApiResponse<Form>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) headers["Authorization"] = `Token ${token}`;

      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/forms/`, {
        method: "POST",
        headers,
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || "Failed to create form",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // PUT: Update a form (full update)
  async updateFormFull(
    workspaceId: number,
    formId: number,
    formData: any
  ): Promise<ApiResponse<Form>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) headers["Authorization"] = `Token ${token}`;

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/forms/${formId}/`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message || data.error || data.detail || "Failed to update form",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // PATCH: Partially update a form
  async updateForm(workspaceId: number, formId: number, formData: any): Promise<ApiResponse<Form>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) headers["Authorization"] = `Token ${token}`;

      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/forms/${formId}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || "Failed to update form",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // DELETE: Remove a form
  async deleteForm(workspaceId: number, formId: number): Promise<ApiResponse<null>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) headers["Authorization"] = `Token ${token}`;

      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/forms/${formId}/`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: {
            message: data.message || data.error || data.detail || "Failed to delete form",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data: null };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // GET: List questions for a form
  async getFormQuestions(
    workspaceId: number,
    formId: number,
    filters?: FormQuestionFilters
  ): Promise<ApiResponse<FormQuestionListResponse>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) headers["Authorization"] = `Token ${token}`;

      const queryParams = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString());
          }
        });
      }

      const queryString = queryParams.toString();
      const url = `${this.baseURL}/workspaces/${workspaceId}/forms/${formId}/questions/${
        queryString ? `?${queryString}` : ""
      }`;

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message || data.error || data.detail || "Failed to fetch form questions",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // POST: Add a question to a form
  async createFormQuestion(
    workspaceId: number,
    formId: number,
    questionData: QuestionCreate | FormData
  ): Promise<ApiResponse<Question>> {
    try {
      const token = proxyAuthService.getToken();
      const isFormData = questionData instanceof FormData;
      const headers: Record<string, string> = {};

      if (token) headers["Authorization"] = `Token ${token}`;
      if (!isFormData) headers["Content-Type"] = "application/json";

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/forms/${formId}/questions/`,
        {
          method: "POST",
          headers,
          body: isFormData ? questionData : JSON.stringify(questionData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message || data.error || data.detail || "Failed to create form question",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // PUT: Update a form question (full update)
  async updateFormQuestionFull(
    workspaceId: number,
    formId: number,
    questionId: number | string,
    questionData: QuestionUpdate | FormData
  ): Promise<ApiResponse<Question>> {
    try {
      const token = proxyAuthService.getToken();
      const isFormData = questionData instanceof FormData;
      const headers: Record<string, string> = {};

      if (token) headers["Authorization"] = `Token ${token}`;
      if (!isFormData) headers["Content-Type"] = "application/json";

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/forms/${formId}/questions/${questionId}/`,
        {
          method: "PUT",
          headers,
          body: isFormData ? questionData : JSON.stringify(questionData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message || data.error || data.detail || "Failed to update form question",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // PATCH: Update a form question (partial)
  async updateFormQuestion(
    workspaceId: number,
    formId: number,
    questionId: number | string,
    questionData: Partial<QuestionUpdate> | FormData
  ): Promise<ApiResponse<Question>> {
    try {
      const token = proxyAuthService.getToken();
      const isFormData = questionData instanceof FormData;
      const headers: Record<string, string> = {};

      if (token) headers["Authorization"] = `Token ${token}`;
      if (!isFormData) headers["Content-Type"] = "application/json";

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/forms/${formId}/questions/${questionId}/`,
        {
          method: "PATCH",
          headers,
          body: isFormData ? questionData : JSON.stringify(questionData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message || data.error || data.detail || "Failed to update form question",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // DELETE: Remove a question from a form
  async deleteFormQuestion(
    workspaceId: number,
    formId: number,
    questionId: number | string
  ): Promise<ApiResponse<null>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) headers["Authorization"] = `Token ${token}`;

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/forms/${formId}/questions/${questionId}/`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: {
            message:
              data.message || data.error || data.detail || "Failed to delete form question",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data: null };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // GET: List all form submissions in a workspace
  async getFormSubmissions(
    workspaceId: number,
    filters?: FormSubmissionFilters
  ): Promise<ApiResponse<FormSubmissionListResponse>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) headers["Authorization"] = `Token ${token}`;

      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            queryParams.append(key, value.toString());
          }
        });
      }

      const queryString = queryParams.toString();
      const url = `${this.baseURL}/workspaces/${workspaceId}/form-submissions/${
        queryString ? `?${queryString}` : ""
      }`;

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message ||
              data.error ||
              data.detail ||
              "Failed to fetch form submissions",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // POST: Approve a form submission
  async approveFormSubmission(
    workspaceId: number,
    submissionId: number,
    reviewNote?: string
  ): Promise<ApiResponse<FormSubmissionFull>> {
    return this.reviewFormSubmission(workspaceId, submissionId, "approve", reviewNote);
  }

  // POST: Reject a form submission
  async rejectFormSubmission(
    workspaceId: number,
    submissionId: number,
    reviewNote?: string
  ): Promise<ApiResponse<FormSubmissionFull>> {
    return this.reviewFormSubmission(workspaceId, submissionId, "reject", reviewNote);
  }

  // POST: Flag a form submission for follow-up
  async flagFormSubmission(
    workspaceId: number,
    submissionId: number,
    reviewNote?: string
  ): Promise<ApiResponse<FormSubmissionFull>> {
    return this.reviewFormSubmission(workspaceId, submissionId, "flag", reviewNote);
  }

  // Mirrors the LeaveRequestsService.review precedent in
  // lib/services/leave-requests.service.ts:94-135 — the three actions
  // share an identical request shape and only differ in the URL segment.
  private async reviewFormSubmission(
    workspaceId: number,
    submissionId: number,
    action: "approve" | "reject" | "flag",
    reviewNote?: string
  ): Promise<ApiResponse<FormSubmissionFull>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) headers["Authorization"] = `Token ${token}`;

      const url = `${this.baseURL}/workspaces/${workspaceId}/form-submissions/${submissionId}/${action}/`;
      const body = reviewNote
        ? JSON.stringify({ review_note: reviewNote })
        : JSON.stringify({});

      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message ||
              data.error ||
              data.detail ||
              `Failed to ${action} form submission`,
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // POST: Create a new form submission
  async createFormSubmission(
    workspaceId: number,
    submissionData: FormSubmission
  ): Promise<ApiResponse<FormSubmissionFull>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) headers["Authorization"] = `Token ${token}`;

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/form-submissions/`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(submissionData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message ||
              data.error ||
              data.detail ||
              "Failed to create form submission",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // GET: Retrieve a form submission by ID
  async getFormSubmission(
    workspaceId: number,
    submissionId: number
  ): Promise<ApiResponse<FormSubmissionFull>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) headers["Authorization"] = `Token ${token}`;

      const response = await fetch(
        `${this.baseURL}/workspaces/${workspaceId}/form-submissions/${submissionId}/`,
        {
          method: "GET",
          headers,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message:
              data.message ||
              data.error ||
              data.detail ||
              "Failed to fetch form submission",
            code: response.status.toString(),
            details: data,
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }

  // POST: Assign a form to properties
  async assignFormToProperties(workspaceId: number, formId: number, data: any): Promise<ApiResponse<any>> {
    try {
      const token = proxyAuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) headers["Authorization"] = `Token ${token}`;

      const response = await fetch(`${this.baseURL}/workspaces/${workspaceId}/forms/${formId}/assign_to_properties/`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: result.message || result.error || result.detail || "Failed to assign form to properties",
            code: response.status.toString(),
            details: result,
          },
        };
      }

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Network error",
          code: "NETWORK_ERROR",
        },
      };
    }
  }
}

export const formsService = new FormsService();
export type {
  Form,
  FormListResponse,
  FormQuestionFilters,
  FormQuestionListResponse,
  Question,
  QuestionCreate,
  QuestionUpdate,
};
