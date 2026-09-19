import { sbUpdate, pesapalToken, pesapalStatus, statusMap } from "./_lib.js";

export default async function handler(req, res) {
  /* Pesapal IPN: OrderTrackingId + OrderMerchantReference, then we confirm via status API */
  try {
    const b = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
    const tracking = b.OrderTrackingId || b.orderTrackingId || req.query.OrderTrackingId;
    const ref = b.OrderMerchantReference || b.order_no || req.query.order_no;
    if (tracking && ref) {
      const token = await pesapalToken();
      const t = await pesapalStatus(token, tracking);
      const status = statusMap[t.payment_status_description] || "pending_payment";
      try { await sbUpdate("orders", { "order_no": `eq.${ref}` }, { status, payment_ref: tracking }); } catch (e) {}
    }
  } catch (e) { console.warn("ipn handling:", e.message); }
  /* Pesapal expects a plain 200 acknowledgement */
  const order = req.body?.OrderMerchantReference || req.query?.order_no || "";
  res.status(200).send(order ? `OrderNotificationType=IPN&OrderTrackingId=${req.body?.OrderTrackingId || ""}&OrderMerchantReference=${order}` : "OK");
}
