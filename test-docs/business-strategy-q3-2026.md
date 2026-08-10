# Byto Commerce — Q3 2026 Business Strategy

**Document type:** Business  
**Owner:** Strategy Office  
**Status:** Draft for PM review  
**Last updated:** 2026-08-01  
**Audience:** Leadership, Product, Engineering leads

---

## 1. Executive summary

Byto Commerce will grow paid subscriptions and reduce checkout drop-off by making wallet payments a first-class experience across iOS and web. Q3 focus is **Apple Pay / Google Pay coverage**, clearer subscription controls, and faster support when payments fail.

**North-star outcome:** +12% completed checkouts vs Q2 baseline, with no increase in chargeback rate.

---

## 2. Company context

| Item | Detail |
|------|--------|
| Product | Byto Commerce mobile + web storefront |
| Primary markets | US, UK, UAE |
| Revenue model | Subscription + transaction fees |
| Current ARR (imaginary) | $4.2M |
| Active merchants | 1,840 |

We compete on speed-to-checkout and merchant tooling, not on lowest fees.

---

## 3. Q3 OKRs (imaginary)

### Objective A — Modernize checkout
- **KR1:** Ship Apple Pay on iOS for 100% of eligible merchants by Sep 15
- **KR2:** Reduce checkout abandonment from 41% → 34%
- **KR3:** Keep payment failure rate under 2.5%

### Objective B — Subscription clarity
- **KR1:** Launch pause / resume subscription from Profile
- **KR2:** Cut “billing confusion” support tickets by 25%
- **KR3:** NPS for billing flows ≥ 42

### Objective C — Knowledge & delivery quality
- **KR1:** All payment-related PRDs linked in CompanyBrain Knowledge
- **KR2:** Average request → Jira cycle time under 3 business days
- **KR3:** Zero P0 payment incidents lasting > 2 hours

---

## 4. Priority initiatives

1. **Wallet payments (P0)** — Apple Pay / Google Pay as default where device supports it.
2. **Subscription pause (P1)** — Self-serve pause up to 60 days without canceling.
3. **Failed payment recovery (P1)** — Auto-retry with backoff + clear in-app messaging.
4. **Merchant analytics (P2)** — Simple dashboard for conversion by payment method.

---

## 5. Business requirements (high level)

### BR-01 Wallet checkout
- Eligible users see Apple Pay / Google Pay before card form.
- Fallback to card must remain one tap away.
- Merchants can disable wallet methods per storefront.

### BR-02 Subscription pause
- User can pause from Profile → Subscription.
- Pause length options: 14, 30, or 60 days.
- Access to paid content freezes during pause; billing resumes automatically unless canceled.

### BR-03 Payment failure messaging
- On decline, show reason category (insufficient funds, expired card, bank decline).
- Offer update-card CTA and optional retry.
- Support agents see the same decline category in the ticket context.

---

## 6. Success metrics & constraints

**Success**
- Checkout conversion, subscription retention (D30), support ticket volume, payment success rate.

**Constraints**
- Must use existing Stripe integration patterns.
- No PCI scope expansion (no raw card storage).
- UAE market requires AED display; settlement still in USD where contracts require it.

**Out of scope for Q3**
- Cryptocurrency payments
- Buy-now-pay-later providers
- Native Android Google Pay beyond web fallback (tracked for Q4)

---

## 7. Stakeholders

| Role | Name (fictional) | Responsibility |
|------|------------------|----------------|
| Sponsor | Lena Ortiz, COO | Budget & priority calls |
| Product | Samir Haddad | PRDs & acceptance |
| Engineering | Priya Nair | Delivery & architecture |
| Support | Jordan Lee | Ticket themes & playbooks |
| Client pilot | Northwind Retail | Early wallet rollout feedback |

---

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Apple Pay entitlement delays | Medium | High | Start cert process week 1 |
| Stripe webhook gaps | Medium | High | Add replay tooling before launch |
| Support confusion on pause | Low | Medium | Publish help article + in-app copy review |
| Duplicate feature requests | High | Medium | Route all asks through CompanyBrain AI assistant |

---

## 9. Decision log (excerpt)

- **2026-07-18** — Approved wallet payments as Q3 P0 over BNPL.
- **2026-07-22** — Pause duration capped at 60 days (finance).
- **2026-07-29** — CompanyBrain Knowledge is source of truth for business docs used in AI analysis.

---

## 10. Appendix — Sample user stories

1. As a shopper on iPhone, I want to pay with Apple Pay so checkout takes under 10 seconds.
2. As a subscriber, I want to pause billing for a month without losing my plan settings.
3. As a merchant admin, I want to see conversion by payment method so I can decide which methods to promote.

---

*Imaginary test document for CompanyBrain Knowledge uploads. Not real company data.*
