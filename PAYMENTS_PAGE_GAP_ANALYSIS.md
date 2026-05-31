# Payments Page — Gap Analysis (v2)

_Scope: the admin **Payment Verification** page (`src/pages/orders/PaymentVerification.tsx`), its service (`paymentService.ts`), and the backend it depends on (`AdminService.listPendingPayments`, `PaymentService.verifyStage10`, `PendingPaymentResponse`). Date: 2026-05-31. Supersedes v1._

## How payments work today

Two-stage model: **Stage 10** = 10% advance, created `PENDING` at checkout with a UPI link, a transaction reference (`tr`), and a **24-hour expiry**; **Stage 90** = 90% balance, created **already `VERIFIED`** when an order goes SHIPPED → DELIVERED (no real collection step). The Payments page lists `PENDING` orders (`GET /admin/payments/pending`) and "Verify" posts `POST /orders/{id}/status {status: CONFIRMED, notes: <utr>}`, which runs `verifyStage10` (marks the Stage-10 payment `VERIFIED`) and confirms the order. An hourly cron auto-cancels `PENDING` orders whose Stage-10 payment expired.

---

## ✅ Closed since v1

The page has been materially upgraded — these earlier gaps are now resolved end-to-end (DTO → service → UI):

- **Reconciliation (was H2):** `PendingPaymentResponse` now carries `tr` and `upiLink`, populated in `AdminService.toPendingPayment` and shown in the verify modal with copy buttons + an "Open UPI Payment" link.
- **Expiry visibility (was M1):** `expiresAt`/`isExpired` are computed server-side; the table shows a live countdown, an "urgent < 1h" warning, an "Expired" tag, and disables Verify for expired rows.
- **Missing-payment rows (was M6):** rows with no Stage-10 record show a "No payment" tag and Verify is disabled.
- **Buyer contact (was L1):** `buyerPhone` is surfaced in the table and modal.
- **Summary KPIs (was L2):** Awaiting Verification, Total Advance Due (10%), Total Order Value.
- **Refresh (was L3):** manual Refresh button + 60s auto-refresh + "last refreshed" timestamp.
- **Advance vs total labelling (was L4):** column is "Advance (10%)" and the modal shows "X of Y order total".

Good baseline now. The remaining gaps are below.

---

## Remaining gaps, by severity

### 🔴 HIGH

**H1 — The 90% balance (Stage-90) is still invisible and never actually collected.**
`createStage90` writes the balance straight to `VERIFIED` and the page only ever queries Stage 10. ~90% of every order's money has no tracking, verification, or view anywhere. This is unchanged from v1 and remains the single biggest gap — the page is a 10%-advance tool, not a payments tool.
→ _Add a balance/Stage-90 view (due / collected / outstanding) and a real collect-or-verify action, or explicitly model the balance as COD with a collection status._

**H2 (NEW) — The UI claims the UTR is stored on the payment record, but it isn't.**
The modal states: _"The UTR will be stored on the payment record for reconciliation."_ In reality `paymentService.verifyPayment(orderId, utr)` sends the UTR as the order-status `notes`, which lands in the order's `statusHistory` (sanitized) — `verifyStage10` only sets `verifiedBy`/`verifiedAt` and **never persists the UTR on the `Payment` entity**. So the reconciliation reference the operator carefully types is disconnected from the payment it reconciles, and the UI's promise is false. This is both the old M3 gap **and** a correctness/trust defect.
→ _Add a `utr`/reference field to the `Payment` model and a verify path that stores it (e.g. pass the reference into `verifyStage10`), or correct the modal copy to say where it's actually recorded._

### 🟠 MEDIUM

**M1 — Verify is still hard-coupled to order confirmation; no reject/fail/dispute.**
"Verify" === confirm the order. There's no way to verify a payment without confirming, to **reject / mark a payment failed**, or to flag a dispute. The only action is approve-and-confirm.
→ _Add explicit Verify / Reject actions; ideally a dedicated payment endpoint decoupled from the order status machine._

**M2 — No UTR ↔ expected-`tr` matching.**
The modal shows the expected `tr` and asks for the buyer's UTR but does nothing with the relationship — no soft compare, no warning on mismatch. Verification is entirely trust-based.
→ _Surface a soft match/mismatch indicator when the entered reference doesn't relate to the expected `tr`._

**M3 — Loads all pending orders; no server-side paging / filter / search.**
`listPendingPayments` still uses `Pageable.unpaged()`; the page paginates client-side (10/pg) and the KPIs sum the whole set. No filter by date, amount, buyer, or urgency. Fine at low volume; doesn't scale and offers no triage for a large queue.
→ _Server-side pagination + filters (date range, buyer, amount, "expiring soon")._

**M4 — No payments history / audit view.**
Once verified the row leaves the queue; once a Stage-10 payment expires the cron cancels the order and it disappears within ≤1h. There is no view of verified / expired / failed payments for audit or finance reconciliation. The "Expired" tag is therefore transient — visible only in the gap between expiry and the next cron run.
→ _A payments history tab (verified / expired / cancelled) with the stored references._

### 🟡 LOW

- **L1 — Verify modal doesn't re-check freshness.** Auto-refresh updates the list, but a modal opened on a row that expires (or gets cron-cancelled) while open will still attempt to verify and fail with a backend error. Minor; the error is handled.
- **L2 — No invoice access from the page.** Can't open the order's invoice PDF here (only "View" → order detail).
- **L3 — KPI accuracy is tied to M3.** Because the endpoint is unpaged, the KPIs are currently accurate across all pending — but they'd silently become page-scoped the moment server pagination is introduced. Worth keeping in mind when M3 is done.

---

## What works well

- Correctly **admin-only** (route guard + `/admin/**` rule; verify endpoint re-checks `ROLE_ADMIN`).
- Verification is **atomic** and guards against double-verify and expiry.
- The reconciliation/expiry/KPI/refresh UX added since v1 is solid and operator-friendly.

---

## Suggested priority order

| # | Gap | Severity | Effort |
|---|-----|----------|--------|
| H2 | Actually persist the UTR on the payment (or fix the copy) | High | Small |
| M1 | Decouple verify from confirm; add Reject | Medium | Medium |
| M2 | UTR ↔ expected-`tr` match indicator | Medium | Small |
| M3 | Server-side paging + filters | Medium | Medium |
| M4 | Payments history / audit view | Medium | Medium |
| H1 | Stage-90 balance tracking & collection | High | Large |

**Do first:** H2 — it's small and it's a live correctness/trust problem (the operator is told the reference is saved when it isn't). **Biggest overall:** H1 (the 90% balance), which needs a backend design change because the balance is currently auto-marked collected.
