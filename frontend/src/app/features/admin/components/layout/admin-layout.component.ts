import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '@core/components/language-switcher/language-switcher.component';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminService } from '../../services/admin.service';
import { environment } from '@environments/environment';
import { AuditLog } from '../../models/admin.models';

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, LanguageSwitcherComponent],
  template: `
    <div class="admin-layout" [class.dark-mode]="isDarkMode()">
      <aside class="sidebar" [class.collapsed]="isSidebarCollapsed()">
        <div class="sidebar-header">
          <a routerLink="/admin" class="logo" aria-label="Admin Dashboard Home">
            <span class="logo-mark" aria-hidden="true">
              <img src="assets/images/P-logo.png" alt="Ponsai logo" class="logo-image">
            </span>
            <span class="logo-content">
              <span class="logo-text">{{ projectName }}</span>
              <span class="logo-subtitle">Admin Panel</span>
            </span>
          </a>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section">
            <span class="nav-section-title">Overview</span>
            <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
              <span class="nav-icon" aria-hidden="true">
                <i class="bi bi-admin-dashboard"></i>
              </span>
              {{ 'admin.dashboard' | translate }}
            </a>
          </div>

          <div class="nav-section">
            <span class="nav-section-title">Management</span>
            <a routerLink="/admin/products" routerLinkActive="active" class="nav-item">
              <span class="nav-icon" aria-hidden="true">
                <i class="bi bi-admin-products"></i>
              </span>
              {{ 'admin.products' | translate }}
            </a>
            <a routerLink="/admin/categories" routerLinkActive="active" class="nav-item">
              <span class="nav-icon" aria-hidden="true">
                <i class="bi bi-admin-categories"></i>
              </span>
              {{ 'admin.categories' | translate }}
            </a>
            <a routerLink="/admin/inventory" routerLinkActive="active" class="nav-item">
              <span class="nav-icon" aria-hidden="true">
                <i class="bi bi-admin-inventory"></i>
              </span>
              {{ 'admin.inventory' | translate }}
            </a>
          </div>

          <div class="nav-section">
            <span class="nav-section-title">Sales</span>
            <a routerLink="/admin/orders" routerLinkActive="active" class="nav-item">
              <span class="nav-icon" aria-hidden="true">
                <i class="bi bi-admin-orders"></i>
              </span>
              {{ 'admin.orders' | translate }}
            </a>
            <a routerLink="/admin/users" routerLinkActive="active" class="nav-item">
              <span class="nav-icon" aria-hidden="true">
                <i class="bi bi-admin-users"></i>
              </span>
              {{ 'admin.customers' | translate }}
            </a>
            <a routerLink="/admin/promotions" routerLinkActive="active" class="nav-item">
              <span class="nav-icon" aria-hidden="true">
                <i class="bi bi-admin-promotions"></i>
              </span>
              {{ 'admin.promotions' | translate }}
            </a>
          </div>

          <div class="nav-section">
            <span class="nav-section-title">System</span>
            <a routerLink="/admin/audit-logs" routerLinkActive="active" class="nav-item">
              <span class="nav-icon" aria-hidden="true">
                <i class="bi bi-admin-audit"></i>
              </span>
              {{ 'admin.auditLogs' | translate }}
              @if (unreadNotificationsCount() > 0) {
                <span class="nav-badge">{{ unreadNotificationsCount() }}</span>
              }
            </a>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user">
            @if (currentUser$ | async; as currentUser) {
              <span class="user-locale">{{ getUserInitials(currentUser.name) }}</span>
              <div class="user-meta">
                <strong>{{ currentUser.name }}</strong>
                <span>{{ currentUser.email }}</span>
              </div>
            } @else {
              <span class="user-locale">AD</span>
              <div class="user-meta">
                <strong>{{ projectName }} Admin</strong>
                <span>admin&#64;ponsai.vn</span>
              </div>
            }
            <span class="user-arrow" aria-hidden="true">
              <i class="bi bi-admin-chevron-down"></i>
            </span>
          </div>

          <div class="language-switcher-wrapper">
            <app-language-switcher></app-language-switcher>
          </div>

          <a routerLink="/" class="back-to-site">{{ 'admin.backToStore' | translate }}</a>
        </div>
      </aside>

      <main class="main-content" [class.sidebar-collapsed]="isSidebarCollapsed()">
        <header class="topbar">
          <div class="topbar-left">
            <button type="button" class="topbar-menu-btn" aria-label="Toggle menu" (click)="toggleSidebar()">
              <i class="bi bi-admin-menu"></i>
            </button>
            <span class="topbar-separator" aria-hidden="true"></span>
            <span class="topbar-title">{{ getPageTitle() }}</span>
          </div>

          <div class="topbar-right">
            <div class="topbar-search">
              <span class="search-icon" aria-hidden="true">
                <i class="bi bi-admin-search"></i>
              </span>
              <input type="text" placeholder="Search..." />
              <span class="search-shortcut">Ctrl K</span>
            </div>
            <button
              type="button"
              class="topbar-icon-btn notification-btn"
              aria-label="Notifications"
              [class.active]="showNotifications()"
              [attr.aria-expanded]="showNotifications()"
              (click)="toggleNotifications()">
              <i class="bi bi-admin-notification"></i>
              @if (unreadNotificationsCount() > 0) {
                <span class="notif-dot">{{ unreadNotificationsCount() }}</span>
              }
            </button>

            <button
              type="button"
              class="topbar-icon-btn"
              [class.active]="isDarkMode()"
              [attr.aria-label]="isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'"
              (click)="toggleTheme()">
              <i class="bi bi-admin-theme"></i>
            </button>

            @if (showNotifications()) {
              <div class="notification-popover" role="dialog" aria-label="Notifications panel">
                <div class="notification-header">
                  <strong>Thông báo</strong>
                  <button
                    type="button"
                    class="mark-read-btn"
                    (click)="markAllNotificationsAsRead()"
                    [disabled]="unreadNotificationsCount() === 0">
                    Đánh dấu đã đọc
                  </button>
                </div>

                <div class="notification-list">
                  @if (isLoadingNotifications()) {
                    <div class="notification-state">Đang tải thông báo...</div>
                  } @else if (notificationError()) {
                    <div class="notification-state">
                      <span>{{ notificationError() }}</span>
                      <button type="button" class="mark-read-btn" (click)="loadNotificationsFromBackend()">Thử lại</button>
                    </div>
                  } @else if (notifications().length === 0) {
                    <div class="notification-state">Hiện chưa có thông báo mới.</div>
                  } @else {
                    @for (notification of notifications(); track notification.id) {
                      <button
                        type="button"
                        class="notification-item"
                        [class.unread]="!notification.read"
                        (click)="markNotificationAsRead(notification.id)">
                        <div class="notification-text">
                          <span class="notification-title">{{ notification.title }}</span>
                          <span class="notification-message">{{ notification.message }}</span>
                        </div>
                        <span class="notification-time">{{ notification.time }}</span>
                      </button>
                    }
                  }
                </div>
              </div>
            }
          </div>
        </header>

        @if (showNotifications()) {
          <button type="button" class="notification-backdrop" (click)="closeNotifications()" aria-label="Close notifications"></button>
        }

        <section class="content-area">
          <router-outlet></router-outlet>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .admin-layout {
      --admin-bg: #fafafa;
      --admin-surface: #ffffff;
      --admin-border: #e5e7eb;
      --admin-text: #111827;
      --admin-muted: #6b7280;
      --admin-accent: #eff6ff;
      --admin-accent-text: #1d4ed8;
      --admin-hover: #f3f4f6;
      display: flex;
      min-height: 100vh;
      background: var(--admin-bg);
      color: var(--admin-text);
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .admin-layout.dark-mode {
      --admin-bg: #0b1220;
      --admin-surface: #111827;
      --admin-border: #1f2937;
      --admin-text: #e5e7eb;
      --admin-muted: #9ca3af;
      --admin-accent: #1f2937;
      --admin-accent-text: #93c5fd;
      --admin-hover: #1f2937;
    }

    .sidebar {
      width: 218px;
      background: var(--admin-surface);
      border-right: 1px solid var(--admin-border);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 40;
      overflow: hidden;
      transition: transform 0.22s ease, opacity 0.22s ease;
    }

    .sidebar.collapsed {
      transform: translateX(-100%);
      opacity: 0;
      pointer-events: none;
    }

    .sidebar.collapsed .logo-content,
    .sidebar.collapsed .nav-section-title,
    .sidebar.collapsed .nav-badge,
    .sidebar.collapsed .sidebar-user,
    .sidebar.collapsed .language-switcher-wrapper,
    .sidebar.collapsed .back-to-site {
      display: none;
    }

    .sidebar.collapsed .sidebar-header {
      justify-content: center;
      padding: 0;
    }

    .sidebar.collapsed .logo {
      justify-content: center;
    }

    .sidebar.collapsed .nav-item {
      justify-content: center;
      padding: 8px;
    }

    .sidebar-header {
      height: 78px;
      display: flex;
      align-items: center;
      padding: 0 12px;
      border-bottom: 1px solid var(--admin-border);
      flex-shrink: 0;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--admin-text);
      text-decoration: none;
      min-width: 0;
    }

    .logo-mark {
      width: 32px;
      height: 32px;
      background: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }

    .admin-layout.dark-mode .logo-mark {
      background: #0f172a;
    }

    .logo-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .logo-content {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
      min-width: 0;
    }

    .logo-text {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--admin-text);
    }

    .logo-subtitle {
      font-size: 12px;
      font-weight: 500;
      color: var(--admin-muted);
      letter-spacing: -0.02em;
    }

    .sidebar-nav {
      flex: 1;
      padding: 12px 8px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-section-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--admin-muted);
      padding: 0 8px 6px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 34px;
      border-radius: 8px;
      padding: 7px 10px;
      text-decoration: none;
      color: var(--admin-text);
      border: 1px solid transparent;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
    }

    .nav-item:hover {
      background: var(--admin-hover);
      border-color: var(--admin-border);
    }

    .nav-item.active {
      background: var(--admin-accent);
      color: var(--admin-accent-text);
      border-color: #dbeafe;
    }

    .nav-icon {
      width: 14px;
      height: 14px;
      color: var(--admin-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .nav-icon i {
      width: 14px;
      height: 14px;
      font-size: 14px;
      display: block;
    }

    .nav-item.active .nav-icon {
      color: var(--admin-accent-text);
    }

    .nav-badge {
      margin-left: auto;
      font-size: 11px;
      font-weight: 700;
      color: inherit;
    }

    .sidebar-footer {
      border-top: 1px solid var(--admin-border);
      padding: 10px 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex-shrink: 0;
    }

    .sidebar-user {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      border-radius: 8px;
      color: var(--admin-text);
    }

    .user-locale {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      background: var(--admin-hover);
      color: var(--admin-text);
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-meta {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
      flex: 1;
    }

    .user-meta strong {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.15;
      color: var(--admin-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-meta span {
      font-size: 12px;
      color: var(--admin-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-arrow {
      width: 14px;
      height: 14px;
      color: var(--admin-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-arrow i {
      width: 14px;
      height: 14px;
      font-size: 14px;
      display: block;
    }

    .language-switcher-wrapper {
      padding: 0 6px;
    }

    .language-switcher-wrapper ::ng-deep .language-switcher {
      display: flex;
      align-items: center;
      gap: 4px;
      border-radius: 999px;
      border: 1px solid var(--admin-border);
      background: var(--admin-surface);
      padding: 3px;
      width: 100%;
    }

    .language-switcher-wrapper ::ng-deep .lang-btn {
      flex: 1;
      min-width: 0;
      height: 28px;
      border-radius: 999px;
      border: none;
      background: transparent;
      color: #6b7280;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      padding: 0;
      opacity: 1;
    }

    .language-switcher-wrapper ::ng-deep .lang-btn:hover {
      background: var(--admin-hover);
      color: var(--admin-text);
    }

    .language-switcher-wrapper ::ng-deep .lang-btn.active {
      background: #111827;
      color: #ffffff;
    }

    .back-to-site {
      text-align: center;
      font-size: 12px;
      color: var(--admin-muted);
      text-decoration: none;
      padding: 4px 8px 0;
    }

    .back-to-site:hover {
      color: var(--admin-text);
      text-decoration: underline;
    }

    .main-content {
      flex: 1;
      margin-left: 218px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .topbar {
      height: 56px;
      background: var(--admin-surface);
      border-bottom: 1px solid var(--admin-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      position: sticky;
      top: 0;
      z-index: 30;
    }

    .topbar-left,
    .topbar-right {
      display: flex;
      align-items: center;
    }

    .topbar-left {
      gap: 10px;
      min-width: 0;
    }

    .topbar-right {
      gap: 8px;
      position: relative;
    }

    .topbar-menu-btn,
    .topbar-icon-btn {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--admin-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: background-color 0.16s ease, color 0.16s ease;
    }

    .topbar-menu-btn:hover,
    .topbar-icon-btn:hover {
      background: var(--admin-hover);
      color: var(--admin-text);
    }

    .topbar-icon-btn.active,
    .topbar-menu-btn.active {
      background: #111827;
      color: #ffffff;
      border-color: #111827;
    }

    .admin-layout.dark-mode .topbar-icon-btn.active,
    .admin-layout.dark-mode .topbar-menu-btn.active {
      background: #374151;
      border-color: #374151;
    }

    .topbar-menu-btn i,
    .topbar-icon-btn i {
      width: 16px;
      height: 16px;
      font-size: 16px;
      display: block;
    }

    .topbar-separator {
      width: 1px;
      height: 16px;
      background: var(--admin-border);
      flex-shrink: 0;
    }

    .topbar-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--admin-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .topbar-search {
      width: 208px;
      height: 32px;
      border: 1px solid var(--admin-border);
      border-radius: 8px;
      background: var(--admin-bg);
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 8px;
      color: #9ca3af;
    }

    .topbar-search:focus-within {
      background: var(--admin-surface);
      border-color: #d1d5db;
      box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.12);
    }

    .search-icon {
      width: 14px;
      height: 14px;
      color: #9ca3af;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .search-icon i {
      width: 14px;
      height: 14px;
      font-size: 14px;
    }

    .topbar-search input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      color: var(--admin-text);
      font-size: 13px;
    }

    .topbar-search input::placeholder {
      color: #9ca3af;
    }

    .search-shortcut {
      border: 1px solid var(--admin-border);
      border-radius: 4px;
      background: var(--admin-surface);
      color: #9ca3af;
      font-size: 10px;
      font-weight: 600;
      line-height: 1;
      padding: 3px 5px;
      flex-shrink: 0;
    }

    .notification-popover {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 320px;
      max-width: min(88vw, 320px);
      background: var(--admin-surface);
      border: 1px solid var(--admin-border);
      border-radius: 12px;
      box-shadow: 0 20px 32px rgba(15, 23, 42, 0.18);
      z-index: 45;
      overflow: hidden;
    }

    .notification-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--admin-border);
    }

    .notification-header strong {
      font-size: 13px;
      color: var(--admin-text);
    }

    .mark-read-btn {
      border: 1px solid var(--admin-border);
      background: var(--admin-surface);
      color: var(--admin-text);
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .mark-read-btn:hover:not(:disabled) {
      background: var(--admin-hover);
    }

    .mark-read-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .notification-list {
      max-height: 280px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .notification-state {
      min-height: 92px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 12px;
      text-align: center;
      color: var(--admin-muted);
      font-size: 13px;
    }

    .notification-item {
      width: 100%;
      border: none;
      border-bottom: 1px solid var(--admin-border);
      background: transparent;
      text-align: left;
      padding: 10px 12px;
      cursor: pointer;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      color: var(--admin-text);
    }

    .notification-item:hover {
      background: var(--admin-hover);
    }

    .notification-item:last-child {
      border-bottom: none;
    }

    .notification-item.unread {
      background: rgba(59, 130, 246, 0.08);
    }

    .notification-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .notification-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--admin-text);
    }

    .notification-message {
      font-size: 12px;
      color: var(--admin-muted);
    }

    .notification-time {
      flex-shrink: 0;
      font-size: 11px;
      color: var(--admin-muted);
      margin-top: 1px;
    }

    .notification-backdrop {
      position: fixed;
      inset: 0;
      border: none;
      background: transparent;
      z-index: 35;
    }

    .notif-dot {
      position: absolute;
      top: 3px;
      right: 2px;
      min-width: 13px;
      height: 13px;
      border-radius: 999px;
      background: #ef4444;
      color: #ffffff;
      border: 2px solid var(--admin-surface);
      font-size: 9px;
      font-weight: 700;
      line-height: 9px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .content-area {
      flex: 1;
      padding: 24px;
      background: var(--admin-bg);
    }

    .main-content.sidebar-collapsed {
      margin-left: 0;
    }

    .admin-layout.dark-mode .main-content ::ng-deep .filters-bar,
    .admin-layout.dark-mode .main-content ::ng-deep .table-container,
    .admin-layout.dark-mode .main-content ::ng-deep .settings-card,
    .admin-layout.dark-mode .main-content ::ng-deep .stat-card,
    .admin-layout.dark-mode .main-content ::ng-deep .category-card,
    .admin-layout.dark-mode .main-content ::ng-deep .promotion-card,
    .admin-layout.dark-mode .main-content ::ng-deep .form-section,
    .admin-layout.dark-mode .main-content ::ng-deep .modal-content,
    .admin-layout.dark-mode .main-content ::ng-deep .chart-card,
    .admin-layout.dark-mode .main-content ::ng-deep .kpi-card,
    .admin-layout.dark-mode .main-content ::ng-deep .insights-panel,
    .admin-layout.dark-mode .main-content ::ng-deep .data-table-section,
    .admin-layout.dark-mode .main-content ::ng-deep .content-card,
    .admin-layout.dark-mode .main-content ::ng-deep .dashboard-card {
      background: var(--admin-surface);
      border-color: var(--admin-border);
      box-shadow: 0 1px 2px rgba(2, 6, 23, 0.34);
    }

    .main-content ::ng-deep .admin-dashboard,
    .main-content ::ng-deep .product-list-page,
    .main-content ::ng-deep .order-list-page,
    .main-content ::ng-deep .user-list-page,
    .main-content ::ng-deep .promotion-list-page,
    .main-content ::ng-deep .inventory-page,
    .main-content ::ng-deep .settings-page,
    .main-content ::ng-deep .audit-logs-page,
    .main-content ::ng-deep .category-list-page,
    .main-content ::ng-deep .product-form-page,
    .main-content ::ng-deep .ml-dashboard,
    .main-content ::ng-deep .analytics-forecast-container {
      max-width: 100%;
      margin: 0;
      background: transparent;
      min-height: auto;
      padding: 0;
    }

    .main-content ::ng-deep .filters-bar,
    .main-content ::ng-deep .table-container,
    .main-content ::ng-deep .settings-card,
    .main-content ::ng-deep .stat-card,
    .main-content ::ng-deep .category-card,
    .main-content ::ng-deep .promotion-card,
    .main-content ::ng-deep .form-section,
    .main-content ::ng-deep .modal-content,
    .main-content ::ng-deep .chart-card,
    .main-content ::ng-deep .kpi-card,
    .main-content ::ng-deep .insights-panel,
    .main-content ::ng-deep .data-table-section,
    .main-content ::ng-deep .content-card,
    .main-content ::ng-deep .dashboard-card {
      background: #ffffff;
      border: 1px solid var(--admin-border);
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .main-content ::ng-deep .btn-primary,
    .main-content ::ng-deep .view-all-link,
    .main-content ::ng-deep .btn-view,
    .main-content ::ng-deep .range-btn.active,
    .main-content ::ng-deep .toggle-btn.active,
    .main-content ::ng-deep .chart-view-toggle .toggle-btn.active,
    .main-content ::ng-deep .page-number.active {
      background: #111827;
      border-color: #111827;
      color: #ffffff;
    }

    @media (max-width: 1024px) {
      .sidebar {
        width: 200px;
      }

      .main-content {
        margin-left: 200px;
      }

      .topbar-search {
        width: 170px;
      }
    }

    @media (max-width: 768px) {
      .sidebar {
        width: 218px;
      }

      .logo-content,
      .nav-section-title,
      .nav-badge,
      .sidebar-user,
      .language-switcher-wrapper,
      .back-to-site,
      .topbar-search,
      .topbar-title,
      .topbar-separator {
        display: none;
      }

      .sidebar-header {
        justify-content: center;
        padding: 0;
      }

      .logo {
        justify-content: center;
      }

      .nav-item {
        justify-content: center;
        padding: 8px;
      }

      .main-content {
        margin-left: 0;
      }

      .content-area {
        padding: 14px 10px;
      }
    }
  `]
})
export class AdminLayoutComponent {
  private destroyRef = inject(DestroyRef);
  private readonly maxNotifications = 8;
  private readonly readStorageKey = 'admin-read-notification-ids';

