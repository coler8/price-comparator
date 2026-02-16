import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonFooter,
  ModalController,
  ActionSheetController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, imageOutline, closeOutline, checkmarkOutline, storefrontOutline, pricetagOutline, listOutline, cubeOutline } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { SUPERMARKETS, SupermarketName } from '../../constants/supermarkets';
import { StagingProduct } from '../product-staging/product-staging.component';

@Component({
  selector: 'app-manual-add-modal',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Nuevo Producto</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="confirm()" color="primary" [disabled]="!isValid()">
            <ion-icon name="checkmark-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="photo-section ion-text-center ion-margin-bottom">
        <div class="image-container" (click)="presentPhotoOptions()">
          @if (photo()) {
            <img [src]="photo()" alt="Product photo" />
          } @else {
            <div class="placeholder">
              <ion-icon name="camera-outline"></ion-icon>
              <p>Añadir Foto</p>
            </div>
          }
        </div>
      </div>

      <ion-list lines="inset" class="custom-list">
        <ion-item>
          <ion-icon name="pricetag-outline" slot="start" color="primary"></ion-icon>
          <ion-input
            label="Nombre"
            labelPlacement="stacked"
            placeholder="Ej. Arroz Extrafino"
            [(ngModel)]="name"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-icon name="storefront-outline" slot="start" color="primary"></ion-icon>
          <ion-select
            label="Supermercado"
            labelPlacement="stacked"
            [(ngModel)]="supermarket"
            interface="action-sheet"
          >
            @for (s of supermarketOptions; track s) {
              <ion-select-option [value]="s">{{ s }}</ion-select-option>
            }
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-icon name="pricetag-outline" slot="start" color="primary"></ion-icon>
          <ion-input
            type="number"
            label="Precio (€)"
            labelPlacement="stacked"
            placeholder="0.00"
            [(ngModel)]="price"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-icon name="list-outline" slot="start" color="primary"></ion-icon>
          <ion-input
            label="Categoría"
            labelPlacement="stacked"
            placeholder="Ej. Despensa"
            [(ngModel)]="category"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-icon name="cube-outline" slot="start" color="primary"></ion-icon>
          <ion-input
            label="Unidad"
            labelPlacement="stacked"
            placeholder="Ej. kg, ud, L"
            [(ngModel)]="unit"
          ></ion-input>
        </ion-item>
      </ion-list>
    </ion-content>

    <ion-footer class="ion-no-border ion-padding">
      <ion-button expand="block" (click)="confirm()" [disabled]="!isValid()" class="main-button">
        Guardar Producto
      </ion-button>
    </ion-footer>
  `,
  styles: [`
    .photo-section {
      display: flex;
      justify-content: center;
      margin-top: 10px;
    }
    .image-container {
      width: 140px;
      height: 140px;
      border-radius: 20px;
      overflow: hidden;
      background: var(--ion-color-step-100);
      border: 2px dashed var(--ion-color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
    }
    .image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--ion-color-primary);
    }
    .placeholder ion-icon {
      font-size: 48px;
    }
    .placeholder p {
      margin: 8px 0 0;
      font-size: 14px;
      font-weight: 500;
    }
    .custom-list {
      background: transparent;
      border-radius: 15px;
      overflow: hidden;
    }
    ion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      margin-bottom: 10px;
    }
    .main-button {
      --border-radius: 12px;
      height: 52px;
      font-weight: 600;
      font-size: 16px;
    }
  `],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonFooter,
  ],
})
export class ManualAddModalComponent {
  private modalCtrl = inject(ModalController);
  private actionSheetCtrl = inject(ActionSheetController);

  name = '';
  price: number | null = null;
  category = '';
  unit = 'unidad';
  supermarket: string = SUPERMARKETS.MERCADONA;
  photo = signal<string | null>(null);

  supermarketOptions = Object.values(SUPERMARKETS);

  constructor() {
    addIcons({ cameraOutline, imageOutline, closeOutline, checkmarkOutline, storefrontOutline, pricetagOutline, listOutline, cubeOutline });
  }

  isValid() {
    return this.name.trim().length > 0 && this.price !== null && this.price > 0;
  }

  async presentPhotoOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Foto del Producto',
      buttons: [
        {
          text: 'Cámara',
          icon: 'camera-outline',
          handler: () => this.takePhoto(CameraSource.Camera),
        },
        {
          text: 'Galería',
          icon: 'image-outline',
          handler: () => this.takePhoto(CameraSource.Photos),
        },
        {
          text: 'Cancelar',
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
  }

  async takePhoto(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source,
      });
      if (image.dataUrl) {
        this.photo.set(image.dataUrl);
      }
    } catch (e) {
      console.warn('Photo cancelled or error', e);
    }
  }

  cancel() {
    this.modalCtrl.dismiss(null);
  }

  confirm() {
    if (!this.isValid()) return;

    const stagingProduct: StagingProduct = {
      name: this.name,
      price: this.price as number,
      supermarket: this.supermarket as any,
      category: this.category || 'Otros',
      unit: this.unit || 'unidad',
      image: this.photo() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
      isNew: true
    };

    this.modalCtrl.dismiss([stagingProduct]);
  }
}
