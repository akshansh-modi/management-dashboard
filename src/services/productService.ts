import api from './api';
import type { Page, Product, Brand, Category, DiscountPolicy } from '../types';

/**
 * Product catalog API. Admins operate over all products; sellers are scoped to
 * their own via the seller-specific list endpoint.
 */
export const productService = {
  /** Admin: list all products (paginated). */
  listAll: async (page = 0, size = 10): Promise<Page<Product>> => {
    const { data } = await api.get<Page<Product>>('/products/all', { params: { page, size } });
    return data;
  },

  /** Seller: list only this seller's products (paginated). */
  listBySeller: async (sellerId: string, page = 0, size = 10): Promise<Page<Product>> => {
    const { data } = await api.get<Page<Product>>(`/products/seller/${sellerId}`, {
      params: { page, size },
    });
    return data;
  },

  getById: async (productId: string): Promise<Product> => {
    const { data } = await api.get<Product>(`/products/${productId}`);
    return data;
  },

  create: async (product: Partial<Product>): Promise<Product> => {
    const { data } = await api.post<Product>('/products/createProduct', product);
    return data;
  },

  /** Full update (PUT /products/{id}). */
  update: async (productId: string, product: Partial<Product>): Promise<Product> => {
    const { data } = await api.put<Product>(`/products/${productId}`, product);
    return data;
  },

  remove: async (productId: string): Promise<void> => {
    await api.delete(`/products/${productId}`);
  },

  /** Convenience toggle for the active flag via full update. */
  setActive: async (product: Product, isActive: boolean): Promise<Product> => {
    return productService.update(product.productId, { ...product, isActive });
  },

  // ── Catalog helpers for the product form ──────────────────────────────────
  listBrands: async (): Promise<Brand[]> => {
    const { data } = await api.get<Brand[]>('/brands/all');
    return data;
  },

  listCategories: async (): Promise<Category[]> => {
    const { data } = await api.get<Category[]>('/categories/all');
    return data;
  },

  listDiscountPolicies: async (): Promise<DiscountPolicy[]> => {
    const { data } = await api.get<DiscountPolicy[]>('/discount-policies');
    return data;
  },
};
