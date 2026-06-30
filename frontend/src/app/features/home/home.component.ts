import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProductService } from '@core/services/product.service';
import { CartService } from '@core/services/cart.service';
import { environment } from '@environments/environment';
import { Product } from '@models/index';
import { BonsaiLandingComponent } from './components/bonsai-landing/bonsai-landing.component';

interface BlogPost {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  author: string;
  image: string;
}

interface BlogResponse {
  success: boolean;
  data: BlogPost[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, BonsaiLandingComponent],
  template: `
    <app-bonsai-landing></app-bonsai-landing>

    @defer (on viewport) {
    <!-- Start Product Section -->
    <div class="product-section">
      <div class="container">
        <div class="row row-cols-1 row-cols-md-3 g-4 featured-products-row">

          <!-- Featured Products from API -->
          <div class="col d-flex" *ngFor="let product of featuredProducts(); trackBy: trackByProductId">
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
                <h3 class="product-title">{{ product.name }}</h3>
                <strong class="product-price">{{ formatPrice(product.price, product.originalCurrency) }}</strong>
              </div>
              <span class="icon-cross" (click)="addToCart(product, $event)">
                <img src="assets/icons/add_to_cart.png" class="img-fluid" alt="Add" loading="lazy" decoding="async">
              </span>
            </a>
          </div>

        </div>
      </div>
    </div>
    <!-- End Product Section -->
    } @placeholder {
      <div style="min-height: 200px;"></div>
    }

    @defer (on viewport) {
    <!-- Start Why Choose Us Section -->
    <div class="why-choose-section">
      <div class="container">
        <div class="row justify-content-between">
          <div class="col-lg-6">
            <h2 class="section-title">How We Work</h2>
            <p>We keep things simple. Quality plants, honest advice, and tools that last. Everything designed to make plant care feel natural, not complicated.</p>

            <div class="row my-5">
              <div class="col-6 col-md-6">
                <div class="feature">
                  <div class="icon">
                    <img src="assets/images/truck.svg" alt="Fast Shipping" class="imf-fluid" loading="lazy" decoding="async">
                  </div>
                  <h3>Shipped with Care</h3>
                  <p>Plants packed securely. Free delivery on orders over $50. Delivery times vary by location.</p>
                </div>
              </div>

              <div class="col-6 col-md-6">
                <div class="feature">
                  <div class="icon">
                    <img src="assets/images/bag.svg" alt="Easy Shopping" class="imf-fluid" loading="lazy" decoding="async">
                  </div>
                  <h3>Straightforward Selection</h3>
                  <p>Clear photos, honest descriptions, and care notes for every plant. No guesswork.</p>
                </div>
              </div>

              <div class="col-6 col-md-6">
                <div class="feature">
                  <div class="icon">
                    <img src="assets/images/support.svg" alt="Support" class="imf-fluid" loading="lazy" decoding="async">
                  </div>
                  <h3>Ongoing Guidance</h3>
                  <p>Care questions? Reach out anytime. We respond within 24 hours with practical advice.</p>
                </div>
              </div>

              <div class="col-6 col-md-6">
                <div class="feature">
                  <div class="icon">
                    <img src="assets/images/return.svg" alt="Returns" class="imf-fluid" loading="lazy" decoding="async">
                  </div>
                  <h3>Simple Returns</h3>
                  <p>Not quite right? Return within 14 days, no complicated process. Plants deserve the right home.</p>
                </div>
              </div>

            </div>
          </div>

          <div class="col-lg-5">
            <div class="img-wrap">
              <img src="assets/images/why-choose-us-img.jpg" alt="Why Choose Us" class="img-fluid" loading="lazy" decoding="async">
            </div>
          </div>

        </div>
      </div>
    </div>
    <!-- End Why Choose Us Section -->
    } @placeholder {
      <div style="min-height: 200px;"></div>
    }

    @defer (on viewport) {
    <!-- Start We Help Section -->
    <div class="we-help-section">
      <div class="container">
        <div class="fit-life-header text-center">
          <h2 class="fit-life-title">Plants That Fit Your Life</h2>
        </div>

        <div class="fit-life-grid">
          <div class="fit-life-col fit-life-col-left">
            <div class="fit-life-card fit-life-image-card fit-life-left-top">
              <img src="assets/images/img-grid-1.jpg" alt="Plant detail" loading="lazy" decoding="async">
            </div>

            <div class="fit-life-card fit-life-text-card">
              <p>For a team that meticulously crafts every frame, adding greenery is like adding the perfect organic layer to your workspace.</p>
            </div>
          </div>

          <div class="fit-life-col fit-life-col-center">
            <div class="fit-life-card fit-life-image-card fit-life-center-tall">
              <img src="assets/images/img-grid-2.jpg" alt="Creative plant lifestyle" loading="lazy" decoding="async">
            </div>
          </div>

          <div class="fit-life-col fit-life-col-right">
            <div class="fit-life-card fit-life-list-card">
              <ul class="list-unstyled mb-0">
                <li>Experienced team of professional growers</li>
                <li>Fast turnaround times & reliable delivery</li>
                <li>Unlimited revisions on selected plans</li>
                <li>Custom editing solutions for every brand</li>
                <li>Consistent, scalable content production</li>
                <li>Modern tools & industry-standard workflows</li>
              </ul>
            </div>

            <div class="fit-life-card fit-life-image-card fit-life-right-bottom">
              <img src="assets/images/img-grid-3.jpg" alt="Happy plant owner" loading="lazy" decoding="async">
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- End We Help Section -->
    } @placeholder {
      <div style="min-height: 200px;"></div>
    }

    @defer (on viewport) {
    <!-- Start Popular Product -->
    <div class="popular-product">
      <div class="container">
        <div class="row">

          <div class="col-12 col-md-6 col-lg-4 mb-4 mb-lg-0">
            <div class="product-item-sm d-flex">
              <div class="thumbnail">
                <img src="assets/images/product-1.png" alt="Nordic Chair" class="img-fluid" loading="lazy" decoding="async">
              </div>
              <div class="pt-3">
                <h3>Essential Tools</h3>
                <p>Pruning shears, wire cutters, and soil scoops built to last. Designed for daily use, not display.</p>
                <p><a routerLink="/shop">Browse Tools</a></p>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6 col-lg-4 mb-4 mb-lg-0">
            <div class="product-item-sm d-flex">
              <div class="thumbnail">
                <img src="assets/images/product-2.png" alt="Kruzo Aero Chair" class="img-fluid" loading="lazy" decoding="async">
              </div>
              <div class="pt-3">
                <h3>Handmade Pots</h3>
                <p>Ceramic and stoneware containers shaped by artisans. Drainage, proportion, and finish that support healthy roots.</p>
                <p><a routerLink="/shop">View Pots</a></p>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6 col-lg-4 mb-4 mb-lg-0">
            <div class="product-item-sm d-flex">
              <div class="thumbnail">
                <img src="assets/images/product-3.png" alt="Ergonomic Chair" class="img-fluid" loading="lazy" decoding="async">
              </div>
              <div class="pt-3">
                <h3>Growing Media</h3>
                <p>Soil blends, fertilizers, and amendments tailored for bonsai cultivation. Formulated for drainage and nutrition.</p>
                <p><a routerLink="/shop">Shop Supplies</a></p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    <!-- End Popular Product -->
    } @placeholder {
      <div style="min-height: 200px;"></div>
    }

    @defer (on viewport) {
    <!-- Start Blog Section -->
    <div class="blog-section">
      <div class="container">
        <div class="row mb-5">
          <div class="col-md-6">
            <h2 class="section-title">Recent Blog</h2>
          </div>
          <div class="col-md-6 text-start text-md-end">
            <a routerLink="/blog" class="more">View All Posts</a>
          </div>
        </div>

        <div class="row recent-blog-grid">
          @if (isLoadingBlogs()) {
            <div class="col-12 text-center py-4">
              <div class="spinner-border text-success" role="status">
                <span class="visually-hidden">Loading blog posts...</span>
              </div>
            </div>
          } @else {
            @for (post of recentPosts(); track trackByBlogId($index, post)) {
              <div class="col-12 col-sm-6 col-md-4 mb-4 mb-md-0 d-flex">
                <article class="post-entry">
                  <a [href]="post.link" target="_blank" rel="noopener" class="post-thumbnail">
                    <img
                      [src]="post.image || 'assets/images/post-1.jpg'"
                      [alt]="post.title"
                      class="img-fluid"
                      loading="lazy"
                      decoding="async"
                      (error)="onBlogImageError($event)"
                    >
                  </a>
                  <div class="post-content-entry">
                    <h3>
                      <a [href]="post.link" target="_blank" rel="noopener">{{ post.title }}</a>
                    </h3>
                    <div class="meta">
                      <span>by <a [href]="post.link" target="_blank" rel="noopener">{{ post.author || 'PONSAI Team' }}</a></span>
                      <span>on <a [href]="post.link" target="_blank" rel="noopener">{{ formatBlogDate(post.pubDate) }}</a></span>
                    </div>
                  </div>
                </article>
              </div>
            }

            @if (!recentPosts().length && !blogLoadError()) {
              <div class="col-12 text-center py-4 text-muted">
                Blog posts are being updated. Please check back shortly.
              </div>
            }

            @if (blogLoadError()) {
              <div class="col-12 text-center py-4 text-muted">
                Unable to load blog posts at the moment.
              </div>
            }
          }

        </div>
      </div>
    </div>
    <!-- End Blog Section -->
    } @placeholder {
      <div style="min-height: 200px;"></div>
    }
  `,
  styles: [`
    :host {
      display: block;
      scroll-behavior: smooth;
    }

    .featured-products-row {
      align-items: stretch;
    }

    .product-card {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background: transparent;
      border-radius: 10px;
      overflow: visible;
      transition: all 0.3s ease;
    }

    .product-image-wrapper {
      position: relative;
      width: 100%;
      padding-top: 66.67%;
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
      object-fit: cover;
      object-position: center;
    }

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

    .product-card:hover .product-image-wrapper {
      top: -25px;
    }

    .we-help-section {
      background: #efefef;
      padding: 90px 0;
    }

    .fit-life-header {
      max-width: 720px;
      margin: 0 auto 34px;
    }

    .fit-life-title {
      font-size: 3rem;
      line-height: 1.05;
      letter-spacing: -0.02em;
      margin: 0;
      color: #111;
      font-weight: 600;
    }

    .fit-life-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      align-items: stretch;
    }

    .fit-life-col {
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-height: 0;
    }

    .fit-life-card {
      border-radius: 18px;
      overflow: hidden;
    }

    .fit-life-image-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .fit-life-left-top {
      height: 310px;
      box-shadow: rgba(0, 0, 0, 0.16) 0px 10px 36px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 1px;
    }

    .fit-life-center-tall {
      flex: 1;
      min-height: 560px;
      box-shadow: rgba(0, 0, 0, 0.16) 0px 10px 36px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 1px;
    }

    .fit-life-list-card {
      padding: 16px 18px;
      background: #f2f2f2;
    }

    .fit-life-text-card {
      padding: 16px 18px;
      background: #f2f2f2;
      min-height: 94px;
      display: flex;
      align-items: center;
    }

    .fit-life-text-card p {
      margin: 0;
      color: #5c5c5c;
      font-size: 14px;
      line-height: 1.45;
    }

    .fit-life-list-card li {
      position: relative;
      padding-left: 14px;
      margin-bottom: 10px;
      color: #4a4a4a;
      font-size: 14px;
      line-height: 1.45;
    }

    .fit-life-list-card li:last-child {
      margin-bottom: 0;
    }

    .fit-life-list-card li::before {
      content: '•';
      position: absolute;
      left: 0;
      top: 0;
      color: #111;
    }

    .fit-life-right-bottom {
      height: 350px;
      box-shadow: rgba(0, 0, 0, 0.16) 0px 10px 36px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 1px;
    }

    .fit-life-col-left {
      justify-content: flex-start;
    }

    .fit-life-col-center {
      justify-content: stretch;
    }

    .fit-life-col-right {
      justify-content: space-between;
    }

    @media (max-width: 991px) {
      .we-help-section {
        padding: 70px 0;
      }

      .fit-life-grid {
        grid-template-columns: 1fr;
      }

      .fit-life-left-top,
      .fit-life-center-tall,
      .fit-life-right-bottom {
        height: 320px;
        min-height: 320px;
      }
    }

    .recent-blog-grid .post-entry {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    .recent-blog-grid .post-thumbnail {
      display: block;
      margin-bottom: 20px;
      overflow: hidden;
      border-radius: 8px;
    }

    .recent-blog-grid .post-thumbnail img {
      width: 100%;
      height: 220px;
      object-fit: cover;
      transition: all 0.3s ease;
    }

    .recent-blog-grid .post-entry:hover .post-thumbnail img {
      transform: scale(1.05);
      opacity: 0.9;
    }

    .recent-blog-grid .post-content-entry {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .recent-blog-grid .post-content-entry h3 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 10px;
      line-height: 1.4;
      min-height: calc(1.4em * 2);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .recent-blog-grid .post-content-entry h3 a {
      color: #2f2f2f;
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .recent-blog-grid .post-content-entry h3 a:hover {
      color: #153243;
    }

    .recent-blog-grid .meta {
      font-size: 14px;
      color: #6c757d;
      margin-top: auto;
    }

    .recent-blog-grid .meta a {
      color: #153243;
      text-decoration: none;
    }

    .recent-blog-grid .meta a:hover {
      text-decoration: underline;
    }

    .recent-blog-grid .meta span {
      margin-right: 10px;
    }

    @media (max-width: 767.98px) {
      .recent-blog-grid .post-thumbnail {
        margin-bottom: 16px;
      }

      .recent-blog-grid .post-thumbnail img {
        height: 200px;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  private http = inject(HttpClient);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private apiUrl = `${environment.apiUrl}/blog`;

  featuredProducts = signal<Product[]>([]);
  isLoading = signal<boolean>(true);
  hasError = signal<boolean>(false);
  recentPosts = signal<BlogPost[]>([]);
  isLoadingBlogs = signal<boolean>(true);
  blogLoadError = signal<boolean>(false);

  ngOnInit(): void {
    this.loadFeaturedProducts();
    this.loadRecentBlogPosts();
  }

  loadFeaturedProducts(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.productService.getProducts({ limit: 12, featured: true }).subscribe({
      next: (response) => {
        const featuredProducts = this.normalizeProducts(response.data);

        if (featuredProducts.length >= 3) {
          this.featuredProducts.set(featuredProducts.slice(0, 3));
          this.isLoading.set(false);
          return;
        }

        this.productService.getProducts({ limit: 12 }).subscribe({
          next: (fallbackResponse) => {
            const fallbackProducts = this.normalizeProducts(fallbackResponse.data);
            const mergedProducts = this.mergeUniqueProducts(featuredProducts, fallbackProducts);
            this.featuredProducts.set(mergedProducts.slice(0, 3));
            this.isLoading.set(false);
            this.hasError.set(false);
          },
          error: () => {
            this.featuredProducts.set(featuredProducts.slice(0, 3));
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Error loading featured products:', err);
        this.hasError.set(true);
        this.isLoading.set(false);
        this.productService.getProducts({ limit: 12 }).subscribe({
          next: (response) => {
            const fallbackProducts = this.normalizeProducts(response.data);
            this.featuredProducts.set(fallbackProducts.slice(0, 3));
            this.hasError.set(false);
          },
          error: () => {
            this.featuredProducts.set([]);
          }
        });
      }
    });
  }

  addToCart(product: Product, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (product.inStock) {
      this.cartService.addItem(product, 1);
      alert(`${product.name} added to cart!`);
    }
  }

  formatPrice(price: number, currency?: string): string {
    const currencySymbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: 'VND',
      JPY: '¥',
      VND: 'VND'
    };

    const symbol = currency ? (currencySymbols[currency] || `${currency} `) : 'VND';
    const formattedPrice = price.toLocaleString('en-US', {
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

  private normalizeProducts(data: unknown): Product[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return (data as Product[]).filter((product) => !!product?._id);
  }

  private mergeUniqueProducts(primary: Product[], secondary: Product[]): Product[] {
    const uniqueProducts = new Map<string, Product>();

    [...primary, ...secondary].forEach((product) => {
      if (product?._id && !uniqueProducts.has(product._id)) {
        uniqueProducts.set(product._id, product);
      }
    });

    return Array.from(uniqueProducts.values());
  }

  loadRecentBlogPosts(): void {
    this.isLoadingBlogs.set(true);
    this.blogLoadError.set(false);

    this.http.get<BlogResponse>(this.apiUrl).subscribe({
      next: (response) => {
        if (!response?.success || !Array.isArray(response.data)) {
          this.recentPosts.set([]);
          this.blogLoadError.set(true);
          this.isLoadingBlogs.set(false);
          return;
        }

        const newestFirst = [...response.data].sort((a, b) => {
          return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
        });

        this.recentPosts.set(newestFirst.slice(0, 3));
        this.isLoadingBlogs.set(false);
      },
      error: (err) => {
        console.error('Error loading recent blog posts:', err);
        this.recentPosts.set([]);
        this.blogLoadError.set(true);
        this.isLoadingBlogs.set(false);
      }
    });
  }

  formatBlogDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  onBlogImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/post-1.jpg';
  }

  trackByBlogId(_index: number, post: BlogPost): string {
    return post.id;
  }
}
