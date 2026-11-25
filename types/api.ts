// TypeScript types for API responses based on your OpenAPI spec
import { Currency, Country, State, City } from '@/types/location';

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface LoginResponse {
  key?: string; // New API returns 'key' instead of 'token'
  user?: UserData;
  message?: string;
  error?: string;
}

export interface ApiTokenResponse {
  key: string;
}

export interface UserData {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  profile_picture?: string;
  country?: string;
  extra_data?: {
    listing_amount?: number;
    average_nightly_rate?: number;
  };
}

export interface Workspace {
  id: number;
  name: string;
  description?: string;
  slug?: string;
  tax_number?: string;
  is_active?: boolean;
  logo?: string | null;
  panel_title?: string;
  theme?: string;
  created_at: string;
  updated_at: string;
  owner?: UserData;
  owner_hidden_fields?: {
    property?: string[];
    payment?: string[];
  };
}

export interface WorkspacePatch {
  name?: string;
  tax_number?: string;
  logo?: string | null;
  panel_title?: string;
  theme?: string;
  owner_hidden_fields?: {
    property?: string[];
    payment?: string[];
  };
}

export interface WorkspaceListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Workspace[];
}

export interface CurrencyListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Currency[];
}

export interface Address {
  id?: number;
  address_line_1: string;
  address_line_2?: string;
  postal_code: string;
  city: City | number;
  state?: State | number;
  country: Country | number;
}

export interface AddressCreate {
  address_line_1?: string;
  address_line_2?: string;
  postal_code: string;
  city: number; // integer for create
  state?: number; // integer for create
  country: number; // integer for create
}

export interface CleaningPaymentFee {
  amount: string;
  currency: Currency;
}

export interface Permission {
  id: number;
  name: string;
  codename: string;
}

export interface Group {
  id: number;
  workspace: number | null;
  name: string;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
  icon?: {
    icon: string;
  } | null;
}

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  date_joined?: string;
  last_login?: string | null;
  phone_number?: string;
  phone?: string; // API uses 'phone' in some contexts
  profile_picture?: string | null;
  country?: string | null;
  extra_data?: {
    listing_amount?: number;
    average_nightly_rate?: number;
  };
}

export interface UserCreate {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_picture?: string;
  country?: string;
  extra_data?: {
    listing_amount?: number;
    average_nightly_rate?: number;
  };
}

export interface UserUpdate {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_picture?: string | null;
  country?: string | null;
  extra_data?: {
    listing_amount?: number;
    average_nightly_rate?: number;
  };
}

export interface PropertyOwner {
  id: number;
  user_type: string;
  user: User;
  is_active: boolean;
  permissions: Permission[];
  groups: Group[];
  address: Address;
  created_at: string;
  updated_at: string;
}

export interface PropertyImage {
  id: number;
  image: string;
  order: number;
}

export interface PropertyImageDetail {
  id: number;
  image: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: number;
  name: string;
  form: number | { id: number } | null;
  address: Address;
  ical_link: string;
  owner: PropertyOwner;
  cleaning_payment_fee: CleaningPaymentFee;
  payment_split_rule: { id: number; name: string } | null;
  commission_rate: string | null;
  room_count: number | null;
  bathroom_count: number | null;
  guest_count: number;
  bed_count: number | null;
  listing_id: string;
  airbnb_url: string;
  cleaning_complete_duration: string;
  check_in_time?: string;
  check_out_time?: string;
  latitude: string;
  longitude: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images: PropertyImage[];
  pause_bot_until?: string | null;
}

export interface RuleLine {
  rule_type: 'fixed' | 'percent' | 'tiered_percent' | 'min_payout' | 'max_payout';
  party: 'cohost' | 'home_owner';
  priority: number;
  amount?: string;
  percent?: string;
  include_tags?: string[];
  exclude_tags?: string[];
  tiers?: { threshold: string; percentage: string }[];
  minimum?: string;
  fallback_party?: string;
  maximum?: string;
  give_to_party?: string;
}

