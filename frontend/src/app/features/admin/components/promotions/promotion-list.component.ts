import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../services/admin.service';
import { AdminPromotion } from '../../models/admin.models';
import { AdminCurrencyPipe } from '../../pipes/admin-currency.pipe';

@Component({
  selector: 'app-promotion-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminCurrencyPipe, TranslateModule],
  template: `
    <div class="promotion-list-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <h1>{{ 'admin.promotionManagement' | translate }}</h1>
          <p class="subtitle">{{ promotions().length }} {{ 'admin.promotionsCount' | translate }}</p>
        </div>
        <button class="btn btn-primary" (click)="openCreateModal()">
          <span>+</span> {{ 'admin.createNewCode' | translate }}
        </button>
      </div>

      <!-- Stats Overview -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon active"><i class="gi gi-ui-success" aria-hidden="true"></i></div>
          <div class="stat-info">
            <span class="stat-value">{{ activePromotions() }}</span>
            <span class="stat-label">{{ 'admin.activePromotions' | translate }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon used"><i class="gi gi-ui-trend-up" aria-hidden="true"></i></div>
          <div class="stat-info">
            <span class="stat-value">{{ totalUsageCount() }}</span>
            <span class="stat-label">{{ 'admin.usageCount' | translate }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon expired"><i class="gi gi-ui-close" aria-hidden="true"></i></div>
          <div class="stat-info">
            <span class="stat-value">{{ expiredPromotions() }}</span>
            <span class="stat-label">{{ 'admin.expired' | translate }}</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-box">
          <input 
            type="text" 
            [placeholder]="'admin.searchPromotions' | translate"
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event)">
        </div>

        <div class="filter-group">
          <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
            <option value="">{{ 'admin.allStatus' | translate }}</option>
            <option value="active">{{ 'admin.activePromotions' | translate }}</option>
            <option value="inactive">{{ 'admin.paused' | translate }}</option>
            <option value="expired">{{ 'admin.expired' | translate }}</option>
          </select>

          <select [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)">
            <option value="">{{ 'admin.allTypes' | translate }}</option>
            <option value="percentage">{{ 'admin.discountPercent' | translate }}</option>
            <option value="fixed">{{ 'admin.discountFixed' | translate }}</option>
            <option value="free_shipping">{{ 'admin.freeShipping' | translate }}</option>
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

      <!-- Promotions Grid -->
      @if (!adminService.loading()) {
        <div class="promotions-grid">
          @for (promo of filteredPromotions(); track promo._id) {
            <div class="promotion-card" [class.inactive]="!promo.isActive" [class.expired]="isExpired(promo)">
              <div class="promo-header">
                <span class="promo-code">{{ promo.code }}</span>
                <div class="promo-status">
                  @if (isExpired(promo)) {
                    <span class="status expired">{{ 'admin.expired' | translate }}</span>
                  } @else if (promo.isActive) {
                    <span class="status active">{{ 'admin.active' | translate }}</span>
                  } @else {
                    <span class="status inactive">{{ 'admin.paused' | translate }}</span>
                  }
                </div>
              </div>

              <div class="promo-value">
                @if (promo.type === 'percentage') {
                  <span class="value">{{ promo.value }}%</span>
                  @if (promo.maxDiscount) {
                    <span class="max">{{ 'admin.max' | translate }} {{ promo.maxDiscount | adminCurrency }}</span>
                  }
                } @else if (promo.type === 'fixed') {
                  <span class="value">{{ promo.value | adminCurrency }}</span>
                } @else {
                  <span class="value free-ship">{{ 'admin.freeShippingLabel' | translate }}</span>
                }
              </div>

              @if (promo.description) {
                <p class="promo-description">{{ promo.description }}</p>
              }

              <div class="promo-conditions">
                @if (promo.minOrderAmount) {
                  <span class="condition">
                    {{ 'admin.minOrder' | translate }}: {{ promo.minOrderAmount | adminCurrency }}
                  </span>
                }
                @if (promo.usageLimit) {
                  <span class="condition">
                    {{ 'admin.usage' | translate }}: {{ promo.usageCount }}/{{ promo.usageLimit }}
                  </span>
                }
              </div>

              <div class="promo-dates">
                <span>{{ formatDate(promo.startDate) }} - {{ formatDate(promo.endDate) }}</span>
              </div>

              <div class="promo-progress" *ngIf="promo.usageLimit">
                <div 
                  class="progress-bar" 
                  [style.width.%]="(promo.usageCount / promo.usageLimit) * 100">
                </div>
              </div>

              <div class="promo-actions">
                <button class="action-btn edit" (click)="editPromotion(promo)" title="Sửa">
                  <i class="gi gi-ui-edit" aria-hidden="true"></i>
                </button>
                <button 
                  class="action-btn toggle" 
                  [class.pause]="promo.isActive"
                  [class.resume]="!promo.isActive"
                  (click)="togglePromotion(promo)" 
                  [title]="promo.isActive ? ('admin.pause' | translate) : ('admin.activate' | translate)"
                  [disabled]="isExpired(promo)">
                  <i *ngIf="promo.isActive" class="gi gi-ui-pause" aria-hidden="true"></i>
                  <i *ngIf="!promo.isActive" class="gi gi-ui-play" aria-hidden="true"></i>
                </button>
                <button class="action-btn delete" (click)="deletePromotion(promo)" title="Xóa">
                  <i class="gi gi-ui-delete" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <p>{{ 'admin.noPromotionsYet' | translate }}</p>
              <button class="btn btn-primary" (click)="openCreateModal()">
                {{ 'admin.createFirstPromotion' | translate }}
              </button>
            </div>
          }
        </div>
      }

      <!-- Create/Edit Modal -->
      @if (showFormModal()) {
        <div class="modal-overlay" (click)="closeFormModal()">
          <div class="modal-content modal-large" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingPromotion() ? ('admin.editPromotion' | translate) : ('admin.createPromotion' | translate) }}</h3>
              <button class="close-btn" (click)="closeFormModal()">×</button>
            </div>
            <div class="modal-body">
              <form (ngSubmit)="submitForm()">
                <div class="form-row">
                  <div class="form-group">
                    <label>{{ 'admin.promotionCode' | translate }} *</label>
                    <div class="code-input">
                      <input 
                        type="text" 
                        [(ngModel)]="formData.code" 
                        name="code"
                        [placeholder]="'admin.promotionCodeExample' | translate"
                        [disabled]="!!editingPromotion()"
                        required>
                      <button 
                        type="button" 
                        class="generate-btn" 
                        (click)="generateCode()"
                        *ngIf="!editingPromotion()">
                        <i class="gi gi-ui-random" aria-hidden="true"></i> {{ 'admin.generateRandom' | translate }}
                      </button>
                    </div>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>{{ 'admin.description' | translate }}</label>
                    <input 
                      type="text" 
                      [(ngModel)]="formData.description" 
                      name="description"
                      [placeholder]="'admin.promotionDescriptionPlaceholder' | translate">
                  </div>
                </div>

                <div class="form-row two-cols">
                  <div class="form-group">
                    <label>{{ 'admin.discountType' | translate }} *</label>
                    <select [(ngModel)]="formData.type" name="type" required>
                      <option value="percentage">{{ 'admin.discountPercent' | translate }}</option>
                      <option value="fixed">{{ 'admin.discountFixed' | translate }}</option>
                      <option value="free_shipping">{{ 'admin.freeShippingLabel' | translate }}</option>
                    </select>
                  </div>
                  <div class="form-group" *ngIf="formData.type !== 'free_shipping'">
                    <label>{{ 'admin.value' | translate }} *</label>
                    <div class="value-input">
                      <input 
                        type="number" 
                        [(ngModel)]="formData.value" 
                        name="value"
                        [placeholder]="formData.type === 'percentage' ? '10' : '100000'"
                        min="0"
                        required>
                      <span class="suffix">{{ formData.type === 'percentage' ? '%' : currencySymbol() }}</span>
                    </div>
                  </div>
                </div>

                <div class="form-row two-cols" *ngIf="formData.type === 'percentage'">
                  <div class="form-group">
                    <label>{{ 'admin.maxDiscount' | translate }}</label>
                    <div class="value-input">
                      <input 
                        type="number" 
                        [(ngModel)]="formData.maxDiscount" 
                        name="maxDiscount"
                        placeholder="50"
                        min="0">
                      <span class="suffix">{{ currencySymbol() }}</span>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>{{ 'admin.minOrder' | translate }}</label>
                    <div class="value-input">
                      <input 
                        type="number" 
                        [(ngModel)]="formData.minOrderValue" 
                        name="minOrderValue"
                        placeholder="20"
                        min="0">
                      <span class="suffix">{{ currencySymbol() }}</span>
                    </div>
                  </div>
                </div>

                <div class="form-row two-cols">
                  <div class="form-group">
                    <label>{{ 'admin.startDate' | translate }} *</label>
                    <input 
                      type="datetime-local" 
                      [(ngModel)]="formData.startDate" 
                      name="startDate"
                      required>
                  </div>
                  <div class="form-group">
                    <label>{{ 'admin.endDate' | translate }} *</label>
                    <input 
                      type="datetime-local" 
                      [(ngModel)]="formData.endDate" 
                      name="endDate"
                      required>
                  </div>
                </div>

                <div class="form-row two-cols">
                  <div class="form-group">
                    <label>{{ 'admin.maxUsage' | translate }}</label>
                    <input 
                      type="number" 
                      [(ngModel)]="formData.usageLimit" 
                      name="usageLimit"
                      [placeholder]="'admin.unlimited' | translate"
                      min="1">
                  </div>
                  <div class="form-group">
                    <label>{{ 'admin.maxPerUser' | translate }}</label>
                    <input 
                      type="number" 
                      [(ngModel)]="formData.usageLimitPerUser" 
                      name="usageLimitPerUser"
                      placeholder="1"
                      min="1">
                  </div>
                </div>

                <div class="form-group checkbox-group">
                  <label>
                    <input 
                      type="checkbox" 
                      [(ngModel)]="formData.isActive" 
                      name="isActive">
                    {{ 'admin.activateNow' | translate }}
                  </label>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeFormModal()">{{ 'button.cancel' | translate }}</button>
              <button class="btn btn-primary" (click)="submitForm()">
                {{ editingPromotion() ? ('button.update' | translate) : ('admin.createCode' | translate) }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .promotion-list-page {
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

    .btn-secondary {
      background: #fff;
      color: #153243;
      border-color: #e6e6ea;
    }

    .btn-secondary:hover {
      background: #e6e6ea;
      border-color: #153243;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 24px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      border-color: #153243;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .stat-icon.active { 
      background: #153243; 
      color: #c3d350;
    }
    
    .stat-icon.used { 
      background: #153243; 
      color: #c3d350; 
    }
    
    .stat-icon.expired { 
      background: #153243; 
      color: #c3d350; 
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #153243;
    }

    .stat-label {
      font-size: 13px;
      color: #666;
    }

    /* Filters */
    .filters-bar {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
      flex: 1;
      min-width: 250px;
      max-width: 400px;
    }

    .search-box img {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      opacity: 0.5;
    }

    .search-box input {
      width: 100%;
      padding: 10px 12px 10px 42px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
    }

    .filter-group {
      display: flex;
      gap: 12px;
    }

    .filter-group select {
      padding: 10px 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      background: #fff;
      min-width: 170px;
      cursor: pointer;
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

    /* Promotions Grid */
    .promotions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .promotion-card {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      position: relative;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .promotion-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .promotion-card.inactive {
      opacity: 0.7;
    }

    .promotion-card.expired {
      opacity: 0.6;
      background: #f9f9f9;
    }

    .promo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .promo-code {
      font-family: monospace;
      font-size: 16px;
      font-weight: 700;
      color: #153243;
      background: #e6e6ea;
      padding: 4px 10px;
      border-radius: 6px;
    }

    .status {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 12px;
      font-weight: 500;
    }

    .status.active {
      background: #153243;
      color: #c3d350;
    }

    .status.inactive {
      background: #e6e6ea;
      color: #153243;
    }

    .status.expired {
      background: #284b63;
      color: #fff;
    }

    .promo-value {
      text-align: center;
      padding: 16px 0;
      border-bottom: 1px dashed #ddd;
      margin-bottom: 12px;
    }

    .promo-value .value {
      font-size: 28px;
      font-weight: 700;
      color: #e63946;
    }

    .promo-value .value.free-ship {
      font-size: 18px;
      color: #153243;
    }

    .promo-value .max {
      display: block;
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }

    .promo-description {
      font-size: 14px;
      color: #666;
      margin: 0 0 12px;
    }

    .promo-conditions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .condition {
      font-size: 12px;
      padding: 4px 8px;
      background: #f5f5f5;
      border-radius: 4px;
      color: #666;
    }

    .promo-dates {
      font-size: 12px;
      color: #999;
      margin-bottom: 8px;
    }

    .promo-progress {
      height: 4px;
      background: #f0f0f0;
      border-radius: 2px;
      margin-bottom: 12px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: #153243;
      border-radius: 2px;
      transition: width 0.3s;
    }

    .promo-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .action-btn {
      width: 36px;
      height: 36px;
      border: 1px solid #e6e6ea;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: #153243;
      transition: all 0.2s;
    }

    .action-btn:hover:not(:disabled) {
      background: #153243;
      color: #fff;
      border-color: #153243;
    }

    .action-btn.delete:hover:not(:disabled) {
      background: #284b63;
      border-color: #284b63;
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      background: #f9f9f9;
      border-radius: 12px;
    }

    .empty-state p {
      color: #666;
      margin-bottom: 16px;
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
      border-radius: 16px;
      width: 100%;
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 2px solid #f0f0f0;
      background: linear-gradient(135deg, #153243 0%, #284b63 100%);
      border-radius: 16px 16px 0 0;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #fff;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(255, 255, 255, 0.2);
      font-size: 28px;
      cursor: pointer;
      color: #fff;
      transition: all 0.2s;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }

    .modal-body {
      padding: 28px;
    }

    .form-row {
      margin-bottom: 20px;
    }

    .form-row.two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
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
    }

    .form-group input,
    .form-group select {
      padding: 12px 14px;
      border: 2px solid #e6e6ea;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #153243;
    }

    .code-input {
      display: flex;
      gap: 8px;
    }

    .code-input input {
      flex: 1;
      text-transform: uppercase;
    }

    .generate-btn {
      padding: 12px 16px;
      border: 2px solid #153243;
      background: #fff;
      color: #153243;
      border-radius: 8px;
      cursor: pointer;
      white-space: nowrap;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s;
    }

    .generate-btn:hover {
      background: #153243;
      color: #fff;
    }

    .value-input {
      position: relative;
    }

    .value-input input {
      width: 100%;
      padding-right: 40px;
    }

    .value-input .suffix {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #153243;
      font-size: 15px;
      font-weight: 600;
    }

    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .checkbox-group input[type="checkbox"] {
      width: 18px;
      height: 18px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      border-top: 2px solid #f0f0f0;
      background: #f9f9f9;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .form-row.two-cols {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PromotionListComponent implements OnInit {
  adminService = inject(AdminService);
  private translate = inject(TranslateService);

  promotions = computed(() => this.adminService.promotions());

  // Computed stats
  activePromotions = computed(() => 
    this.promotions().filter(p => p.isActive && !this.isExpired(p)).length
  );
  
  expiredPromotions = computed(() => 
    this.promotions().filter(p => this.isExpired(p)).length
  );
  
  totalUsageCount = computed(() => 
    this.promotions().reduce((sum, p) => sum + p.usedCount, 0)
  );

  // Currency symbol based on settings
  currencySymbol = computed(() => {
    const currency = this.adminService.currency().toUpperCase();
    switch(currency) {
      case 'USD': return '$';
      case 'VND': return 'VND';
      case 'GBP':
      default: return 'VND';
    }
  });

  // Convert GBP to current currency for display
  convertFromGBP(amountGBP: number): number {
    const rates = this.adminService.exchangeRates();
    if (!rates) return amountGBP;

    const currency = this.adminService.currency().toUpperCase();
    switch(currency) {
      case 'USD':
        return amountGBP * rates.gbp_to_usd;
      case 'VND':
        return Math.round(amountGBP * rates.gbp_to_vnd);
      case 'GBP':
      default:
        return amountGBP;
    }
  }

  // Convert current currency back to GBP for storage
  convertToGBP(amount: number): number {
    const rates = this.adminService.exchangeRates();
    if (!rates) return amount;

    const currency = this.adminService.currency().toUpperCase();
    switch(currency) {
      case 'USD':
        return amount / rates.gbp_to_usd;
      case 'VND':
        return amount / rates.gbp_to_vnd;
      case 'GBP':
      default:
        return amount;
    }
  }

  // Filters as signals
  searchTerm = signal('');
  statusFilter = signal('');
  typeFilter = signal('');

  filteredPromotions = computed(() => {
    let result = [...this.promotions()];
    
    // Search filter
    const search = this.searchTerm().trim();
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(p => 
        p.code.toLowerCase().includes(term) ||
        p.name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }
    
    // Status filter
    const status = this.statusFilter();
    if (status) {
      if (status === 'active') {
        result = result.filter(p => p.isActive && !this.isExpired(p));
      } else if (status === 'inactive') {
        result = result.filter(p => !p.isActive && !this.isExpired(p));
      } else if (status === 'expired') {
        result = result.filter(p => this.isExpired(p));
      }
    }
    
    // Type filter
    const type = this.typeFilter();
    if (type) {
      result = result.filter(p => p.type === type);
    }
    
    return result;
  });

  // Modal
  showFormModal = signal(false);
  editingPromotion = signal<AdminPromotion | null>(null);

  formData: any = this.getEmptyFormData();

  ngOnInit(): void {
    this.loadPromotions();
  }

  loadPromotions(): void {
    this.adminService.loadPromotions().subscribe();
  }

  isExpired(promo: AdminPromotion): boolean {
    return new Date(promo.endDate) < new Date();
  }

  // Modal
  openCreateModal(): void {
    this.editingPromotion.set(null);
    this.formData = this.getEmptyFormData();
    this.showFormModal.set(true);
  }

  editPromotion(promo: AdminPromotion): void {
    this.editingPromotion.set(promo);
    this.formData = {
      code: promo.code,
      name: promo.name,
      description: promo.description || '',
      type: promo.type,
      value: promo.type === 'percentage' ? promo.value : this.convertFromGBP(promo.value),
      maxDiscount: promo.maxDiscount ? this.convertFromGBP(promo.maxDiscount) : null,
      minOrderValue: promo.minOrderAmount ? this.convertFromGBP(promo.minOrderAmount) : null,
      startDate: this.formatDateForInput(promo.startDate),
      endDate: this.formatDateForInput(promo.endDate),
      usageLimit: promo.usageLimit || null,
      usageLimitPerUser: promo.usagePerUser || null,
      isActive: promo.active
    };
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
    this.editingPromotion.set(null);
  }

  submitForm(): void {
    if (!this.formData.code || !this.formData.type || !this.formData.startDate || !this.formData.endDate) {
      alert(this.translate.instant('admin.fillRequiredFields'));
      return;
    }

    // Prepare data with correct field names for backend
    const data: any = {
      code: this.formData.code,
      name: this.formData.description || this.formData.code,
      description: this.formData.description,
      type: this.formData.type,
      value: this.formData.type === 'percentage' ? this.formData.value : this.convertToGBP(this.formData.value || 0),
      startDate: new Date(this.formData.startDate),
      endDate: new Date(this.formData.endDate),
      active: this.formData.isActive
    };

    // Add optional fields only if they have values (convert to GBP)
    if (this.formData.maxDiscount) data.maxDiscount = this.convertToGBP(this.formData.maxDiscount);
    if (this.formData.minOrderValue) data.minOrderAmount = this.convertToGBP(this.formData.minOrderValue);
    if (this.formData.usageLimit) data.usageLimit = this.formData.usageLimit;
    if (this.formData.usageLimitPerUser) data.usagePerUser = this.formData.usageLimitPerUser;

    if (this.editingPromotion()) {
      this.adminService.updatePromotion(this.editingPromotion()!._id, data).subscribe({
        next: () => {
          alert(this.translate.instant('admin.promotionUpdatedSuccess'));
          this.closeFormModal();
          this.loadPromotions();
        },
        error: (err) => alert(err.error?.message || err.message || this.translate.instant('admin.promotionUpdateFailed'))
      });
    } else {
      this.adminService.createPromotion(data).subscribe({
        next: () => {
          alert(this.translate.instant('admin.promotionCreatedSuccess'));
          this.closeFormModal();
          this.loadPromotions();
        },
        error: (err) => alert(err.error?.message || err.message || this.translate.instant('admin.promotionCreateFailed'))
      });
    }
  }

  togglePromotion(promo: AdminPromotion): void {
    const newStatus = !promo.isActive;
    this.adminService.updatePromotion(promo._id, { active: newStatus }).subscribe({
      next: () => this.loadPromotions(),
      error: (err) => alert(err.error?.message || err.message || this.translate.instant('admin.statusUpdateFailed'))
    });
  }

  deletePromotion(promo: AdminPromotion): void {
    if (confirm(`${this.translate.instant('admin.confirmDeletePromotion')} "${promo.code}"?`)) {
      this.adminService.deletePromotion(promo._id).subscribe({
        next: () => {
          alert(this.translate.instant('admin.promotionDeletedSuccess'));
          this.loadPromotions();
        },
        error: (err) => alert(err.error?.message || err.message || this.translate.instant('admin.promotionDeleteFailed'))
      });
    }
  }

  generateCode(): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.formData.code = code;
  }

  getEmptyFormData(): any {
    return {
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      value: null,
      maxDiscount: null,
      minOrderValue: null,
      startDate: '',
      endDate: '',
      usageLimit: null,
      usageLimitPerUser: 1,
      isActive: true
    };
  }

  formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  }

  formatCurrency(amount: number): string {
    return `${amount.toFixed(2)} VND`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN');
  }
}
