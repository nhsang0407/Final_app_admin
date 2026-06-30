import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProductService } from '@core/services/product.service';
import { CategoryService, Category } from '@core/services/category.service';
import { CartService } from '@core/services/cart.service';
import { Product } from '@models/index';
import { SearchFilterComponent, SearchFilterConfig, FilterState } from '@shared/search-filter/search-filter.component';
import { ProductTranslatePipe } from '@shared/pipes/product-translate.pipe';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, RouterModule, SearchFilterComponent, ProductTranslatePipe, TranslateModule],
  template: `
    <!-- Hero Section -->
    <div class="hero">
      <div class="container">
        <div class="row justify-content-between">
          <div class="col-lg-5">
            <div class="intro-excerpt">
              <h1>{{ 'shop.title' | translate }}</h1>
              <p class="mb-4">{{ 'shop.description' | translate }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Products Section -->
    <div class="untree_co-section product-section before-footer-section">
      <div class="container">
        <!-- Search & Filter -->
        <app-search-filter
          [config]="filterConfig"
          (filterChange)="onFilterChange($event)"
        ></app-search-filter>

        <!-- Results Info -->
        <div class="results-info" *ngIf="!loading() && !error()">
          <p class="text-muted mb-0">
            {{ 'shop.showing' | translate }} {{ filteredProducts().length }} {{ 'shop.of' | translate }} {{ allProducts().length }} {{ 'shop.products' | translate }}
            <span *ngIf="currentFilters().searchTerm"> {{ 'shop.for' | translate }} "{{ currentFilters().searchTerm }}"</span>
          </p>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading()" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">{{ 'button.loading' | translate }}</span>
          </div>
          <p class="mt-3">{{ 'shop.loadingProducts' | translate }}</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error()" class="alert alert-danger" role="alert">
          {{ error() }}
        </div>

        <!-- Products Grid -->
        <div *ngIf="!loading() && !error()" class="row product-grid">
          <!-- Product Card -->
          <div class="col-12 col-md-4 col-lg-3 mb-5" *ngFor="let product of paginatedProducts(); trackBy: trackByProductId">
            <a class="product-item product-card" [routerLink]="['/product', product._id]">
              <div class="product-image-wrapper">
                <img 
                  [src]="product.primaryImage || product.images[0] || 'assets/images/product-1.png'" 
                  class="product-thumbnail" 
                  [alt]="product.name"
                  loading="lazy"
                  decoding="async"
                >
              </div>
              <div class="product-info">
                <h3 class="product-title">{{ product.name | productTranslate }}</h3>
                <strong class="product-price">{{ formatPrice(product.price, product.originalCurrency) }}</strong>
              </div>
              <span class="icon-cross" (click)="addToCart(product, $event)">
                <img src="assets/icons/add_to_cart.png" class="img-fluid" alt="Add to Cart" loading="lazy" decoding="async">
              </span>
            </a>
          </div>

          <!-- Empty State -->
          <div *ngIf="filteredProducts().length === 0 && !loading()" class="col-12 text-center py-5">
            <h4>{{ 'shop.noProducts' | translate }}</h4>
            <p class="text-muted">{{ 'shop.tryAdjusting' | translate }}</p>
          </div>
        </div>

        <!-- Pagination -->
        <div *ngIf="totalPages() > 1" class="row">
          <div class="col-12">
            <div class="pagination-wrapper">
              <nav aria-label="Product pagination">
                <ul class="pagination justify-content-center">
                  <li class="page-item" [class.disabled]="currentPage() === 1">
                    <a class="page-link" (click)="goToPage(currentPage() - 1)">{{ 'shop.previous' | translate }}</a>
                  </li>
                  <li 
                    class="page-item" 
                    *ngFor="let page of getPageNumbers()"
                    [class.active]="page === currentPage()"
                  >
                    <a class="page-link" (click)="goToPage(page)">{{ page }}</a>
                  </li>
                  <li class="page-item" [class.disabled]="currentPage() === totalPages()">
                    <a class="page-link" (click)="goToPage(currentPage() + 1)">{{ 'shop.next' | translate }}</a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hero {
      position: relative;
      background-image: url('/assets/images/banner1.jpg');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      overflow: hidden;
    }

    .hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, rgba(21, 50, 67, 0.74) 0%, rgba(21, 50, 67, 0.5) 38%, rgba(21, 50, 67, 0.2) 70%, rgba(21, 50, 67, 0.06) 100%);
      z-index: 1;
    }

    .hero .container {
      position: relative;
      z-index: 2;
    }

    .hero .intro-excerpt {
      max-width: 560px;
    }

    /* Product Grid Styling */
    .product-grid {
      display: flex;
      flex-wrap: wrap;
    }

    .results-info {
      margin-bottom: 2.5rem;
    }

    /* Product Card - Fixed Structure with Original Effects */
    .product-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: transparent;
      border-radius: 10px;
      overflow: visible;
      transition: all 0.3s ease;
    }

    /* Product Image Wrapper - Fixed Aspect Ratio 3:2 (Full-bleed) */
    .product-image-wrapper {
      position: relative;
      width: 100%;
      padding-top: 66.67%; /* 2/3 = 66.67% for 3:2 aspect ratio */
      overflow: hidden;
      background: #f8f9fa;
      border-radius: 10px;
      margin-bottom: 30px;
      top: 0;
      transition: .3s all ease;
    }

    .product-image-wrapper .product-thumbnail {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover; /* Crop để fit, không distort */
      object-position: center;
    }

    /* Product Info - Fixed Height */
    .product-info {
      padding: 0 5px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      min-height: 85px;
    }

    .product-info .product-title {
      font-size: 16px;
      font-weight: 600;
      color: #2f2f2f;
      margin-bottom: 8px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      min-height: 40px;
    }

    .product-info .product-price {
      font-size: 18px;
      font-weight: 800;
      color: #2f2f2f;
      margin-top: auto;
    }

    /* Hover Effects - Original style */
    .product-card:hover .product-image-wrapper {
      top: -25px;
    }

    /* Pagination styling */
    .pagination-wrapper {
      margin-top: 3rem;
      padding: 1.5rem 0;
      border-top: 1px solid #e9ecef;
    }

    .pagination {
      gap: 0.4rem;
    }

    .pagination .page-link {
      cursor: pointer;
      color: #153243;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 0.5rem 0.9rem;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }

    .pagination .page-link:hover {
      background-color: #f8f9fa;
      border-color: #153243;
    }

    .pagination .page-item.active .page-link {
      background-color: #153243;
      border-color: #153243;
      color: #fff;
    }

    .pagination .page-item.disabled .page-link {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `]
})
export class ShopComponent implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private cartService = inject(CartService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  allProducts = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = 20;
  currentFilters = signal<FilterState>({ searchTerm: '', filters: {} });

  // Filter configuration
  filterConfig = signal<SearchFilterConfig>({
    searchPlaceholder: 'search.placeholder',
    showSearch: true,
    showFilters: true,
    searchVariant: 'glow',
    filterConfigs: [
      {
        key: 'category',
        label: 'filter.category',
        type: 'select',
        options: [] // Will be populated from products
      },
      {
        key: 'price',
        label: 'filter.priceRange',
        type: 'range',
        min: 0,
        max: 1000
      },
      {
        key: 'inStock',
        label: 'shop.filter.availability',
        type: 'checkbox',
        placeholder: 'shop.filter.inStockOnly'
      },
      {
        key: 'featured',
        label: 'shop.filter.featured',
        type: 'checkbox',
        placeholder: 'shop.filter.featuredOnly'
      }
    ]
  });

  // Filtered products based on search and filters
  filteredProducts = computed(() => {
    let products = this.allProducts();
    const { searchTerm, filters } = this.currentFilters();

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Category filter
    if (filters['category']) {
      products = products.filter(p => {
        const categorySlug = typeof p.category === 'object' && p.category !== null 
          ? (p.category as any).slug 
          : p.category;
        return categorySlug === filters['category'];
      });
    }

    // Price range filter
    if (filters['price_min'] !== undefined && filters['price_min'] !== null && filters['price_min'] !== '') {
      products = products.filter(p => p.price >= Number(filters['price_min']));
    }
    if (filters['price_max'] !== undefined && filters['price_max'] !== null && filters['price_max'] !== '') {
      products = products.filter(p => p.price <= Number(filters['price_max']));
    }

    // Stock filter
    if (filters['inStock']) {
      products = products.filter(p => p.inStock);
    }

    // Featured filter
    if (filters['featured']) {
      products = products.filter(p => p.featured);
    }

    return products;
  });

  // Total pages based on filtered products
  totalPages = computed(() => {
    return Math.ceil(this.filteredProducts().length / this.pageSize);
  });

  // Paginated products for current page
  paginatedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredProducts().slice(start, end);
  });

  // Legacy products signal for backward compatibility
  products = computed(() => this.paginatedProducts());

  ngOnInit(): void {
    // Sync current page with URL query parameter
    this.route.queryParams.subscribe(params => {
      const page = Number(params['page']);
      if (page && !isNaN(page) && page > 0) {
        this.currentPage.set(page);
      } else {
        this.currentPage.set(1);
      }
    });

    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.error.set(''); // Clear previous errors
    
    this.productService.getProducts({
      page: 1,
      limit: 10000 // Load all products without limit for client-side filtering
    }).subscribe({
      next: (response) => {
        // Handle both array and paginated response formats
        const products = Array.isArray(response.data) ? response.data : (response as any).data || [];
        this.allProducts.set(products as any);
        this.populateCategoryFilter();
        this.loading.set(false);
      },
      error: (err) => {
        // Public endpoint should never get 401 - this indicates a backend configuration issue
        if (err.status === 401) {
          console.error('UNEXPECTED: Products endpoint returned 401 - this is a PUBLIC route!');
          this.error.set('Configuration error: Products endpoint requires authentication when it should be public.');
          this.loading.set(false);
          return;
        }
        
        // User-friendly error messages for public route
        let errorMsg = 'Failed to load products. Please try again later.';
        
        if (err.status === 0) {
          errorMsg = 'Cannot connect to server. Please check your internet connection.';
        } else if (err.status === 500) {
          errorMsg = 'Server error. Please try again later.';
        } else if (err.status === 503) {
          errorMsg = 'Service temporarily unavailable. Please try again in a moment.';
        } else if (err.error?.error) {
          errorMsg = err.error.error;
        }
        
        this.error.set(errorMsg);
        this.loading.set(false);
      }
    });
  }

  populateCategoryFilter(): void {
    // Load categories from API (only active categories)
    this.categoryService.getCategories().subscribe({
      next: (response) => {
        this.categories.set(response.data);
        
        // Create category options from active categories
        const categoryOptions = response.data.map(cat => ({
          value: cat.slug,
          label: cat.name
        }));

        const config = this.filterConfig();
        const categoryFilterIndex = config.filterConfigs.findIndex(f => f.key === 'category');
        if (categoryFilterIndex !== -1) {
          config.filterConfigs[categoryFilterIndex].options = categoryOptions;
          this.filterConfig.set({ ...config });
        }
      },
      error: (err) => {
        console.error('Error loading categories:', err);
      }
    });
  }

  onFilterChange(filterState: FilterState): void {
    this.currentFilters.set(filterState);
    this.currentPage.set(1); // Reset to first page when filters change
  }

  addToCart(product: Product, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (product.inStock) {
      this.cartService.addItem(product, 1);
      // Optional: Show toast notification
      alert(`${product.name} added to cart!`);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      
      // Update URL query parameter
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { page },
        queryParamsHandling: 'merge'
      });
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 2;
    const pages: number[] = [];

    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      pages.push(i);
    }

    return pages;
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
    
    const formattedPrice = price.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    if (symbol === 'VND') {
      return `${formattedPrice} VND`;
    }
    
    return `${symbol}${formattedPrice}`;
  }

  trackByProductId(_index: number, product: Product): string {
    return product._id;
  }
}