export interface PaymentSplitRule {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  remainder_collector_party: 'cohost' | 'home_owner';
  basis_remainder_party: 'cohost' | 'home_owner';
  cleaning_fee_strategy: 'workspace' | 'home_owner' | 'split';
  rules: RuleLine[];
  property_count: number;
  created_at: string;
  updated_at: string;
}

export interface PropertyOccupancyProperty {
  id: number;
  name: string;
  listing_id: string;
  airbnb_url: string;
  images: PropertyImageDetail[];
}

export interface PropertyOccupancy {
  property: PropertyOccupancyProperty;
  occupancy_rate: string;
  revenue: string;
  avg_nightly_rate: string;
  occupied_nights: number;
  available_nights: number;
  blocked_nights: number;
  total_reservations: number;
}
export interface PropertyListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Property[];
}

export interface Expense {
  id: number;
  property: Property; // Property object reference
  amount: string; // decimal string format
  currency: Currency; // Currency object reference
  type: string;
  created_by: WorkspaceUser;
  description: string;
  attachment: string | null;
  expense_date?: string | null; // ISO YYYY-MM-DD
  payment_status?: "paid" | "unpaid" | "scheduled" | null;
  reservation?: number | null; // Reservation PK
  created_at: string; // date-time
  updated_at: string; // date-time
}

export interface ExpenseCreateUpdate {
  id?: number;
  amount: string; // decimal string format
  type: string;
  currency: number; // integer
  description: string;
  property: number; // integer
  attachment?: string | null;
  expense_date?: string; // YYYY-MM-DD
  payment_status?: "paid" | "unpaid" | "scheduled";
  reservation?: number | null;
}

export interface ExpenseListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Expense[];
}

export interface WorkspaceUser {
  id: number;
  user_type: "workspace_admin" | "property_owner" | "staff" | "app_user";
  user: User;
  is_active: boolean;
  permissions: Permission[];
  groups: Group[];
  address?: Address;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceUserCreate {
  user_type: "workspace_admin" | "property_owner" | "staff" | "app_user";
  is_active?: boolean;
  permissions?: number[];
  groups?: number[];
  user: UserCreate;
  address?: AddressCreate;
  assigned_property_ids?: number[];
}

export interface WorkspaceUserUpdate {
  user_type?: "workspace_admin" | "property_owner" | "staff" | "app_user";
  is_active?: boolean;
  permissions?: number[];
  groups?: number[];
  user?: UserUpdate;
  address?: AddressCreate;
  assigned_property_ids?: number[];
}

export interface WorkspaceUserPatch {
  user_type?: "workspace_admin" | "property_owner" | "staff" | "app_user";
  is_active?: boolean;
  permissions?: number[];
  groups?: number[];
  user?: UserUpdate;
  address?: AddressCreate;
  assigned_property_ids?: number[];
}

export interface PermissionDetail {
  id: number;
  name: string;
  codename: string;
}

export interface WorkspaceAllowedPermission {
  id: number;
  permissions: PermissionDetail[];
  user_type: "workspace_admin" | "property_owner" | "staff" | "app_user";
}

export interface WorkspaceUserListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: WorkspaceUser[];
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

// --- Added for Reservations ---
export interface Payment {
  nightly_fee: string;
  created_at: string | number | Date;
  currency: Currency;
  payout_currency: Currency;
  cleaning_fee: string | number;
  guest_service_fee: string | number;
  total_room_fee: string | number;
  night_rate_adjustment: string | number;
  host_service_fee: string | number;
  co_host_payout: string | number;
  net_payout: string | number;
  host_earning: string | null;
  workspace_earning: string | null;
}

export type ReservationStatus = 'inquiry' | 'completed' | 'cancelled' | 'blocked';

export interface Reservation {
  id: number;
  property: Property; // Property object
  reservation_code: string;
  guest_name: string;
  country_name: string;
  checkin_date: string; // YYYY-MM-DD
  checkout_date: string; // YYYY-MM-DD
  adult_guest_count: number;
  child_guest_count: number;
  baby_guest_count: number;
  pet_count: number;
  night_count: number;
  payment: Payment;
  profile_pic?: string | null;
  reservation_status?: ReservationStatus;
}

export interface ReservationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Reservation[];
}