  readonly projectName = 'PONSAI';
  readonly currentUser$ = this.adminAuthService.currentUser$;
  readonly isSidebarCollapsed = signal(false);
  readonly isDarkMode = signal(false);
  readonly showNotifications = signal(false);
  readonly isLoadingNotifications = signal(false);
  readonly notificationError = signal<string | null>(null);
  private readonly readNotificationIds = signal<Set<string>>(new Set());

  readonly notifications = signal<AdminNotification[]>([]);

  readonly unreadNotificationsCount = computed(
    () => this.notifications().filter(notification => !notification.read).length
  );

  constructor(
    private router: Router,
    private adminAuthService: AdminAuthService,
    private adminService: AdminService
  ) {
    this.initializeTheme();
    this.initializeReadNotificationIds();
    this.loadNotificationsFromBackend();
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(isCollapsed => !isCollapsed);
  }

  toggleNotifications(): void {
    const willOpen = !this.showNotifications();
    this.showNotifications.set(willOpen);

    if (willOpen) {
      this.loadNotificationsFromBackend();
    }
  }

  closeNotifications(): void {
    this.showNotifications.set(false);
  }

  markNotificationAsRead(id: string): void {
    this.addReadNotificationIds([id]);
    this.notifications.update(items =>
      items.map(item => item.id === id ? { ...item, read: true } : item)
    );
  }

