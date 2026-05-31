# Plan: Order-detail payment details + configurable advance/balance split

> Execution brief for an AI coding agent. Two independent features. Do them in the order below.
> Repos: backend `procurement-service` (Spring Boot, Java 21, hexagonal `payment/` module), frontend `management-dashboard` (React + TS + Ant Design 6 + Chart.js).
> **Constraints:** the agent CAN compile the backend (`./mvnw compile`) and build the frontend (`npm run build`); always run both at the end. Frontend dev proxy already points at `http://localhost:8080`.

---

## Background (current state — verified)

- Two-stage payment model lives in the hexagonal module `procurement-service/src/main/java/com/marketplace/procurement/payment/`.
  - `application/PaymentService.java`
    - `createStage10(orderId, finalTotal)` → advance. **Hardcoded** `finalTotal * 0.10` at **line ~57**. Creates `Payment` with `stage="10"`, `status="PENDING"`, a UPI `tr`/`upiLink`, and 24h `expiresAt`.
    - `createStage90(orderId, finalTotal, adminUserId)` → balance. **Hardcoded** `finalTotal * 0.90` at **line ~94**. Now creates `status="PENDING"` (recently changed from VERIFIED — finance verifies it later).
    - `verifyStage10(orderId, adminUserId, utr)` and `verifyStage90(orderId, adminUserId, utr, method)` set `status="VERIFIED"`, `verifiedAt`, `verifiedBy`, `utr`, and (stage 90) `method`.
  - Domain model `payment/domain/model/Payment.java` (hand-written, NOT Lombok) has: `id, orderId, stage, amount, upiLink, tr, tn, status, expiresAt, createdAt, verifiedAt, verifiedBy, utr, method`. Builder + getters/setters exist for all.
  - Persistence: `payment/adapter/out/persistence/PaymentEntity.java` (Lombok) + `PaymentMapper.java` map every field incl. `utr`/`method`. Collection: `payments`.
  - Port: `payment/domain/port/out/PaymentRepositoryPort.java` has `findByOrderIdAndStage(orderId, stage)`, `findByStageAndStatus(stage, status)`; adapter `MongoPaymentAdapter`.
- `OrderEntity` carries `stage10PaymentId` and `stage90PaymentId`.
- Order detail in the dashboard: `management-dashboard/src/pages/orders/OrderDetail.tsx` calls `orderService.getById(orderId)` → `GET /orders/{orderId}` → `OrderController.getOrderById` → `OrderService.getOrderById` → `toDto` (the generic `Order` DTO, which has **no** payment info; it only shows `order.paymentMethod`, the checkout "mode of payment" string).
- Existing payment config namespace in `src/main/resources/application.properties` (lines ~26–30): `payment.upi.vpa`, `payment.upi.merchant-name`, `payment.support.whatsapp`. There are also `application-SIT.properties` and `application-PROD.properties`.
- A buyer-facing `GET /orders/{orderId}/payment` already exists (`payment/adapter/in/rest/PaymentController.java`) but returns only the Stage-10 payment via `OrderPaymentResponse` and is scoped to the order's own buyer.

---

# FEATURE 1 — Show payment details (UTR / reference / method / status) on the order-detail page

**Goal:** on the dashboard order detail, an admin/seller can see, for a completed (or in-progress) order, the Stage-10 advance and Stage-90 balance payment records — amount, status, the system UPI reference (`tr`), the admin-entered UTR/reference, the method (stage 90), and verified-by/at.

### 1A. Backend — new DTO

Create `procurement-service/src/main/java/com/marketplace/procurement/dto/response/OrderPaymentsResponse.java` (Lombok `@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor`):

```
String orderId;
List<StagePayment> stages;   // 0..2 entries (advance, balance)

// nested static class StagePayment:
String stage;            // "10" | "90"
String label;            // "Advance" | "Balance"
Double amount;
Double percentOfTotal;   // amount / finalTotal * 100, rounded (see note)
String status;           // PENDING | VERIFIED | EXPIRED | CANCELLED
String tr;               // system UPI ref (stage 10 only; null for 90)
String upiLink;          // stage 10 only
String utr;              // admin-entered reference (null until verified)
String method;           // stage 90 (UPI/CASH/...); null for stage 10
String verifiedBy;       // admin userId (optional to expose; see 1D security)
String verifiedAt;       // ISO-8601
String createdAt;        // ISO-8601
String expiresAt;        // ISO-8601 (stage 10 only)
```

### 1B. Backend — service method

