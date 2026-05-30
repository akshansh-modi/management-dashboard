# Management Dashboard — Build Context & Next Steps

> Handoff doc. Resume here. Companion to `implementation_plan.md`.
> Last updated: 2026-05-31

## What this project is

`management-dashboard` is a separate React app (Vite + TS + **Ant Design 6** + **Chart.js**)
for **Admin** and **Seller** roles. Backend is the existing `procurement-service`
(Spring Boot, Java 21, MongoDB) at `../procurement-service`. Buyer-facing app is
`../Sanitary-Direct` (not touched).

- Dashboard dev server: port **5174**. Run `npm run dev`.
- Backend: `./mvnw spring-boot:run` → serves at `http://localhost:8080/procurement`.
- Dev proxy (`vite.config.ts`) currently targets **localhost:8080** (was the Render URL).
- Auth: unified login, JWT role claim auto-routes admin/seller; buyers get Access Denied.

## Status — DONE ✅

### Backend (procurement-service) — new endpoints, all written, NOT yet compiled by us
Sandbox lacks JDK 21 + Maven, so we verified by static audit only.
**ACTION: run `./mvnw compile` locally to confirm.**

New/edited files:
- `controllers/AdminController.java` (NEW) — `/admin/**`, admin-only:
  - `GET /admin/users?role=&page=&size=`, `GET /admin/users/{id}`,
    `PATCH /admin/users/{id}/role` (body `{role}`),
  - `GET /admin/orders?status=&page=&size=`,
  - `GET /admin/analytics/summary`, `GET /admin/payments/pending`.
- `controllers/SellerController.java` (NEW) — `/seller/**`, admin+seller:
  - `GET /seller/orders?page=&size=`, `GET /seller/analytics/summary`.
  - Seller identity taken from JWT `userId` attribute (never client input).
- `services/AnalyticsService.java` (NEW) — in-Java aggregation (revenue by month,
  orders by status, top products, KPIs). Admin = platform-wide; seller scoped to
  own line items (`items.sellerId`). Excludes CANCELLED from revenue.
- `services/AdminService.java` (NEW) — user list/get, `changeUserRole` (validates
  buyer/seller/admin; revokes refresh tokens on change), pending-payments queue.
- `dto/response/AnalyticsSummaryResponse.java`, `AdminUserResponse.java`,
  `PendingPaymentResponse.java` (NEW).
- `services/OrderService.java` — added `getAllOrders(status, pageable)`,
  `getOrdersBySeller(sellerId, pageable)` (reuse existing `toDto` mapper).
- `services/ProductService.java` — added `getProductsBySeller`, `fullUpdateProduct`
  (ownership-checked; admin may reassign sellerId; preserves variants).
- `controllers/ProductController.java` — added `GET /products/seller/{sellerId}`,
  `PUT /products/{productId}`.
- `controllers/CarouselController.java` + `services/CarouselService.java` —
  added `PUT /carousels/{id}`, `DELETE /carousels/{id}`.
- `mongo/repository/*` — OrderRepository (findByStatus, findByItemsSellerId, counts),
  UserRepository (findByRole, countByRole), ProductRepository (findBySellerId, counts).
- `config/SecurityConfig.java` — added `/admin/**` → hasRole ADMIN,
  `/seller/**` → hasAnyRole ADMIN,SELLER (before `anyRequest().authenticated()`).

### Backend security fixes (applied)
- `auth/AuthController.refreshToken` — re-resolves role from DB instead of trusting
  the (possibly stale) token; revokes orphaned token if user gone.
- `services/AdminService.changeUserRole` — revokes the user's refresh tokens on role
  change (demotion takes effect immediately).
- `handlers/GlobalExceptionHandler` — added `AccessDeniedException` → 403 (was 500).

### Frontend (management-dashboard) — MVP, tsc clean (`tsc -b --force` exit 0)
Vite *bundle* not run in sandbox (node_modules is macOS, sandbox is linux-arm64,
registry blocked). **ACTION: run `npm run build` locally to confirm bundling.**

- `src/types/index.ts` (NEW) — Page<T>, Product, Order, AnalyticsSummary, AdminUser, etc.
- `src/services/` (NEW) — analyticsService, productService, orderService, userService.
- `src/pages/dashboard/Dashboard.tsx` — REWRITTEN to live analytics (no more mock).
- `src/pages/products/ProductList.tsx` — REWRITTEN (table, pagination, search,
  admin-all vs seller-scoped, edit/delete).
