import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductService } from '@core/services/product.service';
import { CartService } from '@core/services/cart.service';
import { Product } from '@models/index';
import { QuantitySelectorComponent } from '@shared/quantity-selector/quantity-selector.component';
import { ProductTranslatePipe } from '@shared/pipes/product-translate.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { ProductReviewsComponent } from '@shared/components/product-reviews.component';

declare const gsap: any;
declare const MorphSVGPlugin: any;

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, QuantitySelectorComponent, ProductTranslatePipe, TranslateModule, ProductReviewsComponent],
  template: `
    <!-- Loading State -->
    <div *ngIf="loading()" class="container my-5">
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">{{ 'button.loading' | translate }}</span>
        </div>
        <p class="mt-3">{{ 'product.loadingDetails' | translate }}</p>
      </div>
    </div>

    <!-- Error State -->
    <div *ngIf="error()" class="container my-5">
      <div class="alert alert-danger" role="alert">
        <h4 class="alert-heading">{{ 'message.error' | translate }}</h4>
        <p>{{ error() }}</p>
        <hr>
        <a routerLink="/shop" class="btn btn-primary">{{ 'product.backToShop' | translate }}</a>
      </div>
    </div>

    <!-- Product Detail Content -->
    <div *ngIf="product() && !loading()" class="untree_co-section product-detail-section before-footer-section">
      <div class="container">
        <div class="row g-4 g-lg-5 align-items-start">
          <!-- Product Images - Left Column -->
          <div class="col-lg-6">
            <div class="product-gallery sticky-top">
              <!-- Main Image -->
              <div class="main-image-wrapper">
                <img 
                  [src]="selectedImage() || product()!.primaryImage || product()!.images[0] || 'assets/images/product-1.png'" 
                  [alt]="product()!.name"
                  class="img-fluid main-product-image"
                >
              </div>

              <!-- Thumbnail Gallery - No Limit -->
              <div class="thumbnail-gallery-wrapper" *ngIf="product()!.images.length > 1">
                <div class="thumbnail-gallery">
                  <div 
                    class="thumbnail-item" 
                    *ngFor="let image of product()!.images"
                    [class.active]="selectedImage() === image"
                    (click)="selectImage(image)"
                  >
                    <img 
                      [src]="image" 
                      [alt]="product()!.name"
                      class="img-fluid thumbnail-image"
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Product Info - Right Column -->
          <div class="col-lg-6">
            <div class="product-info-wrapper">
              <!-- Product Name -->
              <h2 class="product-name">{{ product()!.name | productTranslate }}</h2>

              <!-- SKU & Stock Status -->
              <div class="product-meta-badges">
                <span class="badge badge-sku" *ngIf="product()!.sku">{{ 'product.sku' | translate }}: {{ product()!.sku }}</span>
                <span class="badge badge-stock" [ngClass]="product()!.inStock ? 'badge-in-stock' : 'badge-out-stock'">
                  {{ product()!.inStock ? ('product.inStock' | translate) : ('product.outOfStock' | translate) }}
                </span>
                <span class="badge badge-type" *ngIf="product()!.productType">{{ product()!.productType }}</span>
              </div>

              <!-- Rating -->
              <div class="product-rating" *ngIf="product()!.rating">
                <span class="stars">
                  <i class="bi bi-star-fill text-warning" *ngFor="let star of getStars(product()!.rating!)"></i>
                  <i class="bi bi-star text-warning" *ngFor="let star of getEmptyStars(product()!.rating!)"></i>
                </span>
              </div>

              <!-- Price -->
              <div class="product-price-section">
                <div class="price-wrapper">
                  <span class="current-price">{{ formatPrice(product()!.price, product()!.originalCurrency) }}</span>
                  <ng-container *ngIf="hasDiscount()">
                    <span class="original-price">
                      {{ formatPrice(product()!.originalPrice!, product()!.originalCurrency) }}
                    </span>
                    <span class="discount-badge">
                      {{ 'product.save' | translate }} {{ getDiscountPercent() }}%
                    </span>
                  </ng-container>
                </div>
              </div>

              <!-- Full Description - moved here from bottom -->
              <div class="product-description" *ngIf="product()!.description">
                <label class="section-label">{{ 'product.description' | translate }}:</label>
                <div class="description-text">
                  <p>{{ product()!.description }}</p>
                </div>
              </div>

              <!-- Tags -->
              <div class="product-tags-section" *ngIf="product()!.tags && product()!.tags!.length > 0">
                <label class="section-label">{{ 'product.tags' | translate }}:</label>
                <div class="tags-wrapper">
                  <span class="tag-item" *ngFor="let tag of product()!.tags">
                    {{ tag }}
                  </span>
                </div>
              </div>

              <!-- Quantity Selector -->
              <div class="quantity-section">
                <label class="section-label">{{ 'cart.quantity' | translate }}:</label>
                <app-quantity-selector
                  [value]="quantity()"
                  [min]="1"
                  [max]="product()!.stockQuantity || 99"
                  [disabled]="!product()!.inStock"
                  (valueChange)="onQuantityChange($event)"
                ></app-quantity-selector>
              </div>

              <!-- Action Buttons -->
              <div class="product-actions">
                <button
                  #addToCartButton
                  type="button"
                  class="add-to-cart"
                  [disabled]="!product()!.inStock"
                  (click)="addToCart()">
                  <span>Add to cart</span>
                  <svg class="morph" viewBox="0 0 64 13" aria-hidden="true">
                    <path d="M0 12C6 12 17 12 32 12C47.9024 12 58 12 64 12V13H0V12Z" />
                  </svg>
                  <div class="shirt" aria-hidden="true">
                    <svg class="first" viewBox="0 0 24 24">
                      <path d="M4.99997 3L8.99997 1.5C8.99997 1.5 10.6901 3 12 3C13.3098 3 15 1.5 15 1.5L19 3L22.5 8L19.5 10.5L19 9.5L17.1781 18.6093C17.062 19.1901 16.778 19.7249 16.3351 20.1181C15.4265 20.925 13.7133 22.3147 12 23C10.2868 22.3147 8.57355 20.925 7.66487 20.1181C7.22198 19.7249 6.93798 19.1901 6.82183 18.6093L4.99997 9.5L4.5 10.5L1.5 8L4.99997 3Z" />
                      <g>
                        <path d="M16.3516 9.65383H14.3484V7.83652H14.1742V9.8269H16.5258V7.83652H16.3516V9.65383Z" />
                        <path d="M14.5225 6.01934V7.66357H14.6967V7.4905H14.8186V7.66357H14.9928V6.01934H14.8186V7.31742H14.6967V6.01934H14.5225Z" />
                        <path d="M14.1742 5.67319V7.66357H14.3484V5.84627H16.3516V7.66357H16.5258V5.67319H14.1742Z" />
                        <path d="M15.707 9.48071H15.8812V9.28084L16.0032 9.4807V9.48071H16.1774V7.83648H16.0032V9.14683L15.8812 8.94697V7.83648H15.707V9.48071Z" />
                        <path d="M15.5852 6.01931H15.1149V6.19238H15.5852V6.01931Z" />
                        <path d="M15.707 6.01934V7.66357H15.8812V7.46371L16.0032 7.66357H16.1774V6.01934H16.0032V7.32969L15.8812 7.12984V6.01934H15.707Z" />
                        <path d="M15.411 7.31742H15.2891V6.53857H15.411V7.31742ZM15.1149 7.66357H15.2891V7.4905H15.411V7.66357H15.5852V6.3655H15.1149V7.66357Z" />
                        <path d="M14.5225 8.69756L14.8186 9.18291V9.30763H14.6967V9.13455H14.5225V9.48071H14.9928V9.13456V9.13455L14.6967 8.64917V8.00956H14.8186V8.6586H14.9928V7.83648H14.5225V8.69756Z" />
                        <path d="M15.411 9.30763H15.2891V8.00956H15.411V9.30763ZM15.1149 9.48071H15.5852V7.83648H15.1149V9.48071Z" />
                      </g>
                    </svg>
                    <svg class="second" viewBox="0 0 24 24">
                      <path d="M4.99997 3L8.99997 1.5C8.99997 1.5 10.6901 3 12 3C13.3098 3 15 1.5 15 1.5L19 3L22.5 8L19.5 10.5L19 9.5L17.1781 18.6093C17.062 19.1901 16.778 19.7249 16.3351 20.1181C15.4265 20.925 13.7133 22.3147 12 23C10.2868 22.3147 8.57355 20.925 7.66487 20.1181C7.22198 19.7249 6.93798 19.1901 6.82183 18.6093L4.99997 9.5L4.5 10.5L1.5 8L4.99997 3Z" />
                      <g>
                        <path d="M16.3516 9.65383H14.3484V7.83652H14.1742V9.8269H16.5258V7.83652H16.3516V9.65383Z" />
                        <path d="M14.5225 6.01934V7.66357H14.6967V7.4905H14.8186V7.66357H14.9928V6.01934H14.8186V7.31742H14.6967V6.01934H14.5225Z" />
                        <path d="M14.1742 5.67319V7.66357H14.3484V5.84627H16.3516V7.66357H16.5258V5.67319H14.1742Z" />
                        <path d="M15.707 9.48071H15.8812V9.28084L16.0032 9.4807V9.48071H16.1774V7.83648H16.0032V9.14683L15.8812 8.94697V7.83648H15.707V9.48071Z" />
                        <path d="M15.5852 6.01931H15.1149V6.19238H15.5852V6.01931Z" />
                        <path d="M15.707 6.01934V7.66357H15.8812V7.46371L16.0032 7.66357H16.1774V6.01934H16.0032V7.32969L15.8812 7.12984V6.01934H15.707Z" />
                        <path d="M15.411 7.31742H15.2891V6.53857H15.411V7.31742ZM15.1149 7.66357H15.2891V7.4905H15.411V7.66357H15.5852V6.3655H15.1149V7.66357Z" />
                        <path d="M14.5225 8.69756L14.8186 9.18291V9.30763H14.6967V9.13455H14.5225V9.48071H14.9928V9.13456V9.13455L14.6967 8.64917V8.00956H14.8186V8.6586H14.9928V7.83648H14.5225V8.69756Z" />
                        <path d="M15.411 9.30763H15.2891V8.00956H15.411V9.30763ZM15.1149 9.48071H15.5852V7.83648H15.1149V9.48071Z" />
                      </g>
                    </svg>
                  </div>
                  <div class="cart" aria-hidden="true">
                    <svg viewBox="0 0 36 26">
                      <path d="M1 2.5H6L10 18.5H25.5L28.5 7.5L7.5 7.5" class="shape" />
                      <path d="M11.5 25C12.6046 25 13.5 24.1046 13.5 23C13.5 21.8954 12.6046 21 11.5 21C10.3954 21 9.5 21.8954 9.5 23C9.5 24.1046 10.3954 25 11.5 25Z" class="wheel" />
                      <path d="M24 25C25.1046 25 26 24.1046 26 23C26 21.8954 25.1046 21 24 21C22.8954 21 22 21.8954 22 23C22 24.1046 22.8954 25 24 25Z" class="wheel" />
                      <path d="M14.5 13.5L16.5 15.5L21.5 10.5" class="tick" />
                    </svg>
                  </div>
                </button>
                <a routerLink="/shop" class="btn-back-to-shop">
                  <i class="bi bi-arrow-left"></i>
                  <span>{{ 'product.backToShop' | translate }}</span>
                </a>
              </div>

              <!-- Divider -->
              <hr class="product-divider">

              <!-- Product Specifications - only show if has valid data -->
              <div class="product-specifications" *ngIf="hasValidSpecifications()">
                <h5 class="spec-heading">{{ 'product.specifications' | translate }}</h5>
                <dl class="spec-list">
                  <div class="spec-item" *ngIf="hasValidDimensions()">
                    <dt>{{ 'product.dimensions' | translate }}:</dt>
                    <dd>
                      {{ product()!.dimensions!.width }} x {{ product()!.dimensions!.height }} x {{ product()!.dimensions!.depth }} 
                      {{ product()!.dimensions!.unit }}
                    </dd>
                  </div>
                  <div class="spec-item" *ngIf="product()!.materials && product()!.materials!.length > 0">
                    <dt>{{ 'product.materials' | translate }}:</dt>
                    <dd>{{ product()!.materials!.join(', ') }}</dd>
                  </div>
                  <div class="spec-item" *ngIf="product()!.colors && product()!.colors!.length > 0">
                    <dt>{{ 'product.colors' | translate }}:</dt>
                    <dd>{{ product()!.colors!.join(', ') }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <!-- Product Reviews Section -->
        <div class="row mt-5">
          <div class="col-12">
            <app-product-reviews [productId]="product()!._id" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Hero Section - Centered and balanced */
    .hero .intro-excerpt {
      max-width: 800px;
      margin: 0 auto;
    }

    .product-detail-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }

    .product-detail-subtitle {
      font-size: 1.1rem;
      opacity: 0.85;
    }

    /* Product Detail Section */
    .product-detail-section {
      padding: calc(var(--hero-menu-offset) + 1.5rem) 0 6rem;
    }

    /* Product Gallery - Left Column */
    .product-gallery {
      top: 2rem;
    }

    .main-image-wrapper {
      position: relative;
      width: 100%;
      margin-bottom: 1.5rem;
      border-radius: 16px;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e7eeea;
      box-shadow: 0 14px 30px rgba(21, 50, 67, 0.09);
    }

    .main-product-image {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
      aspect-ratio: 1 / 1;
    }

    /* Thumbnail Gallery - No limit, scrollable */
    .thumbnail-gallery-wrapper {
      width: 100%;
    }

    .thumbnail-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
      gap: 0.75rem;
      max-height: 180px;
      overflow-y: auto;
      padding: 0.25rem;
    }

    .thumbnail-item {
      position: relative;
      cursor: pointer;
      border-radius: 8px;
      overflow: hidden;
      border: 3px solid transparent;
      transition: all 0.3s ease;
      aspect-ratio: 1 / 1;
    }

    .thumbnail-item:hover {
      border-color: #c0d5cf;
      transform: translateY(-2px);
    }

    .thumbnail-item.active {
      border-color: #153243;
      box-shadow: 0 0 0 1px #153243;
    }

    .thumbnail-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* Product Info - Right Column */
    .product-info-wrapper {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .product-name {
      font-size: 2rem;
      font-weight: 700;
      color: #2f2f2f;
      margin: 0;
      line-height: 1.3;
    }

    /* Meta Badges */
    .product-meta-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .badge {
      padding: 0.4rem 0.8rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-sku {
      background: #e9ecef;
      color: #495057;
    }

    .badge-stock {
      font-weight: 700;
    }

    .badge-in-stock {
      background: #28a745;
      color: #fff;
    }

    .badge-out-stock {
      background: #dc3545;
      color: #fff;
    }

    .badge-type {
      background: #153243;
      color: #fff;
    }

    /* Rating */
    .product-rating {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .product-rating .stars {
      font-size: 1.3rem;
      line-height: 1;
    }

    .rating-count {
      color: #6c757d;
      font-size: 0.95rem;
    }

    /* Price Section */
    .product-price-section {
      background: #f8fbf8;
      padding: 0.95rem 1.1rem;
      border-radius: 16px;
      border: 1px solid #deeadf;
    }

    .price-wrapper {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      min-height: 72px;
      padding: 0;
      border-radius: 0;
      background: transparent;
    }

    .current-price {
      font-size: 2.5rem;
      font-weight: 800;
      color: #153243;
      line-height: 1;
      letter-spacing: -0.04em;
    }

    .original-price {
      font-size: 1.5rem;
      color: #6b7280;
      text-decoration: line-through;
    }

    .discount-badge {
      background: #153243;
      color: #f8faff;
      padding: 0.45rem 0.9rem;
      border-radius: 999px;
      font-weight: 700;
      font-size: 0.85rem;
    }

    /* Short Description */
    .product-short-description {
      font-size: 1.05rem;
      line-height: 1.7;
      color: #495057;
    }

    /* Product Description - inline */
    .product-description {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      background: #ffffff;
      padding: 1.25rem 1.35rem;
      border-radius: 16px;
      border: 1px solid #e3ece6;
      box-shadow: 0 8px 18px rgba(21, 50, 67, 0.07);
    }

    .description-text {
      font-size: 1rem;
      line-height: 1.7;
      color: #6b7280;
      padding: 0;
      border-radius: 0;
      background: transparent;
    }

    .description-text p {
      margin: 0;
    }

    /* Divider */
    .product-divider {
      border: 0;
      border-top: 2px solid #e9ecef;
      margin: 1.5rem 0;
    }

    /* Tags Section */
    .product-tags-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      background: #ffffff;
      padding: 1.25rem 1.35rem;
      border-radius: 16px;
      border: 1px solid #e3ece6;
      box-shadow: 0 8px 18px rgba(21, 50, 67, 0.07);
    }

    .section-label {
      font-weight: 600;
      color: #3d4852;
      font-size: 0.98rem;
      letter-spacing: 0.01em;
      margin: 0;
    }

    .tags-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tag-item {
      background: #eef5ef;
      color: #2f4a40;
      padding: 0.5rem 0.95rem;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      border: 1px solid #d5e5d9;
    }

    /* Quantity Section */
    .quantity-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: center;
      background: #ffffff;
      padding: 1rem 1.35rem;
      border-radius: 16px;
      border: 1px solid #e3ece6;
      box-shadow: 0 8px 18px rgba(21, 50, 67, 0.07);
    }

    .quantity-section .section-label {
      align-self: flex-start;
    }

    /* Action Buttons */
    .product-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .add-to-cart {
      --background-default: linear-gradient(145deg, #153243, #20495f);
      --background-hover: linear-gradient(145deg, #1e4356, #2a5c75);
      --background-scale: 1;
      --text-color: #f8faff;
      --text-o: 1;
      --text-x: 12px;
      --cart: #f8faff;
      --cart-x: -48px;
      --cart-y: 0px;
      --cart-rotate: 0deg;
      --cart-scale: .75;
      --cart-clip: 0px;
      --cart-clip-x: 0px;
      --cart-tick-offset: 10px;
      --cart-tick-color: #9ff3dc;
      --shirt-y: -16px;
      --shirt-scale: 0;
      --shirt-color: #f8faff;
      --shirt-logo: #000000;
      --shirt-second-y: 24px;
      --shirt-second-color: #000000;
      --shirt-second-logo: #f8faff;
      -webkit-tap-highlight-color: transparent;
      -webkit-appearance: none;
      outline: none;
      background: none;
      border: none;
      padding: 18px 0;
      width: 100%;
      margin: 0;
      cursor: pointer;
      position: relative;
      font-family: inherit;
      flex: 1;
      min-width: 200px;
      border-radius: 14px;
      box-shadow: 0 10px 24px rgba(21, 50, 67, 0.22);
      transition: box-shadow 0.25s ease, transform 0.25s ease;
    }

    .add-to-cart:before {
      content: "";
      display: block;
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      border-radius: 14px;
      transition: background 0.25s, box-shadow 0.25s ease;
      background: var(--background, var(--background-default));
      transform: scaleX(var(--background-scale)) translateZ(0);
    }

    .add-to-cart:not(.active):not(:disabled):hover {
      --background: var(--background-hover);
      transform: translateY(-2px);
      box-shadow: 0 14px 28px rgba(21, 50, 67, 0.26);
    }

    .add-to-cart:focus-visible {
      box-shadow:
        0 10px 24px rgba(21, 50, 67, 0.22),
        0 0 0 3px rgba(21, 50, 67, 0.18);
    }

    .add-to-cart span {
      display: block;
      text-align: center;
      position: relative;
      z-index: 1;
      font-size: 16px;
      font-weight: 700;
      line-height: 28px;
      color: var(--text-color);
      opacity: var(--text-o);
      transform: translateX(var(--text-x)) translateZ(0);
    }

    .add-to-cart svg {
      display: block;
      width: var(--svg-width, 44px);
      height: var(--svg-height, 44px);
      position: var(--svg-position, relative);
      left: var(--svg-left, 0);
      top: var(--svg-top, 0);
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .add-to-cart svg path {
      fill: var(--svg-fill, none);
      stroke: var(--svg-stroke, none);
      stroke-width: var(--svg-stroke-width, 2);
    }

    .add-to-cart .morph {
      --svg-position: absolute;
      transition: fill 0.25s;
      pointer-events: none;
      margin-left: -32px;
    }

    .add-to-cart .shirt,
    .add-to-cart .cart {
      pointer-events: none;
      position: absolute;
      left: 50%;
    }

    .add-to-cart .shirt {
      margin: -12px 0 0 -12px;
      top: 0;
      transform-origin: 50% 100%;
      transform: translateY(var(--shirt-y)) scale(var(--shirt-scale));
    }

    .add-to-cart .shirt svg {
      --svg-fill: var(--shirt-color);
    }

    .add-to-cart .shirt svg g {
      --svg-fill: var(--svg-g-fill, var(--shirt-logo));
    }

    .add-to-cart .shirt svg.second {
      --svg-fill: var(--shirt-second-color);
      --svg-g-fill: var(--shirt-second-logo);
      --svg-position: absolute;
      -webkit-clip-path: polygon(0 var(--shirt-second-y), 24px var(--shirt-second-y), 24px 24px, 0 24px);
      clip-path: polygon(0 var(--shirt-second-y), 24px var(--shirt-second-y), 24px 24px, 0 24px);
    }

    .add-to-cart .cart {
      --svg-width: 36px;
      --svg-height: 26px;
      --svg-stroke: var(--cart);
      top: 15px;
      margin-left: -18px;
      transform: translate(var(--cart-x), var(--cart-y)) rotate(var(--cart-rotate)) scale(var(--cart-scale)) translateZ(0);
    }

    .add-to-cart .cart:before {
      content: "";
      display: block;
      width: 22px;
      height: 12px;
      position: absolute;
      left: 7px;
      top: 7px;
      background: var(--cart);
      -webkit-clip-path: polygon(0 0, 22px 0, calc(22px - var(--cart-clip-x)) var(--cart-clip), var(--cart-clip-x) var(--cart-clip));
      clip-path: polygon(0 0, 22px 0, calc(22px - var(--cart-clip-x)) var(--cart-clip), var(--cart-clip-x) var(--cart-clip));
    }

    .add-to-cart .cart path.wheel {
      --svg-stroke-width: 1.5;
    }

    .add-to-cart .cart path.tick {
      --svg-stroke: var(--cart-tick-color);
      stroke-dasharray: 10px;
      stroke-dashoffset: var(--cart-tick-offset);
    }

    .add-to-cart:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    .btn-back-to-shop {
      flex: 0 0 auto;
      background: #ffffff;
      color: #2f5f62;
      border: 1px solid #d9e9df;
      padding: 1.15rem 2.2rem;
      border-radius: 14px;
      font-size: 1.05rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 8px 20px rgba(21, 50, 67, 0.1);
    }

    .btn-back-to-shop:hover {
      color: #38b2ac;
      transform: translateY(-2px);
      box-shadow: 0 10px 22px rgba(21, 50, 67, 0.14);
    }

    .btn-back-to-shop:focus-visible {
      outline: none;
      box-shadow:
        0 8px 20px rgba(21, 50, 67, 0.1),
        0 0 0 3px rgba(21, 50, 67, 0.2);
    }

    /* Specifications */
    .product-specifications {
      background: #ffffff;
      padding: 1.5rem;
      border-radius: 16px;
      border: 1px solid #e3ece6;
      box-shadow: 0 8px 18px rgba(21, 50, 67, 0.07);
    }

    .spec-heading {
      font-size: 1.25rem;
      font-weight: 700;
      color: #2f2f2f;
      margin-bottom: 1rem;
    }

    .spec-list {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .spec-item {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid #dee2e6;
    }

    .spec-item:last-child {
      border-bottom: none;
    }

    .spec-item dt {
      font-weight: 600;
      color: #495057;
      margin: 0;
    }

    .spec-item dd {
      color: #6c757d;
      margin: 0;
    }

    /* Responsive */
    @media (max-width: 991px) {
      .product-gallery {
        position: relative !important;
        top: 0 !important;
      }

      .product-detail-title {
        font-size: 2rem;
      }

      .current-price {
        font-size: 2rem;
      }

      .product-actions {
        flex-direction: column;
      }

      .add-to-cart,
      .btn-back-to-shop {
        width: 100%;
      }
    }

    @media (max-width: 576px) {
      .product-detail-title {
        font-size: 1.5rem;
      }

      .product-name {
        font-size: 1.5rem;
      }

      .current-price {
        font-size: 1.75rem;
      }

      .thumbnail-gallery {
        grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
      }

      .spec-item {
        grid-template-columns: 1fr;
        gap: 0.25rem;
      }
    }
  `]
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private cartService = inject(CartService);

  product = signal<Product | null>(null);
  loading = signal<boolean>(true);
  error = signal<string>('');
  selectedImage = signal<string>('');
  quantity = signal<number>(1);
  @ViewChild('addToCartButton')
  set addToCartButtonRef(elementRef: ElementRef<HTMLButtonElement> | undefined) {
    this._addToCartButtonRef = elementRef;
    if (elementRef) {
      this.setupAddToCartAnimationWhenReady();
    }
  }

  private _addToCartButtonRef?: ElementRef<HTMLButtonElement>;

  private removeAddToCartListeners: (() => void) | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProduct(id);
    } else {
      this.error.set('Product ID not found');
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    if (this.removeAddToCartListeners) {
      this.removeAddToCartListeners();
      this.removeAddToCartListeners = null;
    }
  }

  loadProduct(id: string): void {
    this.loading.set(true);
    this.productService.getProduct(id).subscribe({
      next: (response) => {
        this.product.set(response.data);
        if (response.data.primaryImage || response.data.images.length > 0) {
          this.selectedImage.set(response.data.primaryImage || response.data.images[0]);
        }
        this.loading.set(false);
        requestAnimationFrame(() => this.setupAddToCartAnimationWhenReady());
      },
      error: (err) => {
        this.error.set('Failed to load product. Please try again later.');
        this.loading.set(false);
        console.error('Error loading product:', err);
      }
    });
  }

  selectImage(image: string): void {
    this.selectedImage.set(image);
  }

  onQuantityChange(newQuantity: number): void {
    this.quantity.set(newQuantity);
  }

  addToCart(): void {
    const prod = this.product();
    if (prod && prod.inStock) {
      this.cartService.addItem(prod, this.quantity());
      this.quantity.set(1); // Reset quantity
    }
  }

  private setupAddToCartAnimationWhenReady(retries: number = 8): void {
    const button = this._addToCartButtonRef?.nativeElement;
    const isAnimationLibraryReady = typeof gsap !== 'undefined' && typeof MorphSVGPlugin !== 'undefined';

    if (!button) {
      return;
    }

    if (!isAnimationLibraryReady) {
      if (retries > 0) {
        setTimeout(() => this.setupAddToCartAnimationWhenReady(retries - 1), 250);
      }
      return;
    }

    if (this.removeAddToCartListeners) {
      this.removeAddToCartListeners();
      this.removeAddToCartListeners = null;
    }

    this.setupAddToCartAnimation(button);
  }

  private setupAddToCartAnimation(button: HTMLButtonElement): void {
    if (typeof gsap === 'undefined' || typeof MorphSVGPlugin === 'undefined') {
      return;
    }

    gsap.registerPlugin(MorphSVGPlugin);

    const morph = button.querySelector('.morph path');
    const shirt = button.querySelectorAll('.shirt svg > path');

    const onPointerDown = () => {
      if (button.classList.contains('active') || button.disabled) {
        return;
      }

      gsap.to(button, {
        '--background-scale': .97,
        duration: .15
      });
    };

    const onClick = () => {
      if (button.classList.contains('active') || button.disabled) {
        return;
      }

      button.classList.add('active');

      gsap.to(button, {
        keyframes: [{
          '--background-scale': .97,
          duration: .15
        }, {
          '--background-scale': 1,
          delay: .125,
          duration: 1.2,
          ease: 'elastic.out(1, .6)'
        }]
      });

      gsap.to(button, {
        keyframes: [{
          '--shirt-scale': 1,
          '--shirt-y': '-42px',
          '--cart-x': '0px',
          '--cart-scale': 1,
          duration: .4,
          ease: 'power1.in'
        }, {
          '--shirt-y': '-40px',
          duration: .3
        }, {
          '--shirt-y': '16px',
          '--shirt-scale': .9,
          duration: .25,
          ease: 'none'
        }, {
          '--shirt-scale': 0,
          duration: .3,
          ease: 'none'
        }]
      });

      gsap.to(button, {
        '--shirt-second-y': '0px',
        delay: .835,
        duration: .12
      });

      gsap.to(button, {
        keyframes: [{
          '--cart-clip': '12px',
          '--cart-clip-x': '3px',
          delay: .9,
          duration: .06
        }, {
          '--cart-y': '2px',
          duration: .1
        }, {
          '--cart-tick-offset': '0px',
          '--cart-y': '0px',
          duration: .2,
          onComplete() {
            button.style.overflow = 'hidden';
          }
        }, {
          '--cart-x': '52px',
          '--cart-rotate': '-15deg',
          duration: .2
        }, {
          '--cart-x': '104px',
          '--cart-rotate': '0deg',
          duration: .2,
          clearProps: true,
          onComplete() {
            button.style.overflow = 'hidden';
            button.style.setProperty('--text-o', '0');
            button.style.setProperty('--text-x', '0px');
            button.style.setProperty('--cart-x', '-104px');
          }
        }, {
          '--text-o': 1,
          '--text-x': '12px',
          '--cart-x': '-48px',
          '--cart-scale': .75,
          duration: .25,
          clearProps: true,
          onComplete() {
            button.classList.remove('active');
          }
        }]
      });

      gsap.to(button, {
        keyframes: [{
          '--text-o': 0,
          duration: .3
        }]
      });

      if (morph) {
        gsap.to(morph, {
          keyframes: [{
            morphSVG: 'M0 12C6 12 20 10 32 0C43.9024 9.99999 58 12 64 12V13H0V12Z',
            duration: .25,
            ease: 'power1.out'
          }, {
            morphSVG: 'M0 12C6 12 17 12 32 12C47.9024 12 58 12 64 12V13H0V12Z',
            duration: .15,
            ease: 'none'
          }]
        });
      }

      if (shirt.length > 0) {
        gsap.to(shirt, {
          keyframes: [{
            morphSVG: 'M4.99997 3L8.99997 1.5C8.99997 1.5 10.6901 3 12 3C13.3098 3 15 1.5 15 1.5L19 3L23.5 8L20.5 11L19 9.5L18 22.5C18 22.5 14 21.5 12 21.5C10 21.5 5.99997 22.5 5.99997 22.5L4.99997 9.5L3.5 11L0.5 8L4.99997 3Z',
            duration: .25,
            delay: .25
          }, {
            morphSVG: 'M4.99997 3L8.99997 1.5C8.99997 1.5 10.6901 3 12 3C13.3098 3 15 1.5 15 1.5L19 3L23.5 8L20.5 11L19 9.5L18.5 22.5C18.5 22.5 13.5 22.5 12 22.5C10.5 22.5 5.5 22.5 5.5 22.5L4.99997 9.5L3.5 11L0.5 8L4.99997 3Z',
            duration: .85,
            ease: 'elastic.out(1, .5)'
          }, {
            morphSVG: 'M4.99997 3L8.99997 1.5C8.99997 1.5 10.6901 3 12 3C13.3098 3 15 1.5 15 1.5L19 3L22.5 8L19.5 10.5L19 9.5L17.1781 18.6093C17.062 19.1901 16.778 19.7249 16.3351 20.1181C15.4265 20.925 13.7133 22.3147 12 23C10.2868 22.3147 8.57355 20.925 7.66487 20.1181C7.22198 19.7249 6.93798 19.1901 6.82183 18.6093L4.99997 9.5L4.5 10.5L1.5 8L4.99997 3Z',
            duration: 0,
            delay: 1.25
          }]
        });
      }
    };

    button.addEventListener('pointerdown', onPointerDown);
    button.addEventListener('click', onClick);

    this.removeAddToCartListeners = () => {
      button.removeEventListener('pointerdown', onPointerDown);
      button.removeEventListener('click', onClick);
    };
  }

  getStars(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0);
  }

  getEmptyStars(rating: number): number[] {
    return Array(5 - Math.floor(rating)).fill(0);
  }

  hasDiscount(): boolean {
    const prod = this.product();
    return prod?.originalPrice !== undefined && prod.originalPrice !== null && prod.originalPrice > prod.price;
  }

  getDiscountPercent(): string {
    const prod = this.product();
    if (prod?.originalPrice && prod.originalPrice > prod.price) {
      return ((1 - prod.price / prod.originalPrice) * 100).toFixed(0);
    }
    return '0';
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
    
    // Format with proper thousands separator
    const formattedPrice = price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    if (symbol === 'VND') {
      return `${formattedPrice} VND`;
    }
    
    return `${symbol}${formattedPrice}`;
  }

  hasValidSpecifications(): boolean {
    const prod = this.product();
    if (!prod) return false;
    
    const hasValidDimensions = this.hasValidDimensions();
    const hasValidMaterials = !!(prod.materials && prod.materials.length > 0);
    const hasValidColors = !!(prod.colors && prod.colors.length > 0);
    
    return hasValidDimensions || hasValidMaterials || hasValidColors;
  }

  hasValidDimensions(): boolean {
    const prod = this.product();
    if (!prod?.dimensions) return false;
    
    const dim = prod.dimensions;
    return !!(dim.width > 0 || dim.height > 0 || dim.depth > 0);
  }
}