// Analytics
export interface AnalyticsDataPoint {
  date?: string;
  period?: string;
  total?: number;
  count?: number;
  currency?: string;
  [key: string]: number | string | undefined;
}

export interface CountryDemographic {
  country_code: string;
  country_name: string;
  percentage: number;
}

export interface OthersDemographic {
  percentage: number;
}

export interface GuestDemographic {
  total_guests: number;
  international_pct: number;
  countries: CountryDemographic[];
  others: OthersDemographic;
}

export interface EarningAnalyticsDataPoint {
  period: string;
  total_host_earning: string;
  total_workspace_earning: string;
  total_cleaning_fee: string;
  avg_nightly_rate: string;
  currency_code: string;
}

export interface ExpenseAnalyticsDataPoint {
  period: string;
  type: string;
  total_amount: string;
  currency_code: string;
}

export interface ReservationAnalyticsDataPoint {
  period: string;
  occupancy_rate: number;
  total_reservations: number;
  active_days: number;
  busy_days: number;
  blocked_days: number;
  total_period_days: number;
}

export interface ConversationAnalyticsOverview {
  average_sentiment_score: number;
  total_message_volume: number;
  bot_message_volume_percentage: number;
  staff_message_volume_percentage: number;
  average_response_time_seconds: number;
}

export interface RevenuePacingEntry {
  period: string;
  current_year_revenue: string;
  current_year_reservations: number;
  current_year_occupancy_rate: number;
  current_year_avg_nightly_rate: string;
  last_year_revenue: string;
  last_year_reservations: number;
  last_year_occupancy_rate: number;
  last_year_avg_nightly_rate: string;
  currency_code: string;
}

export interface ReservationAnalyticsResponse {
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  results: AnalyticsDataPoint[];
  total_reservations?: number;
  total_amount?: number;
  currency?: string;
}

export interface MonthlySummary {
  currency_code: string;
  workspace_earning: string;
  workspace_earning_change: string;
  total_expenses: string;
  total_expenses_change: string;
  total_revenue: string;
  total_revenue_change: string;
  avg_nightly_rate: string;
  avg_nightly_rate_change: string;
  occupancy_rate: string;
  occupancy_rate_change: string;
  // Canonical revenue fields (Stage A — serve alongside legacy aliases).
  gross_revenue?: string;
  gross_revenue_change?: string;
  owner_revenue?: string;
  owner_revenue_change?: string;
  workspace_revenue?: string;
  workspace_revenue_change?: string;
  noi?: string;
  noi_change?: string;
}

// Tasks

export interface Task {
  id: number;
  property: number;
  reservation: number | string;
  planned_start_time: string;
  planned_end_time: string;
  start_time: string;
  end_time: string;
  assignee: number;
  parent_task?: number;
  type: "cleaning" | "maintenance";
  result: "failed" | "faulty" | "successful";
  description: string;
  created_at: string;
  updated_at: string;
}

export interface TaskListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Task[];
}

export interface TaskFilters {
  assignee_id?: number;
  city_id?: number;
  country_id?: number;
  created_by_id?: number;
  ordering?: string;
  page?: number;
  page_size?: number;
  planned_start_time_gte?: string;
  planned_start_time_lte?: string;
  property_id?: number;
  reservation_id?: number;
  result?: "failed" | "faulty" | "successful";
  search?: string;
  state_id?: number;
  type?: "cleaning" | "maintenance";
}

export interface ApiPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Form {
  id: number;
  name?: string;
  title?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface FormListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Form[];
}

export type AnswerType =
  | 'dropdown'
  | 'checkbox'
  | 'image'
  | 'video'
  | 'rating'
  | 'number'
  | 'audio'
  | 'yesno'
  | 'open'
  | 'date'
  | 'file'
  | 'signature';

