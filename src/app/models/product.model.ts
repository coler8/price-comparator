import { SupermarketName } from '../constants/supermarkets';

export interface SupermarketPrice {
  supermarket: SupermarketName;
  price: number;
  available: boolean;
  link?: string;
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
}
