/* Typed fetch client for the SolarHand API.
   - Bearer token is injected from a module-level holder (set by the auth store)
     to avoid a circular import between store and client.
   - Network failures surface as ApiError with status 0, so callers can tell
     "offline / unreachable" apart from a real HTTP rejection. */

import type {
  AnalysisResponse,
  AnalyzeRequest,
  AssetDetail,
  AssetRead,
  FaultReportRead,
  JobRead,
  ReadingRead,
  ReadingUpsert,
  RegisterRequest,
  RegisterResponse,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
  Token,
  UserRead,
} from "./types";

const BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");

let authToken: string | null = null;
export function setAuthToken(token: string | null): void {
  authToken = token;
}

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
  /** True when the request never reached the server (offline / DNS / CORS). */
  get isNetwork(): boolean {
    return this.status === 0;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Send as application/x-www-form-urlencoded (OAuth2 login). */
  form?: URLSearchParams;
  signal?: AbortSignal;
  auth?: boolean; // default true
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, form, signal, auth = true } = opts;
  const headers: Record<string, string> = {};
  if (auth && authToken) headers["Authorization"] = `Bearer ${authToken}`;

  let payload: BodyInit | undefined;
  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = form.toString();
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let resp: Response;
  try {
    resp = await fetch(`${BASE}${path}`, { method, headers, body: payload, signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "Network unavailable");
  }

  if (resp.status === 204) return undefined as T;

  const text = await resp.text();
  const data = text ? safeJson(text) : null;

  if (!resp.ok) {
    throw new ApiError(resp.status, extractDetail(data) ?? resp.statusText);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractDetail(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return typeof data === "string" ? data : null;
  }
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // FastAPI validation errors: [{ loc, msg, ... }]
    return detail
      .map((e) => (e && typeof e === "object" ? (e as { msg?: string }).msg : null))
      .filter(Boolean)
      .join("; ");
  }
  return null;
}

export const api = {
  base: BASE,

  // -- Auth ------------------------------------------------------------
  login(email: string, password: string): Promise<Token> {
    const form = new URLSearchParams({ username: email, password });
    return request<Token>("/auth/login", { method: "POST", form, auth: false });
  },
  register(payload: RegisterRequest): Promise<RegisterResponse> {
    return request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },
  me(signal?: AbortSignal): Promise<UserRead> {
    return request<UserRead>("/auth/me", { signal });
  },

  // -- Assets / jobs / readings / faults -------------------------------
  listAssets(): Promise<AssetRead[]> {
    return request<AssetRead[]>("/assets");
  },
  getAsset(id: string): Promise<AssetDetail> {
    return request<AssetDetail>(`/assets/${encodeURIComponent(id)}`);
  },
  listJobs(params: { mine?: boolean; status?: string; assetId?: string } = {}): Promise<
    JobRead[]
  > {
    const q = new URLSearchParams();
    if (params.mine) q.set("mine", "true");
    if (params.status) q.set("status", params.status);
    if (params.assetId) q.set("asset_id", params.assetId);
    const qs = q.toString();
    return request<JobRead[]>(`/jobs${qs ? `?${qs}` : ""}`);
  },
  getJob(id: string): Promise<JobRead> {
    return request<JobRead>(`/jobs/${encodeURIComponent(id)}`);
  },
  listReadings(assetId?: string): Promise<ReadingRead[]> {
    const qs = assetId ? `?asset_id=${encodeURIComponent(assetId)}` : "";
    return request<ReadingRead[]>(`/readings${qs}`);
  },
  createReading(payload: ReadingUpsert): Promise<ReadingRead> {
    return request<ReadingRead>("/readings", { method: "POST", body: payload });
  },
  listFaults(params: { assetId?: string; resolved?: boolean } = {}): Promise<
    FaultReportRead[]
  > {
    const q = new URLSearchParams();
    if (params.assetId) q.set("asset_id", params.assetId);
    if (params.resolved !== undefined) q.set("resolved", String(params.resolved));
    const qs = q.toString();
    return request<FaultReportRead[]>(`/faults${qs ? `?${qs}` : ""}`);
  },

  // -- Analytics (Digital Twin Lite) -----------------------------------
  analyzeAsset(assetId: string, payload: AnalyzeRequest): Promise<AnalysisResponse> {
    return request<AnalysisResponse>(
      `/analytics/assets/${encodeURIComponent(assetId)}`,
      { method: "POST", body: payload },
    );
  },

  // -- Offline sync ----------------------------------------------------
  syncPush(payload: SyncPushRequest): Promise<SyncPushResponse> {
    return request<SyncPushResponse>("/sync/push", { method: "POST", body: payload });
  },
  syncPull(since?: string): Promise<SyncPullResponse> {
    const qs = since ? `?since=${encodeURIComponent(since)}` : "";
    return request<SyncPullResponse>(`/sync/pull${qs}`);
  },
};