Add to `OrderService` (it already enforces order access control in `getOrderById`) a method `getOrderPayments(String orderId, String requestingUserId)`:
1. Load the order via `orderRepository.findByOrderId` (throw `IllegalArgumentException` if missing).
2. Reuse the SAME access check as `getOrderById` (admin bypass via `isRequestingUserAdmin()`, else buyer-owner or item-seller; else throw `AccessDeniedException`). Extract that check into a private helper `assertCanViewOrder(order, requestingUserId)` and call it from both `getOrderById` and `getOrderPayments` to avoid drift.
3. For stages `"10"` and `"90"`: `verifyPaymentUseCase.getPaymentByOrderIdAndStage(orderId, stage)` (already injected in `OrderService`). For each present payment, map to `StagePayment`. Compute `percentOfTotal = round(amount / order.getFinalTotal() * 100)` guarding divide-by-zero.
4. Return `OrderPaymentsResponse`.

> `OrderService` already depends on `VerifyPaymentUseCase` (used in `performStatusTransition`). No new injection needed.

### 1C. Backend — controller endpoint

Add to `OrderController`:
```
@GetMapping("/{orderId}/payments")
public ResponseEntity<OrderPaymentsResponse> getOrderPayments(@PathVariable String orderId, HttpServletRequest req) {
    String userId = (String) req.getAttribute("userId");
    if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    return ResponseEntity.ok(orderService.getOrderPayments(orderId, userId));
}
```
This sits under `/orders/**` which is `authenticated()` in `SecurityConfig`; the service-layer access check does the real authorization. (`AccessDeniedException` already maps to 403 via `GlobalExceptionHandler`.)

### 1D. Security — role-aware field visibility (DECIDED)
**One endpoint, authorized by the existing order-access check (admin / buyer-owner / item-seller). Visibility is by FIELD, not by caller.** This is the right model for B2B: the paying business needs its own payment status/reference for reconciliation and credit-terms (Net-15) transparency — hiding it is customer-hostile and drives support load. Only *internal operations* data is admin-only.

- **Buyer (order owner) + Seller** see the payment FACTS: `stage, label, amount, percentOfTotal, status, tr, upiLink, utr, method, verifiedAt, createdAt, expiresAt`.
- **Admin** additionally sees internal fields: `verifiedBy` (and any internal verification note, if added later).

Implementation: in `OrderService.getOrderPayments`, compute `boolean isAdmin = isRequestingUserAdmin()` and only set `verifiedBy` on each `StagePayment` when `isAdmin` is true (leave null otherwise). All other fields are always populated. (This mirrors the existing buyer-facing `GET /orders/{id}/payment`, which already exposes the Stage-10 record to the order's buyer — we're completing it to both stages and adding the admin-only field.)

### 1E. Frontend — types + service

- `management-dashboard/src/types/index.ts`: add
```
export interface StagePayment {
  stage: string; label: string; amount?: number; percentOfTotal?: number;
  status?: string; tr?: string; upiLink?: string; utr?: string; method?: string;
  verifiedBy?: string; verifiedAt?: string; createdAt?: string; expiresAt?: string;
}
export interface OrderPayments { orderId: string; stages: StagePayment[]; }
```
- `src/services/orderService.ts`: add
```
getPayments: async (orderId: string): Promise<OrderPayments> => {
  const { data } = await api.get<OrderPayments>(`/orders/${orderId}/payments`);
  return data;
},
```

### 1F. Frontend — OrderDetail.tsx

In `src/pages/orders/OrderDetail.tsx`:
1. Add state `const [payments, setPayments] = useState<OrderPayments | null>(null)`.
2. In the existing load effect (or a second effect keyed on `orderId`), call `orderService.getPayments(orderId)` and store it; swallow/ignore errors into a soft state so the rest of the page still renders.
3. Add a **"Payments"** card (place it under the Financial summary card in the right column, or full-width below the items table). For each `stage` render a small block:
   - Title: `{label} ({percentOfTotal}%)` e.g. "Advance (10%)".
   - A `Tag` for `status` (reuse a colour map: VERIFIED=green, PENDING=gold, EXPIRED/ CANCELLED=red).
   - `amount` formatted as INR.
   - If `stage==="10"`: show `tr` ("UPI Ref") with a copy button, and `utr` ("Buyer UTR") when present.
   - If `stage==="90"`: show `method` and `utr` ("Reference") when present.
   - Show `verifiedAt` (and `verifiedBy` if present) when VERIFIED.
   - Empty state when `stages` is empty ("No payment records yet").
4. Keep it read-only here (verification still happens on the Payments page).

### 1G. Verify Feature 1
- `./mvnw compile`.
- `npm run build` (or `npx tsc -b`).
- Manual: open a DELIVERED order in the dashboard → Payments card shows Advance (VERIFIED, with UTR + tr) and Balance (PENDING or VERIFIED with method+UTR).

---

# FEATURE 2 — Configurable advance : balance split (currently 10 : 90)

**Goal:** the advance percentage is a config value, not hardcoded. Changing it affects only NEW orders. The UI labels ("Advance (10%)" etc.) must reflect the configured value.

