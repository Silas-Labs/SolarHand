/* Domain types — mirror of the backend Pydantic schemas (app/schemas.py).
   Kept deliberately close to the server contract so the API client is typed
   against reality, not guesses. */

export type Role = "admin" | "technician";
export type AssetStatus = "active" | "inactive" | "maintenance";
export type JobType =
  | "install"
  | "inspection"
  | "repair"
  | "cleaning"
  | "commissioning";
export type JobStatus = "pending" | "in_progress" | "done" | "cancelled";
export type JobPriority = "low" | "normal" | "high" | "urgent";
export type ComponentKind =
  | "module"
  | "inverter"
  | "battery"
  | "charge_controller"
  | "other";
export type RatingUnit = "Wp" | "kVA" | "kWh" | "A" | "V";
export type FaultCategory =
  | "soiling"
  | "shading"
  | "string_outage"
  | "inverter_fault"
  | "clipping"
  | "wiring"
  | "other";
export type FaultSeverity = "info" | "warning" | "critical";
export type FaultSource = "technician" | "system";
export type AnalyticsSeverity =
  | "healthy"
  | "minor"
  | "moderate"
  | "severe"
  | "anomalous"
  | "unknown";

export interface Token {
  access_token: string;
  token_type: string;
}

export interface CompanyRead {
  id: string;
  name: string;
  epra_contractor_license: string | null;
  county: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRead {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  company_id: string | null;
  epra_technician_license: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RegisterRequest {
  company: {
    name: string;
    epra_contractor_license?: string | null;
    county?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
  };
  admin: {
    email: string;
    full_name: string;
    password: string;
    epra_technician_license?: string | null;
  };
}

export interface RegisterResponse {
  access_token: string;
  token_type: string;
  company: CompanyRead;
  user: UserRead;
}

export interface ComponentRead {
  id: string;
  asset_id: string;
  kind: ComponentKind;
  make: string | null;
  model: string | null;
  rating_value: number | null;
  rating_unit: RatingUnit | null;
  quantity: number;
  serial_number: string | null;
  created_at: string;
}

export interface AssetRead {
  id: string;
  company_id: string;
  customer_name: string;
  customer_phone: string | null;
  location_name: string;
  county: string | null;
  latitude: number;
  longitude: number;
  tilt_deg: number;
  azimuth_deg: number;
  system_kwp: number;
  inverter_kva: number | null;
  battery_kwh: number | null;
  module_type: string | null;
  install_date: string | null;
  status: AssetStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client_updated_at: string | null;
}

export interface AssetDetail extends AssetRead {
  components: ComponentRead[];
}

export interface JobRead {
  id: string;
  asset_id: string;
  assigned_to: string | null;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  client_updated_at: string | null;
}

export interface JobUpsert {
  id?: string;
  asset_id: string;
  assigned_to?: string | null;
  type: JobType;
  status?: JobStatus;
  priority?: JobPriority;
  title: string;
  description?: string | null;
  scheduled_date?: string | null;
  completed_at?: string | null;
  client_updated_at?: string | null;
}

export interface ReadingRead {
  id: string;
  asset_id: string;
  job_id: string | null;
  reading_date: string;
  energy_kwh: number;
  period_days: number;
  meter_value: number | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  client_updated_at: string | null;
}

export interface ReadingUpsert {
  id?: string;
  asset_id: string;
  job_id?: string | null;
  reading_date: string;
  energy_kwh: number;
  period_days?: number;
  meter_value?: number | null;
  notes?: string | null;
  client_updated_at?: string | null;
}

export interface FaultReportRead {
  id: string;
  asset_id: string;
  job_id: string | null;
  reading_id: string | null;
  category: FaultCategory;
  severity: FaultSeverity;
  source: FaultSource;
  description: string | null;
  resolved: boolean;
  created_at: string;
}

export interface FaultReportUpsert {
  id?: string;
  asset_id: string;
  job_id?: string | null;
  reading_id?: string | null;
  category: FaultCategory;
  severity?: FaultSeverity;
  source?: FaultSource;
  description?: string | null;
}

export interface AnalyzeRequest {
  energy_kwh: number;
  reading_date: string;
  period_days?: number;
  persist_fault?: boolean;
}

export interface AnalysisResponse {
  asset_id: string;
  reading_id: string | null;
  severity: AnalyticsSeverity;
  summary: string;
  health_ratio: number | null;
  performance_ratio_iec: number | null;
  actual_kwh: number;
  expected_ac_kwh: number;
  expected_dc_ideal_kwh: number;
  reference_yield_hours: number;
  poa_insolation_kwh_m2: number;
  sample_count: number;
  window_start: string | null;
  window_end: string | null;
  likely_causes: string[];
  fault_id: string | null;
}

export interface SyncItemResult {
  entity: string;
  id: string;
  action: "created" | "updated" | "skipped" | "error";
  detail: string | null;
}

export interface SyncPushRequest {
  assets: unknown[];
  jobs: unknown[];
  readings: unknown[];
  faults: unknown[];
}

export interface SyncPushResponse {
  server_time: string;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  results: SyncItemResult[];
}

export interface SyncPullResponse {
  server_time: string;
  assets: AssetRead[];
  jobs: JobRead[];
  readings: ReadingRead[];
  faults: FaultReportRead[];
}
