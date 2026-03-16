export type TrialPhase = "Phase I" | "Phase II" | "Phase III" | "Phase IV";
export type TrialStatus = "planning" | "active" | "completed" | "suspended";
export type SiteStatus = "pending" | "active" | "closed";
export type KitStatus = "available" | "low_stock" | "expired" | "depleted";
export type ShipmentStatus =
  | "preparing"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "cancelled";
export type AlertType =
  | "expiry_warning"
  | "low_stock"
  | "overstock"
  | "shipment_delayed"
  | "high_wastage";
export type AlertSeverity = "info" | "warning" | "critical";

export interface Trial {
  id: string;
  trial_name: string;
  trial_phase: TrialPhase;
  status: TrialStatus | null;
  start_date: string;
  end_date?: string | null;
  description?: string | null;
  sponsor?: string | null;
  protocol_number?: string | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface Site {
  id: string;
  trial_id: string;
  site_name: string;
  location: string;
  country: string;
  activation_date: string;
  patient_capacity: number;
  enrolled_patients: number | null;
  samples_per_patient: number | null;
  coordinator_name?: string | null;
  coordinator_email?: string | null;
  status: SiteStatus | null;
  trial?: Trial;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface Kit {
  id: string;
  kit_type: string;
  lot_number: string;
  manufacturing_date: string;
  expiry_date: string;
  quantity: number;
  unit_cost?: string | null;
  storage_requirements?: string | null;
  status: KitStatus | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface Shipment {
  id: string;
  site_id: string;
  kit_id: string;
  quantity: number;
  shipment_date: string;
  expected_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  tracking_number?: string | null;
  status: ShipmentStatus | null;
  notes?: string | null;
  site?: Site;
  kit?: Kit;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface KitUsage {
  id: string;
  site_id: string;
  kit_id: string;
  kits_used: number;
  kits_returned: number | null;
  kits_wasted: number | null;
  usage_date: string;
  patient_count?: number | null;
  notes?: string | null;
  reported_by?: string | null;
  site?: Site;
  kit?: Kit;
  created_at?: Date | null;
}

export interface DemandForecast {
  id: string;
  site_id: string;
  kit_type: string;
  forecast_date: string;
  predicted_demand: number;
  safety_stock: number;
  recommended_qty: number;
  confidence_score?: string | null;
  model_version?: string | null;
  months_ahead?: number | null;
  created_at?: Date | null;
}

export interface Alert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  entity_type?: string | null;
  entity_id?: string | null;
  message: string;
  is_resolved: boolean | null;
  resolved_at?: Date | null;
  created_at?: Date | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { total: number; page: number; limit: number };
}

export interface DashboardSummary {
  total_shipped: number;
  total_used: number;
  total_wasted: number;
  wastage_pct: number;
  shipped_trend: number;
  used_trend: number;
  wastage_trend: number;
  wastage_pct_trend: number;
  monthly_wastage: MonthlyWastage[];
  expiry_buckets: ExpiryBucket[];
  site_usage: SiteUsageSummary[];
  recent_alerts: Alert[];
  active_trials: number;
  active_sites: number;
  kits_expiring_30: number;
  kits_expiring_60: number;
}

export interface MonthlyWastage {
  month: string;
  shipped: number;
  used: number;
  wasted: number;
}

export interface ExpiryBucket {
  range: string;
  count: number;
  quantity: number;
}

export interface SiteUsageSummary {
  site_id: string;
  site_name: string;
  location: string;
  kits_shipped: number;
  kits_used: number;
  kits_wasted: number;
  wastage_pct: number;
}

export interface ForecastResult {
  predicted_demand: number;
  safety_stock: number;
  recommended_qty: number;
  confidence_score: number;
  method: string;
}
