import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonButton,
  AlertController,
  ActionSheetController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { pencilOutline, cameraOutline, imageOutline } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ProductService } from '../services/product';
import { Product, SupermarketPrice } from '../models/product.model';
import { SUPERMARKET_LOGOS } from '../constants/supermarkets';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.page.html',
  styleUrls: ['./product-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonIcon,
    IonButton
  ],
})
export class ProductDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private alertCtrl = inject(AlertController);
  private actionSheetCtrl = inject(ActionSheetController);
  private toastCtrl = inject(ToastController);

  private productId = signal<string | null>(null);

  product = computed(() => {
    const products = this.productService.getProducts()();
    const id = this.productId();
    return products.find((p) => p.id === id);
  });

  chartData = computed(() => {
    const p = this.product();
    if (!p || !p.priceHistory || p.priceHistory.length === 0) return null;

    // Group by supermarket
    const grouped = p.priceHistory.reduce((acc, curr) => {
      if (!acc[curr.supermarket]) acc[curr.supermarket] = [];
      acc[curr.supermarket].push(curr);
      return acc;
    }, {} as Record<string, any[]>);

    // Sort each group by date
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    const supermarkets = Object.keys(grouped);
    const allPrices = p.priceHistory.map(h => h.price);
    const minPrice = Math.min(...allPrices) * 0.9;
    const maxPrice = Math.max(...allPrices) * 1.1;
    const range = maxPrice - minPrice;

    const chartWidth = 300;
    const chartHeight = 150;

    const processedData = supermarkets.map(sm => {
      const history = grouped[sm];
      const points = history.map((h, i) => {
        const x = (i / (history.length - 1 || 1)) * chartWidth;
        const y = chartHeight - ((h.price - minPrice) / range) * chartHeight;
        return `${x},${y}`;
      }).join(' ');

      return {
        name: sm,
        points,
        color: this.getSupermarketColor(sm)
      };
    });

    return {
      supermarkets: processedData,
      minPrice,
      maxPrice,
      width: chartWidth,
      height: chartHeight
    };
  });

  getSupermarketColor(sm: string) {
    switch (sm.toLowerCase()) {
      case 'mercadona': return '#00aa55';
      case 'lidl': return '#0050aa';
      case 'carrefour': return '#ed1c24';
      default: return '#64748b';
    }
  }

  constructor() {
    addIcons({ pencilOutline, cameraOutline, imageOutline });
  }

  ngOnInit() {
    this.productId.set(this.route.snapshot.paramMap.get('id'));
  }

  getCheapest() {
    const p = this.product();
    return p ? this.productService.getCheapestSupermarket(p) : null;
  }

  async editPrice(priceItem: SupermarketPrice) {
    const p = this.product();
    if (!p) return;

    const alert = await this.alertCtrl.create({
      header: 'Editar precio',
      subHeader: priceItem.supermarket,
      inputs: [
        {
          name: 'price',
          type: 'number',
          value: priceItem.price,
          placeholder: 'Nuevo precio'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: (data) => {
            if (data.price) {
              this.productService.updateProductPrice(p.id, priceItem.supermarket, +data.price);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async changePhoto() {
    const p = this.product();
    if (!p) return;

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Actualizar foto del producto',
      buttons: [
        {
          text: 'Cámara',
          icon: 'camera-outline',
          handler: () => this.captureImage(CameraSource.Camera),
        },
        {
          text: 'Galería de fotos',
          icon: 'image-outline',
          handler: () => this.captureImage(CameraSource.Photos),
        },
        {
          text: 'Cancelar',
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
  }

  async captureImage(source: CameraSource) {
    const p = this.product();
    if (!p) return;

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source,
      });

      if (image.dataUrl) {
        this.productService.updateProductImage(p.id, image.dataUrl);
        this.showToast('Foto actualizada correctamente', 'success');
      }
    } catch (error) {
      console.error('Error al capturar imagen:', error);
      this.showToast('Error al acceder a la cámara o galería', 'danger');
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

  getSupermarketLogo(supermarket: string): string {
    return SUPERMARKET_LOGOS[supermarket] || 'https://cdn-icons-ng.freepik.com/512/3225/3225191.png';
  }
}
