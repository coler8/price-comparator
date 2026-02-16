import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, afterNextRender, effect } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonButton,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonFooter,
  IonTextarea,
  AlertController,
  ActionSheetController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { pencilOutline, cameraOutline, imageOutline, leafOutline, fitnessOutline, restaurantOutline } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';
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
    IonButton,
    IonModal,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    FormsModule
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

  @ViewChild('priceChart') priceChartCanvas?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  chartData = computed(() => {
    const p = this.product();
    if (!p || !p.priceHistory || p.priceHistory.length === 0) return null;

    // Group by supermarket
    const grouped = p.priceHistory.reduce((acc, curr) => {
      if (!acc[curr.supermarket]) acc[curr.supermarket] = [];
      acc[curr.supermarket].push(curr);
      return acc;
    }, {} as Record<string, any[]>);

    // Sort each group by date and format labels
    const allDates = [...new Set(p.priceHistory.map(h => new Date(h.date).toLocaleDateString()))].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const datasets = Object.keys(grouped).map(sm => {
      const history = grouped[sm].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const data = history.map(h => ({ x: new Date(h.date).toLocaleDateString(), y: h.price }));

      return {
        label: sm,
        data: data as any[],
        borderColor: this.getSupermarketColor(sm),
        backgroundColor: this.getSupermarketColor(sm) + '33',
        tension: 0.4,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6
      };
    });

    return { datasets };
  });

  getSupermarketColor(sm: string) {
    switch (sm.toLowerCase()) {
      case 'mercadona': return '#00aa55';
      case 'lidl': return '#0050aa';
      case 'carrefour': return '#ed1c24';
      case 'consum': return '#ff8200';
      default: return '#64748b';
    }
  }

  constructor() {
    addIcons({ pencilOutline, cameraOutline, imageOutline, leafOutline, fitnessOutline, restaurantOutline });
    
    effect(() => {
      const data = this.chartData();
      if (data && this.chart) {
        this.updateChart(data);
      }
    });

    afterNextRender(() => {
      this.initChart();
    });
  }

  private initChart() {
    if (!this.priceChartCanvas) return;
    const ctx = this.priceChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const data = this.chartData();
    if (!data) return;

    const config: any = {
      type: 'line',
      data: {
        datasets: data.datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                family: 'Outfit, sans-serif',
                size: 12,
                weight: 'bold'
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#1e293b',
            bodyColor: '#1e293b',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: (context: any) => {
                return ` ${context.dataset.label}: ${context.parsed.y.toFixed(2)}€`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'category',
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 10
              }
            }
          },
          y: {
            beginAtZero: false,
            grid: {
              color: '#f1f5f9'
            },
            ticks: {
              callback: (value: any) => value + '€',
              font: {
                size: 10
              }
            }
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart(data: any) {
    if (!this.chart) return;
    this.chart.data.datasets = data.datasets;
    this.chart.update();
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

  // Nutrition Logic
  isNutritionModalOpen = signal(false);
  editedNutrition = signal<any>({});

  openNutritionModal() {
    const p = this.product();
    if (p) {
      this.editedNutrition.set({ 
        calories: p.nutritionalInfo?.calories || null,
        fat: p.nutritionalInfo?.fat || null,
        saturatedFat: p.nutritionalInfo?.saturatedFat || null,
        carbs: p.nutritionalInfo?.carbs || null,
        sugars: p.nutritionalInfo?.sugars || null,
        proteins: p.nutritionalInfo?.proteins || null,
        salt: p.nutritionalInfo?.salt || null,
        nutriscore: p.nutritionalInfo?.nutriscore || '-',
        nova: p.nutritionalInfo?.nova || null,
        ingredients: p.nutritionalInfo?.ingredients || '',
        weight: p.weight || null,
        weightUnit: p.weightUnit || '',
        pieces: p.pieces || null
      });
      this.isNutritionModalOpen.set(true);
    }
  }

  async saveNutritionalInfo() {
    const p = this.product();
    if (!p) return;

    const { weight, weightUnit, pieces, ...nutritionalInfo } = this.editedNutrition();
    
    // Update nutritional info
    this.productService.updateProductNutritionalInfo(p.id, nutritionalInfo);
    
    // Update weight info
    this.productService.updateProductWeight(p.id, weight, weightUnit, pieces);

    this.isNutritionModalOpen.set(false);
    this.showToast('Información actualizada', 'success');
  }

  async changeSupermarketPhoto(priceItem: SupermarketPrice) {
    const p = this.product();
    if (!p) return;

    const actionSheet = await this.actionSheetCtrl.create({
      header: `Foto para ${priceItem.supermarket}`,
      buttons: [
        {
          text: 'Cámara',
          icon: 'camera-outline',
          handler: () => this.captureSupermarketImage(priceItem.supermarket, CameraSource.Camera),
        },
        {
          text: 'Galería de fotos',
          icon: 'image-outline',
          handler: () => this.captureSupermarketImage(priceItem.supermarket, CameraSource.Photos),
        },
        {
          text: 'Cancelar',
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
  }

  async captureSupermarketImage(supermarket: string, source: CameraSource) {
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
        this.productService.updateSupermarketImage(p.id, supermarket, image.dataUrl);
        this.showToast('Foto del supermercado actualizada', 'success');
      }
    } catch (error) {
      console.error('Error al capturar imagen del supermercado:', error);
      this.showToast('Error al acceder a la cámara o galería', 'danger');
    }
  }

  getNutriScoreColor(score: string | undefined) {
    if (!score) return 'medium';
    switch (score.toLowerCase()) {
      case 'a': return 'success';
      case 'b': return 'primary';
      case 'c': return 'warning';
      case 'd': return 'danger';
      case 'e': return 'danger';
      default: return 'medium';
    }
  }

  getUnitPrice(price: number): { kgL?: string; piece?: string } | null {
    const p = this.product();
    if (!p) return null;

    let kgLPrice: string | undefined;
    let piecePrice: string | undefined;

    // Calculate price per kg/L if weight and weightUnit are provided
    if (p.weight && p.weightUnit) {
      let calculatedKgL = 0;
      let label = '';
      
      switch (p.weightUnit.toLowerCase()) {
        case 'g':
          calculatedKgL = (price / p.weight) * 1000;
          label = 'kg';
          break;
        case 'kg':
          calculatedKgL = price / p.weight;
          label = 'kg';
          break;
        case 'ml':
          calculatedKgL = (price / p.weight) * 1000;
          label = 'L';
          break;
        case 'l':
          calculatedKgL = price / p.weight;
          label = 'L';
          break;
      }
      
      if (calculatedKgL > 0) {
        kgLPrice = `${calculatedKgL.toFixed(2)}€/${label}`;
      }
    }

    // Calculate price per piece if pieces count is provided
    if (p.pieces && p.pieces > 1) {
      const perPiece = price / p.pieces;
      piecePrice = `${perPiece.toFixed(2)}€/ud`;
    } else if (p.weight && (p.weightUnit?.toLowerCase() === 'uds' || p.weightUnit?.toLowerCase() === 'unidades')) {
      // Fallback for when uds is used as weightUnit
      const perPiece = price / p.weight;
      piecePrice = `${perPiece.toFixed(2)}€/ud`;
    }

    if (!kgLPrice && !piecePrice) return null;
    return { kgL: kgLPrice, piece: piecePrice };
  }
}
