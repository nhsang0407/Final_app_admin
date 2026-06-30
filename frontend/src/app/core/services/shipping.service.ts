import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ShippingService {
  // Shipping rates by location
  private readonly RATES = {
    // Domestic Vietnam
    thuDucFree: 0,               // GBP - Free shipping Thủ Đức
    hcmcOther: 1,                // GBP - Other HCMC districts
    provinceMin: 2,              // GBP - Other provinces (minimum)
    provinceMax: 5,              // GBP - Other provinces (maximum)
    
    // International - Southeast Asia
    thailand: 6,                 // GBP - Thailand
    singapore: 7,                // GBP - Singapore
    malaysia: 6,                 // GBP - Malaysia
    philippines: 8,              // GBP - Philippines
    indonesia: 8,                // GBP - Indonesia
    
    // International - Asia Pacific
    japan: 10,                   // GBP - Japan
    southKorea: 10,              // GBP - South Korea
    hongKong: 9,                 // GBP - Hong Kong
    china: 8,                    // GBP - China
    taiwan: 8,                   // GBP - Taiwan
    
    // International - Americas
    usa: 17,                     // GBP - USA
    canada: 17,                  // GBP - Canada
    mexico: 15,                  // GBP - Mexico
    brazil: 20,                  // GBP - Brazil
    
    // International - Europe
    uk: 15,                      // GBP - United Kingdom
    france: 15,                  // GBP - France
    germany: 15,                 // GBP - Germany
    italy: 15,                   // GBP - Italy
    spain: 15,                   // GBP - Spain
    
    // International - Oceania
    australia: 17,               // GBP - Australia
    newZealand: 17,              // GBP - New Zealand
    
    // International - Default
    internationalDefault: 13     // GBP - Other countries
  };

  private isCalculating = signal(false);
  private lastCalculatedFee = signal<number>(0);

  /**
   * Calculate shipping fee based on delivery address and country
   * @param address Delivery address string (city, district)
   * @param country Country code or name
   * @param orderTotal Order subtotal (not used for free shipping anymore)
   * @returns Shipping fee in VND
   */
  calculateShippingFee(address: string, country: string, orderTotal?: number): number {
    try {
      this.isCalculating.set(true);
      
      const countryLower = (country || 'vietnam').toLowerCase();
      const addressLower = (address || '').toLowerCase();
      let fee = 0;
      
      // Check if Vietnam (domestic)
      if (this.isVietnam(countryLower)) {
        // Check for Thủ Đức - Free shipping
        if (this.isThuDuc(addressLower)) {
          fee = this.RATES.thuDucFree;
        }
        // Check for other HCMC districts - 20k
        else if (this.isHCMC(addressLower)) {
          fee = this.RATES.hcmcOther;
        }
        // Other provinces - 40k-100k
        else {
          fee = this.getProvinceFee(addressLower);
        }
      }
      // International shipping
      else {
        fee = this.getInternationalFee(countryLower);
      }
      
      this.lastCalculatedFee.set(fee);
      return fee;
    } catch (error) {
      console.error('Error calculating shipping fee:', error);
      // Fallback to HCMC rate on error
      const fee = this.RATES.hcmcOther;
      this.lastCalculatedFee.set(fee);
      return fee;
    } finally {
      this.isCalculating.set(false);
    }
  }

  /**
   * Check if country is Vietnam
   */
  private isVietnam(country: string): boolean {
    return country.includes('vietnam') ||
           country.includes('việt nam') ||
           country.includes('viet nam') ||
           country === 'vn';
  }

  /**
   * Check if address is in Thủ Đức district
   */
  private isThuDuc(address: string): boolean {
    return address.includes('thủ đức') || 
           address.includes('thu duc') ||
           address.includes('thuduc');
  }

  /**
   * Check if address is in Ho Chi Minh City (excluding Thủ Đức)
   */
  private isHCMC(address: string): boolean {
    return address.includes('hồ chí minh') || 
           address.includes('hcm') ||
           address.includes('tp.hcm') ||
           address.includes('tp hcm') ||
           address.includes('sài gòn') ||
           address.includes('saigon');
  }

  /**
   * Calculate province shipping fee (£2-£5 range)
   * Can be customized based on specific provinces or distance
   */
  private getProvinceFee(address: string): number {
    // For now, return a random fee between min and max for variety
    // In production, you could map specific provinces to exact fees
    const range = this.RATES.provinceMax - this.RATES.provinceMin;
    const randomAmount = Math.floor(Math.random() * (range + 1));
    return this.RATES.provinceMin + randomAmount;
  }

  /**
   * Get international shipping fee based on country
   */
  private getInternationalFee(country: string): number {
    // Southeast Asia
    if (country.includes('thailand') || country === 'th') return this.RATES.thailand;
    if (country.includes('singapore') || country === 'sg') return this.RATES.singapore;
    if (country.includes('malaysia') || country === 'my') return this.RATES.malaysia;
    if (country.includes('philippines') || country.includes('pilipinas') || country === 'ph') return this.RATES.philippines;
    if (country.includes('indonesia') || country === 'id') return this.RATES.indonesia;
    
    // Asia Pacific
    if (country.includes('japan') || country.includes('日本') || country === 'jp') return this.RATES.japan;
    if (country.includes('korea') || country.includes('한국') || country === 'kr') return this.RATES.southKorea;
    if (country.includes('hong kong') || country.includes('hongkong') || country === 'hk') return this.RATES.hongKong;
    if (country.includes('china') || country.includes('中国') || country === 'cn') return this.RATES.china;
    if (country.includes('taiwan') || country.includes('臺灣') || country === 'tw') return this.RATES.taiwan;
    
    // Americas
    if (country.includes('united states') || country.includes('usa') || country.includes('america') || country === 'us') return this.RATES.usa;
    if (country.includes('canada') || country === 'ca') return this.RATES.canada;
    if (country.includes('mexico') || country.includes('méxico') || country === 'mx') return this.RATES.mexico;
    if (country.includes('brazil') || country.includes('brasil') || country === 'br') return this.RATES.brazil;
    
    // Europe
    if (country.includes('united kingdom') || country.includes('uk') || country.includes('britain') || country === 'gb') return this.RATES.uk;
    if (country.includes('france') || country.includes('français') || country === 'fr') return this.RATES.france;
    if (country.includes('germany') || country.includes('deutschland') || country === 'de') return this.RATES.germany;
    if (country.includes('italy') || country.includes('italia') || country === 'it') return this.RATES.italy;
    if (country.includes('spain') || country.includes('españa') || country === 'es') return this.RATES.spain;
    
    // Oceania
    if (country.includes('australia') || country === 'au') return this.RATES.australia;
    if (country.includes('new zealand') || country.includes('newzealand') || country === 'nz') return this.RATES.newZealand;
    
    // Default for other countries
    return this.RATES.internationalDefault;
  }

  /**
   * Get shipping information text based on fee and country
   */
  getShippingInfo(fee: number, country: string): string {
    const countryLower = (country || 'vietnam').toLowerCase();
    
    if (fee === 0) {
      return 'Miễn phí vận chuyển (khu vực Thủ Đức)';
    }
    
    // Check if domestic or international
    if (this.isVietnam(countryLower)) {
      if (fee === this.RATES.hcmcOther) {
        return `Phí vận chuyển: ${fee.toFixed(2)} VND (TP. Hồ Chí Minh)`;
      }
      return `Phí vận chuyển: ${fee.toFixed(2)} VND (Tỉnh khác)`;
    } else {
      return `Phí vận chuyển quốc tế: ${fee.toFixed(2)} VND (${this.getCountryName(country)})`;
    }
  }

  /**
   * Get friendly country name
   */
  private getCountryName(country: string): string {
    const countryLower = country.toLowerCase();
    
    // Map to friendly names
    if (countryLower.includes('thailand')) return 'Thái Lan';
    if (countryLower.includes('singapore')) return 'Singapore';
    if (countryLower.includes('malaysia')) return 'Malaysia';
    if (countryLower.includes('philippines')) return 'Philippines';
    if (countryLower.includes('indonesia')) return 'Indonesia';
    if (countryLower.includes('japan')) return 'Nhật Bản';
    if (countryLower.includes('korea')) return 'Hàn Quốc';
    if (countryLower.includes('hong kong')) return 'Hồng Kông';
    if (countryLower.includes('china')) return 'Trung Quốc';
    if (countryLower.includes('taiwan')) return 'Đài Loan';
    if (countryLower.includes('united states') || countryLower.includes('usa')) return 'Mỹ';
    if (countryLower.includes('canada')) return 'Canada';
    if (countryLower.includes('mexico')) return 'Mexico';
    if (countryLower.includes('brazil')) return 'Brazil';
    if (countryLower.includes('united kingdom') || countryLower.includes('uk')) return 'Anh';
    if (countryLower.includes('france')) return 'Pháp';
    if (countryLower.includes('germany')) return 'Đức';
    if (countryLower.includes('italy')) return 'Ý';
    if (countryLower.includes('spain')) return 'Tây Ban Nha';
    if (countryLower.includes('australia')) return 'Úc';
    if (countryLower.includes('new zealand')) return 'New Zealand';
    
    return country;
  }

  /**
   * Get amount needed for free shipping
   * Note: Free shipping removed - only Thu Duc gets free shipping
   */
  getAmountForFreeShipping(currentTotal: number): number {
    return 0; // No free shipping threshold anymore
  }

  /**
   * Get shipping rates details
   * @returns Shipping rates configuration
   */
  getShippingRates() {
    return { ...this.RATES };
  }

  /**
   * Get list of supported countries with shipping fees
   */
  getSupportedCountries() {
    return [
      { code: 'VN', name: 'Vietnam', nameVi: 'Việt Nam', region: 'domestic', fee: 'Varies' },
      
      // Southeast Asia
      { code: 'TH', name: 'Thailand', nameVi: 'Thái Lan', region: 'sea', fee: this.RATES.thailand },
      { code: 'SG', name: 'Singapore', nameVi: 'Singapore', region: 'sea', fee: this.RATES.singapore },
      { code: 'MY', name: 'Malaysia', nameVi: 'Malaysia', region: 'sea', fee: this.RATES.malaysia },
      { code: 'PH', name: 'Philippines', nameVi: 'Philippines', region: 'sea', fee: this.RATES.philippines },
      { code: 'ID', name: 'Indonesia', nameVi: 'Indonesia', region: 'sea', fee: this.RATES.indonesia },
      
      // Asia Pacific
      { code: 'JP', name: 'Japan', nameVi: 'Nhật Bản', region: 'asia', fee: this.RATES.japan },
      { code: 'KR', name: 'South Korea', nameVi: 'Hàn Quốc', region: 'asia', fee: this.RATES.southKorea },
      { code: 'HK', name: 'Hong Kong', nameVi: 'Hồng Kông', region: 'asia', fee: this.RATES.hongKong },
      { code: 'CN', name: 'China', nameVi: 'Trung Quốc', region: 'asia', fee: this.RATES.china },
      { code: 'TW', name: 'Taiwan', nameVi: 'Đài Loan', region: 'asia', fee: this.RATES.taiwan },
      
      // Americas
      { code: 'US', name: 'United States', nameVi: 'Mỹ', region: 'americas', fee: this.RATES.usa },
      { code: 'CA', name: 'Canada', nameVi: 'Canada', region: 'americas', fee: this.RATES.canada },
      { code: 'MX', name: 'Mexico', nameVi: 'Mexico', region: 'americas', fee: this.RATES.mexico },
      { code: 'BR', name: 'Brazil', nameVi: 'Brazil', region: 'americas', fee: this.RATES.brazil },
      
      // Europe
      { code: 'GB', name: 'United Kingdom', nameVi: 'Anh', region: 'europe', fee: this.RATES.uk },
      { code: 'FR', name: 'France', nameVi: 'Pháp', region: 'europe', fee: this.RATES.france },
      { code: 'DE', name: 'Germany', nameVi: 'Đức', region: 'europe', fee: this.RATES.germany },
      { code: 'IT', name: 'Italy', nameVi: 'Ý', region: 'europe', fee: this.RATES.italy },
      { code: 'ES', name: 'Spain', nameVi: 'Tây Ban Nha', region: 'europe', fee: this.RATES.spain },
      
      // Oceania
      { code: 'AU', name: 'Australia', nameVi: 'Úc', region: 'oceania', fee: this.RATES.australia },
      { code: 'NZ', name: 'New Zealand', nameVi: 'New Zealand', region: 'oceania', fee: this.RATES.newZealand }
    ];
  }

  /**
   * Check if currently calculating
   */
  isCalculatingFee(): boolean {
    return this.isCalculating();
  }

  /**
   * Get last calculated fee
   */
  getLastFee(): number {
    return this.lastCalculatedFee();
  }
}
