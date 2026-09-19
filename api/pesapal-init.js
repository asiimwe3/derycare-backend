import { sbSelect, sbUpdate, pesapalToken, PESAPAL_BASE } from "./_lib.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { order_no, return_url } = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
    if (!order_no) return res.status(400).json({ error: "order_no required" });
    const rows = await sbSelect("derycare_orders", { "order_no": `eq.${order_no}` });
    const order = rows && rows[0];
    if (!order) return res.status(404).json({ error: "order not found" });
    if (!process.env.PESAPAL_CONSUMER_KEY) return res.status(503).json({ error: "payment gateway not configured" });

    const token = await pesapalToken();
    /* register IPN (idempotent per deployment; Pesapal tolerates repeated registrations) */
    const ipnRes = await fetch(`${PESAPAL_BASE}/api/URLSetup/RegisterIPN`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        url: `${process.env.DERYCARE_API_URL || "https://derycare.vercel.app"}/api/pesapal-ipn`,
        ipn_notification_type: "POST"
      })
    });
    const ipn = await ipnRes.json().catch(() => ({}));
    if (!ipn.ipn_id) throw new Error(ipn.error?.message || "IPN registration failed");

    const submitRes = await fetch(`${PESAPAL_BASE}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        id: order_no,
        currency: "UGX",
        amount: Number(order.total),
        description: `DeryCare order ${order_no}`,
        callback_url: return_url,
        notification_id: ipn.ipn_id,
        first_name: (order.customer_name || "Customer").split(" ")[0],
        last_name: (order.customer_name || "Customer").split(" ").slice(1).join(" ") || "-",
        email_address: order.email || "orders@derycode.online",
        phone_number: order.phone || undefined,
        billing_address: { address_1: order.address || "Uganda", city: order.zone || "Kampala", country: "UG", first_name: order.customer_name || "Customer" }
      })
    });
    const pay = await submitRes.json().catch(() => ({}));
    if (!pay.redirect_url) throw new Error(pay.error?.message || "Pesapal order submission failed");

    try {
      await sbUpdate("derycare_orders", { "order_no": `eq.${order_no}` },
        { status: "awaiting_payment", payment_ref: pay.order_tracking_id || null });
    } catch (e) { console.warn("could not persist payment ref:", e.message); }

    res.status(200).json({ redirect_url: pay.redirect_url, order_tracking_id: pay.order_tracking_id });
  } catch (e) {
    console.error("pesapal-init:", e.message);
    res.status(502).json({ error: e.message });
  }
}