### 2A. Config property
Add to `application.properties` (and mirror in `application-SIT.properties` / `application-PROD.properties`):
```
# Advance percentage of the two-stage split (1..99). Balance = 100 - this.
payment.advance.percentage=${PAYMENT_ADVANCE_PERCENTAGE:10}
```

### 2B. PaymentService — inject + use
In `payment/application/PaymentService.java`:
1. Inject:
```
@Value("${payment.advance.percentage:10}")
private double advancePercentage;
```
2. Add a guarded accessor that clamps to a sane range and logs once if misconfigured:
```
private double advanceFraction() {
    double p = advancePercentage;
    if (p <= 0 || p >= 100) { log.warn("payment.advance.percentage={} out of range; defaulting to 10", p); p = 10; }
    return p / 100.0;
}
```
3. `createStage10`: replace `finalTotal * 0.10` (line ~57) with `finalTotal * advanceFraction()`.
4. `createStage90`: replace `finalTotal * 0.90` (line ~94) with `finalTotal * (1.0 - advanceFraction())`.
   Keep the `Math.round(... * 100.0) / 100.0` rounding.

### 2C. Keep the stage CODES as identifiers (important)
`stage` values `"10"` and `"90"` and payment IDs (`PAY-<order>-10` / `-90`) are **logical identifiers**, not the percentages. **Do NOT** rename them when the ratio changes — `findByOrderIdAndStage(orderId, "10")` etc. are used throughout (`OrderService`, `AdminService`, `PaymentController`, schedulers). Changing the ratio must NOT touch these string codes.
- (Optional, larger follow-up — DO NOT do now: introduce constants `STAGE_ADVANCE="10"`, `STAGE_BALANCE="90"` to document intent. Track separately.)

### 2D. Surface the configured percentage to the UI (so labels are correct)
The frontend currently hardcodes "Advance (10%)" / "Total Advance Due (10%)" in `PaymentVerification.tsx`, "Balance (90%)" in `BalancePaymentsTab.tsx`, and the per-row "Advance (10%)" column. Two acceptable approaches — pick **Option 1**:
- **Option 1 (recommended, minimal):** derive the percentage per-row from data you already have: `Math.round(paymentAmount / finalTotal * 100)`. Replace the hardcoded "10"/"90" in column headers / KPI titles with this derived value (fall back to config-less text "Advance"/"Balance" if `finalTotal` is missing). Feature 1 already returns `percentOfTotal` per stage — reuse the same idea here.
- **Option 2:** expose the config via an endpoint (e.g. add `advancePercent`/`balancePercent` to `PendingPaymentResponse`/`BalancePaymentResponse`, populated from the injected value), and read it on the frontend. More wiring; only do this if Option 1's per-row derivation is insufficient (e.g. empty lists still need a label).

Files to update for labels: `src/pages/orders/PaymentVerification.tsx` (tab label, KPI title "Total Advance Due (10%)", column "Advance (10%)"), `src/pages/orders/BalancePaymentsTab.tsx` (tab label, KPI "Total Balance Due (90%)", column "Balance (90%)").

### 2E. Edge cases / gotchas
- **Existing orders** keep their original amounts (amounts are stored on the `Payment` record, never recomputed). The DTOs already read `payment.getAmount()`, so old orders display correctly even after the ratio changes.
- **Rounding:** advance + balance may differ from `finalTotal` by ₹0.01 due to independent rounding. Acceptable; note it. (Optional: compute balance as `finalTotal - advanceAmount` to guarantee they sum exactly — preferred if you want exactness.)
- **Validation:** reject `<=0` or `>=100` (the `advanceFraction()` clamp handles runtime; optionally fail-fast at startup in a `@PostConstruct`).
- Do not change the 24h `expiresAt` logic or the order status gates (advance gates CONFIRMED, balance is finance-verified post-delivery) — out of scope.

### 2F. Verify Feature 2
- Set `payment.advance.percentage=30` locally, place a new test order, confirm Stage-10 = 30% and Stage-90 = 70% (check the `payments` Mongo collection and the new Payments card from Feature 1).
- Confirm UI labels reflect 30/70 (per-row derivation).
- Set it back to 10; `./mvnw compile` + `npm run build` clean.

---

## Suggested execution order
1. Feature 2 (2A–2C) — small, isolated backend change; compile.
2. Feature 1 (1A–1F) — DTO → service → controller → frontend.
3. Feature 2 (2D) UI labels — once Feature 1's per-row percentage pattern exists, reuse it.
4. Final: `./mvnw compile` and `npm run build`; manual smoke test of an order's Payments card and a fresh order at a non-10 ratio.

## Out of scope (do not do)
- Renaming stage codes "10"/"90".
- Changing verification workflows, expiry, or order status transitions.
- Buyer-app (`Sanitary-Direct`) changes.
```
