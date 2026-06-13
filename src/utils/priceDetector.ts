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
      // Checkout / bolsa Liverpool
      '[data-testid="order-summary-total"]',
      '[data-testid*="total"]',
      '.ld-order-summary__total-price',
      '.bag-summary__total',
      '.order-summary__total-price',
      // Selectores genéricos de respaldo
      '[class*="orderSummary"] [class*="total"]',
      '[class*="order-summary"] [class*="total"]',
      '[class*="resumen"] [class*="total"]',
    ],
    itemSelectors: {
      container: '[data-testid*="cart-item"], .ld-cart-item, .cart-item, .product-item',
      name: '[data-testid*="product-name"], .ld-cart-item__name, .cart-item__title, .product-name',
      price: '[data-testid*="price"], .ld-cart-item__price, .cart-item__price, .product-price',
      qty: '[data-testid*="quantity"] input, [class*="quantity"] input',
    },
  },

  coppel: {
    totalSelectors: [
      '[data-testid*="total"]',
      '[class*="ResumenOrden"] [class*="total"]',
      '[class*="checkout"] [class*="total"]',
      '[class*="cart"] [class*="total"]',
      '[class*="resumen"] [class*="total"]',
      '[class*="summary"] [class*="total"]',
      '.cart-summary-total',
      '.order-summary-total-amount',
    ],
    itemSelectors: {
      container: '[class*="CartItem"], [class*="cart-item"], [data-testid*="cart-item"]',
      name: '[class*="CartItem"] [class*="name"], [class*="CartItem"] [class*="title"]',
      price: '[class*="CartItem"] [class*="price"], [class*="CartItem"] [class*="Price"]',
      qty: '[class*="quantity"] input, [class*="Quantity"] input',
    },
  },

  elektra: {
    totalSelectors: [
      '[data-testid*="total"]',
      '[class*="OrderSummary"] [class*="total"]',
      '[class*="checkout-summary"] [class*="total"]',
      '[class*="CartSummary"] [class*="total"]',
      '[class*="TotalAmount"]',
      '.price-total',
    ],
    itemSelectors: {
      container: '[class*="CartItem"], [class*="cart-item"], [data-testid*="cart-item"]',
      name: '[class*="CartItem"] [class*="name"], [class*="CartItem"] [class*="title"]',
      price: '[class*="CartItem"] [class*="price"], [class*="CartItem"] [class*="Price"]',
      qty: '[class*="quantity"] input, [class*="Quantity"] input',
    },
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

    // Fallback heurístico: busca en el DOM elementos con texto de precio MX
    // junto a etiquetas que indiquen "total" para sitios sin selectores exactos.
    if (this.site !== 'mercadolibre') {
      return this.extractTotalHeuristic();
    }
    return 0;
  }

  /**
   * Heurística de último recurso: recorre elementos de texto corto en el DOM,
   * calcula un score por palabras clave de contexto (total > subtotal) y
   * devuelve el precio del candidato con mayor score.
   */
  private extractTotalHeuristic(): number {
    const PRICE_RE = /\$\s*[\d][\d.,]*/;
    const candidates: Array<{ price: number; score: number }> = [];

    const elements = document.querySelectorAll('span, strong, b, p, div, td, h2, h3, h4');
    elements.forEach((el) => {
      // Solo texto propio (sin hijos) para evitar capturar contenedores grandes
      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? '')
        .join('')
        .trim();

      if (!PRICE_RE.test(ownText)) return;
      const price = parseMXPrice(ownText);
      if (price < 10) return; // ignorar precios irrisorios

      // Contexto: propio + padre + hermano-etiqueta anterior
      const context = [
        ownText,
        el.parentElement?.textContent ?? '',
        el.previousElementSibling?.textContent ?? '',
      ].join(' ').toLowerCase();

      let score = 0;
      if (/total a pagar|importe total|grand total/.test(context)) score += 3;
      else if (/total|importe|bolsa|monto a pagar/.test(context)) score += 2;
      else if (/subtotal/.test(context)) score += 1;

      if (score > 0) candidates.push({ price, score });
    });

    if (candidates.length === 0) return 0;

    // Mayor score; a igualdad, mayor precio (el gran total suele ser el mayor)
    candidates.sort((a, b) => b.score - a.score || b.price - a.price);
    return candidates[0].price;
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
