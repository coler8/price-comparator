import { Injectable, signal } from '@angular/core';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private products = signal<Product[]>([
    {
      id: '1',
      name: 'Leche Entera 1L',
      description: 'Leche de vaca entera de alta calidad.',
      image: 'https://images.unsplash.com/photo-1563636619-e9108b9355ce?w=400',
      category: 'Lácteos',
      unit: 'litro',
      prices: [
        { supermarket: 'Mercadona', price: 0.95, available: true },
        { supermarket: 'Lidl', price: 0.92, available: true },
        { supermarket: 'Carrefour', price: 0.98, available: true }
      ]
    },
    {
      id: '2',
      name: 'Aceite de Oliva Virgen Extra 1L',
      description: 'Aceite de oliva virgen extra obtenido directamente de aceitunas.',
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400',
      category: 'Aceites',
      unit: 'litro',
      prices: [
        { supermarket: 'Mercadona', price: 9.45, available: true },
        { supermarket: 'Lidl', price: 9.25, available: true },
        { supermarket: 'Carrefour', price: 9.50, available: true }
      ]
    },
    {
      id: '3',
      name: 'Arroz Redondo 1kg',
      description: 'Arroz blanco de grano redondo, ideal para paellas.',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
      category: 'Despensa',
      unit: 'kg',
      prices: [
        { supermarket: 'Mercadona', price: 1.35, available: true },
        { supermarket: 'Lidl', price: 1.30, available: true },
        { supermarket: 'Carrefour', price: 1.40, available: true }
      ]
    },
    {
      id: '4',
      name: 'Pechuga de Pollo 1kg',
      description: 'Pechuga de pollo fresca, sin piel.',
      image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400',
      category: 'Carnicería',
      unit: 'kg',
      prices: [
        { supermarket: 'Mercadona', price: 6.95, available: true },
        { supermarket: 'Lidl', price: 6.75, available: true },
        { supermarket: 'Carrefour', price: 7.10, available: true }
      ]
    },
    {
      id: '5',
      name: 'Pan de Molde 450g',
      description: 'Pan de molde blanco extra tierno.',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
      category: 'Despensa',
      unit: 'unidad',
      prices: [
        { supermarket: 'Mercadona', price: 1.15, available: true },
        { supermarket: 'Lidl', price: 1.10, available: true },
        { supermarket: 'Carrefour', price: 1.20, available: true }
      ]
    },
    {
      id: '6',
      name: 'Huevos L 12 uds',
      description: 'Huevos frescos de gallinas criadas en suelo.',
      image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400',
      category: 'Despensa',
      unit: 'docena',
      prices: [
        { supermarket: 'Mercadona', price: 2.35, available: true },
        { supermarket: 'Lidl', price: 2.25, available: true },
        { supermarket: 'Carrefour', price: 2.45, available: true }
      ]
    },
    {
      id: '7',
      name: 'Detergente Líquido 3L',
      description: 'Detergente para lavadora con fragancia floral.',
      image: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=400',
      category: 'Limpieza',
      unit: 'litro',
      prices: [
        { supermarket: 'Mercadona', price: 5.45, available: true },
        { supermarket: 'Lidl', price: 5.25, available: true },
        { supermarket: 'Carrefour', price: 5.60, available: true }
      ]
    }
  ]);

  constructor() { }

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
    this.products.update(products => products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          prices: p.prices.map(pr =>
            pr.supermarket.toLowerCase() === supermarket.toLowerCase()
              ? { ...pr, price: newPrice }
              : pr
          )
        };
      }
      return p;
    }));
  }

  addProduct(product: Omit<Product, 'id'>) {
    const newProduct: Product = {
      ...product,
      id: Math.random().toString(36).substr(2, 9),
    };
    this.products.update(products => [...products, newProduct]);
    return newProduct;
  }

  deleteProduct(id: string) {
    this.products.update(products => products.filter(p => p.id !== id));
  }
}


