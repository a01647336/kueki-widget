import type { CartItem } from '../types';

export interface CartData {
  total: number;
  items: CartItem[];
}

interface SiteConfig {
  /** Selectores para el total del carrito. Se prueban en orden; se usa el primero que encuentre texto. */
  totalSelectors: string[];
  /** Selectores para los ítems del carrito (opcional, best-effort). */
  itemSelectors?: {
    container: string;
    name: string;
    price: string;
    qty?: string;
  };
}

// ─── Configuración por sitio ────────────────────────────────────────────────
const SITE_CONFIGS: Record<string, SiteConfig> = {
  amazon: {
    totalSelectors: [
      // Página de carrito (/cart)
      '#sc-subtotal-amount-activecart',
      '.sc-subtotal .a-color-price',
      // Sidebar de carrito flotante
      '#nav-cart .a-color-price',
      // Checkout
      '#subtotals-marketplace-table .a-color-price',
    ],
    itemSelectors: {
      container: '[data-name="Active Items"] .sc-list-item, .sc-list-item-content',
      name: '.sc-product-title',
      price: '.sc-product-price .a-price .a-offscreen, .sc-product-price',
      qty: '.sc-action-quantity input',
    },
  },

  mercadolibre: {
    totalSelectors: [
      // Página de carrito
      '.cart-summary .andes-money-amount',
      '.cart__total .andes-money-amount',
      '[class*="summary"] [class*="total"] .andes-money-amount',
      // Resumen lateral
      '.ui-pdp-price__second-line .andes-money-amount',
    ],
    itemSelectors: {
      container: '.cart-item, [class*="CartItem"]',
      name: '[class*="CartItem__title"], .cart-item__title',
      price: '.andes-money-amount__fraction',
    },
  },

  liverpool: {
    totalSelectors: [
      // Carrito y resumen de compra
      '.resumen-compra .precio-total',
      '.cart-total-price',
      '.order-summary__total .price',
      '[class*="total"] [class*="precio"]',
      '.subtotal-price',
    ],
    itemSelectors: {
      container: '.cart-item, .product-item',
      name: '.cart-item__title, .product-name',
      price: '.cart-item__price, .product-price',
      qty: '.quantity-input, [class*="quantity"] input',
    },
  },

  coppel: {
    totalSelectors: [
      '.cart-summary-total',
      '.order-summary-total-amount',
      '[class*="resumen"] [class*="total"]',
      '.shopping-cart__total',
    ],
  },

  elektra: {
    totalSelectors: [
      '.price-total',
      '.cart-total-price',
      '[class*="TotalAmount"]',
      '.checkout-summary__total',
    ],
  },
};

// ─── Utilidades ─────────────────────────────────────────────────────────────

/** Convierte texto de precio MX ("$12,999.00", "12,999", "12999") a número. */
function parseMXPrice(text: string): number {
  if (!text) return 0;
  // Quitar símbolo $, espacios, luego comas de miles y parsear
  const cleaned = text.trim().replace(/\$/g, '').replace(/,/g, '').replace(/\s/g, '');
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

/** Extrae precio de un elemento Andes (MercadoLibre): fracción + centavos. */
function parseAndesPrice(el: Element): number {
  const fraction = el.querySelector('.andes-money-amount__fraction')?.textContent ?? '';
  const cents = el.querySelector('.andes-money-amount__cents')?.textContent ?? '00';
  if (!fraction) return 0;
  const clean = fraction.replace(/,/g, '');
  return parseFloat(`${clean}.${cents}`) || 0;
}

/** Debounce simple */
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

// ─── Clase principal ─────────────────────────────────────────────────────────

export class PriceDetector {
  private readonly site: string;
  private readonly config: SiteConfig;
  private readonly callback: (data: CartData) => void;
  private observer: MutationObserver | null = null;
  private lastTotal = -1; // evita callbacks duplicados

  constructor(site: string, callback: (data: CartData) => void) {
    this.site = site;
    this.config = SITE_CONFIGS[site] ?? { totalSelectors: [] };
    this.callback = callback;
  }

  start() {
    this.detect();

    const debouncedDetect = debounce(() => this.detect(), 500);

    this.observer = new MutationObserver(debouncedDetect);
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // SPAs con History API (Mercado Libre, etc.)
    window.addEventListener('popstate', debouncedDetect);
    window.addEventListener('hashchange', debouncedDetect);

    // Algunos sitios usan pushState directamente; interceptamos para detectar navegación SPA
    const origPushState = history.pushState.bind(history);
    history.pushState = (...args) => {
      origPushState(...args);
      debouncedDetect();
    };
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
  }

  private detect() {
    const total = this.extractTotal();
    const items = this.extractItems();

    // Solo emitir callback si el total cambió (evita renders innecesarios)
    if (total !== this.lastTotal) {
      this.lastTotal = total;
      this.callback({ total, items });
    }
  }

  private extractTotal(): number {
    for (const selector of this.config.totalSelectors) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const text = el.textContent ?? '';

      // Mercado Libre usa componentes Andes con elementos separados
      if (this.site === 'mercadolibre') {
        const andesEl = el.classList.contains('andes-money-amount') ? el : el.querySelector('.andes-money-amount');
        if (andesEl) {
          const price = parseAndesPrice(andesEl);
          if (price > 0) return price;
        }
      }

      const price = parseMXPrice(text);
      if (price > 0) return price;
    }
    return 0;
  }

  private extractItems(): CartItem[] {
    const itemConf = this.config.itemSelectors;
    if (!itemConf) return [];

    const containers = document.querySelectorAll(itemConf.container);
    const items: CartItem[] = [];

    containers.forEach((container, index) => {
      const nameEl = container.querySelector(itemConf.name);
      const priceEl = container.querySelector(itemConf.price);
      if (!nameEl || !priceEl) return;

      let price = 0;
      if (this.site === 'mercadolibre') {
        const andesEl = priceEl.closest('.andes-money-amount') ?? priceEl;
        price = parseAndesPrice(andesEl);
      } else {
        price = parseMXPrice(priceEl.textContent ?? '');
      }

      if (price <= 0) return;

      let qty = 1;
      if (itemConf.qty) {
        const qtyEl = container.querySelector(itemConf.qty) as HTMLInputElement | null;
        if (qtyEl) qty = parseInt(qtyEl.value) || 1;
      }

      items.push({
        id: `detected-${this.site}-${index}`,
        name: nameEl.textContent?.trim() ?? `Producto ${index + 1}`,
        price,
        qty,
      });
    });

    return items;
  }
}
