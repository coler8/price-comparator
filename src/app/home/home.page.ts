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
  IonFab,
  IonFabButton,
  LoadingController,
  ToastController,
  ActionSheetController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline, sparkles, cameraOutline, camera, image, trashOutline } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { createWorker } from 'tesseract.js';
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
    IonFab,
    IonFabButton,
  ],
})
export class HomePage {
  private productService = inject(ProductService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertCtrl = inject(AlertController);

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
    addIcons({ personCircleOutline, sparkles, cameraOutline, camera, image, trashOutline });
  }

  async deleteProduct(productId: string, event: Event) {
    event.stopPropagation(); // Avoid triggering card navigation

    const alert = await this.alertCtrl.create({
      header: 'Eliminar producto',
      message: '¿Estás seguro de que quieres eliminar este producto de la lista?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.productService.deleteProduct(productId);
            this.showToast('Producto eliminado correctamente', 'success');
          }
        }
      ]
    });

    await alert.present();
  }

  async scanTicket() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Subir Ticket',
      buttons: [
        {
          text: 'Cámara',
          icon: 'camera',
          handler: () => this.processTicket(CameraSource.Camera),
        },
        {
          text: 'Galería de fotos',
          icon: 'image',
          handler: () => this.processTicket(CameraSource.Photos),
        },
        {
          text: 'Cancelar',
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
  }

  async processTicket(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source,
      });

      if (!image.dataUrl) return;

      const loading = await this.loadingCtrl.create({
        message: 'Analizando imagen...',
        spinner: 'crescent',
      });
      await loading.present();

      // Initialize Tesseract Worker
      const worker = await createWorker('spa'); // Spanish
      const ret = await worker.recognize(image.dataUrl);
      const text = ret.data.text.toLowerCase();
      await worker.terminate();

      await loading.dismiss();

      // Logic to find supermarket
      let detectedSupermarket = '';
      if (text.includes('mercadona')) detectedSupermarket = 'Mercadona';
      else if (text.includes('lidl')) detectedSupermarket = 'Lidl';
      else if (text.includes('carrefour')) detectedSupermarket = 'Carrefour';

      if (!detectedSupermarket) {
        this.showToast('No se identificó el supermercado en el ticket.', 'warning');
        return;
      }

      const productsInDB = this.products();
      const lines = ret.data.text.split('\n');
      let updatesCount = 0;
      let additionsCount = 0;

      for (const line of lines) {
        const lineText = line.trim();
        if (!lineText) continue;

        // Pattern for Mercadona style multi-unit lines: [Qty] [Name] [Unit Price] [Total]
        // Example: 2 salmorejo fresco 1,25 2,50
        const multiPriceRegex = /^(\d+)\s+(.+?)\s+([0-9]+[.,][0-9]{2})\s+([0-9]+[.,][0-9]{2})$/;
        // Pattern for single unit lines: [Qty] [Name] [Price]
        // Example: 1 ls tortilla 1/2 p/ca 4,50
        const singlePriceRegex = /^(\d+)\s+(.+?)\s+([0-9]+[.,][0-9]{2})$/;

        let price = 0;
        let possibleName = '';

        const multiMatch = lineText.match(multiPriceRegex);
        const singleMatch = lineText.match(singlePriceRegex);

        if (multiMatch) {
          // We take the Unit Price as the reference (column 3)
          price = parseFloat(multiMatch[3].replace(',', '.'));
          possibleName = multiMatch[2].trim();
        } else if (singleMatch) {
          price = parseFloat(singleMatch[3].replace(',', '.'));
          possibleName = singleMatch[2].trim();
        } else {
          // Fallback to simple end-of-line price matching
          const fallbackPriceRegex = /([0-9]+[.,][0-9]{2})\s*$/;
          const fallbackMatch = lineText.match(fallbackPriceRegex);
          if (fallbackMatch) {
            price = parseFloat(fallbackMatch[1].replace(',', '.'));
            possibleName = lineText.replace(fallbackPriceRegex, '').trim();
            possibleName = possibleName.replace(/^[0-9]+\s+/, '').trim();
          }
        }

        if (price > 0 && possibleName.length >= 3) {
          // Generic filters
          if (possibleName.toLowerCase().includes('total') ||
            possibleName.toLowerCase().includes('factura') ||
            possibleName.toLowerCase().includes('descripción')) continue;

          // Check if it exists in DB
          const existingProduct = productsInDB.find(p =>
            possibleName.toLowerCase().includes(p.name.toLowerCase()) ||
            p.name.toLowerCase().includes(possibleName.toLowerCase())
          );

          if (existingProduct) {
            this.productService.updateProductPrice(existingProduct.id, detectedSupermarket, price);
            updatesCount++;
          } else {
            // New product detected!
            this.productService.addProduct({
              name: possibleName.charAt(0).toUpperCase() + possibleName.slice(1).toLowerCase(),
              description: `Producto detectado automáticamente desde ticket de ${detectedSupermarket}`,
              category: 'Otros',
              unit: 'unidad',
              image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
              prices: [
                {
                  supermarket: 'Mercadona',
                  price: detectedSupermarket === 'Mercadona' ? price : 0,
                  available: detectedSupermarket === 'Mercadona'
                },
                {
                  supermarket: 'Lidl',
                  price: detectedSupermarket === 'Lidl' ? price : 0,
                  available: detectedSupermarket === 'Lidl'
                },
                {
                  supermarket: 'Carrefour',
                  price: detectedSupermarket === 'Carrefour' ? price : 0,
                  available: detectedSupermarket === 'Carrefour'
                }
              ]
            });
            additionsCount++;
          }
        }
      }

      if (updatesCount > 0 || additionsCount > 0) {
        this.showToast(
          `Ticket procesado: ${updatesCount} actualizados y ${additionsCount} nuevos añadidos.`,
          'success'
        );
      } else {
        this.showToast('No se detectaron productos válidos.', 'warning');
      }

    } catch (error) {
      console.error('Error scanning ticket:', error);
      this.showToast('Error al acceder a la cámara o procesar imagen', 'danger');
    }
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    toast.present();
  }

  onSearch(event: any) {
    this.searchQuery.set(event.detail.value);
  }

  getCheapest(product: Product) {
    return this.productService.getCheapestSupermarket(product);
  }
}
