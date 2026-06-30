import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CartService } from '@core/services/cart.service';
import { AuthService } from '@core/services/auth.service';
import { CartItem } from '@models/index';
import { QuantitySelectorComponent } from '@shared/quantity-selector/quantity-selector.component';
import { ProductTranslatePipe } from '@shared/pipes/product-translate.pipe';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, QuantitySelectorComponent, TranslateModule, ProductTranslatePipe],
  template: `
    <!-- Hero Section -->
    <div class="hero">
      <div class="container">
        <div class="row justify-content-between">
          <div class="col-lg-12">
            <div class="intro-excerpt">
              <h1>{{ 'cart.title' | translate }}</h1>
              <p class="mb-0">{{ 'cart.reviewItems' | translate }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cart Content -->
    <div class="cart-section">
      <div class="container">
        <!-- Sync Status -->
        <div *ngIf="cartService.syncing()" class="alert alert-info mb-4">
          <i class="bi bi-arrow-repeat spin me-2"></i>
          {{ 'cart.syncing' | translate }}
        </div>

        <!-- Empty Cart State -->
        <div *ngIf="cartItems().length === 0 && !cartService.loading()" class="empty-cart">
          <div class="empty-icon">
            <i class="bi bi-cart-x"></i>
          </div>
          <h3>{{ 'cart.empty' | translate }}</h3>
          <p>{{ 'cart.emptyMessage' | translate }}</p>
          <a routerLink="/shop" class="btn btn-primary btn-lg">
            <i class="bi bi-shop me-2"></i>
            {{ 'cart.startShopping' | translate }}
          </a>
        </div>

        <!-- Loading State -->
        <div *ngIf="cartService.loading()" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">{{ 'button.loading' | translate }}</span>
          </div>
          <p class="mt-3 text-muted">{{ 'cart.loadingCart' | translate }}</p>
        </div>

        <!-- Cart Items -->
        <div *ngIf="cartItems().length > 0 && !cartService.loading()" class="cart-content">
          <!-- Cart Table -->
          <div class="cart-table-wrapper">
            <table class="cart-table">
              <thead>
                <tr>
                  <th class="product-col">{{ 'cart.product' | translate }}</th>
                  <th class="price-col">{{ 'cart.price' | translate }}</th>
                  <th class="quantity-col">{{ 'cart.quantity' | translate }}</th>
                  <th class="total-col">{{ 'cart.total' | translate }}</th>
                  <th class="action-col"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of cartItems(); trackBy: trackByProduct" class="cart-item">
                  <td class="product-info">
                    <div class="product-cell">
                      <div class="product-image">
                        <img 
                          [src]="item.product.primaryImage || item.product.images[0] || 'assets/images/product-placeholder.png'" 
                          [alt]="item.product.name"
                          (error)="onImageError($event)"
                        >
                      </div>
                      <div class="product-details">
                        <h6>
                          <a [routerLink]="['/product', item.product._id]">
                            {{ item.product.name | productTranslate }}
                          </a>
                        </h6>
                        <p class="product-meta" *ngIf="item.product.sku">
                          SKU: {{ item.product.sku }}
                        </p>
                        <span class="stock-badge" [class.in-stock]="item.product.inStock">
                          {{ item.product.inStock ? ('product.inStock' | translate) : ('product.outOfStock' | translate) }}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td class="price">
                    <span class="price-value">{{ formatPrice(item.product.price, item.product.originalCurrency) }}</span>
                  </td>
                  <td class="quantity">
                    <app-quantity-selector
                      [value]="item.quantity"
                      [min]="1"
                      [max]="item.product.stockQuantity || 99"
                      (valueChange)="updateQuantity(item.product._id, $event)"
                    ></app-quantity-selector>
                  </td>
                  <td class="total">
                    <span class="total-value">{{ formatPrice(item.product.price * item.quantity, item.product.originalCurrency) }}</span>
                  </td>
                  <td class="action">
                    <button 
                      class="btn-remove" 
                      (click)="removeItem(item.product._id)"
                      [title]="'cart.removeItem' | translate"
                    >
                      <img src="assets/icons/remove.png" alt="Remove" class="remove-icon">
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Cart Actions -->
          <div class="cart-actions">
            <a routerLink="/shop" class="btn btn-outline">
              <i class="bi bi-arrow-left me-2"></i>
              {{ 'cart.continueShopping' | translate }}
            </a>
            <button class="btn btn-outline" (click)="clearCart()">
              <i class="bi bi-trash me-2"></i>
              {{ 'cart.clearCart' | translate }}
            </button>
          </div>

          <!-- Cart Summary -->
          <div class="cart-summary">
            <div class="summary-card">
              <h4 class="summary-title">{{ 'checkout.orderSummary' | translate }}</h4>
              
              <div class="summary-row">
                <span>{{ 'cart.subtotal' | translate }} ({{ totalItems() }} {{ 'cart.items' | translate }})</span>
                <span class="summary-value">{{ formatPrice(subtotal()) }}</span>
              </div>
              
              <div class="summary-row">
                <span>{{ 'cart.shipping' | translate }}</span>
                <span class="summary-value text-muted">{{ 'cart.calculatedAtCheckout' | translate }}</span>
              </div>
              
              <div class="summary-row">
                <span>{{ 'cart.tax' | translate }}</span>
                <span class="summary-value text-muted">{{ 'cart.calculatedAtCheckout' | translate }}</span>
              </div>
              
              <div class="summary-divider"></div>
              
              <div class="summary-row summary-total">
                <span>{{ 'cart.total' | translate }}</span>
                <span class="summary-value">{{ formatPrice(total()) }}</span>
              </div>

              <button 
                class="btn btn-primary btn-checkout"
                routerLink="/checkout"
              >
                <i class="bi bi-lock me-2"></i>
                {{ 'cart.proceedToCheckout' | translate }}
              </button>

              <div class="security-badges" *ngIf="isAuthenticated()">
                <i class="bi bi-shield-check me-2"></i>
                <span>{{ 'cart.secureCheckout' | translate }}</span>
              </div>

              <div class="login-prompt" *ngIf="!isAuthenticated()">
                <p>
                  <i class="bi bi-info-circle me-2"></i>
                  <a routerLink="/login" class="link">{{ 'cart.signIn' | translate }}</a> {{ 'cart.syncMessage' | translate }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hero {
      background: linear-gradient(135deg, #153243 0%, #0d1f29 100%);
      padding: 80px 0 60px;
      color: white;
      margin-bottom: 50px;
    }

    .hero h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .cart-section {
      padding: 0 0 80px;
      min-height: 60vh;
    }

    /* Empty Cart */
    .empty-cart {
      text-align: center;
      padding: 80px 20px;
    }

    .empty-icon {
      font-size: 6rem;
      color: #dce5e4;
      margin-bottom: 30px;
    }

    .empty-cart h3 {
      font-size: 1.8rem;
      color: #2f2f2f;
      margin-bottom: 15px;
    }

    .empty-cart p {
      color: #6c757d;
      font-size: 1.1rem;
      margin-bottom: 30px;
    }

    /* Cart Table */
    .cart-table-wrapper {
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      overflow: hidden;
      margin-bottom: 30px;
    }

    .cart-table {
      width: 100%;
      border-collapse: collapse;
    }

    .cart-table thead {
      background: #f8f9fa;
    }

    .cart-table th {
      padding: 20px 15px;
      text-align: left;
      font-weight: 600;
      color: #2f2f2f;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e9ecef;
    }

    .cart-table td {
      padding: 25px 15px;
      border-bottom: 1px solid #f0f0f0;
      vertical-align: middle;
    }

    .cart-item:last-child td {
      border-bottom: none;
    }

    .product-col { width: 45%; }
    .price-col { width: 15%; }
    .quantity-col { width: 18%; }
    .total-col { width: 15%; }
    .action-col { width: 7%; text-align: center; }

    /* Product Info */
    .product-cell {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .product-image {
      width: 100px;
      height: 100px;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
      background: #f8f9fa;
    }

    .product-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .product-image:hover img {
      transform: scale(1.1);
    }

    .product-details h6 {
      margin: 0 0 8px 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .product-details a {
      color: #2f2f2f;
      text-decoration: none;
      transition: color 0.2s;
    }

    .product-details a:hover {
      color: #153243;
    }

    .product-meta {
      font-size: 0.85rem;
      color: #6c757d;
      margin: 0 0 8px 0;
    }

    .stock-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 5px;
      font-size: 0.75rem;
      font-weight: 500;
      background: #ffc107;
      color: #000;
    }

    .stock-badge.in-stock {
      background: #d4edda;
      color: #155724;
    }

    /* Price & Total */
    .price-value, .total-value {
      font-size: 1.1rem;
      font-weight: 600;
      color: #2f2f2f;
    }

    /* Remove Button */
    .btn-remove {
      width: 40px;
      height: 40px;
      border: none;
      background: #f8f9fa;
      color: #dc3545;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .remove-icon {
      width: 18px;
      height: 18px;
      object-fit: contain;
      opacity: 0.7;
      transition: all 0.2s;
    }

    .btn-remove:hover {
      background: #dc3545;
    }

    .btn-remove:hover .remove-icon {
      filter: brightness(0) invert(1);
      opacity: 1;
    }

    /* Cart Actions */
    .cart-actions {
      display: flex;
      gap: 15px;
      justify-content: space-between;
      margin-bottom: 30px;
    }

    /* Cart Summary */
    .cart-summary {
      display: flex;
      justify-content: flex-end;
    }

    .summary-card {
      width: 400px;
      background: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }

    .summary-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: #2f2f2f;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e9ecef;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      font-size: 0.95rem;
    }

    .summary-row span:first-child {
      color: #6c757d;
    }

    .summary-value {
      font-weight: 600;
      color: #2f2f2f;
    }

    .summary-divider {
      height: 1px;
      background: #e9ecef;
      margin: 20px 0;
    }

    .summary-total {
      font-size: 1.2rem;
      margin-bottom: 25px;
    }

    .summary-total span {
      font-weight: 700;
      color: #2f2f2f;
    }

    .summary-total .summary-value {
      color: #153243;
      font-size: 1.4rem;
    }

    .btn-checkout {
      width: 100%;
      padding: 15px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px;
      margin-bottom: 15px;
    }

    .security-badges {
      text-align: center;
      color: #28a745;
      font-size: 0.9rem;
      padding: 10px;
      background: #d4edda;
      border-radius: 6px;
    }

    .login-prompt {
      text-align: center;
      padding: 15px;
      background: #fff3cd;
      border-radius: 6px;
      margin-top: 15px;
    }

    .login-prompt p {
      margin: 0;
      font-size: 0.9rem;
      color: #856404;
    }

    .login-prompt .link {
      color: #153243;
      font-weight: 600;
      text-decoration: none;
    }

    .login-prompt .link:hover {
      text-decoration: underline;
    }

    /* Buttons */
    .btn {
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.3s;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }

    .btn-primary {
      background: #153243;
      color: white;
    }

    .btn-primary:hover {
      background: #0d1f29;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(21, 50, 67, 0.3);
    }

    .btn-outline {
      background: white;
      color: #2f2f2f;
      border: 2px solid #e9ecef;
    }

    .btn-outline:hover {
      border-color: #153243;
      color: #ffffff;
    }

    .btn-lg {
      padding: 16px 36px;
      font-size: 1.1rem;
    }

    /* Animations */
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .hero h1 {
        font-size: 2rem;
      }

      .cart-table-wrapper {
        overflow-x: auto;
      }

      .cart-table {
        min-width: 600px;
      }

      .product-image {
        width: 70px;
        height: 70px;
      }

      .summary-card {
        width: 100%;
      }

      .cart-actions {
        flex-direction: column;
      }

      .cart-actions .btn {
        width: 100%;
      }
    }
  `]
})
export class CartComponent implements OnInit {
  cartService = inject(CartService);
  private authService = inject(AuthService);

