import { sbUpdate, pesapalToken, pesapalStatus, statusMap } from "./_lib.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { orderTrackingId, order_no } = req.query;
    if (!orderTrackingId || !order_no) return res.status(400).json({ error: "orderTrackingId and order_no required" });
    if (!process.env.PESAPAL_CONSUMER_KEY) return res.status(503).json({ error: "payment gateway not configured" });
    const token = await pesapalToken();
    const t = await pesapalStatus(token, orderTrackingId);
    const status = statusMap[t.payment_status_description] || "pending_payment";
    try {
      await sbUpdate("orders", { "order_no": `eq.${order_no}` }, { status, payment_method: t.payment_method || "pesapal" });
    } catch (e) { console.warn("status update failed:", e.message); }
    res.status(200).json({ status, description: t.payment_status_description || null });
  } catch (e) {
    console.error("pesapal-status:", e.message);
    res.status(502).json({ error: e.message });
  }
}
