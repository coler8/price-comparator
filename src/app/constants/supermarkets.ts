export const SUPERMARKETS = {
  MERCADONA: 'Mercadona',
  LIDL: 'Lidl',
  CARREFOUR: 'Carrefour',
  CONSUM: 'Consum',
} as const;

export type SupermarketName = typeof SUPERMARKETS[keyof typeof SUPERMARKETS];

export const SUPERMARKET_LOGOS: Record<string, string> = {
  [SUPERMARKETS.MERCADONA]: 'https://www.mercadona.es/favicon.ico',
  [SUPERMARKETS.LIDL]: 'https://www.lidl.es/favicon.ico',
  [SUPERMARKETS.CARREFOUR]: 'https://www.carrefour.es/favicon.ico',
  [SUPERMARKETS.CONSUM]: 'https://www.consum.es/themes/custom/consum_es/assets/img/icon-responsive-consum.png',
};
