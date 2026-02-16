import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface OFFProduct {
  code: string;
  product?: {
    product_name?: string;
    product_name_es?: string;
    image_front_url?: string;
    categories?: string;
    quantity?: string;
    brands?: string;
    nutriments?: {
      'energy-kcal_100g'?: number;
      fat_100g?: number;
      'saturated-fat_100g'?: number;
      carbohydrates_100g?: number;
      sugars_100g?: number;
      proteins_100g?: number;
      salt_100g?: number;
    };
    ingredients_text_es?: string;
    ingredients_text?: string;
    nutrition_grades?: string;
    nova_group?: number;
  };
  status: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExternalApiService {
  private http = inject(HttpClient);
  private readonly OFF_API_URL = 'https://world.openfoodfacts.org/api/v2/product/';

  async getProductByBarcode(barcode: string): Promise<OFFProduct> {
    try {
      return await firstValueFrom(
        this.http.get<OFFProduct>(`${this.OFF_API_URL}${barcode}.json`)
      );
    } catch (error) {
      console.error('Error fetching product from Open Food Facts:', error);
      throw error;
    }
  }
}