  markAllNotificationsAsRead(): void {
    this.addReadNotificationIds(this.notifications().map(item => item.id));
    this.notifications.update(items =>
      items.map(item => ({ ...item, read: true }))
    );
  }

  loadNotificationsFromBackend(): void {
    this.isLoadingNotifications.set(true);
    this.notificationError.set(null);

    this.adminService.loadAuditLogs({ page: 1, limit: this.maxNotifications })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const readIds = this.readNotificationIds();
          const mappedNotifications = response.data.map(log => this.mapAuditLogToNotification(log, readIds));
          this.notifications.set(mappedNotifications);
          this.isLoadingNotifications.set(false);
        },
        error: () => {
          this.notificationError.set('Không tải được thông báo từ Firebase.');
          this.isLoadingNotifications.set(false);
        }
      });
  }

  toggleTheme(): void {
    const nextThemeIsDark = !this.isDarkMode();
    this.isDarkMode.set(nextThemeIsDark);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('admin-theme', nextThemeIsDark ? 'dark' : 'light');
    }
  }

  private initializeTheme(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const savedTheme = localStorage.getItem('admin-theme');
    this.isDarkMode.set(savedTheme === 'dark');
  }

  private initializeReadNotificationIds(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const rawValue = localStorage.getItem(this.readStorageKey);
      if (!rawValue) {
        return;
      }

      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        this.readNotificationIds.set(new Set(parsed.filter((value): value is string => typeof value === 'string')));
      }
    } catch {
      this.readNotificationIds.set(new Set());
    }
  }

  private addReadNotificationIds(ids: string[]): void {
    if (ids.length === 0) {
      return;
    }

    this.readNotificationIds.update(currentIds => {
      const nextIds = new Set(currentIds);
      ids.forEach(id => nextIds.add(id));

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.readStorageKey, JSON.stringify(Array.from(nextIds)));
      }

      return nextIds;
    });
  }

  private mapAuditLogToNotification(log: AuditLog, readIds: Set<string>): AdminNotification {
    return {
      id: log._id,
      title: this.getNotificationTitle(log.action),
      message: this.getNotificationMessage(log),
      time: this.formatTimeAgo(log.createdAt),
      read: readIds.has(log._id)
    };
  }

  private getNotificationTitle(action: string): string {
    const titleMap: Record<string, string> = {
      product_create: 'Sản phẩm mới',
      product_update: 'Cập nhật sản phẩm',
      product_delete: 'Xóa sản phẩm',
      inventory_adjustment: 'Điều chỉnh kho',
      order_update_status: 'Cập nhật đơn hàng',
      order_cancel: 'Hủy đơn hàng',
      user_role_change: 'Thay đổi quyền',
      user_ban: 'Khóa tài khoản',
      user_unban: 'Mở khóa tài khoản',
      category_create: 'Danh mục mới',
      category_update: 'Cập nhật danh mục',
      category_delete: 'Xóa danh mục',
      promotion_create: 'Khuyến mãi mới',
      promotion_update: 'Cập nhật khuyến mãi',
      promotion_delete: 'Xóa khuyến mãi',
      settings_update: 'Cập nhật cài đặt',
      stock_alert: 'Cảnh báo tồn kho'
    };

    return titleMap[action] || 'Hoạt động hệ thống';
  }

  private getNotificationMessage(log: AuditLog): string {
    if (log.description) {
      return log.description;
    }

    const actor = log.user?.name || log.user?.email || 'Hệ thống';
    return `${actor} đã thực hiện ${log.action.replace(/_/g, ' ')}.`;
  }

  private formatTimeAgo(dateInput: string): string {
    const timestamp = new Date(dateInput).getTime();
    if (Number.isNaN(timestamp)) {
      return '--';
    }

    const elapsedMs = Date.now() - timestamp;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);

    if (elapsedMinutes < 1) return 'vừa xong';
    if (elapsedMinutes < 60) return `${elapsedMinutes}m`;

    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) return `${elapsedHours}h`;

    const elapsedDays = Math.floor(elapsedHours / 24);
    if (elapsedDays < 7) return `${elapsedDays}d`;

    return new Date(timestamp).toLocaleDateString('vi-VN');
  }

  getUserInitials(name?: string): string {
    const normalizedName = (name || '').trim();
    if (!normalizedName) {
      return 'AD';
    }

    const initials = normalizedName
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');

    return initials || 'AD';
  }

  getPageTitle(): string {
    const url = this.router.url.split('?')[0];
    if (url.startsWith('/admin/products')) return 'Products';
    if (url.startsWith('/admin/categories')) return 'Categories';
    if (url.startsWith('/admin/inventory')) return 'Inventory';
    if (url.startsWith('/admin/orders')) return 'Orders';
    if (url.startsWith('/admin/users')) return 'Users';
    if (url.startsWith('/admin/promotions')) return 'Promotions';
    if (url.startsWith('/admin/ml-analytics')) return 'Analytics';
    if (url.startsWith('/admin/forecast')) return 'Forecast';
    if (url.startsWith('/admin/audit-logs')) return 'Audit Logs';
    if (url.startsWith('/admin/settings')) return 'Settings';
    return 'Dashboard';
  }
}