export type ConditionalOperator =
  | 'equal_to'
  | 'all_of'
  | 'one_of'
  | 'lower_than'
  | 'higher_than';

export type DateMode = 'date' | 'time' | 'datetime';
export type ImageSource = 'both' | 'gallery' | 'camera';
export type VideoSource = 'both' | 'gallery' | 'camera';

export interface Question {
  id?: number;
  question: string;
  answer_type: AnswerType;
  required?: boolean;
  randomly_required?: boolean;
  order?: number;
  is_conditional?: boolean;
  conditional_target?: number | null;
  conditional_operator?: ConditionalOperator | '';
  conditional_value?: string;
  options?: string[];
  image_source?: ImageSource | '';
  video_source?: VideoSource | '';
  date_mode?: DateMode | '';
  lower_limit?: string;
  upper_limit?: string;
  image_attachments?: string[];
}

export interface QuestionCreate extends Question {}
export interface QuestionUpdate extends Question {}

export interface FormQuestionListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Question[];
}

export interface FormQuestionFilters {
  ordering?: string;
  page?: number;
  page_size?: number;
  search?: string;
}

export type FormSubmissionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_followup";

// Minimal task shape returned inside FormSubmission read responses
// (TaskMinimalSerializer in apps/custom_forms/serializers.py)
export interface FormSubmissionTaskMinimal {
  id: number;
  planned_start_time: string;
  planned_end_time: string;
}

// Write-side payload — kept as flat IDs (cleaning mobile app + workspace
// `createFormSubmission` both POST these).
export interface FormSubmission {
  id?: number;
  form: number;
  property?: number | null;
  task?: number | null;
  answers?: any[];
  latitude?: string;
  longitude?: string;
  form_definition?: Record<string, any>;
}

// Read-side detail shape — what GET /form-submissions/{id}/ returns.
export interface FormSubmissionFull {
  id: number;
  form: number;
  property: SupervisorTaskProperty | null;
  task: FormSubmissionTaskMinimal | null;
  staff: SupervisorTaskAssignedTo | null;
  answers?: any[];
  latitude?: string;
  longitude?: string;
  form_definition?: Record<string, any>;
  status: FormSubmissionStatus;
  review_note: string;
  reviewed_by: SupervisorTaskAssignedTo | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormSubmissionList {
  id: number;
  form: number;
  workspace?: number | null;
  property: SupervisorTaskProperty | null;
  task: FormSubmissionTaskMinimal | null;
  staff: SupervisorTaskAssignedTo | null;
  status: FormSubmissionStatus;
  review_note: string;
  reviewed_by: SupervisorTaskAssignedTo | null;
  reviewed_at: string | null;
  latitude?: string;
  longitude?: string;
  created_at: string;
}

export interface FormSubmissionListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FormSubmissionList[];
}

export type IssueCategory =
  | "cleanliness"
  | "maintenance"
  | "check_in"
  | "check_out"
  | "amenities"
  | "noise"
  | "safety"
  | "communication"
  | "location"
  | "billing"
  | "other";

export interface Conversation {
  id: number;
  name: string;
  airbnb_conversation_id: string;
  property: Property;
  reservation?: number | null;
  created_at: string;
  updated_at: string;
  pause_bot_until: string | null;
  lastMessage?: Message;
  unreadCount?: number;
}

export interface ConversationAnalysis {
  id: number;
  summary: string;
  highest_urgency_reached: string;
  early_check_in_requested: boolean;
  late_check_out_requested: boolean;
  required_escalation: boolean;
  urgency: string;
  requires_immediate_action: boolean;
  urgency_reason: string;
  fixed_issues: number[];
  created_at: string;
  updated_at: string;
}

