import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CartService } from '../../core/services/cart.service';
import { OrderService, CreateOrderRequest } from '../../core/services/order.service';
import { 
  PaymentService, 
  PaymentMethod,
  CardPaymentData 
} from '../../core/services/payment.service';
import { AuthService } from '../../core/services/auth.service';
import { PromotionService } from '../../core/services/promotion.service';
import { ShippingService } from '../../core/services/shipping.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule, TranslateModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  private fb = inject(FormBuilder);
  public router = inject(Router); // Public for template access
  protected cartService = inject(CartService);
  private orderService = inject(OrderService);
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private translate = inject(TranslateService);
  private promotionService = inject(PromotionService);
  private shippingService = inject(ShippingService);

  // Forms
  checkoutForm!: FormGroup;
  cardForm!: FormGroup;

  // State
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  isProcessing = signal(false);
  isLoadingMethods = signal(false);
  private orderCreated = signal(false);
  
  // Payment Methods
  paymentMethods = signal<PaymentMethod[]>([]);
  selectedPaymentMethod = signal<string | null>(null);
  
  // Bank Transfer Details
  public bankTransferDetails = signal<any>(null);
  public showBankTransferVerify = signal(false);
  public transferCode = signal('');
  public showInstructions = signal(false);

  // Card Processing
  public isProcessingCard = signal(false);

  // Promotion Code
  public promotionCode = '';
  public isApplyingPromo = signal(false);
  public promoError = signal<string | null>(null);
  public appliedPromotion = computed(() => this.promotionService.appliedPromotion());
  public promotionDiscount = computed(() => this.promotionService.discountAmount());
  public freeShipping = computed(() => this.promotionService.freeShipping());
  
  // Shipping Fee
  public shippingFee = signal<number>(0); // Default 0, will be calculated
  public isCalculatingShipping = signal(false);
  public shippingInfo = signal<string>(this.translate.instant('checkout.shippingByRegion'));
  
  // Geolocation
  public isGettingLocation = signal(false);
  public locationError = signal<string | null>(null);
  public locationSupported = signal(true);
  
  // Final total with promotion discount and shipping fee
  public finalTotal = computed(() => {
    const subtotal = this.cartService.total();
    const discount = this.promotionDiscount();
    const shipping = this.freeShipping() ? 0 : this.shippingFee();
    return Math.max(0, subtotal - discount + shipping);
  });

  ngOnInit() {
    this.checkAuth();
    this.initForms();
    this.loadPaymentMethods();
    this.loadUserDataAndPrefill();
    
    // Calculate initial shipping
    this.calculateShipping();
    
    // Check if geolocation is supported
    this.locationSupported.set('geolocation' in navigator);
  }

  /**
   * Check if user is authenticated
   */
  private checkAuth() {
    const user = this.authService.currentUser();
    if (!user) {
      this.error.set(this.translate.instant('checkout.loginRequired'));
      setTimeout(() => {
        this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl: '/checkout' }
        });
      }, 2000);
    }
  }

  /**
   * Load user data and prefill checkout form
   */
  private loadUserDataAndPrefill() {
    // Get current user
    const user = this.authService.currentUser();
    
    if (!user) {
      // If no user yet, wait for auth to initialize
      this.authService.currentUser$.subscribe(currentUser => {
        if (currentUser) {
          this.prefillFormFromUser(currentUser);
        }
      });
    } else {
      // User already loaded, prefill immediately
      this.prefillFormFromUser(user);
    }
  }

  /**
   * Prefill form with user data
   */
  private prefillFormFromUser(user: any) {
    // Prefill shipping address if user has address data
    if (user.address) {
      const updates: any = {};
      
      if (user.address.street) updates.street = user.address.street;
      if (user.address.city) updates.city = user.address.city;
      if (user.address.state) updates.state = user.address.state;
      if (user.address.zipCode) updates.zipCode = user.address.zipCode;
      if (user.address.country) updates.country = user.address.country;
      
      // Only update if we have at least one field
      if (Object.keys(updates).length > 0) {
        this.checkoutForm.patchValue(updates);
      }
    }
    
    // If no address but we have user name, we can prefill country with default
    if (!user.address?.country && user.name) {
      this.checkoutForm.patchValue({ country: 'United Kingdom' });
    }
  }

  /**
   * Initialize forms
   */
  private initForms() {
    // Shipping form
    this.checkoutForm = this.fb.group({
      street: ['', [Validators.required, Validators.minLength(3)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      state: ['', [Validators.required, Validators.minLength(2)]],
      zipCode: ['', [Validators.required, Validators.pattern(/^[0-9]{4,10}$/)]],
      country: ['United Kingdom', [Validators.required, Validators.minLength(2)]],
      notes: ['']
    });
    
    // Recalculate shipping when address changes
    this.checkoutForm.get('city')?.valueChanges.subscribe(() => {
      this.calculateShipping();
    });
    this.checkoutForm.get('state')?.valueChanges.subscribe(() => {
      this.calculateShipping();
    });
    this.checkoutForm.get('country')?.valueChanges.subscribe(() => {
      this.calculateShipping();
    });

    // Card payment form
    this.cardForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{13,19}$/)]],
      cardHolder: ['', [Validators.required, Validators.minLength(3)]],
      expiryMonth: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
      expiryYear: ['', [Validators.required, Validators.pattern(/^[0-9]{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^[0-9]{3,4}$/)]]
    });
  }

  /**
   * Load available payment methods from backend
   */
  private loadPaymentMethods() {
    this.isLoadingMethods.set(true);
    this.paymentService.getPaymentMethods().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.paymentMethods.set(response.data.filter(m => m.enabled));
          
          // Pre-select first method
          if (response.data.length > 0) {
            this.selectedPaymentMethod.set(response.data[0].id);
          }
        }
        this.isLoadingMethods.set(false);
      },
      error: (err) => {
        console.error('Failed to load payment methods:', err);
        this.isLoadingMethods.set(false);
        
        // Fallback to default methods
        this.paymentMethods.set([
          { 
            id: 'momo', 
            name: this.translate.instant('checkout.momo'), 
            description: this.translate.instant('checkout.momoDescription'),
            icon: 'wallet',
            enabled: true,
            type: 'external_gateway',
            processingTime: 'instant'
          }
        ]);
        this.selectedPaymentMethod.set('momo');
      }
    });
  }

  /**
   * Calculate shipping fee based on delivery address and country
   */
  private calculateShipping() {
    try {
      this.isCalculatingShipping.set(true);
      
      const cartItems = this.cartService.items();
      
      if (cartItems.length === 0) {
        this.shippingFee.set(0);
        this.shippingInfo.set(this.translate.instant('checkout.emptyCartInfo'));
        return;
      }
      
      // Get address and country from form
      const city = this.checkoutForm?.get('city')?.value || '';
      const state = this.checkoutForm?.get('state')?.value || '';
      const country = this.checkoutForm?.get('country')?.value || 'Vietnam';
      const address = `${city}, ${state}`.trim();
      
      // Calculate fee based on address, country (no free shipping threshold)
      const orderTotal = this.cartService.total();
      const fee = this.shippingService.calculateShippingFee(address, country, orderTotal);
      
      this.shippingFee.set(fee);
      
      // Get shipping info message
      const info = this.shippingService.getShippingInfo(fee, country);
      this.shippingInfo.set(info);
      
    } catch (error) {
      console.error('Error calculating shipping:', error);
      // Fallback to HCMC rate on error
      this.shippingFee.set(1);
      this.shippingInfo.set(this.translate.instant('checkout.basicShippingFee'));
    } finally {
      this.isCalculatingShipping.set(false);
    }
  }

  /**
   * Select payment method
   */
  selectPaymentMethod(methodId: string) {
    this.selectedPaymentMethod.set(methodId);
    this.error.set(null);
    this.success.set(null);
    this.bankTransferDetails.set(null);
    this.showBankTransferVerify.set(false);
  }

  /**
   * Get user's current location using Geolocation API
   */
  public async getMyLocation() {
    if (!this.locationSupported()) {
      this.locationError.set(this.translate.instant('checkout.locationNotSupported'));
      return;
    }

    this.isGettingLocation.set(true);
    this.locationError.set(null);

    try {
      // Request geolocation permission
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      console.log('Location obtained:', latitude, longitude);

      // Reverse geocode to get address
      await this.reverseGeocode(latitude, longitude);

    } catch (error: any) {
      console.error('Geolocation error:', error);
      
      if (error.code === 1) {
        this.locationError.set(this.translate.instant('checkout.locationPermissionDeniedDetailed'));
      } else if (error.code === 2) {
        this.locationError.set(this.translate.instant('checkout.locationUnavailableDetailed'));
      } else if (error.code === 3) {
        this.locationError.set(this.translate.instant('checkout.locationTimeoutDetailed'));
      } else {
        this.locationError.set(this.translate.instant('checkout.locationGenericError'));
      }
    } finally {
      this.isGettingLocation.set(false);
    }
  }

  /**
   * Reverse geocode coordinates to address using Nominatim (OpenStreetMap)
   */
  private async reverseGeocode(lat: number, lng: number) {
    try {
      // Use Nominatim (OpenStreetMap) - Free service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reverse geocode');
      }

      const data = await response.json();
      console.log('Geocoding result:', data);

      if (data.address) {
        // Extract address components
        const addr = data.address;
        console.log('Address components:', addr);
        
        // Street (road + house number)
        const street = [addr.house_number, addr.road].filter(Boolean).join(' ') || 
                       addr.suburb || addr.neighbourhood || '';
        
        // City/Town/District (for "Tỉnh/Thành" field in Vietnam context)
        const city = addr.suburb || addr.neighbourhood || addr.quarter || 
                     addr.village || addr.town || '';
        
        // State/Province - handle Vietnam special cases
        let state = addr.state || addr.province || addr.region || addr.state_district;
        
        // Special handling for Vietnam cities
        if (!state && addr.city) {
          // If city is "Thành phố Thủ Đức", the province is Ho Chi Minh City
          if (addr.city.includes('Thủ Đức')) {
            state = 'Thành phố Hồ Chí Minh';
          } else {
            // For other cities, use the city as the province/state
            state = addr.city;
          }
        }
        
        // Country
        const country = addr.country || 'Vietnam';
        
        // Postal code
        const zipCode = addr.postcode || '';

        console.log('Mapped address:', { street, city, state, country, zipCode });

        // Auto-fill the form
        this.checkoutForm.patchValue({
          street: street,
          city: city,
          state: state,
          country: country,
          zipCode: zipCode
        });

        // Recalculate shipping with new address
        this.calculateShipping();

        // Success message
        this.success.set(this.translate.instant('checkout.locationSuccess'));
        setTimeout(() => this.success.set(null), 5000);

      } else {
        throw new Error('No address data returned');
      }

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      this.locationError.set(this.translate.instant('checkout.reverseGeocodeFailed'));
    }
  }

  /**
   * Main payment flow - Create order then route to specific payment method
   */
  proceedToPayment() {
    // Validate forms
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.error.set(this.translate.instant('checkout.errorFillShipping'));
      return;
    }

    if (!this.selectedPaymentMethod()) {
      this.error.set(this.translate.instant('checkout.errorSelectPaymentMethod'));
      return;
    }

    // Validate card form if card payment selected
    if (this.selectedPaymentMethod() === 'card' && this.cardForm.invalid) {
      this.cardForm.markAllAsTouched();
      this.error.set(this.translate.instant('checkout.errorFillCard'));
      return;
    }

    // Validate cart
    if (this.cartService.items().length === 0) {
      this.error.set(this.translate.instant('checkout.errorCartEmpty'));
      return;
    }

    // Prevent duplicate orders
    if (this.orderCreated() || this.isProcessing()) {
      return;
    }

    this.isProcessing.set(true);
    this.error.set(null);
    this.success.set(null);

    // Prepare order data with promotion if applied
    const orderData: CreateOrderRequest = {
      shippingAddress: {
        street: this.checkoutForm.value.street.trim(),
        city: this.checkoutForm.value.city.trim(),
        state: this.checkoutForm.value.state.trim(),
        zipCode: this.checkoutForm.value.zipCode.trim(),
        country: this.checkoutForm.value.country.trim()
      },
      paymentMethod: this.selectedPaymentMethod()!,
      notes: this.checkoutForm.value.notes?.trim() || undefined
    };

    // Add promotion if applied
    const appliedPromo = this.appliedPromotion();
    if (appliedPromo) {
      orderData.promotionCode = appliedPromo.code;
      orderData.promotionDiscount = this.promotionDiscount();
    }

    // Ensure backend cart is in sync with local cart before creating order.
    this.cartService.syncForCheckout().subscribe({
      next: (synced) => {
        if (!synced) {
          this.handleError(this.translate.instant('checkout.errorSyncCart'));
          return;
        }

        // Create order first
        this.orderService.createOrder(orderData).subscribe({
          next: (response) => {
            if (response.success && response.data) {
              const orderId = response.data._id;
              this.orderCreated.set(true);

              // Record promotion usage if promotion was applied
              if (appliedPromo && this.promotionDiscount() > 0) {
                this.promotionService.applyPromotionToOrder(
                  appliedPromo._id,
                  orderId,
                  this.promotionDiscount()
                ).subscribe({
                  next: () => console.log('Promotion usage recorded'),
                  error: (err) => console.error('Failed to record promotion usage:', err)
                });
              }

              // Clear promotion state after successful order
              this.promotionService.clear();

              // Route to specific payment method handler
              this.handlePaymentMethod(orderId);
            } else {
              this.handleError(response.error || this.translate.instant('checkout.errorCreateOrder'));
            }
          },
          error: (err) => {
            console.error('Order creation failed:', err);
            this.handleOrderCreationError(err);
          }
        });
      },
      error: () => {
        this.handleError(this.translate.instant('checkout.errorSyncCart'));
      }
    });
  }

  /**
   * Route to specific payment method handler
   */
  private handlePaymentMethod(orderId: string) {
    const method = this.selectedPaymentMethod();

    switch (method) {
      case 'momo':
        this.initiateMomoPayment(orderId);
        break;
      case 'manual_payment':
        this.initiateManualPayment(orderId);
        break;
      case 'card':
        this.initiateCardPayment(orderId);
        break;
      case 'bank_transfer':
        this.initiateBankTransfer(orderId);
        break;
      default:
        this.handleError(`Payment method '${method}' is not supported`);
    }
  }

  /**
   * MOMO Payment Flow
   */
  private initiateMomoPayment(orderId: string) {
    this.paymentService.initiateMomoPayment(orderId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.cartService.clearCart();
          this.paymentService.redirectToMomo(response.data.payUrl);
        } else {
          this.handleError(response.error || this.translate.instant('checkout.errorMomoInit'));
        }
      },
      error: (err) => {
        console.error('MOMO payment failed:', err);
        this.handleError(err.error?.error || this.translate.instant('checkout.errorMomoInit'));
      }
    });
  }

  /**
   * Manual Payment Flow
   * 
   * SIMPLIFIED: Order is already created with pending_manual_payment status.
   * No need to call backend again - just clear cart and navigate.
   */
  private initiateManualPayment(orderId: string) {
    console.log('[Checkout] Manual payment order created:', orderId);
    
    // Clear cart
    this.cartService.clearCart();
    
    // Show success message
    this.success.set(this.translate.instant('checkout.manualOrderPlaced'));
    this.isProcessing.set(false);
    
    // Redirect to orders page
    setTimeout(() => {
      this.router.navigate(['/profile']);
    }, 2000);
  }

  /**
   * Card Payment Flow (2-step: initiate + process)
   */
  private initiateCardPayment(orderId: string) {
    const cardData: CardPaymentData = {
      cardNumber: this.cardForm.value.cardNumber.replace(/\s/g, ''),
      cardHolder: this.cardForm.value.cardHolder.trim(),
      expiryMonth: this.cardForm.value.expiryMonth,
      expiryYear: this.cardForm.value.expiryYear,
      cvv: this.cardForm.value.cvv
    };

    this.paymentService.initiateCardPayment(orderId, cardData).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          if (response.data.requiresProcessing) {
            // Step 2: Process the card payment
            this.processCardPayment(orderId);
          } else {
            this.handleError(this.translate.instant('checkout.errorUnexpectedCardResponse'));
          }
        } else {
          this.handleError(response.error || this.translate.instant('checkout.errorCardInit'));
        }
      },
      error: (err) => {
        console.error('Card payment initiation failed:', err);
        this.handleError(err.error?.error || this.translate.instant('checkout.errorCardInit'));
      }
    });
  }

  /**
   * Process Card Payment (Step 2)
   */
  private processCardPayment(orderId: string) {
    this.isProcessingCard.set(true);
    
    this.paymentService.processCardPayment(orderId).subscribe({
      next: (response) => {
        this.isProcessingCard.set(false);
        
        if (response.success && response.data) {
          if (response.data.status === 'paid') {
            this.cartService.clearCart();
            this.success.set(this.translate.instant('checkout.cardPaymentSuccess', { transactionId: response.data.transactionId }));
            this.isProcessing.set(false);
            
            setTimeout(() => {
              this.router.navigate(['/order-detail', orderId]);
            }, 3000);
          } else {
            this.handleError(response.data.message || 'Card payment failed');
          }
        } else {
          this.handleError(response.error || this.translate.instant('checkout.errorCardProcess'));
        }
      },
      error: (err) => {
        this.isProcessingCard.set(false);
        console.error('Card processing failed:', err);
        this.handleError(err.error?.error || this.translate.instant('checkout.errorCardProcess'));
      }
    });
  }

  /**
   * Bank Transfer Flow
   */
  private initiateBankTransfer(orderId: string) {
    this.paymentService.initiateBankTransfer(orderId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          console.log('Bank transfer invoice received:', response.data);
          
          // Store full invoice details FIRST
          this.bankTransferDetails.set(response.data);
          this.showBankTransferVerify.set(false);
          this.isProcessing.set(false);
          
          // Show success message with payment reference
          this.success.set(
            this.translate.instant('checkout.bankInvoiceGenerated', { reference: response.data.reference })
          );
          
          // DON'T clear cart immediately - it causes template to show "empty cart" message
          // Cart will be cleared when component is destroyed or user navigates away
          console.log('Invoice displayed, cart preserved to maintain UI state');
        } else {
          this.handleError(response.error || this.translate.instant('checkout.errorGenerateInvoice'));
        }
      },
      error: (err) => {
        console.error('Bank transfer initiation failed:', err);
        this.handleError(err.error?.error || this.translate.instant('checkout.errorGenerateInvoice'));
      }
    });
  }

  /**
   * Verify Bank Transfer
   */
  verifyBankTransfer() {
    if (!this.transferCode().trim()) {
      this.error.set(this.translate.instant('checkout.errorTransferCodeRequired'));
      return;
    }

    const orderId = this.bankTransferDetails()?.orderId;
    if (!orderId) {
      this.error.set(this.translate.instant('checkout.errorOrderIdMissing'));
      return;
    }

    this.isProcessing.set(true);
    
    this.paymentService.verifyBankTransfer(orderId, this.transferCode().trim()).subscribe({
      next: (response) => {
        this.isProcessing.set(false);
        
        if (response.success && response.data) {
          if (response.data.status === 'paid') {
            this.success.set(response.data.message);
            setTimeout(() => {
              this.router.navigate(['/order-detail', orderId]);
            }, 3000);
          } else if (response.data.status === 'pending') {
            this.error.set(response.data.message);
          } else {
            this.error.set(response.data.message);
          }
        } else {
          this.handleError(response.error || this.translate.instant('checkout.errorVerificationFailed'));
        }
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.handleError(err.error?.error || this.translate.instant('checkout.errorVerifyBankTransfer'));
      }
    });
  }

  /**
   * Error handlers
   */
  private handleOrderCreationError(err: any) {
    let errorMessage = this.translate.instant('checkout.errorCreateOrderTryAgain');
    
    if (err.status === 401) {
      errorMessage = this.translate.instant('checkout.errorLoginToContinue');
      setTimeout(() => this.router.navigate(['/auth/login']), 2000);
    } else if (err.status === 400) {
      errorMessage = err.error?.error || this.translate.instant('checkout.errorInvalidOrderData');
    } else if (err.error?.error) {
      errorMessage = err.error.error;
    }
    
    this.handleError(errorMessage);
  }

  private handleError(message: string) {
    this.error.set(message);
    this.isProcessing.set(false);
    this.orderCreated.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * UI Helpers
   */
  getPaymentIcon(type: string): string {
    const icons: Record<string, string> = {
      'external_gateway': 'wallet',
      'manual': 'cash',
      'card': 'credit-card',
      'bank_transfer': 'bank'
    };
    return icons[type] || 'cash-coin';
  }

  formatCardNumber(event: any) {
    let value = event.target.value.replace(/\s/g, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    this.cardForm.patchValue({ cardNumber: formattedValue }, { emitEvent: false });
  }

  /**
   * Apply promotion code
   */
  public applyPromotion(): void {
    const code = this.promotionCode.trim();
    
    if (!code) {
      this.promoError.set(this.translate.instant('checkout.errorEnterPromotionCode'));
      return;
    }

    this.isApplyingPromo.set(true);
    this.promoError.set(null);

    const orderAmount = this.cartService.total();

    this.promotionService.validatePromotion({
      code,
      orderAmount,
      items: this.cartService.items().map(item => ({
        productId: item.product._id,
        quantity: item.quantity
      }))
    }).subscribe({
      next: (response) => {
        this.isApplyingPromo.set(false);
        
        if (response.valid && response.data) {
          this.promotionService.applyPromotion(
            response.data.promotion,
            response.data.discount
          );
          this.success.set(response.message || this.translate.instant('checkout.promotionAppliedSuccess'));
          this.promotionCode = ''; // Clear input
          setTimeout(() => this.success.set(null), 3000);
        } else {
          this.promoError.set(response.message || this.translate.instant('checkout.errorInvalidPromotionCode'));
        }
      },
      error: (err) => {
        this.isApplyingPromo.set(false);
        this.promoError.set(
          err.error?.message || 
          this.translate.instant('checkout.errorApplyPromotion')
        );
      }
    });
  }

  /**
   * Remove applied promotion
   */
  public removePromotion(): void {
    this.promotionService.removePromotion();
    this.promotionCode = '';
    this.promoError.set(null);
    this.success.set(this.translate.instant('checkout.promotionRemoved'));
    setTimeout(() => this.success.set(null), 2000);
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    this.success.set(this.translate.instant('checkout.copiedToClipboard'));
    setTimeout(() => this.success.set(null), 2000);
  }

  public copyAllBankDetails() {
    const details = this.bankTransferDetails();
    if (!details) return;

    const bankInfo = `
BANK TRANSFER DETAILS
=====================

Invoice Number: ${details.invoiceNumber}
Order ID: ${details.orderId}

BANK INFORMATION:
Bank Name: ${details.bankDetails.bankName}
Account Name: ${details.bankDetails.accountName}
IBAN: ${details.bankDetails.iban}
SWIFT/BIC: ${details.bankDetails.swift}
Sort Code: ${details.bankDetails.sortCode}
Account Number: ${details.bankDetails.accountNumber}

PAYMENT DETAILS:
Amount: ${details.amount.toFixed(2)} VND
Payment Reference: ${details.reference}

IMPORTANT: Include the payment reference "${details.reference}" in your transfer!

Due Date: ${new Date(details.dueDate).toLocaleDateString()}
    `.trim();

    navigator.clipboard.writeText(bankInfo);
    this.success.set(this.translate.instant('checkout.allBankDetailsCopied'));
    setTimeout(() => this.success.set(null), 3000);
  }
}
