import { SupermarketName } from '../constants/supermarkets';

export interface SupermarketPrice {
  supermarket: SupermarketName;
  price: number;
  available: boolean;
  link?: string;
  image?: string;
}

export interface PriceHistoryEntry {
  supermarket: string;
  price: number;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  prices: SupermarketPrice[];
  unit: string;
  priceHistory: PriceHistoryEntry[];
  weight?: number;
  weightUnit?: string;
  pieces?: number;
  nutritionalInfo?: {
    calories?: number;
    fat?: number;
    saturatedFat?: number;
    carbs?: number;
    sugars?: number;
    proteins?: number;
    salt?: number;
    nutriscore?: string;
    nova?: number;
    ingredients?: string;
  };
}
