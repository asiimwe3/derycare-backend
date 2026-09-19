/* Shared helpers: Supabase (service role) + Pesapal */
export const SUPABASE_URL = process.env.SUPABASE_URL || "https://emldbjqegftrngxypeca.supabase.co";
export const SB = process.env.SUPABASE_SERVICE_ROLE;
const env = (process.env.PESAPAL_ENV || "demo").toLowerCase();
export const PESAPAL_BASE = (env === "live" || env === "production")
  ? "https://pay.pesapal.com" : "https://cybqa.pesapal.com";
const FT = { signal: AbortSignal.timeout(20000) };

export async function sbSelect(table, filters) {
  if (!SB) throw new Error("SUPABASE_SERVICE_ROLE not configured");
  const q = new URLSearchParams(filters).toString();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
    headers: { apikey: SB, Authorization: `Bearer ${SB}`, Accept: "application/json" }, ...FT
  });
  if (!r.ok) throw new Error(`Supabase select ${table}: ${r.status}`);
  return r.json();
}
export async function sbUpdate(table, filters, data) {
  if (!SB) throw new Error("SUPABASE_SERVICE_ROLE not configured");
  const q = new URLSearchParams(filters).toString();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
    method: "PATCH",
    headers: { apikey: SB, Authorization: `Bearer ${SB}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(data), ...FT
  });
  if (!r.ok) throw new Error(`Supabase update ${table}: ${r.status}`);
}
export async function pesapalToken() {
  const r = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: process.env.PESAPAL_CONSUMER_KEY, consumer_secret: process.env.PESAPAL_CONSUMER_SECRET }), ...FT
  });
  const d = await r.json().catch(() => ({}));
  if (!d.token) throw new Error(d.error?.message || "Pesapal auth failed");
  return d.token;
}
export async function pesapalStatus(token, orderTrackingId) {
  const r = await fetch(`${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, ...FT
  });
  return r.json();
}
export const statusMap = {
  COMPLETED: "paid", PENDING: "pending_payment", INVALID: "failed",
  IN_PROGRESS: "pending_payment", FAILED: "failed", CANCELLED: "cancelled", REVERSED: "refunded"
};
