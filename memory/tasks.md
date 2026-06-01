# Management Dashboard — Task Tracker & Plan

> Use this file to organize remaining features to be built out. 
> Mark completed items with `[x]`.
> In progress items with `[/]`.

## 📦 Post-MVP Phase 1: Catalog & Brands Management
- [x] **Brands**: Implement `BrandManager.tsx` (Card/Table view, CRUD capabilities, logo/banner uploads).
- [x] **Brands API**: Ensure backend `GET /brands/all`, `POST /brands/create`, `PUT /brands/update` are fully functioning and connected.
- [x] **Categories**: Implement `CategoryManager.tsx` (Tree view for hierarchy, CRUD capabilities).
- [x] **Categories API**: Ensure `GET /categories/tree` and associated write endpoints function.

## 📦 Post-MVP Phase 2: Platform Monetization & Incentives
- [x] **Discount Policies**: Implement `DiscountPolicyManager.tsx`.
- [x] **Tier Management**: Allow admins to define minimum quantity thresholds for dynamic discounts (e.g., 5% at 10 items, 10% at 50 items).
- [x] **Discount API**: Hook up `POST /discount-policies` and `PUT /discount-policies/{id}` endpoints.

## 📦 Post-MVP Phase 3: Content & Appearance
- [x] **Carousels**: Implement `CarouselManager.tsx` for banner uploads, link management, and ordering.
- [x] **Carousels API**: Ensure `POST /carousels/create` and `PUT /carousels/{id}` endpoints work.
- [x] **Homepage Config**: Implement `HomepageConfigManager.tsx` (or similar) to arrange sections (like Featured Products, Top Brands).
- [x] **Homepage API**: Ensure `GET /details/home` and `POST /details/home/create` are mapped correctly.

## 📦 Post-MVP Phase 4: Financials & Admin
- [x] **Payment Verification**: Implement `PaymentVerification.tsx`.
- [x] **Payments API**: Wire up `GET /admin/payments/pending` and verification action buttons.
- [x] **Seller Settings**: Implement `/settings` for sellers to configure invoice prefixes, terms, and bank details.

## 🚨 Identified Gaps (Pending Fixes)
- [x] **Gap 1: Missing Image Upload**: Implement backend `POST /upload/image` for Brands/Categories/Carousels.
- [x] **Gap 2: Payment Verification Mismatch**: Switch frontend `PaymentVerification.tsx` to use `GET /admin/payments/pending`.
- [x] **Gap 3: Seller Settings Missing Backend**: Implement settings API in `SellerController`.

## 📦 Post-MVP Phase 7: User Management & Security Hardening
- [x] **UserManager.tsx**: Create screen for viewing users and switching user roles.
- [x] **Users Routing**: Add `/users` route under RoleGuard inside `router/index.tsx`.
- [x] **Security Hardening**: Secure password hashing with `@JsonIgnore`, protect `/products/seller/**` GET endpoint, and configure `application.properties` to suppress error messages/stacktraces.

## 🚨 Detailed System Activity Diagram
- [ ] **Define Diagram Scope**: Map out swimlanes for Buyer, Seller, Admin, and System.
- [ ] **Develop Detailed Mermaid Workflow**: Cover Happy Path, Expiry/Cron Cancellation, and Order Cancellations.



