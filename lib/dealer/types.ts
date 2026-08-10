export type DealerPrimarySection = "overview" | "inventory" | "leads" | "messages" | "analytics";
export type DealerSecondarySection = "customers" | "marketing" | "team" | "showroom" | "verification" | "billing" | "reviews" | "activity" | "settings" | "support";
export type DealerSection = DealerPrimarySection | DealerSecondarySection;

export type DealerRole = "owner" | "manager" | "sales_agent" | "inventory_editor" | "analyst";
export type DealerPermission =
  | "inventory.read" | "inventory.write" | "inventory.publish" | "inventory.bulk"
  | "leads.read" | "leads.write" | "leads.assign"
  | "customers.read" | "customers.write"
  | "messages.read" | "messages.write"
  | "analytics.read"
  | "marketing.read" | "marketing.write" | "marketing.publish"
  | "team.read" | "team.write"
  | "showroom.read" | "showroom.write"
  | "verification.read" | "verification.write"
  | "billing.read" | "billing.write"
  | "reviews.read" | "reviews.respond"
  | "activity.read" | "settings.read" | "settings.write" | "support.write";

export type DealerWorkspaceState = {
  dealership_id: string;
  dealership_name: string;
  slug: string;
  role: DealerRole;
  permissions: DealerPermission[];
  account_status: "active" | "flagged" | "suspended" | "blocked";
  subscription_status: "payment_pending" | "active" | "past_due" | "grace_period" | "cancelled" | "expired";
  verification_status: "not_started" | "documents_required" | "submitted" | "under_review" | "changes_required" | "approved" | "rejected";
  showroom_status: "draft" | "ready" | "live" | "hidden";
  renewal_at?: string | null;
  grace_ends_at?: string | null;
  photo_limit: number;
  minimum_photos: number;
  staff_seat_limit: number;
  can_add_stock: boolean;
  can_publish_stock: boolean;
  can_manage_team: boolean;
  can_manage_billing: boolean;
  can_publish_marketing: boolean;
  can_receive_leads: boolean;
  alerts: DealerInsight[];
};

export type DealerProfile = {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  short_bio?: string | null;
  business_description?: string | null;
  physical_location?: string | null;
  contact_email?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  website_url?: string | null;
  trading_hours?: string | null;
  year_established?: number | null;
  is_public?: boolean;
  verification_status?: string;
  created_at?: string;
};

export type DealerSummary = {
  live_stock: number;
  draft_stock: number;
  pending_stock: number;
  reserved_stock: number;
  sold_30d: number;
  new_leads: number;
  overdue_followups: number;
  unread_messages: number;
  appointments_today: number;
  quotes_open: number;
  stock_views_30d: number;
  leads_30d: number;
  response_rate: number;
  avg_response_minutes: number | null;
  followers: number;
  active_statuses: number;
  profile_completion: number;
};

export type DealerInventoryItem = {
  id: string;
  stock_number?: string | null;
  title: string;
  city: string;
  rate?: string | null;
  price_amount?: number | null;
  photos?: string[] | null;
  vehicle_year?: number | null;
  brand?: string | null;
  model?: string | null;
  vehicle_type?: string | null;
  odometer_km?: number | null;
  stock_status: "available" | "reserved" | "sold";
  lifecycle_status: "draft" | "live" | "paused" | "expired" | "archived";
  moderation_status: "pending" | "approved" | "rejected" | "changes_required";
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
  views: number;
  saves: number;
  leads: number;
  search_appearances: number;
  days_in_stock: number;
  assigned_to?: string | null;
  completion_score: number;
  missing_fields: string[];
};

export type DealerLead = {
  id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  listing_id?: string | null;
  listing_title?: string | null;
  source: string;
  status: "new" | "contacted" | "qualified" | "viewing" | "negotiation" | "finance" | "won" | "lost";
  priority: "normal" | "high";
  assigned_to?: string | null;
  assigned_name?: string | null;
  budget_amount?: number | null;
  trade_in?: boolean;
  finance_required?: boolean;
  finance_status?: "not_required" | "documents_needed" | "submitted" | "under_review" | "approved" | "declined" | null;
  message?: string | null;
  next_follow_up_at?: string | null;
  last_activity_at?: string | null;
  lost_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
  activity_reason?: string | null;
};

export type DealerCustomer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  source: string;
  notes?: string | null;
  lead_count: number;
  quote_count: number;
  appointment_count: number;
  last_activity_at?: string | null;
  created_at: string;
  preferences?: string[];
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_make?: string | null;
  preferred_vehicle_type?: string | null;
};

export type DealerCustomerMatch = {
  id: string;
  title: string;
  city?: string | null;
  price_amount?: number | null;
  brand?: string | null;
  vehicle_type?: string | null;
  photos?: string[] | null;
  match_reasons: string[];
};

export type DealerMessageThread = {
  id: string;
  other_name: string;
  other_photo?: string | null;
  listing_id?: string | null;
  listing_title?: string | null;
  lead_id?: string | null;
  lead_status?: string | null;
  assigned_to?: string | null;
  preview?: string | null;
  unread_count: number;
  updated_at: string;
};

export type DealerThreadMessage = {
  id: string;
  sender_role: "buyer" | "owner";
  body: string;
  created_at: string;
  attachment_id?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
};

export type DealerInsight = {
  id: string;
  kind: "inventory" | "lead" | "marketing" | "billing" | "verification" | "team" | "sales";
  severity: "important" | "recommended" | "insight";
  title: string;
  message: string;
  action_label?: string | null;
  action_section?: DealerSection | null;
  entity_type?: string | null;
  entity_id?: string | null;
  created_at?: string;
};

