import { motion } from 'motion/react';
import { ShoppingCart, CheckCircle, AlertCircle, LogIn, Bell } from 'lucide-react';
import type { LevelName, Purchase } from '../types';
import { PaymentSimulator } from './PaymentSimulator';
import { COMPATIBLE_SITES, SITE_DISPLAY_NAMES } from '../constants/kueski';
import { formatMXN } from '../utils/payments';

interface SmartReminderProps {
  currentSite: string;
  isLoggedIn: boolean;
  cartTotal: number;
  userLevel: LevelName;
  showSimulator: boolean;
  nextPayment?: { date: string; amount: number };
  onOpenSimulator: () => void;
  onCloseSimulator: () => void;
  onConfirmPurchase: (purchase: Omit<Purchase, 'id' | 'date' | 'status'>) => void;
  onLoginClick: () => void;
}

const COMPATIBLE_SITE_LIST = COMPATIBLE_SITES as readonly string[];

/** Devuelve los días que faltan para una fecha (negativo si ya pasó). */
function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

export function SmartReminder({
  currentSite,
  isLoggedIn,
  cartTotal,
  userLevel,
  showSimulator,
  nextPayment,
  onOpenSimulator,
  onCloseSimulator,
  onConfirmPurchase,
  onLoginClick,
}: SmartReminderProps) {
  const isEcommerce = COMPATIBLE_SITE_LIST.includes(currentSite);
  const siteName = SITE_DISPLAY_NAMES[currentSite] ?? currentSite;

  const daysLeft = nextPayment ? daysUntil(nextPayment.date) : null;
  const showPaymentReminder = isLoggedIn && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

  if (showSimulator && cartTotal > 0) {
    return (
      <PaymentSimulator
        cartTotal={cartTotal}
        currentSite={currentSite}
        userLevel={userLevel}
        onConfirm={onConfirmPurchase}
        onClose={onCloseSimulator}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Recordatorio de pago próximo */}
      {showPaymentReminder && nextPayment && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-3 flex items-start gap-3 border ${
            daysLeft! <= 3
              ? 'bg-amber-50 border-amber-300'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <Bell className={`w-4 h-4 shrink-0 mt-0.5 ${daysLeft! <= 3 ? 'text-amber-500' : 'text-blue-500'}`} />
          <div>
            <p className={`text-xs font-semibold ${daysLeft! <= 3 ? 'text-amber-800' : 'text-blue-800'}`}>
              {daysLeft === 0
                ? 'Tu pago vence hoy'
                : `Tu pago vence en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`}
            </p>
            <p className={`text-xs mt-0.5 ${daysLeft! <= 3 ? 'text-amber-700' : 'text-blue-700'}`}>
              {formatMXN(nextPayment.amount)} el{' '}
              {new Date(nextPayment.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
            </p>
          </div>
        </motion.div>
      )}

      {/* Bloque principal según contexto */}
      {isEcommerce ? (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="bg-emerald-500 rounded-full p-2 mt-1 shrink-0">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 mb-1">
                Divide tu pago en quincenas
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                Usa <span className="font-semibold text-emerald-600">Kueski Pay</span> y paga tu compra sin intereses en {siteName}.
              </p>

              {isLoggedIn && cartTotal > 0 ? (
                <button
                  onClick={onOpenSimulator}
                  className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
                >
                  Simular pago — {formatMXN(cartTotal)}
                </button>
              ) : isLoggedIn ? (
                <p className="text-xs text-gray-500 italic">Agrega productos al carrito para ver la simulación de pagos.</p>
              ) : (
                <button
                  onClick={onLoginClick}
                  className="flex items-center gap-2 w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
                >
                  <LogIn className="w-4 h-4" />
                  Inicia sesión para usar Kueski Pay
                </button>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border border-gray-200 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <div className="bg-gray-100 rounded-full p-2 mt-1">
              <AlertCircle className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-1">Esperando tu próxima compra</h3>
              <p className="text-sm text-gray-600">
                Te avisaremos cuando estés en un sitio compatible con Kueski Pay.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Como funciona */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h4 className="font-semibold text-gray-900 text-sm">Como funciona Kueski Pay</h4>
        <div className="space-y-2">
          {[
            'Divide tu compra en 2, 4 o más pagos quincenales',
            'Sin intereses en compras seleccionadas',
            'Aprobación instantánea en minutos',
          ].map((text) => (
            <div key={text} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sitios compatibles */}
      <div className="bg-gray-100 rounded-xl p-3">
        <p className="text-xs text-gray-600 mb-2 font-semibold">Sitios compatibles:</p>
        <div className="flex flex-wrap gap-2">
          {COMPATIBLE_SITES.map((site) => (
            <span
              key={site}
              className={`text-xs px-3 py-1 rounded-full border ${
                site === currentSite
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold'
                  : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {SITE_DISPLAY_NAMES[site]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
