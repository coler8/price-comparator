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
  IonFooter,
  LoadingController,
  ToastController,
  ActionSheetController,
  AlertController,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline, sparkles, cameraOutline, camera, image, trashOutline, addOutline } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { createWorker } from 'tesseract.js';
import { ProductService } from '../services/product';
import { Product } from '../models/product.model';
import { SUPERMARKETS, SUPERMARKET_LOGOS } from '../constants/supermarkets';
import { ProductStagingComponent, StagingProduct } from './product-staging/product-staging.component';

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
    IonFooter,
    IonSpinner,
    IonCol
],
})
export class HomePage {
  private productService = inject(ProductService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertCtrl = inject(AlertController);
  private modalCtrl = inject(ModalController);

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
    'Carbohidratos',
    'Proteínas',
    'Grasas',
    'Frutas y Verduras',
    'Limpieza y Otros',
  ];
  selectedCategory = signal('Todos');

  constructor() {
    addIcons({ personCircleOutline, sparkles, cameraOutline, camera, image, trashOutline, addOutline });
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
          text: 'Escanear Ticket (Cámara)',
          icon: 'camera',
          handler: () => this.processTicket(CameraSource.Camera),
        },
        {
          text: 'Cargar Ticket (Galería)',
          icon: 'image',
          handler: () => this.processTicket(CameraSource.Photos),
        },
        {
          text: 'Añadir Producto Manualmente',
          icon: 'add-outline',
          handler: () => this.addProductManually(),
        },
        {
          text: 'Cancelar',
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
  }

  async addProductManually() {
    const alert = await this.alertCtrl.create({
      header: 'Nuevo Producto',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre del producto (ej. Arroz)'
        },
        {
          name: 'category',
          type: 'text',
          placeholder: 'Categoría (ej. Despensa)'
        },
        {
          name: 'unit',
          type: 'text',
          placeholder: 'Unidad (ej. kg, litro, unidad)',
          value: 'unidad'
        },
        {
          name: 'price',
          type: 'number',
          placeholder: 'Precio actual'
        },
        {
          name: 'supermarket',
          type: 'text',
          placeholder: 'Supermercado (Mercadona, Lidl, Carrefour, Consum)',
          value: SUPERMARKETS.MERCADONA
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Siguiente: Foto',
          handler: (data) => {
            if (data.name && data.price) {
              this.captureProductPhotoForNewProduct(data);
            } else {
              this.showToast('Nombre y precio son obligatorios', 'warning');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async captureProductPhotoForNewProduct(productData: any) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Foto del Producto',
      buttons: [
        {
          text: 'Cámara',
          icon: 'camera',
          handler: () => this.saveNewProduct(productData, CameraSource.Camera),
        },
        {
          text: 'Galería',
          icon: 'image',
          handler: () => this.saveNewProduct(productData, CameraSource.Photos),
        },
        {
          text: 'Omitir Foto',
          handler: () => this.saveNewProduct(productData, null),
        }
      ]
    });
    await actionSheet.present();
  }

  async saveNewProduct(data: any, source: CameraSource | null) {
    let imageUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400';

    if (source) {
      try {
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: source,
        });
        if (photo.dataUrl) imageUrl = photo.dataUrl;
      } catch (e) {
        console.warn('Photo cancelled or error', e);
      }
    }

    const price = parseFloat(data.price);
    const supermarket = data.supermarket || 'Otros';
    
    const stagingProduct: StagingProduct = {
      name: data.name,
      price: price,
      supermarket: supermarket as any,
      category: data.category || 'Otros',
      unit: data.unit || 'unidad',
      image: imageUrl,
      isNew: true
    };

    this.openStagingModal([stagingProduct]);
  }