export interface ConversationGuestProfile {
  id: number;
  label: string;
  personality_type: string;
  communication_style: string;
  tone_descriptors: string | string[];
  recommended_engagement_style: string;
  loyalty_tier: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationSatisfaction {
  id: number;
  initial_satisfaction: number;
  final_satisfaction: number;
  satisfaction_trend: string;
  expectations_met: string;
  would_recommend_likelihood: number;
  frustration_peaks: string;
  satisfaction_peaks: string;
  unresolved_concerns: string;
  churn_risk: string;
  churn_risk_factors: string;
  positive_mentions: string;
  negative_mentions: string;
  overall_satisfaction: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationResponseSuggestion {
  id: number;
  status: string;
  suggested_tone: string;
  reply_to_message_id: number;
  context_start_message_id: number;
  context_end_message_id: number;
  key_points: string;
  avoid: string;
  draft: string;
  internal_note: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationSentiment {
  id: number;
  label: string;
  score: number;
  confidence: number;
  frustration_level: number;
  expressed_emotions: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationIssue {
  id: number;
  property: number;
  category: string;
  severity: string;
  summary: string;
  evidence: string;
  affected_area: string;
  is_recurring: boolean;
  is_safety_related: boolean;
  suggested_resolutions: string;
  resolution_notes: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationRisk {
  id: number;
  property: number;
  risk_type: string;
  risk_level: string;
  risk_score: number;
  evidence: string;
  recommended_action: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationFinancialRisk {
  id: number;
  conversation: number;
  property: number;
  risk_type: string;
  source: string;
  risk_score: number;
  evidence: string;
  amount: string;
  percentage: number;
  currency: string;
  is_committed: boolean;
  is_reasonable: boolean;
  justification_strength: string;
  recommendation: string;
  exposure_level: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export type RequestPreferenceSource = "bot" | "host" | "guest";

export interface ConversationRequestPreference {
  id: number;
  text: string;
  evidence: string;
  source: RequestPreferenceSource | string;
  is_resolved?: boolean;
  created_at: string;
  updated_at: string;
}

export interface RequestPreference {
  id: number;
  text: string;
  evidence: string;
  source: RequestPreferenceSource;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface RequestPreferenceCreate {
  text: string;
  evidence: string;
  source: RequestPreferenceSource;
  is_resolved: boolean;
}

export type PatchedRequestPreference = Partial<RequestPreferenceCreate>;

export interface PaginatedRequestPreferenceList {
  count: number;
  next: string | null;
  previous: string | null;
  results: RequestPreference[];
}

export interface ConversationAnalytics {
  conversation_id: number;
  summary: string;
  key_topics: string;
  last_analyzed_message_id: number;
  last_message_id: number;
  analysis: ConversationAnalysis | null;
  guest_profile: ConversationGuestProfile | null;
  satisfaction: ConversationSatisfaction | null;
  response_suggestion: ConversationResponseSuggestion | null;
  sentiments: ConversationSentiment[];
  issues: ConversationIssue[];
  risks: ConversationRisk[];
  financial_risks: ConversationFinancialRisk[];
  requests_and_preferences: ConversationRequestPreference[];
}

export type PauseBotDuration =
  | "1_hour"
  | "8_hours"
  | "until_checkout"
  | "indefinitely";

export interface PauseBotRequest {
  duration: PauseBotDuration;
}

export type PropertyPauseBotDuration = "1_hour" | "8_hours" | "indefinitely";

export interface PropertyPauseBotRequest {
  duration: PropertyPauseBotDuration;
}

export interface Message {
  id: number;
  sender_name: string;
  sender_image?: string | null;
  message: string;
  is_staff: boolean;
  is_bot: boolean;
  reply_to: number;
  manuel_action_required: boolean;
  conversation: number;
  created_at: string;
  updated_at: string;
}

export interface BotConfig {
  role: string;
  objective: string;
  context: string;
  sop: string;
  instructions: string;
  examples?: string;
  notes?: string;
}

export interface BotSetupFormSubmission {
  id: number;
  config: BotConfig;
  template?: string;
}

export interface Bot {
  id: number;
  name: string;
  workspace: number;
  instruction?: string | null;
  llm_model: number;
  temperature: number;
  delay_before_responding: number;
  setup_completed: boolean;
  form_submission: BotSetupFormSubmission;
  created_at: string;
  updated_at: string;
}

export interface PatchedBot {
  name?: string;
  instruction?: string | null;
  llm_model?: number;
  temperature?: number;
  delay_before_responding?: number;
  setup_completed?: boolean;
  form_submission?: Partial<BotSetupFormSubmission>;
}

export interface PaginatedBotList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Bot[];
}

export interface BotSetupFormSubmissionCreate {
  name: string;
  temperature?: number;
  delay_before_responding?: number;
  config?: BotConfig;
  template?: string;
}

// --- Financial risks ---
export type FinancialRiskExposureLevel =
  | "None"
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

export type FinancialRiskRiskType =
  | "full_refund"
  | "partial_refund"
  | "discount"
  | "compensation"
  | "free_night"
  | "upgrade"
  | "credit"
  | "chargeback_loss"
  | "cancellation"
  | "other";

export type FinancialRiskSource =
  | "host_offered"
  | "guest_requested"
  | "platform_mandated"
  | "policy_automatic";

export type FinancialRiskJustificationStrength =
  | "strong"
  | "moderate"
  | "weak"
  | "none";

export interface FinancialRisk {
  id: number;
  conversation: number;
  property: number | Pick<Property, "id" | "name">;
  risk_type: FinancialRiskRiskType;
  source: FinancialRiskSource;
  risk_score: number;
  evidence: string;
  amount: string | null;
  percentage: number | null;
  currency: string | null;
  is_committed: boolean;
  is_reasonable: boolean | null;
  justification_strength: FinancialRiskJustificationStrength | null;
  recommendation: string | null;
  exposure_level: FinancialRiskExposureLevel;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialRiskListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FinancialRisk[];
}

export interface FinancialRiskUpdate {
  is_resolved: boolean;
}

export type PatchedFinancialRisk = Partial<FinancialRiskUpdate>;

// --- Supervisor /tasks/today-all/ payload ---
export interface SupervisorTaskAssignedTo {
  id: number;
  name: string;
}

export interface SupervisorTaskCleaningFee {
  amount: string;
  currency: Currency;
}

export interface SupervisorTaskAddress {
  id: number;
  address_line_1?: string;
  address_line_2?: string;
  postal_code?: string;
  city?: { id: number; name: string; state_id?: number };
  state?: { id: number; name: string; country_id?: number };
  country?: {
    id: number;
    name: string;
    iso2: string;
    iso3: string;
    currency: Currency;
  };
}

export interface SupervisorTaskProperty {
  id: number;
  name: string;
  address: SupervisorTaskAddress | null;
  cleaning_payment_fee?: { amount: string; currency: Currency } | null;
  first_image: string | null;
  latitude?: string;
  longitude?: string;
  form?: number | null;
}

export interface SupervisorTaskReservation {
  guest_name: string;
  country_name: string;
  checkin_date: string;
  checkout_date: string;
  adult_guest_count: number;
  child_guest_count: number;
  baby_guest_count: number;
  pet_count: number;
}

export interface SupervisorTaskToday {
  id: number;
  property: SupervisorTaskProperty;
  cleaning_fee: SupervisorTaskCleaningFee | null;
  reservation: SupervisorTaskReservation | null;
  planned_start_time: string;
  planned_end_time: string;
  start_time: string | null;
  end_time: string | null;
  type: "cleaning" | "maintenance";
  result: "" | "failed" | "faulty" | "successful";
  description: string;
  created_at: string;
  updated_at: string;
  assigned_to: SupervisorTaskAssignedTo | null;
}

// --- Leave requests ---
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeaveType = "vacation" | "sick" | "personal" | "unpaid";

export interface LeaveRequest {
  id: number;
  requested_by: number;
  requested_by_name: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  status: LeaveStatus;
  reason: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_note: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequestListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LeaveRequest[];
}
