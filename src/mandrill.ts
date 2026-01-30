import axios from "axios";
import { config } from "./config.js";

const API_BASE = "https://mandrillapp.com/api/1.0";

interface RejectEntry {
  email: string;
  reason: string;
  detail: string;
  created_at: string;
  last_event_at: string;
  expires_at: string | null;
  expired: boolean;
  sender: {
    address: string;
    created_at: string;
    sent: number;
    hard_bounces: number;
    soft_bounces: number;
    rejects: number;
    complaints: number;
    unsubs: number;
    opens: number;
    clicks: number;
    unique_opens: number;
    unique_clicks: number;
  } | null;
  subaccount: string | null;
}

interface DeleteResult {
  deleted: boolean;
  email: string;
  subaccount: string | null;
}

interface MandrillError {
  status: "error";
  code: number;
  name: string;
  message: string;
}

async function apiCall<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
  const response = await axios.post<T>(`${API_BASE}${endpoint}`, {
    key: config.mandrillApiKey,
    ...data,
  });
  return response.data;
}

export async function checkEmail(email: string): Promise<RejectEntry[]> {
  return apiCall<RejectEntry[]>("/rejects/list.json", {
    email,
    include_expired: true,
  });
}

export async function deleteFromRejectList(email: string): Promise<DeleteResult> {
  return apiCall<DeleteResult>("/rejects/delete.json", { email });
}

export async function listAllRejects(): Promise<RejectEntry[]> {
  return apiCall<RejectEntry[]>("/rejects/list.json", {
    include_expired: false,
  });
}

export function formatRejectEntry(entry: RejectEntry): string {
  const lines = [
    `  Alasan: ${entry.reason}`,
    `  Detail: ${entry.detail || "-"}`,
    `  Tanggal: ${entry.created_at}`,
    `  Event Terakhir: ${entry.last_event_at}`,
    `  Expired: ${entry.expired ? "Ya" : "Tidak"}`,
  ];
  if (entry.expires_at) {
    lines.push(`  Expires: ${entry.expires_at}`);
  }
  return lines.join("\n");
}

export function isMandrillError(data: unknown): data is MandrillError {
  return typeof data === "object" && data !== null && "status" in data && (data as MandrillError).status === "error";
}

export type { RejectEntry, DeleteResult };
