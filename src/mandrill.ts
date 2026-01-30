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

interface MessageEntry {
  ts: number;
  _id: string;
  sender: string;
  template: string | null;
  subject: string;
  email: string;
  tags: string[];
  opens: number;
  opens_detail: { ts: number; ip: string; location: string; ua: string }[];
  clicks: number;
  clicks_detail: { ts: number; ip: string; location: string; ua: string; url: string }[];
  state: string;
  metadata: Record<string, string>;
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

export async function searchMessages(email: string, limit = 5): Promise<MessageEntry[]> {
  return apiCall<MessageEntry[]>("/messages/search.json", {
    query: `full_email:${email}`,
    limit,
  });
}

export async function listAllRejects(): Promise<RejectEntry[]> {
  return apiCall<RejectEntry[]>("/rejects/list.json", {
    include_expired: false,
  });
}

const REASON_LABELS: Record<string, string> = {
  "hard-bounce": "Hard Bounce - Email address does not exist or is invalid",
  "soft-bounce": "Soft Bounce - Temporary failure (mailbox full/server down)",
  "spam": "Spam Complaint - Recipient reported the email as spam",
  "unsub": "Unsubscribe - Recipient unsubscribed",
  "custom": "Manual - Manually added to reject list",
};

function parseSmtpDetail(detail: string): string {
  const codeMatch = detail.match(/(\d{3})[-\s](\d\.\d\.\d)/);
  const smtpCode = codeMatch ? `${codeMatch[1]} (${codeMatch[2]})` : null;

  const cleaned = detail
    .replace(/\s{2,}/g, " ")
    .replace(/\d{3}[-\s]\d\.\d\.\d\s*/g, "")
    .trim();

  const lines: string[] = [];
  if (smtpCode) lines.push(`  SMTP Code: ${smtpCode}`);
  if (cleaned) lines.push(`  Message: ${cleaned}`);
  return lines.join("\n");
}

export function formatRejectEntry(entry: RejectEntry): string {
  const reasonLabel = REASON_LABELS[entry.reason] ?? entry.reason;

  const lines = [
    ``,
    `--- Reject Info ---`,
    `Reason  : ${reasonLabel}`,
  ];

  if (entry.detail) {
    lines.push(``, `--- SMTP Detail ---`);
    lines.push(parseSmtpDetail(entry.detail));
  }

  lines.push(
    ``,
    `--- Timestamp ---`,
    `Added     : ${entry.created_at}`,
    `Last Event: ${entry.last_event_at}`,
  );

  if (entry.expires_at) {
    lines.push(`Auto-remove: ${entry.expires_at}`);
  }
  lines.push(`Expired    : ${entry.expired ? "Yes" : "No (still active)"}`);

  if (entry.sender) {
    lines.push(
      ``,
      `--- Sender Stats ---`,
      `Sender    : ${entry.sender.address}`,
      `Sent      : ${entry.sender.sent}`,
      `Bounces   : ${entry.sender.hard_bounces} hard, ${entry.sender.soft_bounces} soft`,
      `Rejects   : ${entry.sender.rejects}`,
      `Complaints: ${entry.sender.complaints}`,
    );
  }

  return lines.join("\n");
}

const STATE_LABELS: Record<string, string> = {
  sent: "Sent",
  bounced: "Bounced",
  rejected: "Rejected",
  spam: "SPAM",
  unsub: "Unsubscribed",
  deferred: "Deferred",
  queued: "Queued",
};

export function formatMessageHistory(messages: MessageEntry[]): string {
  if (messages.length === 0) {
    return "\n--- Send History ---\nNo send history found.";
  }

  const lines = [
    ``,
    `--- Send History (last ${messages.length}) ---`,
  ];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const date = new Date(msg.ts * 1000).toISOString().replace("T", " ").substring(0, 19);
    const state = STATE_LABELS[msg.state] ?? msg.state;
    const spam = msg.state === "spam" ? " << SPAM REPORT" : "";
    const subject = msg.subject || "(no subject)";

    lines.push(
      `${i + 1}. ${date}`,
      `   Subject: ${subject}`,
      `   Status : ${state}${spam}`,
      `   Opens  : ${msg.opens} | Clicks: ${msg.clicks}`,
      `   Sender : ${msg.sender}`,
    );
  }

  const spamCount = messages.filter((m) => m.state === "spam").length;
  if (spamCount > 0) {
    lines.push(``, `!! ${spamCount} of ${messages.length} emails reported as SPAM`);
  }

  return lines.join("\n");
}

export function isMandrillError(data: unknown): data is MandrillError {
  return typeof data === "object" && data !== null && "status" in data && (data as MandrillError).status === "error";
}

export type { RejectEntry, DeleteResult, MessageEntry };
