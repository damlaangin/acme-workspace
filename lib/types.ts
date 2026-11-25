// ./lib/types.ts
import type { Property } from "@/types/api";
export interface PricingPlan {
  name: string;
  features: string[];
  price: string;
  upto: number; // Add upto property
  contact: boolean;
  productReferenceCode: string;
}

export interface PricingProps {
  title: string;
  description: string;
  plans: PricingPlan[];
  color: string;
  listings: number;
  monthly: boolean;
}

export type CheckOutValues = {
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  phoneNo: string;
  idendityNo: string;
  cardHolderName: string;
  creditCardNumber: string;
  cvc: number;
  expireMonth: number;
  expireYear: number;
  billingName: string;
  address: string;
  city: string;
  district: string;
  zip: number;
};

export const initialCheckOutValues = {
  email: "",
  firstName: "",
  lastName: "",
  country: "",
  phoneNo: "",
  idendityNo: "",
  cardHolderName: "",
  creditCardNumber: "",
  cvc: 0,
  expireMonth: 0,
  expireYear: 0,
  billingName: "",
  address: "",
  city: "",
  district: "",
  zip: 0,
};

export interface MonthlyData {
  name: string;
  count: number;
}

export type Purchase = {
  userId: number;
  name: string;
  email: string;
  price: number;
};

export interface Plan {
  basic: boolean;
  pro: boolean;
  premium: boolean;
}

// Define interface for features
export interface Features {
  cleaning_app: string[];
  ai_module: string[];
}

export interface AcmeUser {
  id: number;
  username?: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone_number?: string | null;
  user_type?: string | null;
  listing_count?: number | null;
  avg_nightly_rate?: number | null;
  country?: string | null;
  created_at?: string | null;
  profile_image_url?: string | null;
}

export interface AcmeWorkspaceUser extends AcmeUser {
  membership_id: number;
  role_id?: number | null;
  is_active?: boolean;
  workspace_user_type?: string | null;
  updated_at?: string | null;
}

export interface AcmeWorkspace {
  id: number;
  name: string;
  slug?: string;
  preferred_currency?: string | null;
  tax_number?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  owner_id?: number | null;
  sub_id?: number | null;
  logo_link?: string | null;
  group_name?: string | null;
}

export type AcmeProperty = Property;

type CleaningAppUserRolePermission =
  | "fullAccess"
  | "appAccess"
  | "adminPanelAccess"
  | "postRead"
  | "postCreate"
  | "postUpdate"
  | "postDelete"
  | "chatGroupCreate"
  | "chatGroupUpdate"
  | "chatGroupDelete"
  | "surveyCreate"
  | "surveyUpdate"
  | "surveyDelete"
  | "surveyResultRead"
  | "surveyResultReview"
  | "cleaningTaskCreate"
  | "cleaningTaskUpdate"
  | "cleaningTaskDelete"
  | "cleaningTaskPick"
  | "cleaningTaskSettingsRead"
  | "cleaningTaskSettingsUpdate"
  | "faultReportRead"
  | "faultReportUpdate"
  | "faultContactRead"
  | "faultContactCreate"
  | "faultContactUpdate"
  | "faultContactDelete";

type OwnersPanelUserRolePermission =
  | "fullAccess"
  | "appAccess"
  | "calendarView"
  | "earningsReportsView"
  | "downloadFinancialStatements"
  | "guestReviewsAccess"
  | "cleaningReportsView"
  | "taskAssignmentsView"
  | "contractDocumentsAccess"
  | "propertyDescriptionView";

type AIModuleUserRolePermission =
  | "fullAccess"
  | "appAccess"
  | "conversationsView"
  | "promptEdit"
  | "propInstructionsEdit"
  | "chatbotConfigure"
  | "analyticsMonitor"
  | "propDisable";

type DashboardUserRolePermission =
  | "fullAccess"
  | "userList"
  | "userCreate"
  | "userUpdate"
  | "userDelete"
  | "roleList"
  | "roleCreate"
  | "roleUpdate"
  | "roleDelete"
  | "propList"
  | "propCreate"
  | "propUpdate"
  | "propDelete";

export interface AcmeUserRolePermissions {
  cleaning_app?: CleaningAppUserRolePermission[] | null;
  owners_panel?: OwnersPanelUserRolePermission[] | null;
  ai_module?: AIModuleUserRolePermission[] | null;
  dashboard?: DashboardUserRolePermission[] | null;
}

/**
 * Define the AcmeUserRole interface
 * @property {string} `id` - The user role ID
 * @property {string} `workspace_id` - The workspace ID
 * @property {string} `name` - The user role name
 * @property {string} `description` - The user role description
 * @property {AcmeUserRolePermissions} `permissions` - The user role permissions
 * @property {boolean} `has_dashboard_access` - The user role dashboard access
 * @property {string} `created_at` - The user role created date. ISO 8601 date string
 * @property {string} `updated_at` - The user role updated date. ISO 8601 date string
 */
export interface AcmeUserRole {
  id: number;
  workspace_id?: number | null;
  name: string;
  description?: string | null;
  permissions: AcmeUserRolePermissions | string[] | null;
  has_dashboard_access?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FormActionState<T> {
  success: boolean;
  data: T;
}

export interface CleaningAppSurveyData {
  id: number;
  title: string;
  description: string;
};

export interface CleaningAppSurveyResultVerificationData {
  house: {
    title: string;
    address: string;
  },
  user: {
    first_name: string;
    last_name: string;
  }
  cleaning_date: string;
}
