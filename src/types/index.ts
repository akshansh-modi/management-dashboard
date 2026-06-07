/**
 * Shared API types for the management dashboard.
 * These mirror the procurement-service response DTOs.
 */

/** Response wrapper for bulk-create operations. */
export interface BulkCreateResult<T> {
  created: T[];
  failed: Array<{ index: number; label: string; reason: string }>;
}

/** Spring Data Page envelope. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page index (0-based)
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}

// ── Products ───────────────────────────────────────────────────────────────

export interface DiscountTier {
  minQuantity: number;
  discountPercentage: number;
}

export interface DiscountPolicy {
  policyId: string;
  scope?: string;
  aggregationGroupId?: string;
  tiers?: DiscountTier[];
  isActive?: boolean;
}

export interface Variant {
  variantId?: string;
  sku?: string;
  heading?: string;
  price?: number;
  stockQuantity?: number;
  gstRate?: number;
  isActive?: boolean;
  attributes?: Record<string, string>;
}

export interface Product {
  productId: string;
  productName: string;
  productDescription?: string;
  productImagesUrl?: string[];
  brandName?: string;
  productBrandId?: string;
  categoryId?: string;
  price?: number;
  currency?: string;
  stockQuantity?: number;
  unitOfMeasure?: string;
  sku?: string;
  hsn?: string;
  attributes?: Record<string, unknown>;
  documentUrls?: string[];
  discountPolicy?: DiscountPolicy | null;
  variantAttributes?: string[];
  variants?: Variant[];
  warranty?: string;
  supportDetails?: string;
  isActive?: boolean;
  sellerId?: string;
  gstRate?: number;
}

// ── Orders ─────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Address {
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  [key: string]: unknown;
}

export interface OrderItem {
  productId: string;
  variantId?: string;
  variantAttributes?: Record<string, string>;
  productName: string;
  brandName?: string;
  brandId?: string;
  sku?: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  discountApplied?: number;
  finalUnitPrice: number;
  subtotal: number;
  sellerId?: string;
  hsn?: string;
  gstRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
}

export interface Order {
  orderId: string;
  userId: string;
  orderDate: string;
  status: OrderStatus;
  subtotal?: number;
  totalDiscount?: number;
  shippingCharge?: number;
  shippingPercentage?: number;
  taxAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  finalTotal?: number;
  currency?: string;
  shippingAddress?: Address;
  items: OrderItem[];
  invoiceNumber?: string;
  paymentMethod?: string;
  buyerCompanyName?: string;
}

// ── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsKpis {
  totalRevenue: number;
  totalOrders: number;
  activeProducts: number;
  activeSellers?: number | null;
  totalUsers?: number | null;
  pendingPayments: number;
}

export interface TimeSeriesPoint {
  label: string;
  value: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface AnalyticsSummary {
  scope: 'ADMIN' | 'SELLER';
  kpis: AnalyticsKpis;
  revenueByMonth: TimeSeriesPoint[];
  ordersByStatus: StatusCount[];
  topProducts: TopProduct[];
}

// ── Users ──────────────────────────────────────────────────────────────────

export type Role = 'buyer' | 'seller' | 'admin';

export type AccountStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface AdminUser {
  userId: string;
  username?: string;
  mobileNumber?: string;
  emailId?: string;
  role: Role;
  phoneVerified?: boolean;
  companyName?: string;
  gstin?: string;
  pan?: string;
  stateCode?: string;
  address?: Address;
  /**
   * Onboarding status. Null/undefined = legacy user (treat as APPROVED).
   */
  accountStatus?: AccountStatus | null;
}

// ── Buyer analytics ──────────────────────────────────────────────────────────

export interface TopBrand {
  brandName: string;
  quantitySold: number;
  spend: number;
}

export interface BuyerAnalyticsKpis {
  totalSpend: number;
  totalOrders: number;
  totalItems: number;
  avgOrderValue: number;
  lastOrderDate?: string | null;
  daysSinceLastOrder?: number | null;
  cancellationRate: number;
  pendingPayments: number;
}

export interface BuyerAnalytics {
  userId: string;
  kpis: BuyerAnalyticsKpis;
  monthlySpend: TimeSeriesPoint[];
  ordersByStatus: StatusCount[];
  topProducts: TopProduct[];
  topBrands: TopBrand[];
}

