import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { getFirebaseDb } from '../services/firebase-admin';
import { ref, get, push, set, update, remove } from 'firebase/database';
import { Category, Product, PaginatedResponse } from '@models/index';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private db = getFirebaseDb();

  private normalizeCategory(categoryValue: unknown, categoriesById: Record<string, Category>): Product['category'] {
    if (typeof categoryValue !== 'string') {
      return categoryValue as Product['category'];
    }

    return categoriesById[categoryValue] || categoryValue;
  }

  private normalizeProduct(productId: string, rawProduct: Record<string, any>, categoriesById: Record<string, Category>): Product {
    return {
      _id: productId,
      ...(rawProduct || {}),
      category: this.normalizeCategory(rawProduct?.['category'], categoriesById)
    } as Product;
  }

  private matchesCategory(productCategory: Product['category'], categoryParam: string): boolean {
    if (typeof productCategory === 'string') {
      return productCategory === categoryParam;
    }

    return productCategory._id === categoryParam || productCategory.slug === categoryParam;
  }

  getProducts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    featured?: boolean;
    search?: string;
  }): Observable<PaginatedResponse<Product[]>> {
    const dbRef = ref(this.db, 'products');
    const categoriesRef = ref(this.db, 'categories');

    return from(Promise.all([get(dbRef), get(categoriesRef)])).pipe(
      map(([productsSnapshot, categoriesSnapshot]) => {
        const productsValue = productsSnapshot.val() || {};
        const categoriesValue = categoriesSnapshot.val() || {};
        const categoriesById = Object.entries(categoriesValue).reduce<Record<string, Category>>((accumulator, [id, raw]: any) => {
          accumulator[id] = {
            _id: id,
            ...(raw || {})
          } as Category;
          return accumulator;
        }, {});

        const items: Product[] = Object.entries(productsValue).map(([id, raw]: any) =>
          this.normalizeProduct(id, raw || {}, categoriesById)
        );

        // Apply simple filtering locally
        let filtered = items;

        if (params) {
          if (params.category) {
            filtered = filtered.filter(product => this.matchesCategory(product.category, params.category as string));
          }
          if (params.featured !== undefined) {
            filtered = filtered.filter(p => !!p.featured === !!params.featured);
          }
          if (params.search) {
            const q = params.search.toLowerCase();
            filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
          }
        }

        const total = filtered.length;
        const limit = params?.limit ?? 12;
        const page = params?.page ?? 1;
        const start = (page - 1) * limit;
        const data = filtered.slice(start, start + limit);
        const pages = Math.max(1, Math.ceil(total / limit));

        return {
          success: true,
          data,
          count: data.length,
          total,
          page,
          pages
        } as PaginatedResponse<Product[]>;
      })
    );
  }

  getProduct(id: string): Observable<{ success: boolean; data: Product }> {
    const dbRef = ref(this.db, `products/${id}`);
    const categoriesRef = ref(this.db, 'categories');

    return from(Promise.all([get(dbRef), get(categoriesRef)])).pipe(
      map(([productSnapshot, categoriesSnapshot]) => {
        const categoriesValue = categoriesSnapshot.val() || {};
        const categoriesById = Object.entries(categoriesValue).reduce<Record<string, Category>>((accumulator, [categoryId, raw]: any) => {
          accumulator[categoryId] = {
            _id: categoryId,
            ...(raw || {})
          } as Category;
          return accumulator;
        }, {});

        return {
          success: productSnapshot.exists(),
          data: this.normalizeProduct(id, productSnapshot.val() || {}, categoriesById)
        };
      })
    );
  }

  createProduct(product: Partial<Product>): Observable<{ success: boolean; data: Product }> {
    const dbRef = ref(this.db, 'products');
    const newRef = push(dbRef);
    return from(set(newRef, product)).pipe(
      map(() => ({ success: true, data: { _id: newRef.key as string, ...(product as any) } as Product }))
    );
  }

  updateProduct(id: string, product: Partial<Product>): Observable<{ success: boolean; data: Product }> {
    const dbRef = ref(this.db, `products/${id}`);
    return from(update(dbRef, product as any)).pipe(
      map(() => ({ success: true, data: { _id: id, ...(product as any) } as Product }))
    );
  }

  deleteProduct(id: string): Observable<{ success: boolean; data: {} }> {
    const dbRef = ref(this.db, `products/${id}`);
    return from(remove(dbRef)).pipe(map(() => ({ success: true, data: {} })));
  }
}