- `src/pages/products/ProductForm.tsx` (NEW) — create + full edit; brand/category/
  discount-policy selects; admin-only seller assignment; variant-preservation guard.
- `src/pages/orders/OrderList.tsx` — REWRITTEN (status filter tabs, role-scoped).
- `src/pages/orders/OrderDetail.tsx` (NEW) — Steps timeline, valid-transition buttons,
  admin notes modal, seller sees only own items + portion. Exports `STATUS_TAG`.
- `src/router/index.tsx` — added `products/new`, `products/:productId`, `orders/:orderId`.
- `src/App.tsx` — wrapped in Ant `<App>` for themed message/modal context.
- `vite.config.ts` — proxy target → `http://localhost:8080`.

## Status — NOT DONE / NEXT

### 0. Verify locally (do first)
- [ ] `cd procurement-service && ./mvnw compile` — fix any compile errors.
- [ ] `cd management-dashboard && npm run build` — confirm Vite bundle.
- [ ] Seed/ensure an **admin** user exists in Mongo (seeder only creates a seller
      `SLR-MODIBROTHERS`, role `seller`). Either add an admin via DB, or use the
      new `PATCH /admin/users/{id}/role` (needs an existing admin → bootstrap one
      manually in Mongo: set a user's `role` to `admin`).
- [ ] Smoke test: login as admin → dashboard analytics populate; products/orders load;
      create/edit a product; change an order status.

### 1. Dead sidebar links (DashboardLayout.tsx)
Menu links to routes that DON'T exist yet → currently fall through to /dashboard:
**Categories, Brands, Users, Discount Policies, Carousels, Payments, Homepage Config,
Business Settings.** Build these pages (post-MVP, see implementation_plan Phases 7–11).
Recommended next: **User Management** (`/users`) — pairs with the role-change endpoint
already built (`userService` already has `list`, `changeRole`, `getById`).

### 2. Remaining security hardening (from the auth audit)
- [ ] **HIGH/CRITICAL**: ensure `JWT_SECRET` env var is set (32+ random bytes) in every
      deployed profile. Default fallback in `application.properties` = token forgery risk.
- [ ] **MEDIUM**: `@JsonIgnore` on `UserEntity.password` (defense in depth).
- [ ] **MEDIUM**: auth-gate `GET /products/seller/**` — currently public (catalog GET
      is permitAll), exposes inactive products. Add a GET rule requiring ADMIN/SELLER,
      or filter to active for public.
- [ ] **MEDIUM**: tighten CORS in `application-PROD.properties` — drop `*.ngrok*` and
      preview wildcards (combined with allowCredentials=true).
- [ ] **LOW**: generic 500 handler echoes `ex.getMessage()`; set
      `server.error.include-stacktrace=never` in prod. Consider last-admin demotion guard.

### 3. Known data gap
`UserEntity` has no `createdAt` → "new users over time" chart can't be derived.
Dashboard shows `totalUsers` KPI instead. Add `createdAt` to UserEntity + set on
signup if that trend is wanted.

## Key facts / gotchas for whoever resumes
- Roles stored lowercase in Mongo (`buyer`/`seller`/`admin`); JWT normalizes to `ROLE_*`.
- JWT carries `sub` (username=mobile), `userId`, `role`. Access 1h, refresh 24h.
- `OrderItemSnapshot.sellerId` + `ProductEntity.sellerId` enable seller scoping.
- Order status flow: PENDING→CONFIRMED→PROCESSING→SHIPPED→DELIVERED (+CANCELLED).
  PENDING→CONFIRMED verifies stage-10 payment; SHIPPED→DELIVERED creates stage-90.
- Admin status change = `POST /orders/{id}/status` (records history); seller/general =
  `PATCH /orders/{id}/status`.
- Frontend token keys in localStorage: `dashboard_token`, `dashboard_refreshToken`.
- `api.ts` baseURL = `/api/procurement` in dev (proxy strips `/api`).
- Architecture decision: admin/analytics kept in classic layered style (controllers→
  services→repos), NOT hexagonal — only the `payment` module is hexagonal (it has a
  real external-provider boundary). Don't "hexagonalize" admin/analytics.

## Finalized product decisions (from implementation_plan.md)
- Multi-seller orders: seller sees only their line items + their portion.
- Seller onboarding: admin directly flips role (no application workflow).
- Admin assigns sellerId via dropdown when creating products.
- Same procurement-service backend; new endpoints secured via JWT roles.
