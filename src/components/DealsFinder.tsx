import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Tag, Sparkles, ExternalLink, Percent, Clock, BellRing, Check } from 'lucide-react';
import { fetchDeals, subscribeDeal } from '../utils/api';
import type { ApiDeal } from '../utils/api';

interface DealsFinderProps {
  currentSite: string;
}

// Tipo interno normalizado
interface Deal {
  id: number;
  site: string;
  siteKey: string;
  title: string;
  description: string;
  discount: string;
  tag: string;
  active: boolean;
  color: string;
}

// URL pública de cada tienda (para el botón "Ver más").
const SITE_URLS: Record<string, string> = {
  amazon:       'https://www.amazon.com.mx',
  mercadolibre: 'https://www.mercadolibre.com.mx',
  liverpool:    'https://www.liverpool.com.mx',
  coppel:       'https://www.coppel.com',
  elektra:      'https://www.elektra.com.mx',
};

// Ofertas estáticas como fallback cuando la API no está disponible
function buildStaticDeals(currentSite: string): Deal[] {
  return [
    {
      id: 1, site: 'Amazon', siteKey: 'amazon',
      title: 'Pago diferido disponible',
      description: 'Compra ahora y paga en 4 quincenas sin intereses',
      discount: 'Sin intereses', tag: 'Kueski Pay',
      active: currentSite === 'amazon',
      color: 'bg-teal-500',
    },
    {
      id: 2, site: 'Mercado Libre', siteKey: 'mercadolibre',
      title: '3 MSI + Cashback 5%',
      description: 'Meses sin intereses + reembolso en tu siguiente compra',
      discount: '5% cashback', tag: 'Oferta especial',
      active: currentSite === 'mercadolibre',
      color: 'bg-blue-700',
    },
    {
      id: 3, site: 'Liverpool', siteKey: 'liverpool',
      title: 'Envío gratis con Kueski',
      description: 'Paga con Kueski Pay y obtén envío sin costo',
      discount: 'Envío gratis', tag: 'Beneficio',
      active: currentSite === 'liverpool',
      color: 'bg-blue-800',
    },
    {
      id: 4, site: 'Coppel', siteKey: 'coppel',
      title: 'Hasta 6 MSI',
      description: 'Meses sin intereses en compras mayores a $1,500',
      discount: '6 MSI', tag: 'Disponible',
      active: currentSite === 'coppel',
      color: 'bg-blue-600',
    },
    {
      id: 5, site: 'Elektra', siteKey: 'elektra',
      title: 'Paga a plazos con 0% interés',
      description: 'Hasta 4 quincenas sin intereses en electrónica y más',
      discount: '0% interés', tag: 'Kueski Pay',
      active: currentSite === 'elektra',
      color: 'bg-blue-800',
    },
  ];
}

function apiDealToDeal(d: ApiDeal, currentSite: string): Deal {
  const SITE_NAMES: Record<string, string> = {
    amazon: 'Amazon', mercadolibre: 'Mercado Libre',
    liverpool: 'Liverpool', coppel: 'Coppel', elektra: 'Elektra',
  };
  return {
    id:          d.id,
    site:        SITE_NAMES[d.site] ?? d.site,
    siteKey:     d.site,
    title:       d.title,
    description: d.description,
    discount:    d.discount,
    tag:         d.tag,
    active:      d.site === currentSite,
    color:       d.color,
  };
}

export function DealsFinder({ currentSite }: DealsFinderProps) {
  const [deals, setDeals] = useState<Deal[]>(() => buildStaticDeals(currentSite));
  const [subscribed, setSubscribed] = useState(false);

  // Intentar cargar deals dinámicos desde el backend
  useEffect(() => {
    fetchDeals(currentSite).then((apiDeals) => {
      if (apiDeals && apiDeals.length > 0) {
        setDeals(apiDeals.map((d) => apiDealToDeal(d, currentSite)));
      }
    });
  }, [currentSite]);

  // Actualizar estado activo si cambia el sitio (sin re-fetch)
  useEffect(() => {
    setDeals((prev) => prev.map((d) => ({ ...d, active: d.siteKey === currentSite })));
    setSubscribed(false);
  }, [currentSite]);

  const activeDeal = deals.find((d) => d.active);

  const handleVerMas = (deal: Deal) => {
    const url = SITE_URLS[deal.siteKey];
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleActivarAlertas = () => {
    if (subscribed) return;
    setSubscribed(true);
    if (activeDeal) void subscribeDeal(activeDeal.id);
  };

  return (
    <div className="space-y-4">
      {/* Oferta activa en el sitio actual */}
      {activeDeal ? (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className={`${activeDeal.color} text-white rounded-xl p-4 border-2 border-white/20 shadow-lg`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold">¡Oferta activa!</h3>
            </div>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
              {activeDeal.tag}
            </span>
          </div>
          <h4 className="font-bold text-lg mb-1">{activeDeal.title}</h4>
          <p className="text-sm text-white/90 mb-3">{activeDeal.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              <span className="text-sm font-semibold">{activeDeal.discount}</span>
            </div>
            <button
              onClick={() => handleVerMas(activeDeal)}
              className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors flex items-center gap-1"
            >
              Ver más
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
          <Tag className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 font-semibold mb-1">No hay ofertas en este sitio</p>
          <p className="text-xs text-gray-500">Navega por sitios compatibles para ver ofertas</p>
        </div>
      )}

      {/* Todas las ofertas */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-500" />
          Todas las ofertas
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {deals.map((deal, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border transition-all ${
                deal.active
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-semibold text-sm text-gray-900">{deal.site}</h5>
                    {deal.active && (
                      <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                        Activo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{deal.title}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 whitespace-nowrap ml-2">
                  {deal.discount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Próximas ofertas */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 text-sm mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          Próximamente
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-900">El Buen Fin 2026</p>
              <p className="text-[10px] text-gray-600">Hasta 18 MSI en productos seleccionados</p>
            </div>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Nov 2026
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-900">Hot Sale</p>
              <p className="text-[10px] text-gray-600">Descuentos exclusivos con Kueski Pay</p>
            </div>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              May 2026
            </span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleActivarAlertas}
        disabled={subscribed}
        className={`w-full py-3 rounded-lg font-semibold transition-colors text-sm flex items-center justify-center gap-2 ${
          subscribed
            ? 'bg-emerald-100 text-emerald-700 cursor-default'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {subscribed ? (
          <><Check className="w-4 h-4" /> ¡Alertas activadas!</>
        ) : (
          <><BellRing className="w-4 h-4" /> Activar alertas de ofertas</>
        )}
      </button>
    </div>
  );
}
