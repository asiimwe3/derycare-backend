# DeryCare Backend API

Serverless API for the DeryCare marketplace (asiimwe3.github.io/derycare). Powered by DeryCode technology.

## Endpoints
- GET /api/health — {ok:true}
- POST /api/pesapal-init — {order_no, return_url} → {redirect_url}. Reads the order from Supabase, then creates a Pesapal payment request (UGX).
- GET /api/pesapal-status?orderTrackingId=&order_no= — polls Pesapal, updates the order, returns {status: paid|pending_payment|failed|cancelled|refunded}
- POST /api/pesapal-ipn — Pesapal Instant Payment Notification receiver; confirms via status API and updates the order.

## Environment variables (Vercel project "derycare")
- PESAPAL_ENV — "demo" (cybqa.pesapal.com) or "production" (pay.pesapal.com)
- PESAPAL_CONSUMER_KEY / PESAPAL_CONSUMER_SECRET — from the Pesapal dashboard
- SUPABASE_URL — https://upjmzobjnpeldiubuopk.supabase.co
- SUPABASE_SERVICE_ROLE — DeryCare project service_role key (Settings → API in Supabase)
- DERYCARE_API_URL — public URL of this deployment (https://derycare.vercel.app)

## Supabase tables
- orders (order_no, customer_name, phone, email, address, zone, notes, items jsonb, subtotal, delivery_fee, total, status, source, payment_ref, payment_method)
- bookings (booking_no, service, customer_name, phone, location, preferred_date, notes)
- RLS: anon may INSERT only; service_role full access.

© 2026 DeryCare
