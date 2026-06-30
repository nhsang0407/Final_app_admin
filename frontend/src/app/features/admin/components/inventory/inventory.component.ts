import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AdminService } from '../../services/admin.service';
import { AdminProduct } from '../../models/admin.models';
import { AdminCurrencyPipe } from '../../pipes/admin-currency.pipe';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminCurrencyPipe, TranslateModule],
  template: `
    <div class="inventory-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <h1>{{ 'admin.inventoryManagement' | translate }}</h1>
          <p class="subtitle">{{ 'admin.inventorySubtitle' | translate }}</p>
        </div>
        <button class="btn btn-primary" (click)="exportReport()">
          <i class="gi gi-ui-chart" aria-hidden="true"></i> {{ 'admin.exportExcel' | translate }}
        </button>
      </div>

      <!-- Stats Overview -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">{{ 'admin.totalProducts' | translate }}</span>
            <span class="stat-value">{{ totalProducts() }}</span>
          </div>
        </div>
        <div class="stat-card warning">
          <div class="stat-info">
            <span class="stat-label">{{ 'admin.lowStock' | translate }}</span>
            <span class="stat-value">{{ lowStockCount() }}</span>
          </div>
        </div>
        <div class="stat-card danger">
          <div class="stat-info">
            <span class="stat-label">{{ 'admin.outOfStock' | translate }}</span>
            <span class="stat-value">{{ outOfStockCount() }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-label">{{ 'admin.inventoryValue' | translate }}</span>
            <span class="stat-value">{{ totalInventoryValue() | adminCurrency }}</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-box">
          <input 
            type="text" 
            [placeholder]="'admin.searchProducts' | translate"
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event)">
        </div>

        <div class="filter-group">
          <select [ngModel]="stockFilter()" (ngModelChange)="stockFilter.set($event)">
            <option value="">{{ 'admin.allStatus' | translate }}</option>
            <option value="in_stock">{{ 'admin.inStock' | translate }} (>{{ adminService.lowStockThreshold() }})</option>
            <option value="low_stock">{{ 'admin.lowStock' | translate }} (≤{{ adminService.lowStockThreshold() }})</option>
            <option value="out_of_stock">{{ 'admin.outOfStock' | translate }}</option>
          </select>

          <select [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event)">
            <option value="">{{ 'admin.allCategories' | translate }}</option>
            @for (category of categories(); track category._id) {
              <option [value]="category._id">{{ category.name }}</option>
            }
          </select>

          <select class="sort-select" [ngModel]="sortBy()" (ngModelChange)="sortBy.set($event)">
            <option value="stock_asc">{{ 'admin.sort.stockAsc' | translate }}</option>
            <option value="stock_desc">{{ 'admin.sort.stockDesc' | translate }}</option>
            <option value="name_asc">{{ 'admin.sort.nameAsc' | translate }}</option>
            <option value="value_desc">{{ 'admin.sort.valueDesc' | translate }}</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      @if (adminService.loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>{{ 'admin.loading' | translate }}</p>
        </div>
      }

      <!-- Inventory Table -->
      @if (!adminService.loading()) {
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ 'admin.productName' | translate }}</th>
                <th>SKU</th>
                <th>{{ 'admin.category' | translate }}</th>
                <th>{{ 'admin.price' | translate }}</th>
                <th class="stock-col">{{ 'admin.stock' | translate }}</th>
                <th>{{ 'admin.status' | translate }}</th>
                <th class="value-col">{{ 'admin.value' | translate }}</th>
                <th class="actions-col">{{ 'admin.actions' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (product of filteredProducts(); track product._id) {
                <tr [class.low-stock]="isLowStock(product)" [class.out-of-stock]="product.stockQuantity === 0">
                  <td>
                    <div class="product-info">
                      <img [src]="product.primaryImage || product.images[0] || 'assets/images/placeholder.jpg'" [alt]="product.name">
                      <span class="name">{{ product.name }}</span>
                    </div>
                  </td>
                  <td class="sku">{{ product.sku || '-' }}</td>
                  <td>{{ getCategoryName(product.category) }}</td>
                  <td class="price">{{ product.price | adminCurrency }}</td>
                  <td class="stock-col">
                    <div class="stock-display">
                      <span class="stock-value" [class.warning]="isLowStock(product)" [class.danger]="product.stockQuantity === 0">
                        {{ product.stockQuantity }}
                      </span>
                      <div class="stock-bar">
                        <div 
                          class="stock-fill" 
                          [class.warning]="isLowStock(product)" 
                          [class.danger]="product.stockQuantity === 0"
                          [style.width.%]="getStockPercentage(product)">
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    @if (product.stockQuantity === 0) {
                      <span class="status-badge danger">{{ 'admin.outOfStock' | translate }}</span>
                    } @else if (isLowStock(product)) {
                      <span class="status-badge warning">{{ 'admin.lowStock' | translate }}</span>
                    } @else {
                      <span class="status-badge success">{{ 'admin.inStock' | translate }}</span>
                    }
                  </td>
                  <td class="value-col">
                    {{ (product.price * product.stockQuantity) | adminCurrency }}
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button class="action-btn adjust" (click)="openAdjustModal(product)">
                        {{ 'admin.adjust' | translate }}
                      </button>
                      <button class="action-btn history" (click)="viewHistory(product)">
                        {{ 'admin.history' | translate }}
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="empty-row">
                    <p>{{ 'admin.noProducts' | translate }}</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (pagination().pages > 1) {
          <div class="pagination">
            <button 
              class="page-btn" 
              [disabled]="pagination().page === 1"
              (click)="goToPage(pagination().page - 1)">
              {{ 'common.previous' | translate }}
            </button>
            
            @for (page of getPageNumbers(); track page) {
              <button 
                class="page-btn" 
                [class.active]="page === pagination().page"
                (click)="goToPage(page)">
                {{ page }}
              </button>
            }
            
            <button 
              class="page-btn" 
              [disabled]="pagination().page === pagination().pages"
              (click)="goToPage(pagination().page + 1)">
              {{ 'common.next' | translate }}
            </button>
          </div>
        }
      }

      <!-- Adjust Stock Modal -->
      @if (showAdjustModal()) {
        <div class="modal-overlay" (click)="closeAdjustModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ 'admin.adjustInventory' | translate }}</h3>
              <button class="close-btn" (click)="closeAdjustModal()">×</button>
            </div>
            <div class="modal-body">
              @if (selectedProduct()) {
                <div class="product-preview">
                  <img [src]="selectedProduct()!.primaryImage || selectedProduct()!.images[0] || 'assets/images/placeholder.jpg'" [alt]="selectedProduct()!.name">
                  <div class="info">
                    <h4>{{ selectedProduct()!.name }}</h4>
                    <p>{{ 'admin.currentStock' | translate }}: <strong>{{ selectedProduct()!.stockQuantity }}</strong></p>
                  </div>
                </div>

                <div class="adjust-form">
                  <div class="adjust-type">
                    <label>
                      <input type="radio" name="adjustType" value="set" [(ngModel)]="adjustType">
                      {{ 'admin.adjustType.set' | translate }}
                    </label>
                    <label>
                      <input type="radio" name="adjustType" value="add" [(ngModel)]="adjustType">
                      {{ 'admin.adjustType.add' | translate }}
                    </label>
                    <label>
                      <input type="radio" name="adjustType" value="subtract" [(ngModel)]="adjustType">
                      {{ 'admin.adjustType.subtract' | translate }}
                    </label>
                  </div>

                  <div class="form-group">
                    <label>{{ 'admin.quantity' | translate }}</label>
                    <input 
                      type="number" 
                      [(ngModel)]="adjustAmount" 
                      min="0"
                      [placeholder]="'admin.enterQuantity' | translate">
                    @if (adjustType !== 'set') {
                      <div class="quick-actions">
                        <button type="button" class="quick-btn" (click)="adjustAmount = 1">+1</button>
                        <button type="button" class="quick-btn" (click)="adjustAmount = 5">+5</button>
                        <button type="button" class="quick-btn" (click)="adjustAmount = 10">+10</button>
                        <button type="button" class="quick-btn" (click)="adjustAmount = 50">+50</button>
                      </div>
                    }
                  </div>

                  <div class="form-group">
                    <label>{{ 'admin.adjustReason' | translate }}</label>
                    <select [(ngModel)]="adjustReason" (change)="onReasonChange()">
                      <option value="">{{ 'admin.selectReason' | translate }}</option>
                      <option value="purchase">{{ 'admin.reason.purchase' | translate }}</option>
                      <option value="inventory_check">{{ 'admin.reason.inventoryCheck' | translate }}</option>
                      <option value="damaged">{{ 'admin.reason.damaged' | translate }}</option>
                      <option value="adjustment">{{ 'admin.reason.adjustment' | translate }}</option>
                      <option value="promotion">{{ 'admin.reason.promotion' | translate }}</option>
                      <option value="return">{{ 'admin.reason.return' | translate }}</option>
                      <option value="custom">{{ 'admin.reason.custom' | translate }}</option>
                    </select>
                  </div>

                  @if (adjustReason === 'custom' || !adjustReason) {
                    <div class="form-group">
                      <label>{{ 'admin.note' | translate }} {{ adjustReason === 'custom' ? ('admin.requiredShort' | translate) : ('common.optional' | translate) }}</label>
                      <input 
                        type="text" 
                        [(ngModel)]="adjustNote"
                        [placeholder]="adjustReason === 'custom' ? ('admin.enterReason' | translate) : ('admin.additionalNoteOptional' | translate)">
                    </div>
                  }

                  <!-- Warning Boxes -->
                  @if (isLargeDecrease()) {
                    <div class="warning-box large-decrease">
                      <i class="gi gi-ui-warning" aria-hidden="true"></i> {{ 'admin.warning.largeDecrease' | translate }}
                    </div>
                  }

                  @if (willBeLowStock()) {
                    <div class="warning-box low-stock">
                      <i class="gi gi-ui-alert" aria-hidden="true"></i> {{ 'admin.warning.willBeLowStock' | translate }}
                    </div>
                  }

                  @if (willBeOutOfStock()) {
                    <div class="warning-box out-of-stock">
                      <i class="gi gi-ui-close" aria-hidden="true"></i> {{ 'admin.warning.willBeOutOfStock' | translate }}
                    </div>
                  }

                  <div class="preview-result" [class.danger-bg]="calculateNewStock() < 0">
                    <span>{{ 'admin.result' | translate }}:</span>
                    <strong [class.danger]="calculateNewStock() < 0">
                      {{ calculateNewStock() < 0 ? ('admin.invalid' | translate) : calculateNewStock() }}
                    </strong>
                  </div>
                </div>
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeAdjustModal()">{{ 'button.cancel' | translate }}</button>
              <button 
                class="btn btn-primary" 
                (click)="handleSubmitAdjustment()"
                [disabled]="!isValidAdjustment()">
                {{ 'button.update' | translate }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- History Modal -->
      @if (showHistoryModal()) {
        <div class="modal-overlay" (click)="closeHistoryModal()">
          <div class="modal-content modal-large" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ 'admin.inventoryHistory' | translate }}</h3>
              <button class="close-btn" (click)="closeHistoryModal()">×</button>
            </div>
            <div class="modal-body">
              @if (selectedProduct()) {
                <div class="product-preview">
                  <img [src]="selectedProduct()!.primaryImage || selectedProduct()!.images[0] || 'assets/images/placeholder.jpg'" [alt]="selectedProduct()!.name">
                  <div class="info">
                    <h4>{{ selectedProduct()!.name }}</h4>
                    <p>{{ 'admin.currentStock' | translate }}: <strong>{{ selectedProduct()!.stockQuantity }}</strong></p>
                  </div>
                </div>

                <div class="history-list">
                  <!-- Demo: Replace with real data from backend -->
                  <div class="info-box">
                    {{ 'admin.inventoryHistoryInDevelopment' | translate }}
                  </div>

                  <!-- Example history items (replace with real data) -->
                  <div class="history-item">
                    <div class="history-icon add">+</div>
                    <div class="history-details">
                      <div class="history-action">Nhập hàng</div>
                      <div class="history-change">
                        <span class="old-value">45</span> → <span class="new-value">95</span>
                      </div>
                      <div class="history-note">Nhập từ nhà cung cấp ABC</div>
                    </div>
                    <div class="history-time">
                      15/01/2026<br>14:30
                    </div>
                  </div>

                  <div class="history-item">
                    <div class="history-icon subtract">-</div>
                    <div class="history-details">
                      <div class="history-action">Xuất bán</div>
                      <div class="history-change">
                        <span class="old-value">95</span> → <span class="new-value">92</span>
                      </div>
                      <div class="history-note">Đơn hàng #ORD-2026-0123</div>
                    </div>
                    <div class="history-time">
                      14/01/2026<br>10:15
                    </div>
                  </div>

                  <div class="history-item">
                    <div class="history-icon set">≈</div>
                    <div class="history-details">
                      <div class="history-action">Kiểm kê</div>
                      <div class="history-change">
                        <span class="old-value">98</span> → <span class="new-value">95</span>
                      </div>
                      <div class="history-note">Điều chỉnh sau kiểm kê định kỳ</div>
                    </div>
                    <div class="history-time">
                      10/01/2026<br>09:00
                    </div>
                  </div>
                </div>
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeHistoryModal()">{{ 'button.close' | translate }}</button>
            </div>
          </div>
        </div>
      }

      <!-- Confirm Dialog -->
      @if (showConfirmDialog()) {
        <div class="confirm-dialog" (click)="closeConfirmDialog()">
          <div class="confirm-content" (click)="$event.stopPropagation()">
            <h4><i class="gi gi-ui-warning" aria-hidden="true"></i> {{ 'admin.confirmChangeTitle' | translate }}</h4>
            <p>{{ confirmMessage() }}</p>
            <div class="confirm-buttons">
              <button class="btn btn-secondary" (click)="closeConfirmDialog()">{{ 'button.cancel' | translate }}</button>
              <button class="btn btn-primary" (click)="confirmAdjustment()">{{ 'button.confirm' | translate }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .inventory-page {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .page-header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0;
    }

    .subtitle {
      color: #666;
      margin: 4px 0 0;
    }

    .btn {
      padding: 10px 20px;
      border: 2px solid transparent;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #153243;
      color: #fff;
      border-color: #153243;
    }

    .btn-primary:hover {
      background: #0d1f29;
      border-color: #0d1f29;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #fff;
      color: #153243;
      border-color: #e6e6ea;
    }

    .btn-secondary:hover {
      background: #e6e6ea;
      border-color: #153243;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: #fff;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border-left: 4px solid #153243;
    }

    .stat-card.warning {
      border-left-color: #c3d350;
    }

    .stat-card.danger {
      border-left-color: #284b63;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stat-label {
      font-size: 13px;
      color: #666;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #153243;
    }

    /* Filters */
    .filters-bar {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: nowrap;
    }

    .search-box {
      position: relative;
      flex: 1 1 auto;
      min-width: 200px;
      max-width: 350px;
    }

    .search-box input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #e6e6ea;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
    }

    .search-box input:focus {
      outline: none;
      border-color: #153243;
      box-shadow: 0 0 0 3px rgba(21, 50, 67, 0.1);
    }

    .filter-group {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: nowrap;
      flex-shrink: 0;
    }

    .filter-group select {
      min-width: 160px;
      max-width: 180px;
      padding: 12px 12px;
      padding-right: 28px;
      border: 1px solid #e6e6ea;
      border-radius: 8px;
      font-size: 14px;
      background: #fff;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23153243' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
    }

    .filter-group select:focus {
      outline: none;
      border-color: #153243;
      box-shadow: 0 0 0 3px rgba(21, 50, 67, 0.1);
    }

    .filter-group select option {
      padding: 8px;
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
    }

    .filter-group select.sort-select {
      min-width: 190px;
      max-width: 210px;
    }

    /* Loading */
    .loading-state {
      text-align: center;
      padding: 60px 20px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f0f0f0;
      border-top-color: #153243;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Table */
    .table-container {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th,
    .data-table td {
      padding: 14px 16px;
      text-align: left;
      font-size: 14px;
      border-bottom: 1px solid #f0f0f0;
    }

    .data-table th {
      background: #f8f9fa;
      font-weight: 600;
      color: #666;
    }

    .data-table tr:hover {
      background: #fafafa;
    }

    .data-table tr.low-stock {
      background: #fffbeb;
    }

    .data-table tr.out-of-stock {
      background: #fef2f2;
    }

    .product-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .product-info img {
      width: 48px;
      height: 48px;
      object-fit: cover;
      border-radius: 8px;
    }

    .product-info .name {
      font-weight: 500;
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sku {
      font-family: monospace;
      color: #666;
    }

    .price {
      font-weight: 600;
      color: #153243;
    }

    .stock-col {
      width: 140px;
    }

    .stock-display {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stock-value {
      font-weight: 700;
      font-size: 16px;
    }

    .stock-value.warning {
      color: #d97706;
    }

    .stock-value.danger {
      color: #dc2626;
    }

    .stock-bar {
      width: 100%;
      height: 4px;
      background: #f0f0f0;
      border-radius: 2px;
      overflow: hidden;
    }

    .stock-fill {
      height: 100%;
      background: #22c55e;
      border-radius: 2px;
      transition: width 0.3s;
    }

    .stock-fill.warning {
      background: #f59e0b;
    }

    .stock-fill.danger {
      background: #ef4444;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-badge.success {
      background: #153243;
      color: #c3d350;
    }

    .status-badge.warning {
      background: #c3d350;
      color: #153243;
    }

    .status-badge.danger {
      background: #e6e6ea;
      color: #153243;
    }

    .value-col {
      font-weight: 500;
      color: #666;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      padding: 6px 12px;
      height: 32px;
      border: 1px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s;
      white-space: nowrap;
      min-width: 80px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .action-btn.adjust {
      background: #e3f2fd;
      color: #1976d2;
      border-color: #e3f2fd;
    }

    .action-btn.adjust:hover {
      background: #1976d2;
      color: #fff;
      border-color: #1976d2;
    }

    .action-btn.history {
      background: #f3e5f5;
      color: #7b1fa2;
      border-color: #f3e5f5;
    }

    .action-btn.history:hover {
      background: #7b1fa2;
      color: #fff;
      border-color: #7b1fa2;
    }

    .empty-row {
      text-align: center;
      padding: 40px !important;
      color: #999;
    }

    /* Pagination */
    .pagination {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 24px;
    }

    .page-btn {
      padding: 8px 16px;
      border: 1px solid #ddd;
      background: #fff;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .page-btn:hover:not(:disabled) {
      background: #f5f5f5;
    }

    .page-btn.active {
      background: #153243;
      color: #fff;
      border-color: #153243;
    }

    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: #fff;
      border-radius: 12px;
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-content.modal-large {
      max-width: 600px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 2px solid #f0f0f0;
      background: linear-gradient(to bottom, #fff, #fafbfc);
    }

    .modal-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #153243;
      letter-spacing: -0.2px;
    }

    .close-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: #f5f5f5;
      border-radius: 8px;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .close-btn:hover {
      background: #153243;
      color: #fff;
      transform: rotate(90deg);
    }

    .modal-body {
      padding: 24px;
    }

    .product-preview {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 12px;
      margin-bottom: 24px;
      border: 1px solid #e6e6ea;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .product-preview img {
      width: 72px;
      height: 72px;
      object-fit: cover;
      border-radius: 10px;
      border: 2px solid #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      flex-shrink: 0;
    }

    .product-preview .info {
      flex: 1;
      min-width: 0;
    }

    .product-preview h4 {
      margin: 0 0 8px;
      font-size: 17px;
      font-weight: 700;
      color: #153243;
      line-height: 1.4;
      word-break: break-word;
    }

    .product-preview p {
      margin: 0;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
    }

    .product-preview p strong {
      color: #153243;
      font-size: 16px;
      font-weight: 700;
    }

    .adjust-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .adjust-type {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: #fafbfc;
      border-radius: 10px;
      border: 1px solid #e6e6ea;
    }

    .adjust-type label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 15px;
      padding: 10px 12px;
      border-radius: 8px;
      transition: all 0.2s;
      font-weight: 500;
    }

    .adjust-type label:hover {
      background: #fff;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .adjust-type input[type="radio"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #153243;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      font-size: 14px;
      font-weight: 600;
      color: #153243;
      letter-spacing: 0.2px;
    }

    .form-group input {
      padding: 12px 16px;
      border: 2px solid #e6e6ea;
      border-radius: 10px;
      font-size: 15px;
      transition: all 0.2s;
      background: #fff;
    }

    .form-group input:focus {
      outline: none;
      border-color: #153243;
      box-shadow: 0 0 0 3px rgba(21, 50, 67, 0.1);
    }

    .form-group input::placeholder {
      color: #999;
    }

    .preview-result {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
      border-radius: 10px;
      font-size: 15px;
      font-weight: 500;
      border: 2px solid #a5d6a7;
    }

    .preview-result span {
      color: #2e7d32;
    }

    .preview-result strong {
      font-size: 24px;
      color: #1b5e20;
      font-weight: 700;
    }

    .preview-result strong.danger {
      color: #c62828;
    }

    .preview-result.danger-bg {
      background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
      border-color: #ef9a9a;
    }

    .preview-result.danger-bg span {
      color: #c62828;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      border-top: 2px solid #f0f0f0;
      background: #fafbfc;
    }

    .history-list {
      min-height: 200px;
      max-height: 400px;
      overflow-y: auto;
    }

    .history-item {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: #fff;
      border: 1px solid #e6e6ea;
      border-radius: 10px;
      margin-bottom: 12px;
      transition: all 0.2s;
    }

    .history-item:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      transform: translateY(-2px);
    }

    .history-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .history-icon.add {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .history-icon.subtract {
      background: #ffebee;
      color: #c62828;
    }

    .history-icon.set {
      background: #e3f2fd;
      color: #1565c0;
    }

    .history-details {
      flex: 1;
      min-width: 0;
    }

    .history-action {
      font-weight: 600;
      color: #153243;
      margin-bottom: 4px;
      font-size: 15px;
    }

    .history-change {
      color: #666;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .history-change .old-value {
      color: #999;
      text-decoration: line-through;
    }

    .history-change .new-value {
      color: #153243;
      font-weight: 600;
    }

    .history-note {
      font-size: 13px;
      color: #888;
      font-style: italic;
      margin-top: 4px;
    }

    .history-time {
      text-align: right;
      font-size: 12px;
      color: #999;
      flex-shrink: 0;
    }

    .coming-soon {
      text-align: center;
      color: #999;
      padding: 60px 20px;
      font-size: 15px;
    }

    .coming-soon::before {
      content: '';
      display: block;
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
      width: 1em;
      height: 1em;
      margin-left: auto;
      margin-right: auto;
      background-color: currentColor;
      -webkit-mask-image: url('/assets/griddy-icons/ui-chart.svg');
      mask-image: url('/assets/griddy-icons/ui-chart.svg');
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-position: center;
      mask-position: center;
      -webkit-mask-size: contain;
      mask-size: contain;
    }

    .quick-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }

    .quick-btn {
      padding: 6px 12px;
      border: 1px solid #e6e6ea;
      background: #fff;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .quick-btn:hover {
      background: #153243;
      color: #fff;
      border-color: #153243;
    }

    .info-box {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 16px;
      font-size: 13px;
      color: #856404;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .info-box::before {
      content: 'ℹ️';
      font-size: 18px;
    }

    .warning-box {
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 12px;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .warning-box.large-decrease {
      background: #fff3cd;
      border: 2px solid #ffc107;
      color: #856404;
    }

    .warning-box.low-stock {
      background: #fff3e0;
      border: 2px solid #ff9800;
      color: #e65100;
    }

    .warning-box.out-of-stock {
      background: #ffebee;
      border: 2px solid #f44336;
      color: #c62828;
    }

    .confirm-dialog {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.2s;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .confirm-content {
      background: #fff;
      padding: 24px;
      border-radius: 12px;
      max-width: 400px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      animation: scaleIn 0.3s ease-out;
    }

    @keyframes scaleIn {
      from {
        transform: scale(0.9);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    .confirm-content h4 {
      margin: 0 0 12px;
      color: #153243;
      font-size: 18px;
      font-weight: 700;
    }

    .confirm-content p {
      margin: 0 0 20px;
      color: #666;
      line-height: 1.5;
    }

    .confirm-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class InventoryComponent implements OnInit {
  adminService = inject(AdminService);

  products = computed(() => this.adminService.products());
  categories = computed(() => this.adminService.categories());
  pagination = computed(() => this.adminService.productPagination());

  // Computed stats
  totalProducts = computed(() => this.pagination().total);
  
  lowStockCount = computed(() => {
    const threshold = this.adminService.lowStockThreshold();
    return this.products().filter(p => 
      p.stockQuantity > 0 && p.stockQuantity <= threshold
    ).length;
  });
  
  outOfStockCount = computed(() => 
    this.products().filter(p => p.stockQuantity === 0).length
  );
  
  totalInventoryValue = computed(() => 
    this.products().reduce((sum, p) => sum + (p.price * p.stockQuantity), 0)
  );

  // Filters (signals for reactivity)
  searchTerm = signal('');
  stockFilter = signal('');
  categoryFilter = signal('');
  sortBy = signal('stock_asc');

  filteredProducts = computed(() => {
    let result = [...this.products()];
    
    // Search filter
    const search = this.searchTerm();
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term)
      );
    }
    
    // Category filter
    const catFilter = this.categoryFilter();
    if (catFilter) {
      result = result.filter(p => {
        const categoryId = typeof p.category === 'string' ? p.category : p.category?._id;
        return categoryId === catFilter;
      });
    }
    
    // Stock status filter
    const stockStatus = this.stockFilter();
    const threshold = this.adminService.lowStockThreshold();
    if (stockStatus) {
      if (stockStatus === 'in_stock') {
        result = result.filter(p => p.stockQuantity > threshold);
      } else if (stockStatus === 'low_stock') {
        result = result.filter(p => p.stockQuantity > 0 && p.stockQuantity <= threshold);
      } else if (stockStatus === 'out_of_stock') {
        result = result.filter(p => p.stockQuantity === 0);
      }
    }
    
    // Sorting
    const sort = this.sortBy();
    switch (sort) {
      case 'stock_asc':
        result.sort((a, b) => a.stockQuantity - b.stockQuantity);
        break;
      case 'stock_desc':
        result.sort((a, b) => b.stockQuantity - a.stockQuantity);
        break;
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'value_desc':
        result.sort((a, b) => (b.price * b.stockQuantity) - (a.price * a.stockQuantity));
        break;
    }
    
    return result;
  });

  // Adjust Modal
  showAdjustModal = signal(false);
  selectedProduct = signal<AdminProduct | null>(null);
  adjustType = 'set';
  adjustAmount: number | null = null;
  adjustReason = '';
  adjustNote = '';

  // Confirm Dialog
  showConfirmDialog = signal(false);
  confirmMessage = signal('');

  // History Modal
  showHistoryModal = signal(false);

  // Predefined reasons with Vietnamese translations
  private reasonTranslations: { [key: string]: string } = {
    'purchase': 'Nhập hàng từ nhà cung cấp',
    'inventory_check': 'Kiểm kê định kỳ',
    'damaged': 'Hàng bị hư hỏng/hết hạn',
    'adjustment': 'Điều chỉnh sai số',
    'promotion': 'Khuyến mãi/tặng kèm',
    'return': 'Trả hàng từ khách',
    'custom': 'Tùy chỉnh'
  };

  ngOnInit(): void {
    this.loadData();
    // Load settings to get lowStockThreshold
    this.adminService.loadSettings().subscribe();
  }

  loadData(): void {
    // Load more products for inventory view
    this.adminService.loadProducts({ page: 1, limit: 1000 }).subscribe();
    this.adminService.loadCategories().subscribe();
  }

  goToPage(page: number): void {
    const params: any = { page, limit: 1000 };
    const catFilter = this.categoryFilter();
    if (catFilter) params.category = catFilter;
    this.adminService.loadProducts(params).subscribe();
  }

  getPageNumbers(): number[] {
    const { page, pages } = this.pagination();
    const result: number[] = [];
    
    let start = Math.max(1, page - 2);
    let end = Math.min(pages, page + 2);
    
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    
    return result;
  }

  isLowStock(product: AdminProduct): boolean {
    const threshold = this.adminService.lowStockThreshold();
    return product.stockQuantity > 0 && product.stockQuantity <= threshold;
  }

  getStockPercentage(product: AdminProduct): number {
    const max = 100; // Assume 100 as max for display
    return Math.min((product.stockQuantity / max) * 100, 100);
  }

  getCategoryName(category: string | { _id: string; name: string; slug: string }): string {
    if (typeof category === 'object' && category?.name) {
      return category.name;
    }
    const categoryId = typeof category === 'string' ? category : category?._id;
    const found = this.categories().find(c => c._id === categoryId);
    return found?.name || 'Không xác định';
  }

  // Adjust Modal
  openAdjustModal(product: AdminProduct): void {
    this.selectedProduct.set(product);
    this.adjustType = 'set';
    this.adjustAmount = product.stockQuantity;
    this.adjustReason = '';
    this.adjustNote = '';
    this.showAdjustModal.set(true);
  }

  closeAdjustModal(): void {
    this.showAdjustModal.set(false);
    this.selectedProduct.set(null);
    this.adjustReason = '';
    this.adjustNote = '';
  }

  onReasonChange(): void {
    // Auto-fill note based on reason if not custom
    if (this.adjustReason && this.adjustReason !== 'custom') {
      this.adjustNote = this.reasonTranslations[this.adjustReason] || '';
    } else {
      this.adjustNote = '';
    }
  }

  calculateNewStock(): number {
    const current = this.selectedProduct()?.stockQuantity || 0;
    const amount = this.adjustAmount || 0;
    
    switch (this.adjustType) {
      case 'set':
        return amount;
      case 'add':
        return current + amount;
      case 'subtract':
        return current - amount;
      default:
        return current;
    }
  }

  // Real-time Validation Methods
  isLargeDecrease(): boolean {
    const current = this.selectedProduct()?.stockQuantity || 0;
    const newStock = this.calculateNewStock();
    const decrease = current - newStock;
    return decrease > current * 0.5 && current > 0;
  }

  willBeLowStock(): boolean {
    const newStock = this.calculateNewStock();
    const threshold = this.adminService.lowStockThreshold();
    return newStock > 0 && newStock <= threshold;
  }

  willBeOutOfStock(): boolean {
    return this.calculateNewStock() === 0;
  }

  needsConfirmation(): boolean {
    const current = this.selectedProduct()?.stockQuantity || 0;
    const newStock = this.calculateNewStock();
    const change = Math.abs(current - newStock);
    
    return (
      change > 50 || // Thay đổi > 50 items
      newStock === 0 || // Đặt về 0
      change > 100 // Thay đổi > 100 items
    );
  }

  getConfirmationMessage(): string {
    const current = this.selectedProduct()?.stockQuantity || 0;
    const newStock = this.calculateNewStock();
    const productName = this.selectedProduct()?.name || 'sản phẩm';
    
    if (newStock === 0) {
      return `Bạn có chắc muốn đặt tồn kho của "${productName}" về 0? Sản phẩm sẽ hết hàng!`;
    }
    
    const change = Math.abs(current - newStock);
    if (change > 100) {
      return `Bạn có chắc muốn thay đổi tồn kho từ ${current} thành ${newStock}? Đây là thay đổi lớn (${change} items)!`;
    }
    
    if (change > 50) {
      return `Bạn có chắc muốn ${current > newStock ? 'giảm' : 'tăng'} tồn kho từ ${current} xuống ${newStock}?`;
    }
    
    return `Xác nhận thay đổi tồn kho từ ${current} thành ${newStock}?`;
  }

  isValidAdjustment(): boolean {
    const isAmountValid = this.adjustAmount !== null && this.calculateNewStock() >= 0;
    
    // If reason is custom, note is required
    if (this.adjustReason === 'custom') {
      return isAmountValid && this.adjustNote.trim().length > 0;
    }
    
    return isAmountValid;
  }

  handleSubmitAdjustment(): void {
    if (!this.isValidAdjustment()) return;
    
    // Check if needs confirmation
    if (this.needsConfirmation()) {
      this.confirmMessage.set(this.getConfirmationMessage());
      this.showConfirmDialog.set(true);
    } else {
      this.submitAdjustment();
    }
  }

  confirmAdjustment(): void {
    this.showConfirmDialog.set(false);
    this.submitAdjustment();
  }

  closeConfirmDialog(): void {
    this.showConfirmDialog.set(false);
    this.confirmMessage.set('');
  }

  submitAdjustment(): void {
    if (!this.selectedProduct() || !this.isValidAdjustment()) return;
    
    const newStock = this.calculateNewStock();
    
    // Build note with reason
    let finalNote = this.adjustNote;
    if (this.adjustReason && this.adjustReason !== 'custom') {
      finalNote = this.reasonTranslations[this.adjustReason];
      if (this.adjustNote) {
        finalNote += ` - ${this.adjustNote}`;
      }
    }
    
    this.adminService.updateProductStock(
      this.selectedProduct()!._id, 
      newStock, 
      finalNote || undefined
    ).subscribe({
      next: () => {
        this.closeAdjustModal();
        this.loadData();
      },
      error: (err) => {
        console.error('Error updating stock:', err);
        alert(err.error?.message || 'Không thể cập nhật tồn kho');
      }
    });
  }

  // History Modal
  viewHistory(product: AdminProduct): void {
    this.selectedProduct.set(product);
    this.showHistoryModal.set(true);
  }

  closeHistoryModal(): void {
    this.showHistoryModal.set(false);
    this.selectedProduct.set(null);
  }

  exportReport(): void {
    const products = this.filteredProducts();
    const threshold = this.adminService.lowStockThreshold();
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN');
    const timeStr = now.toLocaleTimeString('vi-VN');
    
    // Tính toán thống kê
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stockQuantity), 0);
    const inStock = products.filter(p => p.stockQuantity > threshold).length;
    const lowStock = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= threshold).length;
    const outOfStock = products.filter(p => p.stockQuantity === 0).length;
    
    // Prepare data for Excel
    const summaryData = [
      { 'Chỉ tiêu': 'BÁO CÁO TỒN KHO', 'Giá trị': '' },
      { 'Chỉ tiêu': 'Ngày xuất', 'Giá trị': `${dateStr} ${timeStr}` },
      { 'Chỉ tiêu': 'Tổng số sản phẩm', 'Giá trị': totalProducts },
      { 'Chỉ tiêu': `Còn hàng (>${threshold})`, 'Giá trị': inStock },
      { 'Chỉ tiêu': `Sắp hết (≤${threshold})`, 'Giá trị': lowStock },
      { 'Chỉ tiêu': 'Hết hàng', 'Giá trị': outOfStock },
      { 'Chỉ tiêu': 'Tổng giá trị tồn kho', 'Giá trị': this.formatCurrency(totalValue) },
      { 'Chỉ tiêu': '', 'Giá trị': '' }
    ];
    
    const detailData = products.map((p, index) => {
      const categoryName = this.getCategoryName(p.category);
      const status = p.stockQuantity === 0 ? 'Hết hàng' : 
                     p.stockQuantity <= threshold ? 'Sắp hết' : 'Còn hàng';
      const value = p.price * p.stockQuantity;
      
      return {
        'STT': index + 1,
        'Tên sản phẩm': p.name,
        'SKU': p.sku || 'N/A',
        'Danh mục': categoryName,
        'Giá bán (VND)': p.price,
        'Tồn kho': p.stockQuantity,
        'Trạng thái': status,
        'Giá trị (VND)': value
      };
    });
    
    import('xlsx').then(XLSX => {
      const wb = XLSX.utils.book_new();
      
      // Summary sheet
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Thống kê');
      
      // Detail sheet
      const wsDetail = XLSX.utils.json_to_sheet(detailData);
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi tiết');
      
      XLSX.writeFile(wb, `Bao_cao_ton_kho_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}.xlsx`);
    });
  }

  formatCurrency(amount: number): string {
    return `${amount.toFixed(2)} VND`;
  }
}

