# Payments Page — Gap Analysis

_Scope: the admin **Payment Verification** page (`src/pages/orders/PaymentVerification.tsx`) and the backend it depends on. Date: 2026-05-31._

## How payments work today

The platform uses a **two-stage** payment model:

- **Stage 10** — a 10% advance. Created automatically at checkout (`createStage10`) with status `PENDING`, a UPI link, a transaction reference (`tr`), and a **24-hour expiry**.
- **Stage 90** — the 90% balance. Created automatically when an order moves **SHIPPED → DELIVERED** (`createStage90`), and is written straight to status `VERIFIED` — there is no actual collection step.

The Payments page lists orders in `PENDING` status (`GET /admin/payments/pending` → `AdminService.listPendingPayments`) and lets an admin **Verify**, which posts `POST /orders/{id}/status {status: CONFIRMED}`. That single call runs `verifyStage10` (marks the Stage-10 payment `VERIFIED`) **and** transitions the order to `CONFIRMED`. A background cron (`processHourlyExpiry`) auto-cancels any `PENDING` order whose Stage-10 payment passes its 24h expiry.

So the page today covers exactly one thing: **verifying the 10% advance**.

---

## Gaps, by severity

### 🔴 HIGH

**H1 — The 90% balance is invisible and never actually verified.**
`createStage90` writes the balance payment as `VERIFIED` with no collection workflow, and the Payments page only ever queries Stage 10. So ~90% of every order's money has **no tracking, no verification, and no view** anywhere in the dashboard. For a B2B platform this is the single biggest gap: the page is a 10%-advance tool, not a payments tool.
→ _Recommendation: add a "Balance / Stage-90" view (due, collected, pending) and a real verify/collect action for it, or explicitly model it as COD and surface collection status._

**H2 — No transaction reference shown for reconciliation.**
The Stage-10 `Payment` carries `tr` (transaction ref), `tn`, `upiLink`, and `amount`, but `PendingPaymentResponse` exposes only `paymentId`, `paymentStatus`, `paymentAmount`. The verify modal even asks the admin for a "UTR number," yet never shows the **system's expected `tr`** to match against. An admin verifying an offline UPI payment has nothing to reconcile against — they're approving blind.
→ _Recommendation: include `tr`, `upiLink`, and `amount` in the pending-payment DTO and display them in the verify modal._

### 🟠 MEDIUM

**M1 — Expiry is not surfaced; expired items error out.**
Stage-10 payments expire after 24h and `verifyStage10` throws `"… has expired"` past that. The page shows no expiry time, countdown, or warning, so an admin can click Verify on an effectively-dead payment and get a confusing error — or the cron silently cancels it first and it vanishes from the list with no audit trail.
→ _Recommendation: add an "Expires" column / countdown; disable or flag expired rows; show why a row disappeared (auto-cancelled)._

**M2 — Verification is hard-coupled to order confirmation.**
"Verify" === `POST status CONFIRMED`. There is no way to (a) verify a payment without confirming the order, (b) **reject / mark failed** a payment, or (c) record a dispute. The only path is approve-and-confirm. If the order isn't in `PENDING` (concurrent change), the call fails.
→ _Recommendation: add explicit Verify / Reject actions; consider a dedicated payment-verify endpoint decoupled from the status machine._

**M3 — The entered UTR/notes don't attach to the payment.**
The modal's "Verification notes / UTR" is sent as `notes` and lands only in the order's `statusHistory` (sanitized). The `Payment` record stores `verifiedBy`/`verifiedAt` but **not** the reference the admin typed. Reconciliation evidence is therefore disconnected from the payment entity.
→ _Recommendation: persist the UTR/reference on the Payment record._

**M4 — Loads all pending orders; no server-side paging/filter/search.**
`listPendingPayments` calls `findByStatus("PENDING", Pageable.unpaged())` and the page paginates client-side. There's no date range, amount, or buyer filter. Fine at low volume, but it loads the entire pending set every open and offers no way to triage a large queue.
→ _Recommendation: server-side pagination + filters (date, buyer, amount)._

**M5 — No "expired / failed payments" audit view.**
Once a payment expires and the order is auto-cancelled, it leaves the queue with no dashboard record that a payment failed. There's no way to review historical/failed/expired payments.
→ _Recommendation: a payments history/audit tab (verified, expired, cancelled)._

**M6 — Orders with no Stage-10 record are shown but can't be verified.**
`toPendingPayment` tolerates a null payment (`paymentStatus` → shown as "AWAITING"), but clicking Verify then calls `verifyStage10`, which throws `"Stage 10 payment not found"`. The row looks actionable but isn't.
→ _Recommendation: detect missing payment and disable/relabel the action._

### 🟡 LOW / UX

**L1 — No buyer contact.** The DTO has `buyerCompanyName` but no phone/email, so an admin can't quickly chase a buyer about a pending advance. (The buyer snapshot has a phone; it just isn't surfaced.)

**L2 — No summary KPIs.** No count of pending verifications, total advance due, or total pending order value at the top of the page.

**L3 — No manual refresh / auto-refresh.** The original plan called for an "auto-refreshing list"; today the page only refetches after a successful verify. A queue that others are working can go stale.

**L4 — Advance vs total not labelled.** "Payment Amount" (the 10% advance) sits next to "Order Total" with no indication that the former is a 10% advance — easy to misread.

**L5 — No invoice / payment-link access.** No way to open the order's invoice PDF or copy the UPI link from this page.

---

## What works well (so it's not all gaps)

- The page is correctly **admin-only** (route guard + `/admin/**` security rule), and the verify endpoint re-checks `ROLE_ADMIN`.
- Verification is **atomic**: marking the payment `VERIFIED` and confirming the order happen in one transactional call, and `verifyStage10` guards against double-verification and expiry.
- Buyer company, order total, and advance amount are shown; the verify modal confirms before acting.

---

## Suggested priority order

| # | Gap | Severity | Effort |
|---|-----|----------|--------|
| H2 | Show `tr`/UPI/amount for reconciliation | High | Small (DTO + modal) |
| M3 | Persist UTR onto the payment record | Medium | Small |
| M1 | Surface expiry + disable expired rows | Medium | Small |
| L1–L4 | Buyer contact, KPIs, refresh, labels | Low | Small |
| M6 | Handle missing-payment rows | Medium | Small |
| M2 | Decouple verify from confirm; add reject | Medium | Medium |
| M4 | Server-side paging/filters | Medium | Medium |
| M5 | Payments history/audit view | Medium | Medium |
| H1 | Stage-90 balance tracking & collection | High | Large |

**Highest value, lowest effort first:** H2 + M3 + M1 (reconciliation + expiry) materially de-risk the verify action with small, mostly-DTO changes. **H1 (the 90% balance)** is the biggest gap overall but is a larger design effort because the backend currently treats the balance as auto-collected.