  async openStagingModal(products: StagingProduct[]) {
    const modal = await this.modalCtrl.create({
      component: ProductStagingComponent,
      componentProps: {
        products: products
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data && data.length > 0) {
      this.saveConfirmedProducts(data);
    }
  }

  async saveConfirmedProducts(products: StagingProduct[]) {
    const productsInDB = this.products();
    let updatesCount = 0;
    let additionsCount = 0;

    for (const p of products) {
      if (p.existingId) {
        this.productService.updateProductPrice(p.existingId, p.supermarket as any, p.price);
        updatesCount++;
      } else {
        // Double check if it exists now (e.g. if name was edited to match an existing one)
        const existingProduct = productsInDB.find(dbProd => 
          dbProd.name.toLowerCase() === p.name.toLowerCase()
        );

        if (existingProduct) {
          this.productService.updateProductPrice(existingProduct.id, p.supermarket as any, p.price);
          updatesCount++;
        } else {
          const now = new Date().toISOString();
          const priceHistory = [
            { supermarket: SUPERMARKETS.MERCADONA, price: p.supermarket === SUPERMARKETS.MERCADONA ? p.price : 0, date: now },
            { supermarket: SUPERMARKETS.LIDL, price: p.supermarket === SUPERMARKETS.LIDL ? p.price : 0, date: now },
            { supermarket: SUPERMARKETS.CARREFOUR, price: p.supermarket === SUPERMARKETS.CARREFOUR ? p.price : 0, date: now },
            { supermarket: SUPERMARKETS.CONSUM, price: p.supermarket === SUPERMARKETS.CONSUM ? p.price : 0, date: now }
          ].filter(h => h.price > 0);

          this.productService.addProduct({
            name: p.name,
            description: p.isNew ? 'Producto añadido manualmente' : `Actualizado desde ticket`,
            category: p.category,
            unit: p.unit,
            image: p.image,
            prices: [
              { supermarket: SUPERMARKETS.MERCADONA, price: p.supermarket === SUPERMARKETS.MERCADONA ? p.price : 0, available: p.supermarket === SUPERMARKETS.MERCADONA },
              { supermarket: SUPERMARKETS.LIDL, price: p.supermarket === SUPERMARKETS.LIDL ? p.price : 0, available: p.supermarket === SUPERMARKETS.LIDL },
              { supermarket: SUPERMARKETS.CARREFOUR, price: p.supermarket === SUPERMARKETS.CARREFOUR ? p.price : 0, available: p.supermarket === SUPERMARKETS.CARREFOUR },
              { supermarket: SUPERMARKETS.CONSUM, price: p.supermarket === SUPERMARKETS.CONSUM ? p.price : 0, available: p.supermarket === SUPERMARKETS.CONSUM }
            ],
            priceHistory: priceHistory
          });
          additionsCount++;
        }
      }
    }

    if (updatesCount > 0 || additionsCount > 0) {
      this.showToast(
        `Acción completada: ${updatesCount} actualizados y ${additionsCount} nuevos añadidos.`,
        'success'
      );
    }
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
      const textLower = text.toLowerCase();
      if (textLower.includes('mercadona')) detectedSupermarket = SUPERMARKETS.MERCADONA;
      else if (textLower.includes('lidl')) detectedSupermarket = SUPERMARKETS.LIDL;
      else if (textLower.includes('carrefour')) detectedSupermarket = SUPERMARKETS.CARREFOUR;
      else if (textLower.includes('consum')) detectedSupermarket = SUPERMARKETS.CONSUM;

      if (!detectedSupermarket) {
        this.showToast('No se identificó el supermercado en el ticket.', 'warning');
        return;
      }

      const productsInDB = this.products();
      const lines = ret.data.text.split('\n');
      const detectedProducts: StagingProduct[] = [];

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
          const existingProduct = productsInDB.find((p: Product) =>
            possibleName.toLowerCase().includes(p.name.toLowerCase()) ||
            p.name.toLowerCase().includes(possibleName.toLowerCase())
          );

          detectedProducts.push({
            name: existingProduct ? existingProduct.name : possibleName.charAt(0).toUpperCase() + possibleName.slice(1).toLowerCase(),
            price: price,
            supermarket: detectedSupermarket,
            category: existingProduct ? existingProduct.category : 'Otros',
            unit: existingProduct ? existingProduct.unit : 'unidad',
            image: existingProduct ? existingProduct.image : 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
            isNew: !existingProduct,
            existingId: existingProduct?.id
          });
        }
      }

      if (detectedProducts.length > 0) {
        this.openStagingModal(detectedProducts);
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

  getSupermarketLogo(supermarket: string): string {
    return SUPERMARKET_LOGOS[supermarket] || 'https://cdn-icons-ng.freepik.com/512/3225/3225191.png';
  }
}
