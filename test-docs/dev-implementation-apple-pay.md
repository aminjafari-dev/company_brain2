# Development Implementation — Apple Pay Checkout (iOS)

**Document type:** Engineering / Implementation  
**Related business doc:** `business-strategy-q3-2026.md` (BR-01)  
**Feature request (imaginary):** REQ-2048 — Add Apple Pay to checkout  
**Status:** Ready for development planning  
**Owner:** Priya Nair (Eng)  
**Estimate:** 8–12 engineer-days  
**Last updated:** 2026-08-05

---

## 1. Goal

Enable Apple Pay on the Byto Commerce iOS checkout so eligible users can complete payment without entering card details, using the existing Stripe Payment Sheet / Apple Pay flow.

---

## 2. Scope

### In scope
- Detect Apple Pay capability on device
- Present Apple Pay as primary CTA when supported
- Create PaymentIntent with wallet method types
- Confirm payment and navigate to order success
- Surface decline / cancel states in UI
- Feature flag: `checkout.apple_pay.enabled`
- Merchant setting: enable/disable Apple Pay per storefront

### Out of scope
- Google Pay (separate ticket)
- WatchOS / App Clip
- Changing Stripe account or fee structure
- Server-side order fulfillment redesign

---

## 3. Current architecture (imaginary)

```
[Flutter iOS App]
    └── PaymentManager (stripe_flutter)
          └── Stripe Payment Sheet
                └── Backend /payments/intent  → Stripe API
                      └── Webhooks → OrderService
```

Relevant modules (fictional paths aligned with demo codebase):
- `lib/payments/payment_manager.dart` — Stripe init & Apple Pay support check
- `lib/checkout/checkout_screen.dart` — CTA ordering & loading states
- `lib/checkout/widgets/wallet_pay_button.dart` — new
- `server/routes/payments.ts` — PaymentIntent creation
- `server/webhooks/stripe.ts` — `payment_intent.succeeded` / `failed`

---

## 4. Acceptance criteria

- [ ] AC1: If `Stripe.instance.isApplePaySupported()` is true and merchant flag is on, Apple Pay button appears above card form.
- [ ] AC2: Tapping Apple Pay opens native sheet; cancel returns user to checkout with no charge.
- [ ] AC3: Successful payment marks order `paid`, shows success screen, and emits analytics `checkout_completed` with `method=apple_pay`.
- [ ] AC4: Declined payment shows category message (e.g. insufficient funds) and keeps cart intact.
- [ ] AC5: When Apple Pay unsupported or flag off, UI matches current card-only checkout.
- [ ] AC6: Webhook idempotency key prevents double-fulfillment on retries.
- [ ] AC7: Unit + widget tests cover support-check branching and cancel path.

---

## 5. Implementation plan

### Phase A — Backend (2–3 days)

| Seq | Component | Task | Effort |
|-----|-----------|------|--------|
| A1 | `payments` API | Accept `payment_method_types` including `card` + `apple_pay` (via Payment Sheet) | Medium |
| A2 | PaymentIntent | Set currency, amount, `metadata.order_id`, `metadata.storefront_id` | Low |
| A3 | Webhooks | Confirm idempotent fulfill on `payment_intent.succeeded` | Medium |
| A4 | Merchant config | Persist `apple_pay_enabled` on storefront settings | Low |

### Phase B — Mobile (4–5 days)

| Seq | Component | Task | Effort |
|-----|-----------|------|--------|
| B1 | `PaymentManager` | Expose `isApplePayAvailable()` wrapping Stripe support API | Low |
| B2 | Feature flag | Gate UI on remote config + merchant setting | Low |
| B3 | `WalletPayButton` | New button component; primary when available | Medium |
| B4 | Checkout flow | Create intent → present sheet → handle result | High |
| B5 | Error UX | Map Stripe error codes to user-facing copy | Medium |
| B6 | Analytics | Track shown / tapped / canceled / succeeded | Low |

### Phase C — QA & rollout (2–3 days)

| Seq | Component | Task | Effort |
|-----|-----------|------|--------|
| C1 | Test plan | Device matrix: iPhone 12+, iOS 16–18, Sandbox Apple Pay | Medium |
| C2 | Staging | Enable flag for Northwind Retail pilot only | Low |
| C3 | Monitoring | Dashboard: success rate, cancel rate, decline reasons | Medium |
| C4 | Rollout | 10% → 50% → 100% after 48h stable metrics | Medium |

---

## 6. API sketch

### `POST /v1/payments/intent`

```json
{
  "orderId": "ord_9f2a",
  "storefrontId": "sf_northwind",
  "amount": 4599,
  "currency": "usd",
  "walletPreferred": true
}
```

### Response

```json
{
  "clientSecret": "pi_xxx_secret_yyy",
  "publishableKey": "pk_test_...",
  "applePayEligible": true
}
```

### Webhook handling notes
- Key events: `payment_intent.succeeded`, `payment_intent.payment_failed`
- Idempotency: store `stripe_event_id` unique constraint
- On success: set order status `paid`, enqueue fulfillment job

---

## 7. Data & config changes

```sql
-- Imaginary migration
ALTER TABLE storefronts
  ADD COLUMN apple_pay_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS ux_stripe_events_id
  ON stripe_webhook_events (stripe_event_id);
```

Remote config keys:
- `checkout.apple_pay.enabled` (boolean)
- `checkout.apple_pay.min_ios_version` (string, e.g. `"16.0"`)

---

## 8. Security & compliance

- Do not log full PaymentIntent client secrets.
- Keep Apple Merchant ID in secure env / CI secrets.
- No change to PCI scope: card data stays with Stripe / Apple.
- Validate webhook signatures before mutating orders.

---

## 9. Test cases

| ID | Case | Expected |
|----|------|----------|
| T1 | Supported device + flag on | Apple Pay CTA visible |
| T2 | Unsupported device | Card form only |
| T3 | User cancels sheet | No charge; checkout unchanged |
| T4 | Successful sandbox pay | Order `paid`; success screen |
| T5 | Decline | Error banner; retry allowed |
| T6 | Duplicate webhook | Single fulfillment |
| T7 | Merchant disables Apple Pay | CTA hidden even if device supports |

---

## 10. Jira breakdown (suggested)

1. `KAN-1101` — Backend PaymentIntent + metadata  
2. `KAN-1102` — Storefront `apple_pay_enabled` setting  
3. `KAN-1103` — Flutter PaymentManager Apple Pay gate  
4. `KAN-1104` — Checkout WalletPayButton + flow  
5. `KAN-1105` — Webhook idempotency + monitoring  
6. `KAN-1106` — QA matrix & staged rollout  

---

## 11. Rollout checklist

- [ ] Apple Merchant ID created and verified
- [ ] Stripe Apple Pay enabled in dashboard (test + live)
- [ ] Feature flag default **off** in production
- [ ] Pilot merchant (Northwind) enabled
- [ ] Support playbook updated for wallet declines
- [ ] Knowledge doc linked from feature request in CompanyBrain

---

## 12. Open questions

1. Should Apple Pay appear on subscription renewals or checkout only for Q3?
2. Do we require billing address collection for high-risk merchants?
3. Is AED storefront display enough, or do we need local acquiring for UAE later?

---

*Imaginary test document for CompanyBrain Knowledge uploads. Not real implementation.*
