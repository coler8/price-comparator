import { Component, Input, signal } from '@angular/core';
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
  IonLabel,
  IonInput,
  IonIcon,
  IonFooter,
  IonThumbnail,
  ModalController,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trashOutline, checkmarkDoneOutline, closeOutline, trendingUpOutline, trendingDownOutline, removeOutline } from 'ionicons/icons';
import { SupermarketName } from '../../constants/supermarkets';

export interface StagingProduct {
  name: string;
  price: number;
  supermarket: SupermarketName | string;
  category: string;
  unit: string;
  image: string;
  isNew: boolean;
  existingId?: string;
  oldPrice?: number;
  nutritionalInfo?: any;
}

@Component({
  selector: 'app-product-staging',
  templateUrl: './product-staging.component.html',
  styleUrls: ['./product-staging.component.scss'],
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
    IonLabel,
    IonInput,
    IonIcon,
    IonFooter,
    IonThumbnail,
    IonNote,
  ],
})
export class ProductStagingComponent {
  @Input() products: StagingProduct[] = [];
  
  stagingList = signal<StagingProduct[]>([]);

  constructor(private modalCtrl: ModalController) {
    addIcons({ trashOutline, checkmarkDoneOutline, closeOutline, trendingUpOutline, trendingDownOutline, removeOutline });
  }

  ngOnInit() {
    this.stagingList.set([...this.products]);
  }

  removeProduct(index: number) {
    const list = this.stagingList();
    list.splice(index, 1);
    this.stagingList.set([...list]);
  }

  cancel() {
    this.modalCtrl.dismiss(null);
  }

  confirm() {
    this.modalCtrl.dismiss(this.stagingList());
  }

  updatePrice(index: number, event: any) {
    const value = parseFloat(event.detail.value);
    if (!isNaN(value)) {
      const list = this.stagingList();
      list[index].price = value;
      this.stagingList.set([...list]);
    }
  }

  updateName(index: number, event: any) {
    const value = event.detail.value;
    if (value) {
      const list = this.stagingList();
      list[index].name = value;
      this.stagingList.set([...list]);
    }
  }
}
