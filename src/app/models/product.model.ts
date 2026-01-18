export interface SupermarketPrice {
  supermarket: 'Lidl' | 'Mercadona' | 'Carrefour';
  price: number;
  available: boolean;
  link?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  prices: SupermarketPrice[];
  unit: string; // e.g., 'kg', 'unidad', 'litro'
}
