const API_BASE = "/api";

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API Error ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Status ───────────────────────────────────────────────
export interface BotStatusResponse {
  status: "DISCONNECTED" | "QR_READY" | "CONNECTED" | "CONNECTING";
  qrCode: string | null;
}

export function getStatus(): Promise<BotStatusResponse> {
  return apiFetch<BotStatusResponse>("/status");
}

export function restartBot(): Promise<{ message: string }> {
  return apiFetch("/bot/restart", { method: "POST" });
}

export function logoutBot(): Promise<{ message: string }> {
  return apiFetch("/bot/logout", { method: "POST" });
}

// ─── Webhooks ─────────────────────────────────────────────
export interface Webhook {
  id: string;
  groupJid: string;
  groupName: string;
  targetUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getWebhooks(): Promise<Webhook[]> {
  return apiFetch<Webhook[]>("/webhooks");
}

export function createWebhook(
  data: Pick<Webhook, "groupJid" | "groupName" | "targetUrl"> & {
    isActive?: boolean;
  }
): Promise<Webhook> {
  return apiFetch<Webhook>("/webhooks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateWebhook(
  id: string,
  data: Partial<Pick<Webhook, "groupName" | "targetUrl" | "isActive">>
): Promise<Webhook> {
  return apiFetch<Webhook>(`/webhooks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteWebhook(id: string): Promise<Webhook> {
  return apiFetch<Webhook>(`/webhooks/${id}`, { method: "DELETE" });
}

// ─── Groups ───────────────────────────────────────────────
export interface WAGroup {
  id: string;
  subject: string;
  participants: number;
}

export function getGroups(): Promise<WAGroup[]> {
  return apiFetch<WAGroup[]>("/groups");
}

// ─── System Logs ──────────────────────────────────────────
export interface SystemLog {
  id: string;
  level: "INFO" | "ERROR" | "WARNING";
  message: string;
  createdAt: string;
}

export function getLogs(limit = 100): Promise<SystemLog[]> {
  return apiFetch<SystemLog[]>(`/logs?limit=${limit}`);
}

export function clearLogs(): Promise<{ count: number }> {
  return apiFetch<{ count: number }>("/logs", { method: "DELETE" });
}
