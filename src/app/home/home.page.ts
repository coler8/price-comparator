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
import { personCircleOutline, sparkles, cameraOutline, camera, image, trashOutline, addOutline, barcodeOutline, barcode } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { createWorker } from 'tesseract.js';
import { ProductService } from '../services/product';
import { ExternalApiService } from '../services/external-api.service';
import { Product } from '../models/product.model';
import { SUPERMARKETS, SUPERMARKET_LOGOS } from '../constants/supermarkets';
import { ProductStagingComponent, StagingProduct } from './product-staging/product-staging.component';
import { ManualAddModalComponent } from './manual-add-modal/manual-add-modal.component';

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
  private externalApiService = inject(ExternalApiService);

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
    addIcons({ personCircleOutline, sparkles, cameraOutline, camera, image, trashOutline, addOutline, barcodeOutline, barcode });
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
      header: 'Añadir Productos',
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
          text: 'Escanear Código de Barras',
          icon: 'barcode-outline',
          handler: () => this.scanBarcode(),
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
    const modal = await this.modalCtrl.create({
      component: ManualAddModalComponent
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data && data.length > 0) {
      const stagingProducts = data.map((p: StagingProduct) => {
        const productsInDB = this.products();
        const existingProduct = productsInDB.find(dbProd => 
          dbProd.name.toLowerCase() === p.name.toLowerCase()
        );

        if (existingProduct) {
          const supermarketPrice = existingProduct.prices.find(pr => 
            pr.supermarket.toLowerCase() === (p.supermarket as string).toLowerCase()
          );
          
          return {
            ...p,
            existingId: existingProduct.id,
            isNew: false,
            oldPrice: (supermarketPrice && supermarketPrice.available) ? supermarketPrice.price : undefined
          };
        }
        return p;
      });
      
      this.openStagingModal(stagingProducts);
    }
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
            priceHistory: priceHistory,
            nutritionalInfo: p.nutritionalInfo
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

  async scanBarcode() {
    try {
      // Check for permissions
      const { camera } = await BarcodeScanner.checkPermissions();
      if (camera !== 'granted') {
        const { camera: newStatus } = await BarcodeScanner.requestPermissions();
        if (newStatus !== 'granted') {
          this.showToast('Se requiere permiso de cámara para escanear', 'warning');
          return;
        }
      }

      const { barcodes } = await BarcodeScanner.scan();
      
      if (barcodes.length > 0) {
        const barcode = barcodes[0].displayValue;
        this.processBarcode(barcode);
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      this.showToast('Error al escanear código de barras', 'danger');
    }
  }

  async processBarcode(barcode: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Buscando producto en Open Food Facts...',
      spinner: 'crescent',
    });
    await loading.present();

    try {
      const result = await this.externalApiService.getProductByBarcode(barcode);
      await loading.dismiss();

      if (result.status === 1 && result.product) {
        const p = result.product;
        const productName = p.product_name_es || p.product_name || 'Producto desconocido';
        const image = p.image_front_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400';
        const category = p.categories ? p.categories.split(',')[0].trim() : 'Otros';

        const productsInDB = this.products();
        const existingProduct = productsInDB.find(dbProd => 
          dbProd.name.toLowerCase() === productName.toLowerCase()
        );

        const nutritionalInfo = {
          calories: p.nutriments?.['energy-kcal_100g'],
          fat: p.nutriments?.fat_100g,
          saturatedFat: p.nutriments?.['saturated-fat_100g'],
          carbs: p.nutriments?.carbohydrates_100g,
          sugars: p.nutriments?.sugars_100g,
          proteins: p.nutriments?.proteins_100g,
          salt: p.nutriments?.salt_100g,
          nutriscore: p.nutrition_grades,
          nova: p.nova_group,
          ingredients: p.ingredients_text_es || p.ingredients_text
        };

        // Now we need the price and supermarket
        this.askPriceAndSupermarketForBarcodeProduct({
          name: existingProduct ? existingProduct.name : productName,
          image: existingProduct ? existingProduct.image : image,
          category: existingProduct ? existingProduct.category : category,
          unit: existingProduct ? existingProduct.unit : (p.quantity || 'unidad'),
          existingId: existingProduct?.id,
          nutritionalInfo: nutritionalInfo
        });
      } else {
        this.showToast('Producto no encontrado en Open Food Facts', 'warning');
      }
    } catch (error) {
      await loading.dismiss();
      this.showToast('Error al conectar con Open Food Facts', 'danger');
    }
  }

  async askPriceAndSupermarketForBarcodeProduct(productData: any) {
    const alert = await this.alertCtrl.create({
      header: 'Detalle de Compra',
      subHeader: productData.name,
      inputs: [
        {
          name: 'price',
          type: 'number',
          placeholder: 'Precio pagado'
        },
        {
          name: 'supermarket',
          type: 'text',
          placeholder: 'Supermercado (Mercadona, Lidl, Consum...)',
          value: SUPERMARKETS.MERCADONA
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Añadir',
          handler: (data) => {
            if (data.price) {
              const selectedSupermarket = data.supermarket || 'Otros';
              let oldPrice = undefined;
              
              if (productData.existingId) {
                const productsInDB = this.products();
                const existingProduct = productsInDB.find(p => p.id === productData.existingId);
                if (existingProduct) {
                  const supermarketPrice = existingProduct.prices.find(pr => 
                    pr.supermarket.toLowerCase() === selectedSupermarket.toLowerCase()
                  );
                  if (supermarketPrice && supermarketPrice.available) {
                    oldPrice = supermarketPrice.price;
                  }
                }
              }

              const stagingProduct: StagingProduct = {
                name: productData.name,
                price: parseFloat(data.price),
                supermarket: selectedSupermarket,
                category: productData.category,
                unit: productData.unit,
                image: productData.image,
                isNew: !productData.existingId,
                existingId: productData.existingId,
                oldPrice: oldPrice,
                nutritionalInfo: productData.nutritionalInfo
              };
              this.openStagingModal([stagingProduct]);
            } else {
              this.showToast('El precio es obligatorio', 'warning');
              return false;
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
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

          let oldPrice = undefined;
          if (existingProduct) {
            const supermarketPrice = existingProduct.prices.find(pr => 
              pr.supermarket.toLowerCase() === detectedSupermarket.toLowerCase()
            );
            if (supermarketPrice && supermarketPrice.available) {
              oldPrice = supermarketPrice.price;
            }
          }

          detectedProducts.push({
            name: existingProduct ? existingProduct.name : possibleName.charAt(0).toUpperCase() + possibleName.slice(1).toLowerCase(),
            price: price,
            supermarket: detectedSupermarket,
            category: existingProduct ? existingProduct.category : 'Otros',
            unit: existingProduct ? existingProduct.unit : 'unidad',
            image: existingProduct ? existingProduct.image : 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
            isNew: !existingProduct,
            existingId: existingProduct?.id,
            oldPrice: oldPrice
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
