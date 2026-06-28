import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, forkJoin, from, map, switchMap, tap, throwError } from 'rxjs';
import { get, ref, set, update, remove, push } from 'firebase/database';
import { getFirebaseDb, hasFirebaseConfig } from '@core/services/firebase-admin';
import {
  DashboardStats,
  AdminProduct,
  AdminCategory,
  AdminOrder,
  AdminUser,
  AdminPromotion,
  AuditLog,
  PaginatedResponse,
  ProductFormData,
  CategoryFormData,
  PromotionFormData,
  OrderStatusUpdate,
  StockUpdate
} from '../models/admin.models';

type FirebaseRecord = Record<string, any>;

function toArray<T extends { _id?: string }>(value: FirebaseRecord | null): T[] {
  if (!value) return [];
  return Object.entries(value).map(([id, item]) => ({ _id: id, ...(item as Record<string, any>) })) as T[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly basePath = '';
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  private _dashboardStats = signal<DashboardStats | null>(null);
  private _products = signal<AdminProduct[]>([]);
  private _categories = signal<AdminCategory[]>([]);
  private _orders = signal<AdminOrder[]>([]);
  private _users = signal<AdminUser[]>([]);
  private _promotions = signal<AdminPromotion[]>([]);
  private _auditLogs = signal<AuditLog[]>([]);
  private _lowStockThreshold = signal<number>(10);
  private _currency = signal<string>('GBP');
  private _exchangeRates = signal<any>(null);

  private _productPagination = signal({ page: 1, limit: 20, total: 0, pages: 0 });
  private _orderPagination = signal({ page: 1, limit: 20, total: 0, pages: 0 });
  private _userPagination = signal({ page: 1, limit: 20, total: 0, pages: 0 });
  private _auditPagination = signal({ page: 1, limit: 50, total: 0, pages: 0 });

  loading = this._loading.asReadonly();
  error = this._error.asReadonly();
  dashboardStats = this._dashboardStats.asReadonly();
  products = this._products.asReadonly();
  categories = this._categories.asReadonly();
  orders = this._orders.asReadonly();
  users = this._users.asReadonly();
  promotions = this._promotions.asReadonly();
  auditLogs = this._auditLogs.asReadonly();
  lowStockThreshold = this._lowStockThreshold.asReadonly();
  currency = this._currency.asReadonly();
  exchangeRates = this._exchangeRates.asReadonly();
  productPagination = this._productPagination.asReadonly();
  orderPagination = this._orderPagination.asReadonly();
  userPagination = this._userPagination.asReadonly();
  auditPagination = this._auditPagination.asReadonly();
  lowStockProducts = computed(() => this._products().filter(product => product.stockQuantity <= this._lowStockThreshold()));
  activePromotions = computed(() => this._promotions().filter(promotion => promotion.active && new Date(promotion.endDate) >= new Date()));

  private db() {
    if (!hasFirebaseConfig()) {
      throw new Error('Firebase configuration is missing.');
    }
    return getFirebaseDb();
  }

  private path(...parts: string[]): string {
    return [this.basePath, ...parts].filter(Boolean).join('/');
  }

  private setLoading(value: boolean): void {
    this._loading.set(value);
  }

  private setError(message: string | null): void {
    this._error.set(message);
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '').toLowerCase();
  }

  private normalizeDateInput(value: unknown): string {
    if (typeof value === 'number') {
      return new Date(value).toISOString();
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }

    return new Date().toISOString();
  }

  private normalizeTimestamp(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = new Date(value).getTime();
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return Date.now();
  }

  private normalizeOrderStatusValue(value: unknown): AdminOrder['status'] {
    const normalized = this.normalizeText(value);
    if (normalized.includes('ship')) return 'shipped';
    if (normalized.includes('deliver')) return 'delivered';
    if (normalized.includes('cancel')) return 'cancelled';
    if (normalized.includes('process')) return 'processing';
    return 'pending';
  }

  private normalizePaymentStatusValue(value: unknown, fallbackStatus?: unknown): AdminOrder['paymentStatus'] {
    const normalized = this.normalizeText(value || fallbackStatus);
    if (normalized.includes('refund')) return 'refunded';
    if (normalized.includes('fail')) return 'failed';
    if (normalized.includes('paid') || normalized.includes('deliver') || normalized.includes('ship') || normalized.includes('success')) {
      return 'paid';
    }
    return 'pending';
  }

  private normalizeCategoryId(category: AdminProduct['category']): string {
    return typeof category === 'string' ? category : category?._id || category?.slug || category?.name || '';
  }

  private normalizeProduct(product: AdminProduct | Record<string, any>, id?: string): AdminProduct {
    const stockQuantity = Number((product as any).stockQuantity ?? (product as any).stock ?? 0);
    return {
      _id: (product as any)._id || id || '',
      name: (product as any).name || '',
      slug: (product as any).slug,
      sku: (product as any).sku,
      description: (product as any).description || '',
      shortDescription: (product as any).shortDescription,
      price: Number((product as any).price || 0),
      originalPrice: (product as any).originalPrice !== undefined ? Number((product as any).originalPrice) : undefined,
      category: (product as any).category || '',
      productType: (product as any).productType,
      images: Array.isArray((product as any).images) ? (product as any).images : [],
      primaryImage: (product as any).primaryImage,
      inStock: (product as any).inStock !== undefined ? Boolean((product as any).inStock) : stockQuantity > 0,
      stock: stockQuantity,
      stockQuantity,
      featured: Boolean((product as any).featured),
      dimensions: (product as any).dimensions,
      materials: Array.isArray((product as any).materials) ? (product as any).materials : undefined,
      colors: Array.isArray((product as any).colors) ? (product as any).colors : undefined,
      tags: Array.isArray((product as any).tags) ? (product as any).tags : undefined,
      rating: Number((product as any).rating || 0),
      reviews: Number((product as any).reviews || 0),
      createdAt: this.normalizeDateInput((product as any).createdAt),
      updatedAt: this.normalizeDateInput((product as any).updatedAt || (product as any).createdAt)
    };
  }

  private normalizeCategory(category: AdminCategory | Record<string, any>, id?: string, productCount = 0): AdminCategory {
    return {
      _id: (category as any)._id || id || '',
      name: (category as any).name || '',
      description: (category as any).description,
      slug: (category as any).slug || '',
      icon: (category as any).icon,
      parent: (category as any).parent,
      active: (category as any).active !== false,
      productCount,
      createdAt: this.normalizeDateInput((category as any).createdAt),
      updatedAt: this.normalizeDateInput((category as any).updatedAt || (category as any).createdAt)
    };
  }

  private normalizeUser(user: AdminUser | Record<string, any>, id?: string): AdminUser {
    return {
      _id: (user as any)._id || id || '',
      name: (user as any).name || '',
      email: (user as any).email || '',
      phone: (user as any).phone,
      role: (user as any).role === 'admin' ? 'admin' : 'user',
      isActive: (user as any).isActive !== false,
      isEmailVerified: (user as any).isEmailVerified !== false,
      authProvider: (user as any).authProvider === 'google' ? 'google' : 'local',
      avatar: (user as any).avatar,
      address: (user as any).address,
      orderCount: Number((user as any).orderCount || 0),
      totalSpent: Number((user as any).totalSpent || 0),
      createdAt: this.normalizeDateInput((user as any).createdAt),
      updatedAt: this.normalizeDateInput((user as any).updatedAt || (user as any).createdAt)
    };
  }

  private normalizeOrder(order: AdminOrder | Record<string, any>, id?: string): AdminOrder {
    const normalizedItems = Array.isArray((order as any).items)
      ? (order as any).items.map((item: any) => ({
          product: typeof item.product === 'string'
            ? { _id: item.product, name: item.name || item.product, primaryImage: item.primaryImage, price: Number(item.price || 0), sku: item.sku }
            : {
                _id: item.product?._id || item.productId || '',
                name: item.product?.name || item.name || 'Sản phẩm',
                primaryImage: item.product?.primaryImage,
                price: Number(item.price || item.product?.price || 0),
                sku: item.product?.sku || item.sku
              },
          quantity: Number(item.quantity || 0),
          price: Number(item.price || item.product?.price || 0),
          sku: item.sku || item.product?.sku
        }))
      : [];

    const receiverName = (order as any).receiverName || (order as any).user?.name || 'Khách hàng';
    const receiverEmail = (order as any).user?.email || (order as any).email || '';
    const receiverPhone = (order as any).receiverPhone || (order as any).user?.phone || '';
    const addressDetail = (order as any).addressDetail || '';

    return {
      _id: (order as any)._id || (order as any).orderId || id || '',
      user: {
        _id: this.resolveUserId((order as any).user) || (order as any).userId || '',
        name: receiverName,
        email: receiverEmail,
        phone: receiverPhone || undefined
      },
      items: normalizedItems,
      totalAmount: Number((order as any).totalAmount || (order as any).subtotal || 0) + Number((order as any).shippingFee || 0),
      shippingAddress: (order as any).shippingAddress || {
        street: addressDetail,
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      status: this.normalizeOrderStatusValue((order as any).status),
      paymentStatus: this.normalizePaymentStatusValue((order as any).paymentStatus, (order as any).status),
      paymentMethod: (order as any).paymentMethod,
      trackingNumber: (order as any).trackingNumber,
      notes: (order as any).notes || addressDetail,
      createdAt: this.normalizeDateInput((order as any).createdAt || (order as any).timestamp),
      updatedAt: this.normalizeDateInput((order as any).updatedAt || (order as any).createdAt || (order as any).timestamp)
    };
  }

  private normalizePromotion(promotion: AdminPromotion | Record<string, any>, id?: string): AdminPromotion {
    const active = (promotion as any).active !== false && (promotion as any).isActive !== false;
    return {
      _id: (promotion as any)._id || id || '',
      code: (promotion as any).code || '',
      name: (promotion as any).name || '',
      description: (promotion as any).description,
      type: (promotion as any).type || 'percentage',
      value: Number((promotion as any).value || 0),
      minOrderAmount: (promotion as any).minOrderAmount !== undefined ? Number((promotion as any).minOrderAmount) : undefined,
      maxDiscount: (promotion as any).maxDiscount !== undefined ? Number((promotion as any).maxDiscount) : undefined,
      usageLimit: (promotion as any).usageLimit !== undefined ? Number((promotion as any).usageLimit) : undefined,
      usagePerUser: (promotion as any).usagePerUser !== undefined ? Number((promotion as any).usagePerUser) : undefined,
      usedCount: Number((promotion as any).usedCount || (promotion as any).usageCount || 0),
      usageCount: Number((promotion as any).usageCount || (promotion as any).usedCount || 0),
      applicableProducts: Array.isArray((promotion as any).applicableProducts) ? (promotion as any).applicableProducts : undefined,
      applicableCategories: Array.isArray((promotion as any).applicableCategories) ? (promotion as any).applicableCategories : undefined,
      excludedProducts: Array.isArray((promotion as any).excludedProducts) ? (promotion as any).excludedProducts : undefined,
      startDate: this.normalizeDateInput((promotion as any).startDate),
      endDate: this.normalizeDateInput((promotion as any).endDate),
      active,
      isActive: active,
      createdBy: (promotion as any).createdBy || { _id: '', name: 'System', email: '' },
      createdAt: this.normalizeDateInput((promotion as any).createdAt),
      updatedAt: this.normalizeDateInput((promotion as any).updatedAt || (promotion as any).createdAt)
    };
  }

  private normalizeAuditLog(log: AuditLog | Record<string, any>, id?: string): AuditLog {
    const action = (log as any).action || (log as any).type || 'system_event';
    const createdAt = this.normalizeDateInput((log as any).createdAt || (log as any).timestamp);
    return {
      _id: (log as any)._id || id || '',
      action,
      entityType: (log as any).entityType || (log as any).type || 'notification',
      entityId: (log as any).entityId,
      entityName: (log as any).entityName,
      description: (log as any).description || (log as any).message || (log as any).title,
      user: (log as any).user || {
        _id: (log as any).userId || '',
        name: (log as any).userName || (log as any).title || 'System',
        email: (log as any).userEmail || ''
      },
      userName: (log as any).userName,
      userRole: (log as any).userRole,
      ipAddress: (log as any).ipAddress,
      changes: (log as any).changes,
      status: (log as any).status === 'failure' ? 'failure' : 'success',
      errorMessage: (log as any).errorMessage,
      createdAt
    };
  }

  private loadNotificationLogs(): Observable<AuditLog[]> {
    return from(get(ref(this.db(), 'notifications'))).pipe(
      map(snapshot => {
        const rootValue = snapshot.val() as FirebaseRecord | null;
        if (!rootValue) {
          return [];
        }

        return Object.entries(rootValue).flatMap(([userId, userNotifications]) => {
          if (!userNotifications || typeof userNotifications !== 'object') {
            return [];
          }

          return Object.entries(userNotifications as FirebaseRecord).map(([id, notification]) => this.normalizeAuditLog({
            _id: id,
            action: (notification as any).type || 'system_event',
            entityType: 'notification',
            description: (notification as any).message || (notification as any).title,
            userId,
            userName: (notification as any).title || 'System',
            status: 'success',
            timestamp: (notification as any).timestamp,
            createdAt: (notification as any).timestamp,
            ...notification
          }, id));
        });
      })
    );
  }

  private paginate<T>(items: T[], page = 1, limit = 20): PaginatedResponse<T> {
    const currentPage = Math.max(1, page);
    const pageSize = Math.max(1, limit);
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const start = (currentPage - 1) * pageSize;
    return {
      success: true,
      data: items.slice(start, start + pageSize),
      pagination: { page: currentPage, limit: pageSize, total, pages }
    };
  }

  private loadCollection<T extends { _id?: string }>(collection: string): Observable<T[]> {
    if (!hasFirebaseConfig()) {
      return throwError(() => new Error('Firebase configuration is missing.'));
    }
    return from(get(ref(this.db(), this.path(collection)))).pipe(map(snapshot => toArray<T>(snapshot.val() as FirebaseRecord | null)));
  }

  private loadRecord<T extends { _id?: string }>(collection: string, id: string): Observable<T> {
    if (!hasFirebaseConfig()) {
      return throwError(() => new Error('Firebase configuration is missing.'));
    }
    return from(get(ref(this.db(), this.path(collection, id)))).pipe(map(snapshot => ({ _id: id, ...(snapshot.val() || {}) } as T)));
  }

  private loadObject<T>(path: string, fallback: T): Observable<T> {
    if (!hasFirebaseConfig()) {
      return throwError(() => new Error('Firebase configuration is missing.'));
    }
    return from(get(ref(this.db(), path))).pipe(map(snapshot => (snapshot.val() ?? fallback) as T));
  }

  private resolveCategoryId(category: AdminProduct['category']): string {
    return typeof category === 'string' ? category : category?._id || category?.slug || category?.name || '';
  }

  private resolveUserId(user: AdminOrder['user']): string {
    return typeof user === 'string' ? user : user?._id || '';
  }

  private normalizeOrderStatus(status?: string): string {
    return status === 'pending_manual_payment' ? 'pending' : (status || 'pending');
  }

  private filterByDate<T extends { createdAt?: string }>(items: T[], dateRange?: { startDate?: string; endDate?: string }): T[] {
    if (!dateRange?.startDate && !dateRange?.endDate) return items;
    const start = dateRange.startDate ? new Date(dateRange.startDate).getTime() : null;
    const end = dateRange.endDate ? new Date(dateRange.endDate).getTime() : null;
    return items.filter(item => {
      const createdAt = new Date(item.createdAt || '').getTime();
      if (Number.isNaN(createdAt)) return true;
      if (start !== null && createdAt < start) return false;
      if (end !== null && createdAt > end) return false;
      return true;
    });
  }

  private mapProductForStorage(data: ProductFormData, existing?: Partial<AdminProduct>): Record<string, any> {
    return {
      ...existing,
      ...data,
      stock: data.stockQuantity,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private processStats(
    products: AdminProduct[],
    categories: AdminCategory[],
    orders: AdminOrder[],
    users: AdminUser[],
    promotions: AdminPromotion[],
    auditLogs: AuditLog[],
    settings: any,
    dateRange?: { startDate?: string; endDate?: string }
  ): DashboardStats {
    const normalizedOrders = orders.map(order => this.normalizeOrder(order));
    const normalizedProducts = products.map(product => this.normalizeProduct(product));
    const normalizedCategories = categories.map(category => this.normalizeCategory(category));
    const normalizedUsers = users.map(user => this.normalizeUser(user));

    const filteredOrders = this.filterByDate(normalizedOrders, dateRange);
    const revenueOrders = filteredOrders.filter(order => !['failed', 'refunded'].includes(order.paymentStatus));
    
    const topProductsMap = new Map<string, { name: string; totalSold: number; price: number; primaryImage?: string }>();
    const topRevenueMap = new Map<string, { name: string; totalRevenue: number }>();
    const heatmapMap = new Map<string, number>();
    const dailyRevenueMap = new Map<string, { total: number; count: number }>();
    const monthlyRevenueMap = new Map<string, { total: number; count: number }>();
    const ordersByStatusMap = new Map<string, number>();

    for (const order of filteredOrders) {
      const createdAt = new Date(order.createdAt || order.updatedAt);
      const normalizedStatus = this.normalizeOrderStatus(order.status);
      ordersByStatusMap.set(normalizedStatus, (ordersByStatusMap.get(normalizedStatus) || 0) + 1);
      
      const heatKey = `${createdAt.getDay() + 1}-${Math.floor(createdAt.getHours() / 2)}`;
      heatmapMap.set(heatKey, (heatmapMap.get(heatKey) || 0) + 1);

      if (!['failed', 'refunded'].includes(order.paymentStatus)) {
        const dayKey = `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}-${createdAt.getDate()}`;
        const monthKey = `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}`;
        
        const daily = dailyRevenueMap.get(dayKey) || { total: 0, count: 0 };
        daily.total += Number(order.totalAmount || 0);
        daily.count += 1;
        dailyRevenueMap.set(dayKey, daily);
        
        const monthly = monthlyRevenueMap.get(monthKey) || { total: 0, count: 0 };
        monthly.total += Number(order.totalAmount || 0);
        monthly.count += 1;
        monthlyRevenueMap.set(monthKey, monthly);
      }

      for (const item of order.items || []) {
        const productId = typeof item.product === 'string' ? item.product : item.product?._id;
        const productName = typeof item.product === 'string' ? item.product : item.product?.name || 'Sản phẩm';
        const productPrice = Number(item.price || item.product?.price || 0);
        const quantity = Number(item.quantity || 0);
        
        if (productId) {
          const sold = topProductsMap.get(productId) || { name: productName, totalSold: 0, price: productPrice, primaryImage: item.product?.primaryImage };
          sold.totalSold += quantity;
          topProductsMap.set(productId, sold);
          
          const revenue = topRevenueMap.get(productId) || { name: productName, totalRevenue: 0 };
          revenue.totalRevenue += productPrice * quantity;
          topRevenueMap.set(productId, revenue);
        }
      }
    }

    const lowStockThreshold = settings?.lowStockThreshold ?? this._lowStockThreshold();

    return {
      overview: {
        totalProducts: normalizedProducts.length,
        totalCategories: normalizedCategories.filter(category => category.active !== false).length,
        totalOrders: filteredOrders.length,
        totalUsers: normalizedUsers.filter(user => user.role === 'user').length,
        totalRevenue: revenueOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
        pendingOrders: filteredOrders.filter(order => ['pending', 'pending_manual_payment'].includes(order.status)).length,
        lowStockProducts: normalizedProducts.filter(product => Number(product.stockQuantity || 0) <= lowStockThreshold).length
      },
      recentOrders: [...filteredOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10),
      topProducts: [...topProductsMap.entries()].sort((a, b) => b[1].totalSold - a[1].totalSold).slice(0, 5).map(([id, item]) => ({ _id: id, ...item })),
      topProductsByRevenue: [...topRevenueMap.entries()].sort((a, b) => b[1].totalRevenue - a[1].totalRevenue).slice(0, 5).map(([id, item]) => ({ _id: id, ...item })),
      heatmapData: [...heatmapMap.entries()].map(([key, count]) => { const [day, hourInterval] = key.split('-').map(Number); return { _id: { day, hourInterval }, count }; }),
      ordersByStatus: Object.fromEntries(ordersByStatusMap.entries()),
      dailyRevenue: [...dailyRevenueMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, value]) => { const [year, month, day] = key.split('-').map(Number); return { _id: { year, month, day }, ...value }; }),
      monthlyRevenue: [...monthlyRevenueMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12).map(([key, value]) => { const [year, month] = key.split('-').map(Number); return { _id: { year, month }, ...value }; })
    };
  }

  loadDashboardStats(dateRange?: { startDate?: string; endDate?: string }): Observable<{ success: boolean; data: DashboardStats }> {
    this.setLoading(true);
    this.setError(null);

    return forkJoin({
      products: this.loadCollection<AdminProduct>('products'),
      categories: this.loadCollection<AdminCategory>('categories'),
      orders: this.loadCollection<AdminOrder>('orders'),
      users: this.loadCollection<AdminUser>('users'),
      promotions: this.loadCollection<AdminPromotion>('promotions'),
      auditLogs: this.loadCollection<AuditLog>('auditLogs'),
      settings: this.loadObject<any>(this.path('settings'), {})
    }).pipe(
      map(({ products, categories, orders, users, promotions, auditLogs, settings }) => {
        const stats = this.processStats(products, categories, orders, users, promotions, auditLogs, settings, dateRange);
        
        const lowStockThreshold = settings?.lowStockThreshold ?? this._lowStockThreshold();
        this._lowStockThreshold.set(lowStockThreshold);
        if (settings?.currency) this._currency.set(settings.currency);
        if (settings?.exchangeRates) this._exchangeRates.set(settings.exchangeRates);

        this._dashboardStats.set(stats);
        this.setLoading(false);
        return { success: true, data: stats };
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to load dashboard stats');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  loadDashboardStatsWithoutSetting(dateRange?: { startDate?: string; endDate?: string }): Observable<{ success: boolean; data: DashboardStats }> {
    return forkJoin({
      products: this.loadCollection<AdminProduct>('products'),
      categories: this.loadCollection<AdminCategory>('categories'),
      orders: this.loadCollection<AdminOrder>('orders'),
      users: this.loadCollection<AdminUser>('users'),
      promotions: this.loadCollection<AdminPromotion>('promotions'),
      auditLogs: this.loadCollection<AuditLog>('auditLogs'),
      settings: this.loadObject<any>(this.path('settings'), {})
    }).pipe(
      map(({ products, categories, orders, users, promotions, auditLogs, settings }) => {
        const stats = this.processStats(products, categories, orders, users, promotions, auditLogs, settings, dateRange);
        return { success: true, data: stats };
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  loadProducts(params?: { page?: number; limit?: number; search?: string; category?: string; inStock?: boolean; lowStock?: boolean; }): Observable<PaginatedResponse<AdminProduct>> {
    this.setLoading(true);
    this.setError(null);

    return this.loadCollection<AdminProduct>('products').pipe(
      map(products => {
        const normalizedProducts = products.map(product => this.normalizeProduct(product));
        let items = [...products];
        if (params?.search) {
          const search = this.normalizeText(params.search);
          items = normalizedProducts.filter(product => this.normalizeText(product.name).includes(search) || this.normalizeText(product.sku).includes(search) || this.normalizeText(product.description).includes(search));
        } else {
          items = normalizedProducts;
        }
        if (params?.category) items = items.filter(product => this.resolveCategoryId(product.category) === params.category);
        if (params?.inStock !== undefined) items = items.filter(product => product.inStock === params.inStock);
        if (params?.lowStock) items = items.filter(product => Number(product.stockQuantity || 0) <= this._lowStockThreshold());
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const response = this.paginate(items, params?.page || 1, params?.limit || 20);
        this._products.set(response.data);
        this._productPagination.set(response.pagination);
        this.setLoading(false);
        return response;
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to load products');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  createProduct(data: ProductFormData): Observable<{ success: boolean; data: AdminProduct }> {
    this.setLoading(true);
    this.setError(null);
    const collectionRef = ref(this.db(), this.path('products'));
    const newRef = push(collectionRef);
    const payload = this.mapProductForStorage(data);
    return from(set(newRef, payload)).pipe(
      map(() => ({ success: true, data: { _id: newRef.key as string, ...payload } as AdminProduct })),
      tap(response => {
        this._products.update(products => [response.data, ...products]);
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to create product');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  getProductById(id: string): Observable<{ success: boolean; data: AdminProduct }> {
    return this.loadRecord<AdminProduct>('products', id).pipe(map(data => ({ success: true, data: this.normalizeProduct(data, id) })));
  }

  updateProduct(id: string, data: Partial<ProductFormData>): Observable<{ success: boolean; data: AdminProduct }> {
    this.setLoading(true);
    return from(update(ref(this.db(), this.path('products', id)), { ...data, stock: data.stockQuantity, updatedAt: new Date().toISOString() })).pipe(
      switchMap(() => this.loadRecord<AdminProduct>('products', id)),
      map(dataRecord => ({ success: true, data: this.normalizeProduct(dataRecord, id) })),
      tap(response => {
        this._products.update(products => products.map(product => product._id === id ? response.data : product));
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to update product');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  deleteProduct(id: string): Observable<{ success: boolean; message: string }> {
    this.setLoading(true);
    return from(remove(ref(this.db(), this.path('products', id)))).pipe(
      map(() => ({ success: true, message: 'Product deleted' })),
      tap(() => {
        this._products.update(products => products.filter(product => product._id !== id));
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to delete product');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  bulkDeleteProducts(ids: string[]): Observable<{ success: boolean; message: string }> {
    this.setLoading(true);
    return from(Promise.all(ids.map(id => remove(ref(this.db(), this.path('products', id)))))).pipe(
      map(() => ({ success: true, message: 'Products deleted' })),
      tap(() => {
        this._products.update(products => products.filter(product => !ids.includes(product._id)));
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to delete products');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  updateProductStock(id: string, stockQuantity: number, reason?: string): Observable<{ success: boolean; data: AdminProduct }> {
    const payload: Record<string, any> = { stockQuantity, stock: stockQuantity, updatedAt: new Date().toISOString() };
    if (reason) payload['reason'] = reason;
    return from(update(ref(this.db(), this.path('products', id)), payload)).pipe(
      switchMap(() => this.loadRecord<AdminProduct>('products', id)),
      map(dataRecord => ({ success: true, data: dataRecord })),
      tap(response => {
        this._products.update(products => products.map(product => product._id === id ? response.data : product));
      })
    );
  }

  loadCategories(): Observable<{ success: boolean; data: AdminCategory[] }> {
    this.setLoading(true);
    this.setError(null);
    return forkJoin({ categories: this.loadCollection<AdminCategory>('categories'), products: this.loadCollection<AdminProduct>('products') }).pipe(
      map(({ categories, products }) => {
        const normalizedProducts = products.map(product => this.normalizeProduct(product));
        const normalizedCategories = categories.map(category => this.normalizeCategory(category));
        const productCountByCategory = new Map<string, number>();
        normalizedProducts.forEach(product => {
          const categoryId = this.resolveCategoryId(product.category);
          if (!categoryId) return;
          productCountByCategory.set(categoryId, (productCountByCategory.get(categoryId) || 0) + 1);
        });
        const mapped = normalizedCategories.map(category => ({ ...category, productCount: productCountByCategory.get(category._id) || 0 }));
        this._categories.set(mapped);
        this.setLoading(false);
        return { success: true, data: mapped };
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to load categories');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  createCategory(data: CategoryFormData): Observable<{ success: boolean; data: AdminCategory }> {
    this.setLoading(true);
    const collectionRef = ref(this.db(), this.path('categories'));
    const newRef = push(collectionRef);
    const payload = { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return from(set(newRef, payload)).pipe(
      map(() => ({ success: true, data: { _id: newRef.key as string, ...payload, productCount: 0 } as AdminCategory })),
      tap(response => {
        this._categories.update(categories => [...categories, response.data]);
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to create category');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  updateCategory(id: string, data: Partial<CategoryFormData>): Observable<{ success: boolean; data: AdminCategory }> {
    this.setLoading(true);
    return from(update(ref(this.db(), this.path('categories', id)), { ...data, updatedAt: new Date().toISOString() })).pipe(
      switchMap(() => this.loadRecord<AdminCategory>('categories', id)),
      map(dataRecord => ({ success: true, data: dataRecord })),
      tap(response => {
        this._categories.update(categories => categories.map(category => category._id === id ? { ...response.data, productCount: category.productCount } : category));
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to update category');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  deleteCategory(id: string): Observable<{ success: boolean; message: string }> {
    this.setLoading(true);
    return from(remove(ref(this.db(), this.path('categories', id)))).pipe(
      map(() => ({ success: true, message: 'Category deleted' })),
      tap(() => {
        this._categories.update(categories => categories.filter(category => category._id !== id));
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to delete category');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  loadOrders(params?: { page?: number; limit?: number; status?: string; paymentStatus?: string; search?: string; startDate?: string; endDate?: string; }): Observable<PaginatedResponse<AdminOrder>> {
    this.setLoading(true);
    this.setError(null);
    return this.loadCollection<AdminOrder>('orders').pipe(
      map(orders => {
        let items = this.filterByDate(orders.map(order => this.normalizeOrder(order)), { startDate: params?.startDate, endDate: params?.endDate });
        if (params?.status) items = items.filter(order => this.normalizeOrderStatus(order.status) === params.status);
        if (params?.paymentStatus) items = items.filter(order => order.paymentStatus === params.paymentStatus);
        if (params?.search) {
          const search = this.normalizeText(params.search);
          items = items.filter(order => this.normalizeText(order._id).includes(search) || this.normalizeText(order.user?.name).includes(search) || this.normalizeText(order.user?.email).includes(search));
        }
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const response = this.paginate(items, params?.page || 1, params?.limit || 20);
        this._orders.set(response.data);
        this._orderPagination.set(response.pagination);
        this.setLoading(false);
        return response;
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to load orders');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  getOrderById(id: string): Observable<{ success: boolean; data: AdminOrder }> {
    return this.loadRecord<AdminOrder>('orders', id).pipe(map(data => ({ success: true, data: this.normalizeOrder(data, id) })));
  }

  updateOrderStatus(id: string, data: OrderStatusUpdate): Observable<{ success: boolean; data: AdminOrder }> {
    this.setLoading(true);
    return from(update(ref(this.db(), this.path('orders', id)), { ...data, updatedAt: new Date().toISOString() })).pipe(
      switchMap(() => this.loadRecord<AdminOrder>('orders', id)),
      map(dataRecord => ({ success: true, data: this.normalizeOrder(dataRecord, id) })),
      tap(response => {
        this._orders.update(orders => orders.map(order => order._id === id ? response.data : order));
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to update order');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  cancelOrder(id: string, reason?: string): Observable<{ success: boolean; data: AdminOrder; message: string }> {
    this.setLoading(true);
    return from(update(ref(this.db(), this.path('orders', id)), { status: 'cancelled', paymentStatus: 'refunded', cancelReason: reason || '', updatedAt: new Date().toISOString() })).pipe(
      switchMap(() => this.loadRecord<AdminOrder>('orders', id)),
      map(dataRecord => ({ success: true, data: this.normalizeOrder(dataRecord, id), message: 'Order cancelled' })),
      tap(response => {
        this._orders.update(orders => orders.map(order => order._id === id ? response.data : order));
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to cancel order');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  loadUsers(params?: { page?: number; limit?: number; role?: string; search?: string; active?: boolean; }): Observable<PaginatedResponse<AdminUser>> {
    this.setLoading(true);
    this.setError(null);
    return this.loadCollection<AdminUser>('users').pipe(
      map(users => {
        let items = users.map(user => this.normalizeUser(user));
        if (params?.role) items = items.filter(user => user.role === params.role);
        if (params?.search) {
          const search = this.normalizeText(params.search);
          items = items.filter(user => this.normalizeText(user.name).includes(search) || this.normalizeText(user.email).includes(search));
        }
        if (params?.active !== undefined) items = items.filter(user => user.isActive === params.active);
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const response = this.paginate(items, params?.page || 1, params?.limit || 20);
        this._users.set(response.data);
        this._userPagination.set(response.pagination);
        this.setLoading(false);
        return response;
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to load users');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  getUserById(id: string): Observable<{ success: boolean; data: AdminUser & { recentOrders: AdminOrder[] } }> {
    return forkJoin({ user: this.loadRecord<AdminUser>('users', id), orders: this.loadCollection<AdminOrder>('orders') }).pipe(
      map(({ user, orders }) => ({
        success: true,
        data: {
          ...this.normalizeUser(user, id),
          recentOrders: orders.map(order => this.normalizeOrder(order)).filter(order => this.resolveUserId(order.user) === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        }
      }))
    );
  }

  updateUserRole(id: string, role: 'user' | 'admin'): Observable<{ success: boolean; data: AdminUser }> {
    this.setLoading(true);
    return from(update(ref(this.db(), this.path('users', id)), { role, updatedAt: new Date().toISOString() })).pipe(
      switchMap(() => this.loadRecord<AdminUser>('users', id)),
      map(dataRecord => ({ success: true, data: this.normalizeUser(dataRecord, id) })),
      tap(response => {
        this._users.update(users => users.map(user => user._id === id ? response.data : user));
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to update user role');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  toggleUserStatus(id: string): Observable<{ success: boolean; data: AdminUser; message: string }> {
    this.setLoading(true);
    return this.getUserById(id).pipe(
      switchMap(response => from(update(ref(this.db(), this.path('users', id)), { isActive: !response.data.isActive, updatedAt: new Date().toISOString() })).pipe(
        switchMap(() => this.loadRecord<AdminUser>('users', id)),
        map(dataRecord => ({ success: true, data: this.normalizeUser(dataRecord, id), message: 'User status updated' }))
      )),
      tap(response => {
        this._users.update(users => users.map(user => user._id === id ? response.data : user));
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to update user status');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  loadPromotions(params?: { active?: boolean; type?: string; }): Observable<{ success: boolean; data: AdminPromotion[] }> {
    this.setLoading(true);
    this.setError(null);
    return this.loadCollection<AdminPromotion>('promotions').pipe(
      map(promotions => {
        let items = promotions.map(promotion => this.normalizePromotion(promotion));
        if (params?.active !== undefined) items = items.filter(promotion => promotion.active === params.active);
        if (params?.type) items = items.filter(promotion => promotion.type === params.type);
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this._promotions.set(items);
        this.setLoading(false);
        return { success: true, data: items };
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to load promotions');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  createPromotion(data: PromotionFormData): Observable<{ success: boolean; data: AdminPromotion }> {
    this.setLoading(true);
    const collectionRef = ref(this.db(), this.path('promotions'));
    const newRef = push(collectionRef);
    const payload = { ...data, usedCount: 0, usageCount: 0, active: data.active, isActive: data.active, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return from(set(newRef, payload)).pipe(
      map(() => ({ success: true, data: this.normalizePromotion({ _id: newRef.key as string, ...payload }) })),
      tap(response => {
        this._promotions.update(promotions => [response.data, ...promotions]);
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to create promotion');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  updatePromotion(id: string, data: Partial<PromotionFormData>): Observable<{ success: boolean; data: AdminPromotion }> {
    this.setLoading(true);
    return from(update(ref(this.db(), this.path('promotions', id)), { ...data, updatedAt: new Date().toISOString() })).pipe(
      switchMap(() => this.loadRecord<AdminPromotion>('promotions', id)),
      map(dataRecord => ({ success: true, data: this.normalizePromotion(dataRecord, id) })),
      tap(response => {
        this._promotions.update(promotions => promotions.map(promotion => promotion._id === id ? response.data : promotion));
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to update promotion');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  deletePromotion(id: string): Observable<{ success: boolean; message: string }> {
    this.setLoading(true);
    return from(remove(ref(this.db(), this.path('promotions', id)))).pipe(
      map(() => ({ success: true, message: 'Promotion deleted' })),
      tap(() => {
        this._promotions.update(promotions => promotions.filter(promotion => promotion._id !== id));
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to delete promotion');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  togglePromotionStatus(id: string): Observable<{ success: boolean; data: AdminPromotion }> {
    return this.loadRecord<AdminPromotion>('promotions', id).pipe(
      switchMap(promotion => from(update(ref(this.db(), this.path('promotions', id)), { active: !this.normalizePromotion(promotion, id).active, isActive: !this.normalizePromotion(promotion, id).active, updatedAt: new Date().toISOString() })).pipe(
        switchMap(() => this.loadRecord<AdminPromotion>('promotions', id)),
        map(dataRecord => ({ success: true, data: this.normalizePromotion(dataRecord, id) }))
      )),
      tap(response => {
        this._promotions.update(promotions => promotions.map(promotion => promotion._id === id ? response.data : promotion));
      })
    );
  }

  updateStock(id: string, stock: number): Observable<{ success: boolean; data: AdminProduct }> {
    return from(update(ref(this.db(), this.path('products', id)), { stockQuantity: stock, stock, updatedAt: new Date().toISOString() })).pipe(
      switchMap(() => this.loadRecord<AdminProduct>('products', id)),
      map(dataRecord => ({ success: true, data: dataRecord })),
      tap(response => {
        this._products.update(products => products.map(product => product._id === id ? response.data : product));
      })
    );
  }

  getLowStockProducts(threshold?: number): Observable<{ success: boolean; data: AdminProduct[] }> {
    const limit = threshold ?? this._lowStockThreshold();
    return this.loadCollection<AdminProduct>('products').pipe(map(products => ({ success: true, data: products.filter(product => Number(product.stockQuantity || 0) <= limit) })));
  }

  bulkUpdateStock(updates: StockUpdate[]): Observable<{ success: boolean; data: any[] }> {
    const tasks = updates.map(item => update(ref(this.db(), this.path('products', item.productId)), { stockQuantity: item.stockQuantity, stock: item.stockQuantity, updatedAt: new Date().toISOString(), stockReason: item.reason || '' }));
    return from(Promise.all(tasks)).pipe(map(() => ({ success: true, data: updates })));
  }

  loadAuditLogs(params?: { page?: number; limit?: number; action?: string; entityType?: string; user?: string; startDate?: string; endDate?: string; }): Observable<PaginatedResponse<AuditLog>> {
    this.setLoading(true);
    this.setError(null);
    return this.loadCollection<AuditLog>('auditLogs').pipe(
      switchMap(logs => {
        const normalizedLogs = logs.length > 0 ? logs.map(log => this.normalizeAuditLog(log)) : [];
        const source$ = normalizedLogs.length > 0 ? from([normalizedLogs]) : this.loadNotificationLogs().pipe(map(notificationLogs => notificationLogs.map(log => this.normalizeAuditLog(log))));

        return source$.pipe(map((sourceLogs) => {
          let items = this.filterByDate(sourceLogs, { startDate: params?.startDate, endDate: params?.endDate });
          if (params?.action) items = items.filter(log => log.action === params.action);
          if (params?.entityType) items = items.filter(log => log.entityType === params.entityType);
          if (params?.user) {
            const search = this.normalizeText(params.user);
            items = items.filter(log => this.normalizeText(log.userName || log.user?.name || log.user?.email).includes(search));
          }
          items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const response = this.paginate(items, params?.page || 1, params?.limit || 50);
          this._auditLogs.set(response.data);
          this._auditPagination.set(response.pagination);
          this.setLoading(false);
          return response;
        }));
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to load audit logs');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  loadSettings(): Observable<any> {
    this.setLoading(true);
    this.setError(null);
    return this.loadObject<any>(this.path('settings'), { lowStockThreshold: 10, currency: 'GBP' }).pipe(
      map(settings => ({ success: true, data: settings, exchangeRates: settings.exchangeRates })),
      tap(response => {
        if (response.data?.lowStockThreshold !== undefined) this._lowStockThreshold.set(response.data.lowStockThreshold);
        if (response.data?.currency) this._currency.set(response.data.currency);
        if (response.exchangeRates) this._exchangeRates.set(response.exchangeRates);
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to load settings');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  updateSettings(settings: any): Observable<any> {
    this.setLoading(true);
    this.setError(null);
    return from(set(ref(this.db(), this.path('settings')), settings)).pipe(
      map(() => ({ success: true, data: settings })),
      tap(response => {
        if (settings.lowStockThreshold !== undefined) this._lowStockThreshold.set(settings.lowStockThreshold);
        if (response.data?.currency) this._currency.set(response.data.currency);
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to update settings');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  resetSettings(): Observable<any> {
    this.setLoading(true);
    this.setError(null);
    const defaults = { lowStockThreshold: 10, currency: 'GBP', updatedAt: new Date().toISOString() };
    return from(set(ref(this.db(), this.path('settings')), defaults)).pipe(
      map(() => ({ success: true, data: defaults })),
      tap(() => {
        this._lowStockThreshold.set(10);
        this._currency.set('GBP');
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError(error?.message || 'Failed to reset settings');
        this.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  clearError(): void {
    this._error.set(null);
  }

  clearState(): void {
    this._dashboardStats.set(null);
    this._products.set([]);
    this._categories.set([]);
    this._orders.set([]);
    this._users.set([]);
    this._promotions.set([]);
    this._auditLogs.set([]);
    this._error.set(null);
  }
}