export type DealerStatusType = "photo" | "video" | "vehicle" | "text" | "promotion";
export type DealerStatus = {
  id: string;
  content_type: DealerStatusType;
  title?: string | null;
  body?: string | null;
  media_url?: string | null;
  listing_id?: string | null;
  listing_title?: string | null;
  cta_label?: string | null;
  action_url?: string | null;
  starts_at: string;
  expires_at: string;
  moderation_status: string;
  publication_status: string;
  views: number;
  unique_viewers: number;
  completed_views: number;
  vehicle_opens: number;
  messages_generated: number;
};


export type DealerUpdate = {
  id: string;
  update_type: "new_stock" | "new_arrival" | "price_reduction" | "weekend_special" | "finance_offer" | "clearance" | "branch_announcement" | "trading_hours";
  title: string;
  body: string;
  image_url?: string | null;
  listing_id?: string | null;
  listing_title?: string | null;
  moderation_status: "pending" | "approved" | "removed";
  publication_status: "draft" | "scheduled" | "pending" | "published" | "expired" | "removed";
  moderation_reason?: string | null;
  scheduled_at?: string | null;
  published_at?: string | null;
  expires_at?: string | null;
  created_at: string;
};

export type DealerInventorySale = {
  id: string;
  listing_id: string;
  lead_id?: string | null;
  customer_id?: string | null;
  source: string;
  sale_price?: number | null;
  sold_at: string;
};

export type DealerCampaign = {
  id: string;
  title: string;
  campaign_type: string;
  status: "draft" | "scheduled" | "active" | "completed" | "cancelled";
  starts_at?: string | null;
  ends_at?: string | null;
  listing_ids: string[];
  views: number;
  leads: number;
  created_at: string;
};

export type DealerStaffMember = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  email?: string | null;
  role: DealerRole;
  is_active: boolean;
  last_active_at?: string | null;
  assigned_leads: number;
};

export type DealerInvitation = {
  id: string;
  invited_email: string;
  role: DealerRole;
  status: "pending" | "accepted" | "expired" | "revoked" | "declined";
  expires_at: string;
  created_at: string;
};

export type DealerActivityEvent = {
  id: string;
  actor_name?: string | null;
  action: string;
  entity_type: string;
  entity_label?: string | null;
  details?: string | null;
  created_at: string;
};

export type DealerQuote = {
  id: string;
  quote_number: string;
  lead_id?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  listing_id?: string | null;
  listing_title?: string | null;
  vehicle_price: number;
  fees_amount: number;
  extras_amount: number;
  trade_in_amount: number;
  total_amount: number;
  status: "draft" | "sent" | "accepted" | "declined" | "expired" | "cancelled";
  expires_at?: string | null;
  created_at: string;
};

export type DealerAppointment = {
  id: string;
  customer_name?: string | null;
  listing_title?: string | null;
  appointment_type: string;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  assigned_name?: string | null;
};

export type DealerAnalytics = {
  range_days: number;
  totals: {
    showroom_views: number;
    vehicle_views: number;
    search_appearances: number;
    saves: number;
    enquiries: number;
    leads: number;
    won: number;
    response_rate: number;
    avg_response_minutes: number | null;
    followers_gained: number;
  };
  lead_sources: Array<{ label: string; value: number }>;
  stock_performance: Array<{ id: string; title: string; views: number; saves: number; leads: number; days_in_stock: number }>;
  salesperson_performance: Array<{ user_id: string; name: string; leads: number; contacted: number; won: number; response_minutes: number | null }>;
  daily: Array<{ date: string; views: number; leads: number; status_views: number }>;
};

export type DealerVerificationDocument = {
  id?: string;
  document_type: "company_registration" | "tax" | "business_address" | "representative_authority";
  status: "missing" | "pending" | "under_review" | "changes_required" | "approved" | "rejected";
  reason?: string | null;
  version?: number;
  uploaded_at?: string | null;
  reviewed_at?: string | null;
};

export type DealerBilling = {
  plan_code: "dealer";
  amount_cents: number;
  currency: "ZAR";
  status: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  renews_at?: string | null;
  grace_ends_at?: string | null;
  auto_renew?: boolean;
  invoices: Array<{ id: string; invoice_number: string; amount_cents: number; status: string; issued_at: string; paid_at?: string | null }>;
};

export type DealerTradeIn = {
  id: string;
  lead_id?: string | null;
  customer_id?: string | null;
  make?: string | null;
  model?: string | null;
  vehicle_year?: number | null;
  mileage_km?: number | null;
  condition?: string | null;
  expected_amount?: number | null;
  registration_number?: string | null;
  notes?: string | null;
  status: "captured" | "reviewing" | "valued" | "accepted" | "declined";
  created_at: string;
};

export type DealerBranch = {
  id: string;
  name: string;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  trading_hours?: string | null;
  is_primary: boolean;
  is_active: boolean;
};

export type DealerSettings = {
  stock_age_warning_days: number;
  lead_response_warning_hours: number;
  notify_new_leads: boolean;
  notify_overdue_followups: boolean;
  notify_inventory_attention: boolean;
  notify_marketing_opportunities: boolean;
  notify_billing: boolean;
  default_lead_owner?: string | null;
  quote_valid_days: number;
  branches: DealerBranch[];
};

export type DealerSearchResult = {
  type: "vehicle" | "lead" | "customer" | "quote" | "message";
  id: string;
  title: string;
  detail?: string | null;
  section: DealerSection;
  href?: string | null;
};
