# Dodo Payments Fix — Task Tracker

## Decisions locked in
- Package pricing: 3 dedicated Dodo products (DONE — created via API)
- Webhook: generated via API (DONE)
- BNPL providers: Klarna, Affirm, Afterpay/Clearpay
- 30/60 day tiles: relabel to real Dodo BNPL provider terms
- Product IDs: Lawrence will paste as he creates each of remaining 14

## Dodo resources created this session
- Starter product: pdt_0NiH7alQMWrN8ppKIroyx ($49.00)
- Premium product: pdt_0NiH7ar4uNo47MUVHUEuG ($79.00)
- Elite product: pdt_0NiH7axwxzloQrqGXVZWt ($125.00)
- Webhook endpoint id: ep_3FvORHOwZzq5QlN2JSqnZ7sOvbe -> https://ghaafeedimusic.com/api/dodo/webhook
- Webhook secret: whsec_LlI3XQ1w/Kjy3XvH4F3a5o0qe8q8O0Tm
- Webhook filter_types: payment.succeeded, payment.failed, payment.cancelled, refund.succeeded, dispute.opened
- standardwebhooks npm package added to packages/web/package.json

## Remaining work
- [ ] Fix DODO_MODE/DODO_API_KEY trailing whitespace bug (.trim() defensively in code)
- [ ] Update DODO_PRODUCT_MAP: map starter/premium/elite package IDs to new Dodo product IDs
- [ ] Fix checkout-session route: use real product ID + real amount for packages (no more hardcoded fallback)
- [ ] Add allowed_payment_method_types passthrough based on payNowMethod / bnplOption selection
- [ ] Relabel BNPL tiles: buynow4->afterpay_clearpay/klarna "Pay in 4", monthly->affirm, pay30/pay60 -> map to real installment schedule from Klarna/Affirm (need to decide exact wording)
- [ ] Webhook: verify signature via standardwebhooks + DODO_WEBHOOK_SECRET
- [ ] Webhook: insert order into orders table on payment.succeeded (schema already exists)
- [ ] New endpoint: GET /api/dodo/order-status?sessionId= for client polling
- [ ] Onboarding.tsx: wire poller to call new order-status endpoint instead of dead localStorage flag; call s9PersistOrder() on confirmed success
- [ ] Typecheck 0 errors
- [ ] Tell Lawrence: add DODO_WEBHOOK_SECRET env var on Render (value above)
- [ ] Commit + push
- [ ] Verify end to end (as much as possible without a live browser payment)

## Payment method type mapping (Dodo real values)
card -> credit/debit card (default, no special type needed)
apple -> apple_pay
google -> google_pay
paypal -> NOT confirmed supported by Dodo — need fallback (may need to hide or verify)
bank -> ach / bank transfer type TBD
crypto -> NOT confirmed - may not be Dodo native, may need to hide

BNPL real types confirmed from docs: klarna, afterpay_clearpay, affirm (implied), cashapp, upi_collect