  cartItems = this.cartService.items;
  
  subtotal = computed(() => this.cartService.total());
  totalItems = computed(() => this.cartService.itemCount());
  total = computed(() => this.subtotal());

  ngOnInit(): void {
    // Component initialization
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  updateQuantity(productId: string, newQuantity: number): void {
    this.cartService.updateQuantity(productId, newQuantity);
  }

  removeItem(productId: string): void {
    if (confirm('Remove this item from your cart?')) {
      this.cartService.removeItem(productId);
    }
  }

  clearCart(): void {
    if (confirm('Are you sure you want to clear your entire cart?')) {
      this.cartService.clearCart();
    }
  }

  trackByProduct(index: number, item: CartItem): string {
    return item.product._id;
  }

  onImageError(event: any): void {
    event.target.src = 'assets/images/product-placeholder.png';
  }

  formatPrice(price: number, currency?: string): string {
    const currencySymbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': 'VND',
      'JPY': '¥',
      'VND': 'VND'
    };
    
    const symbol = currency ? (currencySymbols[currency] || currency + ' ') : 'VND';
    
    // For VND or GBP formatted as VND
    if (currency === 'VND' || symbol === 'VND') {
      const formattedPrice = price.toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return `${formattedPrice} VND`;
    }
    
    const formattedPrice = price.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `${symbol}${formattedPrice}`;
  }
}
