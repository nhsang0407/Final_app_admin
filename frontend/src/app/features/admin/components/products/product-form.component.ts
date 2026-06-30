import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { AdminCategory, ProductFormData } from '../../models/admin.models';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="product-form-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <a routerLink="/admin/products" class="back-link">
            ← Quay lại
          </a>
          <h1>{{ isEditMode ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới' }}</h1>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>{{ isEditMode ? 'Đang tải thông tin sản phẩm...' : 'Đang xử lý...' }}</p>
        </div>
      }

      <!-- Form -->
      @if (!loading()) {
        <form [formGroup]="productForm" (ngSubmit)="onSubmit()">
          <div class="form-layout">
            <!-- Main Content -->
            <div class="main-content">
              <!-- Basic Info -->
              <div class="form-section">
                <h3>Thông tin cơ bản</h3>
                
                <div class="form-group">
                  <label for="name">Tên sản phẩm <span class="required">*</span></label>
                  <input 
                    type="text" 
                    id="name" 
                    formControlName="name"
                    class="form-control"
                    [class.error]="isFieldInvalid('name')">
                  @if (isFieldInvalid('name')) {
                    <span class="error-message">Tên sản phẩm là bắt buộc</span>
                  }
                </div>

                <div class="form-group">
                  <label for="sku">SKU</label>
                  <input 
                    type="text" 
                    id="sku" 
                    formControlName="sku"
                    class="form-control"
                    placeholder="VD: BONSAI-001">
                </div>

                <div class="form-group">
                  <label for="shortDescription">Mô tả ngắn</label>
                  <textarea 
                    id="shortDescription" 
                    formControlName="shortDescription"
                    class="form-control"
                    rows="2"
                    maxlength="500"
                    placeholder="Mô tả ngắn gọn về sản phẩm..."></textarea>
                </div>

                <div class="form-group">
                  <label for="description">Mô tả chi tiết <span class="required">*</span></label>
                  <textarea 
                    id="description" 
                    formControlName="description"
                    class="form-control"
                    rows="5"
                    [class.error]="isFieldInvalid('description')"></textarea>
                  @if (isFieldInvalid('description')) {
                    <span class="error-message">Mô tả sản phẩm là bắt buộc</span>
                  }
                </div>
              </div>

              <!-- Pricing -->
              <div class="form-section">
                <h3>Giá & Tồn kho</h3>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="price">Giá bán <span class="required">*</span></label>
                    <div class="input-with-suffix">
                      <input 
                        type="number" 
                        id="price" 
                        formControlName="price"
                        class="form-control"
                        min="0"
                        [class.error]="isFieldInvalid('price')">
                      <span class="suffix">VND</span>
                    </div>
                    @if (isFieldInvalid('price')) {
                      <span class="error-message">Giá bán là bắt buộc</span>
                    }
                  </div>

                  <div class="form-group">
                    <label for="originalPrice">Giá gốc</label>
                    <div class="input-with-suffix">
                      <input 
                        type="number" 
                        id="originalPrice" 
                        formControlName="originalPrice"
                        class="form-control"
                        min="0">
                      <span class="suffix">VND</span>
                    </div>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="stockQuantity">Số lượng tồn kho</label>
                    <input 
                      type="number" 
                      id="stockQuantity" 
                      formControlName="stockQuantity"
                      class="form-control"
                      min="0">
                  </div>

                  <div class="form-group checkbox-group">
                    <label class="checkbox-label">
                      <input type="checkbox" formControlName="inStock">
                      <span>Còn hàng</span>
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" formControlName="featured">
                      <span>Sản phẩm nổi bật</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Images -->
              <div class="form-section">
                <h3>Hình ảnh</h3>
                
                <div class="form-group">
                  <label for="primaryImage">Hình ảnh chính (URL)</label>
                  <input 
                    type="text" 
                    id="primaryImage" 
                    formControlName="primaryImage"
                    class="form-control"
                    placeholder="https://...">
                </div>

                @if (productForm.get('primaryImage')?.value) {
                  <div class="image-preview">
                    <img [src]="productForm.get('primaryImage')?.value" alt="Preview">
                  </div>
                }

                <div class="form-group">
                  <label>Hình ảnh bổ sung (URLs)</label>
                  <div formArrayName="images" class="image-list">
                    @for (image of imagesArray.controls; track $index) {
                      <div class="image-input-row">
                        <input 
                          type="text" 
                          [formControlName]="$index"
                          class="form-control"
                          placeholder="https://...">
                        <button type="button" class="remove-btn" (click)="removeImage($index)">
                          X
                        </button>
                      </div>
                    }
                  </div>
                  <button type="button" class="add-btn" (click)="addImage()">
                    Thêm hình ảnh
                  </button>
                </div>
              </div>

              <!-- Tags & Materials -->
              <div class="form-section">
                <h3>Thuộc tính bổ sung</h3>
                
                <div class="form-group">
                  <label for="materials">Chất liệu (phân cách bằng dấu phẩy)</label>
                  <input 
                    type="text" 
                    id="materials" 
                    formControlName="materialsInput"
                    class="form-control"
                    placeholder="VD: Gỗ, Đất, Rêu">
                </div>

                <div class="form-group">
                  <label for="colors">Màu sắc (phân cách bằng dấu phẩy)</label>
                  <input 
                    type="text" 
                    id="colors" 
                    formControlName="colorsInput"
                    class="form-control"
                    placeholder="VD: Xanh, Nâu, Trắng">
                </div>

                <div class="form-group">
                  <label for="tags">Tags (phân cách bằng dấu phẩy)</label>
                  <input 
                    type="text" 
                    id="tags" 
                    formControlName="tagsInput"
                    class="form-control"
                    placeholder="VD: bonsai, cây cảnh, trang trí">
                </div>
              </div>
            </div>

            <!-- Sidebar -->
            <div class="sidebar">
              <!-- Category -->
              <div class="form-section">
                <h3>Danh mục</h3>
                <div class="form-group">
                  <label for="category">Chọn danh mục <span class="required">*</span></label>
                  <select 
                    id="category" 
                    formControlName="category"
                    class="form-control"
                    [class.error]="isFieldInvalid('category')">
                    <option value="">-- Chọn danh mục --</option>
                    @for (cat of categories(); track cat._id) {
                      <option [value]="cat._id">{{ cat.name }}</option>
                    }
                  </select>
                  @if (isFieldInvalid('category')) {
                    <span class="error-message">Vui lòng chọn danh mục</span>
                  }
                </div>
              </div>

              <!-- Actions -->
              <div class="form-section actions-section">
                <button type="submit" class="btn btn-primary btn-block" [disabled]="adminService.loading()">
                  @if (adminService.loading()) {
                    <span class="spinner-small"></span>
                    Đang lưu...
                  } @else {
                    {{ isEditMode ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm' }}
                  }
                </button>
                <a routerLink="/admin/products" class="btn btn-secondary btn-block">Hủy</a>
              </div>
            </div>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .product-form-page {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #fff;
      border: 1px solid #e6e6ea;
      border-radius: 8px;
      color: #153243;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 16px;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .back-link:hover {
      background: #153243;
      color: #fff;
      border-color: #153243;
      box-shadow: 0 2px 6px rgba(21, 50, 67, 0.15);
      transform: translateX(-2px);
    }

    .page-header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0;
    }

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

    /* Form Layout */
    .form-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 24px;
    }

    .form-section {
      background: #fff;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      margin-bottom: 24px;
    }

    .form-section h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f0f0f0;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin-bottom: 8px;
    }

    .required {
      color: #dc3545;
    }

    .form-control {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #153243;
    }

    .form-control.error {
      border-color: #dc3545;
    }

    .error-message {
      display: block;
      color: #dc3545;
      font-size: 12px;
      margin-top: 4px;
    }

    textarea.form-control {
      resize: vertical;
      min-height: 80px;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .input-with-suffix {
      position: relative;
    }

    .input-with-suffix input {
      padding-right: 50px;
    }

    .input-with-suffix .suffix {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #999;
      font-size: 13px;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 8px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    .checkbox-label input {
      width: 18px;
      height: 18px;
    }

    /* Images */
    .image-preview {
      width: 200px;
      height: 200px;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
      border: 1px solid #ddd;
    }

    .image-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .image-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }

    .image-input-row {
      display: flex;
      gap: 8px;
    }

    .image-input-row .form-control {
      flex: 1;
    }

    .remove-btn {
      width: 40px;
      height: 40px;
      border: 1px solid #ddd;
      background: #fff;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .remove-btn img {
      width: 16px;
      height: 16px;
    }

    .remove-btn:hover {
      background: #ffebee;
      border-color: #ffcdd2;
    }

    .add-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border: 1px dashed #e6e6ea;
      background: #fff;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      color: #153243;
      font-weight: 500;
      transition: all 0.2s;
    }

    .add-btn:hover {
      border-color: #153243;
      border-style: solid;
      background: #153243;
      color: #fff;
    }

    /* Sidebar */
    .sidebar .form-section {
      position: sticky;
      top: 24px;
    }

    .actions-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 20px;
      border: 2px solid transparent;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }

    .btn-block {
      width: 100%;
    }

    .btn-primary {
      background: #153243;
      color: #fff;
      border-color: #153243;
    }

    .btn-primary:hover:not(:disabled) {
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

    .spinner-small {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    /* Responsive */
    @media (max-width: 992px) {
      .form-layout {
        grid-template-columns: 1fr;
      }

      .sidebar .form-section {
        position: static;
      }
    }

    @media (max-width: 576px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProductFormComponent implements OnInit {
  adminService = inject(AdminService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  productForm!: FormGroup;
  categories = signal<AdminCategory[]>([]);
  loading = signal(false);
  isEditMode = false;
  productId: string | null = null;

  get imagesArray(): FormArray {
    return this.productForm.get('images') as FormArray;
  }

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();
    
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId && this.productId !== 'new') {
      this.isEditMode = true;
      this.loadProduct();
    }
  }

  initForm(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      sku: [''],
      description: ['', [Validators.required, Validators.maxLength(5000)]],
      shortDescription: ['', Validators.maxLength(500)],
      price: [0, [Validators.required, Validators.min(0)]],
      originalPrice: [null],
      category: ['', Validators.required],
      primaryImage: [''],
      images: this.fb.array([]),
      inStock: [true],
      stockQuantity: [0, Validators.min(0)],
      featured: [false],
      materialsInput: [''],
      colorsInput: [''],
      tagsInput: ['']
    });
  }

  loadCategories(): void {
    this.adminService.loadCategories().subscribe({
      next: (response) => {
        this.categories.set(response.data);
      }
    });
  }

  loadProduct(): void {
    this.loading.set(true);
    this.adminService.getProductById(this.productId!).subscribe({
      next: (response) => {
        const product = response.data;
        const categoryId = typeof product.category === 'string' 
          ? product.category 
          : product.category?._id || '';
        
        this.productForm.patchValue({
          name: product.name,
          sku: product.sku || '',
          description: product.description,
          shortDescription: product.shortDescription || '',
          price: product.price,
          originalPrice: product.originalPrice || null,
          category: categoryId,
          primaryImage: product.primaryImage || '',
          inStock: product.inStock,
          stockQuantity: product.stockQuantity,
          featured: product.featured,
          materialsInput: product.materials?.join(', ') || '',
          colorsInput: product.colors?.join(', ') || '',
          tagsInput: product.tags?.join(', ') || ''
        });

        // Add images to form array
        this.imagesArray.clear();
        product.images?.forEach(img => {
          if (img !== product.primaryImage) {
            this.imagesArray.push(this.fb.control(img));
          }
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  addImage(): void {
    this.imagesArray.push(this.fb.control(''));
  }

  removeImage(index: number): void {
    this.imagesArray.removeAt(index);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.productForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      Object.keys(this.productForm.controls).forEach(key => {
        this.productForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.productForm.value;
    
    // Prepare data
    const productData: ProductFormData = {
      name: formValue.name,
      description: formValue.description,
      shortDescription: formValue.shortDescription || undefined,
      price: formValue.price,
      originalPrice: formValue.originalPrice || undefined,
      category: formValue.category,
      sku: formValue.sku || undefined,
      primaryImage: formValue.primaryImage || undefined,
      images: [
        ...(formValue.primaryImage ? [formValue.primaryImage] : []),
        ...formValue.images.filter((img: string) => img)
      ],
      inStock: formValue.inStock,
      stockQuantity: formValue.stockQuantity,
      featured: formValue.featured,
      materials: formValue.materialsInput ? formValue.materialsInput.split(',').map((s: string) => s.trim()).filter((s: string) => s) : undefined,
      colors: formValue.colorsInput ? formValue.colorsInput.split(',').map((s: string) => s.trim()).filter((s: string) => s) : undefined,
      tags: formValue.tagsInput ? formValue.tagsInput.split(',').map((s: string) => s.trim()).filter((s: string) => s) : undefined
    };

    if (this.isEditMode && this.productId) {
      this.adminService.updateProduct(this.productId, productData).subscribe({
        next: () => {
          this.router.navigate(['/admin/products']);
        }
      });
    } else {
      this.adminService.createProduct(productData).subscribe({
        next: () => {
          this.router.navigate(['/admin/products']);
        }
      });
    }
  }
}
