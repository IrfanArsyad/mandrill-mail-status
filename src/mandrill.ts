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

const REASON_LABELS: Record<string, string> = {
  "hard-bounce": "Hard Bounce - Email tidak bisa dikirim (alamat tidak ada/tidak valid)",
  "soft-bounce": "Soft Bounce - Gagal sementara (mailbox penuh/server down)",
  "spam": "Spam Complaint - Penerima melaporkan email sebagai spam",
  "unsub": "Unsubscribe - Penerima berhenti berlangganan",
  "custom": "Manual - Ditambahkan secara manual ke reject list",
};

function parseSmtpDetail(detail: string): string {
  // Extract SMTP error code
  const codeMatch = detail.match(/(\d{3})[-\s](\d\.\d\.\d)/);
  const smtpCode = codeMatch ? `${codeMatch[1]} (${codeMatch[2]})` : null;

  // Clean up multi-line SMTP response
  const cleaned = detail
    .replace(/\s{2,}/g, " ")
    .replace(/\d{3}[-\s]\d\.\d\.\d\s*/g, "")
    .trim();

  const lines: string[] = [];
  if (smtpCode) lines.push(`  SMTP Code: ${smtpCode}`);
  if (cleaned) lines.push(`  Pesan: ${cleaned}`);
  return lines.join("\n");
}

export function formatRejectEntry(entry: RejectEntry): string {
  const reasonLabel = REASON_LABELS[entry.reason] ?? entry.reason;

  const lines = [
    ``,
    `--- Reject Info ---`,
    `Alasan  : ${reasonLabel}`,
  ];

  if (entry.detail) {
    lines.push(``, `--- SMTP Detail ---`);
    lines.push(parseSmtpDetail(entry.detail));
  }

  lines.push(
    ``,
    `--- Waktu ---`,
    `Ditambahkan  : ${entry.created_at}`,
    `Event Terakhir: ${entry.last_event_at}`,
  );

  if (entry.expires_at) {
    lines.push(`Auto-hapus   : ${entry.expires_at}`);
  }
  lines.push(`Status Expire: ${entry.expired ? "Sudah expired" : "Masih aktif (belum expired)"}`);

  if (entry.sender) {
    lines.push(
      ``,
      `--- Sender Stats ---`,
      `Sender   : ${entry.sender.address}`,
      `Terkirim : ${entry.sender.sent}`,
      `Bounce   : ${entry.sender.hard_bounces} hard, ${entry.sender.soft_bounces} soft`,
      `Rejects  : ${entry.sender.rejects}`,
      `Complaint: ${entry.sender.complaints}`,
    );
  }

  return lines.join("\n");
}

export function isMandrillError(data: unknown): data is MandrillError {
  return typeof data === "object" && data !== null && "status" in data && (data as MandrillError).status === "error";
}

export type { RejectEntry, DeleteResult };