// ── Catalog (brands / categories) ────────────────────────────────────────────

export interface Brand {
  brandId?: string;
  brandName: string;
  brandLogoUrl?: string;
  brandImageUrl?: string;
  brandDescription?: string;
  brandWebsiteUrl?: string;
  brandContactEmail?: string;
  brandContactPhone?: string;
  categoryIds?: string[];
  brandAddress?: Address;
  isActive?: boolean;
}

export interface Category {
  categoryId?: string;
  categoryName: string;
  parentCategoryId?: string;
  categoryImageUrl?: string;
  categoryDescription?: string;
  subCategories?: Category[];
}

// ── Content & Appearance ───────────────────────────────────────────────────

export interface CarouselItem {
  label: string;
  actionLink: string;
}

export interface Carousel {
  carouselId?: string;
  title: string;
  tagline?: string;
  description?: string;
  imageUrl?: string;
  items?: CarouselItem[];
  isEnabled?: boolean;
}

export type CardType = 
  | 'FEATURED_BRANDS'
  | 'FEATURED_VERTICALS'
  | 'FEATURED_PRODUCTS'
  | 'FEATURED_OFFERS';

export interface ExploreCardConfig {
  cardType: CardType;
  ids?: string[];
  enabled: boolean;
}

export interface HomepageConfig {
  carouselIds?: string[];
  exploreCards?: ExploreCardConfig[];
}

// ── Payment Verification ──────────────────────────────────────────────────

/** Mirrors backend PendingPaymentResponse DTO. */
export interface PendingPayment {
  orderId: string;
  userId: string;
  buyerCompanyName?: string;
  /** Buyer phone from the frozen snapshot — for quick follow-up. */
  buyerPhone?: string;
  invoiceNumber?: string;
  finalTotal?: number;
  currency?: string;
  status: string;
  orderDate?: string;
  paymentId?: string;
  paymentStatus?: string;
  paymentAmount?: number;
  /** System-generated UPI transaction reference for reconciliation. */
  tr?: string;
  /** Full UPI deep-link the buyer was asked to pay via. */
  upiLink?: string;
  /** ISO-8601 expiry timestamp of the Stage-10 payment. */
  expiresAt?: string;
  /** True when PENDING but already past expiresAt — computed server-side. */
  isExpired?: boolean;
}

/** Mirrors backend BalancePaymentResponse DTO (Stage-90, 90% balance). */
export interface BalancePayment {
  orderId: string;
  userId: string;
  buyerCompanyName?: string;
  buyerPhone?: string;
  invoiceNumber?: string;
  finalTotal?: number;
  balanceAmount?: number;
  currency?: string;
  paymentId?: string;
  paymentStatus?: string;
  method?: string;
  utr?: string;
  orderDate?: string;
  deliveredAt?: string;
}

export interface StagePayment {
  stage: string;
  label: string;
  amount?: number;
  percentOfTotal?: number;
  status?: string;
  tr?: string;
  upiLink?: string;
  utr?: string;
  method?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt?: string;
  expiresAt?: string;
}

export interface OrderPayments {
  orderId: string;
  stages: StagePayment[];
}

// ── Filter Management ──────────────────────────────────────────────────────

/** Matches FilterAttributeResponse from the backend */
export interface FilterAttribute {
  mongoId?: string;
  categoryIds: string[];
  attributeId: string;          // e.g. "horsepower"
  label: string;                // e.g. "Horsepower"
  type: 'single-select' | 'multi-select' | 'range';
  unit?: string;
  displayOrder?: number;
  min?: number;
  max?: number;
  options?: string[];
  optionSource?: 'STATIC' | 'SUBCATEGORIES';
  includeSubcategories?: boolean;
}

/** Matches CategoryFiltersResponse.FilterConfig (public GET /filters) */
export interface FilterConfig {
  id: string;                   // attributeId
  label: string;
  type: 'single-select' | 'multi-select' | 'range';
  unit?: string;
  displayOrder?: number;
  min?: number;
  max?: number;
  options?: string[];
  optionSource?: 'STATIC' | 'SUBCATEGORIES';
  categoryIds: string[];        // needed for partition logic
  includeSubcategories?: boolean;
}
