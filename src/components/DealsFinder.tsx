import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Tag, Sparkles, Percent } from 'lucide-react';
import { fetchDeals } from '../utils/api';
import type { ApiDeal } from '../utils/api';

interface DealsFinderProps {
  currentSite: string;
}

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

// URL pública de cada tienda compatible.
const SITE_URLS: Record<string, string> = {
  amazon:       'https://www.amazon.com.mx',
  mercadolibre: 'https://www.mercadolibre.com.mx',
  liverpool:    'https://www.liverpool.com.mx',
  coppel:       'https://www.coppel.com',
  elektra:      'https://www.elektra.com.mx',
};

const SITE_NAMES: Record<string, string> = {
  amazon: 'Amazon', mercadolibre: 'Mercado Libre',
  liverpool: 'Liverpool', coppel: 'Coppel', elektra: 'Elektra',
};

function buildStaticDeals(currentSite: string): Deal[] {
  return [
    { id: 1, site: 'Amazon', siteKey: 'amazon', title: 'Pago diferido disponible', description: 'Compra ahora y paga en 4 quincenas sin intereses', discount: 'Sin intereses', tag: 'Kueski Pay', active: currentSite === 'amazon', color: 'bg-teal-500' },
    { id: 2, site: 'Mercado Libre', siteKey: 'mercadolibre', title: '3 MSI + Cashback 5%', description: 'Meses sin intereses + reembolso en tu siguiente compra', discount: '5% cashback', tag: 'Oferta especial', active: currentSite === 'mercadolibre', color: 'bg-blue-700' },
    { id: 3, site: 'Liverpool', siteKey: 'liverpool', title: 'Envío gratis con Kueski', description: 'Paga con Kueski Pay y obtén envío sin costo', discount: 'Envío gratis', tag: 'Beneficio', active: currentSite === 'liverpool', color: 'bg-blue-800' },
    { id: 4, site: 'Coppel', siteKey: 'coppel', title: 'Hasta 6 MSI', description: 'Meses sin intereses en compras mayores a $1,500', discount: '6 MSI', tag: 'Disponible', active: currentSite === 'coppel', color: 'bg-blue-600' },
    { id: 5, site: 'Elektra', siteKey: 'elektra', title: 'Paga a plazos con 0% interés', description: 'Hasta 4 quincenas sin intereses en electrónica', discount: '0% interés', tag: 'Kueski Pay', active: currentSite === 'elektra', color: 'bg-blue-800' },
  ];
}

function apiDealToDeal(d: ApiDeal, currentSite: string): Deal {
  return {
    id: d.id, site: SITE_NAMES[d.site] ?? d.site, siteKey: d.site,
    title: d.title, description: d.description, discount: d.discount,
    tag: d.tag, active: d.site === currentSite, color: d.color,
  };
}

function openSite(siteKey: string) {
  const url = SITE_URLS[siteKey];
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

export function DealsFinder({ currentSite }: DealsFinderProps) {
  const [deals, setDeals] = useState<Deal[]>(() => buildStaticDeals(currentSite));

  useEffect(() => {
    fetchDeals(currentSite).then((apiDeals) => {
      if (apiDeals && apiDeals.length > 0) {
        setDeals(apiDeals.map((d) => apiDealToDeal(d, currentSite)));
      }
    });
  }, [currentSite]);

  useEffect(() => {
    setDeals((prev) => prev.map((d) => ({ ...d, active: d.siteKey === currentSite })));
  }, [currentSite]);

  const activeDeal = deals.find((d) => d.active);

  return (
    <div className="space-y-4">
      {/* Oferta activa en el sitio actual */}
      {activeDeal ? (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          onClick={() => openSite(activeDeal.siteKey)}
          className={`${activeDeal.color} text-white rounded-xl p-4 border-2 border-white/20 shadow-lg cursor-pointer hover:opacity-90 transition-opacity`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold">Oferta activa</h3>
            </div>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
              {activeDeal.tag}
            </span>
          </div>
          <h4 className="font-bold text-lg mb-1">{activeDeal.title}</h4>
          <p className="text-sm text-white/90 mb-3">{activeDeal.description}</p>
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            <span className="text-sm font-semibold">{activeDeal.discount}</span>
          </div>
          <p className="text-[10px] text-white/70 mt-2">Toca para ver la oferta en {activeDeal.site}</p>
        </motion.div>
      ) : (
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
          <Tag className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 font-semibold mb-1">No hay ofertas en este sitio</p>
          <p className="text-xs text-gray-500">Toca una tienda de abajo para ver sus beneficios</p>
        </div>
      )}

      {/* Todas las ofertas — clickeables para abrir cada sitio */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-500" />
          Ofertas en tiendas compatibles
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {deals.map((deal) => (
            <button
              key={deal.id}
              onClick={() => openSite(deal.siteKey)}
              className={`w-full p-3 rounded-lg border transition-all text-left ${
                deal.active
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                  : 'bg-gray-50 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-semibold text-sm text-gray-900">{deal.site}</h5>
                    {deal.active && (
                      <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                        Aqui ahora
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{deal.title}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 whitespace-nowrap ml-2">
                  {deal.discount}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
