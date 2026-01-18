import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSearchbar,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline, sparkles } from 'ionicons/icons';
import { ProductService } from '../services/product';
import { Product } from '../models/product.model';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DecimalPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonSearchbar,
    IonGrid,
    IonRow,
    IonCol,
    IonSpinner,
  ],
})
export class HomePage {
  private productService = inject(ProductService);

  searchQuery = signal('');
  products = this.productService.getProducts();

  filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();

    return this.products().filter((p) => {
      const matchesQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query);

      const matchesCategory = category === 'Todos' || p.category === category;

      return matchesQuery && matchesCategory;
    });
  });

  categories = [
    'Todos',
    'Lácteos',
    'Aceites',
    'Despensa',
    'Carnicería',
    'Limpieza',
  ];
  selectedCategory = signal('Todos');

  constructor() {
    addIcons({ personCircleOutline, sparkles });
  }

  onSearch(event: any) {
    this.searchQuery.set(event.detail.value);
  }

  getCheapest(product: Product) {
    return this.productService.getCheapestSupermarket(product);
  }
}
