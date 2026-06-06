# Plan: lazy loading for management-dashboard

> Execution brief. Goal: stop shipping one ~1.6 MB JS bundle; load each page (and heavy
> libs) only when needed. Verify with `npm run build` and `npx tsc -b` at the end.

## Current state (measured)
- `src/router/index.tsx` eagerly imports all **18 page components**.
- Production build = a **single** `dist/assets/index-*.js` ≈ **1.62 MB** (uncompressed), one chunk.
- Heavy deps all in that one chunk: `antd@6`, `@ant-design/icons`, `@ant-design/charts`,
  `chart.js` + `react-chartjs-2`, `dayjs`.
- Data is already server-paginated; the win here is **JS code-splitting**, not data.

Target: a small initial chunk (shell + login) + per-route chunks + cached vendor chunks,
so opening the app downloads ~100–300 KB instead of 1.6 MB, and charts only load on chart pages.

---

## Step 1 — Route-based code splitting (biggest win)
In `src/router/index.tsx`, convert page imports to `React.lazy` and wrap the routed
elements in `<Suspense>`. Keep the **shell eager** (it's needed immediately):
`DashboardLayout`, `RoleGuard`, `Login`, and the `Navigate` redirects.

```tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import RoleGuard from '../components/guards/RoleGuard';
import Login from '../pages/Login';                 // keep eager (first paint)
import RouteFallback from '../components/RouteFallback';
import RouteError from '../components/RouteError';

const Dashboard       = lazy(() => import('../pages/dashboard/Dashboard'));
const ProductList     = lazy(() => import('../pages/products/ProductList'));
const ProductForm     = lazy(() => import('../pages/products/ProductForm'));
const OrderList       = lazy(() => import('../pages/orders/OrderList'));
const OrderDetail     = lazy(() => import('../pages/orders/OrderDetail'));
const BrandManager    = lazy(() => import('../pages/brands/BrandManager'));
const CategoryManager = lazy(() => import('../pages/categories/CategoryManager'));
const DiscountPolicyManager = lazy(() => import('../pages/discounts/DiscountPolicyManager'));
const CarouselManager = lazy(() => import('../pages/content/CarouselManager'));
const HomepageConfigManager = lazy(() => import('../pages/content/HomepageConfigManager'));
const PaymentVerification   = lazy(() => import('../pages/orders/PaymentVerification'));
const Settings        = lazy(() => import('../pages/dashboard/Settings'));
const UserManager     = lazy(() => import('../pages/users/UserManager'));
const BuyerDetail     = lazy(() => import('../pages/users/BuyerDetail'));

// helper so each lazy element gets a Suspense boundary
const L = (El: React.ComponentType) => (
  <Suspense fallback={<RouteFallback />}><El /></Suspense>
);
```
Then in the route table use `element: L(Dashboard)` etc. Put `errorElement: <RouteError />`
on the layout route so a failed chunk fetch is handled (see Step 3).

> Note: these pages are default exports (confirmed), so `lazy(() => import('...'))` works as-is.

## Step 2 — Suspense fallback component
`src/components/RouteFallback.tsx` — a centered AntD `Spin` (matches existing loading style):
```tsx
import { Spin } from 'antd';
export default function RouteFallback() {
  return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><Spin size="large" /></div>;
}
```

## Step 3 — Chunk-load error boundary (important for deploys)
After a redeploy, an open tab may request an old chunk hash that no longer exists → the
dynamic `import()` rejects. Handle it so the user gets a reload prompt, not a blank page.
`src/components/RouteError.tsx`:
```tsx
import { useRouteError } from 'react-router-dom';
import { Result, Button } from 'antd';
export default function RouteError() {
  const err = useRouteError() as Error | undefined;
  const isChunk = /chunk|dynamically imported module|Importing a module/i.test(err?.message ?? '');
  return (
    <Result
      status="warning"
      title={isChunk ? 'A new version is available' : 'Something went wrong'}
      subTitle={isChunk ? 'Please reload to get the latest version.' : undefined}
      extra={<Button type="primary" onClick={() => location.reload()}>Reload</Button>}
    />
  );
}
```
(Optionally add a tiny `import()` retry wrapper that reloads once on first chunk failure.)

## Step 4 — Vite manual vendor chunks (cache big libs separately)
In `vite.config.ts`, add `build.rollupOptions.output.manualChunks` so antd / charts / dayjs
become their own long-cached chunks, and charts don't sit in the main bundle:
```ts
build: {
  chunkSizeWarningLimit: 900,
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'antd-vendor': ['antd', '@ant-design/icons'],
        'charts-vendor': ['chart.js', 'react-chartjs-2', '@ant-design/charts'],
        'date-vendor': ['dayjs'],
      },
    },
  },
},
```
Result: `charts-vendor` is only fetched on routes that render charts (Dashboard, BuyerDetail);
`antd-vendor`/`react-vendor` are cached across deploys (hash changes only when those deps change).

## Step 5 — Lazy-load charts inside pages (optional, extra trim)
`Dashboard.tsx` and `BuyerDetail.tsx` import `react-chartjs-2` + register Chart.js at module
top. With Step 4 that's already isolated to `charts-vendor`, loaded only on those routes — so
this step is optional. If you want those pages' first paint even lighter, `lazy()` the chart
sub-components and render KPI cards immediately while charts stream in.

## Step 6 — Image lazy loading (cheap polish)
Product images in `ProductList` (`Avatar src=...`) and any `<img>`: add `loading="lazy"` so
off-screen thumbnails defer. Tables are already paginated, so impact is minor but free.

## Step 7 — (Optional) Preload on intent
For snappy nav, prefetch a route's chunk on sidebar hover/focus:
```ts
const prefetch = () => import('../pages/orders/OrderList'); // same specifier as the lazy()
// onMouseEnter={prefetch} on the menu item
```
Or preload likely-next routes during idle via `requestIdleCallback`. Do this last, only if needed.

## Step 8 — (Optional) Bundle visibility
Add `rollup-plugin-visualizer` as a dev dep to see chunk sizes:
`import { visualizer } from 'rollup-plugin-visualizer'` → `plugins: [react(), visualizer()]`,
then open `stats.html` after build. Helps confirm the split worked. (Needs npm install.)

---

## Sequencing
1. Steps 1–3 together (lazy routes + fallback + error boundary) — the core change.
2. Step 4 (vendor chunks) — pairs with it; do in the same PR.
3. Steps 5–8 — optional polish, only if you want more.

## Verification
- `npx tsc -b` → clean (lazy/Suspense are typed fine).
- `npm run build` → expect **many** chunks in `dist/assets/` (per-page + `*-vendor-*`), and the
  entry chunk should drop from ~1.6 MB to a few hundred KB. No single-1.6MB file.
- Smoke test: hard-reload `/dashboard`, navigate to Products/Orders/Users — each shows the Spin
  briefly, then renders; network tab shows a new chunk per first visit.
- Deploy test: rebuild (new hashes) with an old tab open → navigation shows the "new version,
  reload" Result instead of a blank screen.

## Gotchas / backward-compat
- Keep `Login` and the layout eager — lazy-loading the very first screen adds a flash.
- Default exports are required for the simple `lazy(() => import('...'))` form (all pages use them).
- `manualChunks` keys must match the installed package names exactly.
- Don't lazy-load `AuthContext`/theme/`App.tsx` — they're app-wide and must be present at boot.
- This is purely a frontend build change; no API or backend impact.
