import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';

export const adminRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/auth/admin-login.component').then(m => m.AdminLoginComponent)
  },
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () => import('./components/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./components/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./components/products/product-list.component').then(m => m.ProductListComponent)
      },
      {
        path: 'products/new',
        loadComponent: () => import('./components/products/product-form.component').then(m => m.ProductFormComponent)
      },
      {
        path: 'products/:id/edit',
        loadComponent: () => import('./components/products/product-form.component').then(m => m.ProductFormComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./components/categories/category-list.component').then(m => m.CategoryListComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./components/orders/order-list.component').then(m => m.OrderListComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./components/users/user-list.component').then(m => m.UserListComponent)
      },
      {
        path: 'promotions',
        loadComponent: () => import('./components/promotions/promotion-list.component').then(m => m.PromotionListComponent)
      },
      {
        path: 'inventory',
        loadComponent: () => import('./components/inventory/inventory.component').then(m => m.InventoryComponent)
      },
      {
        path: 'audit-logs',
        loadComponent: () => import('./components/audit-logs/audit-logs.component').then(m => m.AuditLogsComponent)
      }
    ]
  }
];
