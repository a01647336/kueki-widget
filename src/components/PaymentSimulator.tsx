import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Info } from 'lucide-react';
import type { LevelName, Purchase } from '../types';
import { calculateInstallmentPlans, calculateCashback, formatMXN } from '../utils/payments';
import { SITE_DISPLAY_NAMES } from '../constants/kueski';
import { KueskiPayLogo } from './KueskiPayLogo';

interface PaymentSimulatorProps {
  cartTotal: number;
  currentSite: string;
  userLevel: LevelName;
  onConfirm: (purchase: Omit<Purchase, 'id' | 'date' | 'status'>) => void;
  onClose: () => void;
}

export function PaymentSimulator({
  cartTotal,
  currentSite,
  userLevel,
  onConfirm,
  onClose,
}: PaymentSimulatorProps) {
  const plans = calculateInstallmentPlans(cartTotal, userLevel);
  const [selectedPlan, setSelectedPlan] = useState(plans[1] ?? plans[0]);
  const [confirmed, setConfirmed] = useState(false);

  const cashback = calculateCashback(cartTotal, userLevel);
  const siteName = SITE_DISPLAY_NAMES[currentSite] ?? currentSite;

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => {
      onConfirm({
        site: siteName,
        amount: cartTotal,
        plan: selectedPlan.periods,
        paymentPerPeriod: selectedPlan.paymentPerPeriod,
        cashback,
      });
    }, 1500);
  };

  if (confirmed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-6 gap-3 text-center"
      >
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <h3 className="font-bold text-gray-900">¡Compra confirmada!</h3>
        <p className="text-sm text-gray-600">
          Pagarás {formatMXN(selectedPlan.paymentPerPeriod)} cada quincena por {selectedPlan.periods} quincenas.
        </p>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-sm text-emerald-700 font-semibold">
          Cashback ganado: {formatMXN(cashback)}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
        <p className="text-xs text-emerald-700 font-semibold mb-1">Total de tu carrito en {siteName}</p>
        <p className="text-2xl font-bold text-gray-900">{formatMXN(cartTotal)}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">Elige tu plan de pago:</p>
        {plans.map((plan) => (
          <button
            key={plan.periods}
            onClick={() => setSelectedPlan(plan)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
              selectedPlan.periods === plan.periods
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div>
              <span className="font-semibold text-sm text-gray-900">
                {plan.periods} quincenas
              </span>
              {plan.commissionRate > 0 && (
                <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                  +{(plan.commissionRate * 100).toFixed(1)}% comisión
                </span>
              )}
              {plan.commissionRate === 0 && (
                <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                  Sin intereses
                </span>
              )}
            </div>
            <span className="font-bold text-emerald-700 text-sm">
              {formatMXN(plan.paymentPerPeriod)}/quincena
            </span>
          </button>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        <div className="text-xs text-gray-600 space-y-0.5">
          <p>Total a pagar: <span className="font-semibold">{formatMXN(selectedPlan.totalAmount)}</span></p>
          <p className="text-emerald-600 font-semibold">
            Cashback estimado ({userLevel}): {formatMXN(cashback)}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
        >
          <span>Confirmar con</span>
          <KueskiPayLogo size="sm" variant="white" />
        </button>
      </div>
    </div>
  );
}
