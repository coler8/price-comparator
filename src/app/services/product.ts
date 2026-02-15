import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private products = signal<Product[]>([]);
  private readonly STORAGE_KEY = 'price_comparator_products';

  constructor() {
    this.initData();
  }

  private async initData() {
    const savedData = localStorage.getItem(this.STORAGE_KEY);

    if (savedData) {
      const data = JSON.parse(savedData);
      // Migrate existing data to include priceHistory if missing
      const migratedData = data.map((p: Product) => {
        if (!p.priceHistory) {
          return { ...p, priceHistory: this.generateInitialHistory(p) };
        }
        return p;
      });
      this.products.set(migratedData);
      if (JSON.stringify(data) !== JSON.stringify(migratedData)) {
        this.saveToStorage(migratedData);
      }
    } else {
      // First time: fetch from JSON and save to localStorage
      this.http.get<Product[]>('assets/products.json').subscribe({
        next: (data) => {
          const productsWithHistory = data.map(p => ({
            ...p,
            priceHistory: this.generateInitialHistory(p)
          }));
          this.products.set(productsWithHistory);
          this.saveToStorage(productsWithHistory);
        },
        error: (err) => console.error('Error loading products.json:', err)
      });
    }
  }

  private generateInitialHistory(product: Product) {
    const history = [];
    const now = new Date();
    // Generate 5 entries for each supermarket with some randomness
    for (const p of product.prices) {
      for (let i = 4; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i * 7)); // One per week
        const variance = (Math.random() - 0.5) * 0.2; // +/- 10%
        history.push({
          supermarket: p.supermarket,
          price: +(p.price * (1 + variance)).toFixed(2),
          date: date.toISOString()
        });
      }
    }
    return history;
  }

  private saveToStorage(products: Product[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(products));
  }

  getProducts() {
    return this.products;
  }

  searchProducts(query: string) {
    if (!query) return this.products();
    return this.products().filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  getCheapestSupermarket(product: Product) {
    return product.prices.reduce((prev, current) =>
      (prev.price < current.price) ? prev : current
    );
  }

  updateProductPrice(productId: string, supermarket: string, newPrice: number) {
    this.products.update(products => {
      const updatedProducts = products.map(p => {
        if (p.id === productId) {
          const newHistoryEntry = {
            supermarket,
            price: newPrice,
            date: new Date().toISOString()
          };

          return {
            ...p,
            prices: p.prices.map(pr =>
              pr.supermarket.toLowerCase() === supermarket.toLowerCase()
                ? { ...pr, price: newPrice, available: true }
                : pr
            ),
            priceHistory: [...(p.priceHistory || []), newHistoryEntry]
          };
        }
        return p;
      });

      this.saveToStorage(updatedProducts);
      return updatedProducts;
    });
  }

  addProduct(product: Omit<Product, 'id'>) {
    const newProduct: Product = {
      ...product,
      id: Math.random().toString(36).substr(2, 9),
    };
    this.products.update(products => {
      const updatedProducts = [...products, newProduct];
      this.saveToStorage(updatedProducts);
      return updatedProducts;
    });
    return newProduct;
  }

  deleteProduct(id: string) {
    this.products.update(products => {
      const updatedProducts = products.filter(p => p.id !== id);
      this.saveToStorage(updatedProducts);
      return updatedProducts;
    });
  }

  updateProductImage(productId: string, imageDataUrl: string) {
    this.products.update(products => {
      const updatedProducts = products.map(p => {
        if (p.id === productId) {
          return { ...p, image: imageDataUrl };
        }
        return p;
      });
      this.saveToStorage(updatedProducts);
      return updatedProducts;
    });
  }
}


