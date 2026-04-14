export interface AuthUser {
  user_id: number;
  username: string;
  email?: string;
  full_name?: string;
  profile_image_url?: string | null;
  is_admin?: boolean;
  onboarding_guide_required?: boolean;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
}

export interface AuthLoginResponse {
  token: string;
  user: AuthUser;
}

export interface AuthRegisterPayload {
  username: string;
  email: string;
  full_name?: string;
  password: string;
}

export interface AuthRegisterResponse {
  requires_email_verification: boolean;
  email: string;
  message: string;
}

export interface AuthResendVerificationPayload {
  email?: string;
  identifier?: string;
}

export interface AuthResendVerificationResponse {
  sent?: boolean;
  already_verified?: boolean;
  email?: string;
  message: string;
}

export interface AuthAccountResponse {
  user: AuthUser;
}

export interface PagedResult {
  data: Record<string, unknown>[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SetPartRequirement {
  part_num: string;
  color_id: number;
  required_quantity: number;
  inventory_id: number;
  part_name?: string;
  part_img_url?: string;
  color_name?: string;
}

export interface SetPartsResponse {
  set_num: string;
  inventory_id: number | null;
  inventory_version?: number;
  parts: SetPartRequirement[];
}

export interface CatalogSetPart {
  part_num: string;
  color_id: number;
  quantity: number;
  part_name?: string;
  part_img_url?: string;
  color_name?: string;
}

export interface CatalogSetPartsResponse {
  set_num: string;
  inventory_id: number | null;
  inventory_version?: number;
  parts: CatalogSetPart[];
}

export interface SetInstruction {
  id: number;
  set_num: string;
  source: string;
  source_label?: string | null;
  url: string;
  name?: string | null;
  instruction_type?: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface SetInstructionsResponse {
  set_num: string;
  instructions: SetInstruction[];
}

export interface UserSetCreatePayload {
  user_id: number;
  set_num: string;
  quantity: number;
  is_public?: boolean;
  condition_public?: string;
  condition_complete?: string;
  purchase_price?: number;
  owned_since?: string;
}

export interface UserSetPartSelection extends SetPartRequirement {
  has_part: boolean;
  owned_quantity?: number;
}

export interface UserSetWithPartsPayload {
  user_set: UserSetCreatePayload;
  parts: UserSetPartSelection[];
}

export interface UserSetWithPartsResult {
  user_set: {
    id: number;
  } & UserSetCreatePayload;
  summary: {
    parts_processed: number;
    user_parts_created: number;
    missing_parts_created: number;
  };
}

export interface UserSetBreakdownPart {
  row_id: number;
  part_num: string;
  color_id: number;
  quantity: number;
  part_name?: string;
  part_img_url?: string;
  color_name?: string;
}

export interface UserSetBreakdownResponse {
  user_set_id: number;
  user_id: number;
  set_num: string;
  set_name?: string;
  img_url?: string;
  available_parts: UserSetBreakdownPart[];
  missing_parts: UserSetBreakdownPart[];
}

export interface MissingPartCatalogRow {
  missing_part_id: number;
  user_set_id: number;
  user_id: number;
  set_num: string;
  set_name?: string;
  set_img_url?: string;
  theme_id?: number;
  theme_name?: string;
  element_id?: string;
  part_num: string;
  part_name?: string;
  part_img_url?: string;
  color_id: number;
  color_name?: string;
  quantity_missing: number;
  username?: string;
  email?: string;
  full_name?: string;
}
