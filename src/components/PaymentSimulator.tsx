import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Info, AlertTriangle, Tag } from 'lucide-react';
import type { LevelName, Purchase } from '../types';
import { calculateInstallmentPlans, calculateCashback, applyDealOffline, formatMXN, type InstallmentPlan } from '../utils/payments';
import { SITE_DISPLAY_NAMES } from '../constants/kueski';
import { calculatePlans, fetchDeals, type AppliedDeal } from '../utils/api';
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
  // Planes locales como base inmediata (offline / mientras carga el backend).
  const [plans, setPlans] = useState<InstallmentPlan[]>(() =>
    calculateInstallmentPlans(cartTotal, userLevel)
  );
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan>(() => {
    const initial = calculateInstallmentPlans(cartTotal, userLevel);
    return initial[1] ?? initial[0];
  });
  const [approved, setApproved] = useState(true);
  const [rejectMessage, setRejectMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [appliedDeal, setAppliedDeal] = useState<AppliedDeal | null>(null);
  const [effectiveTotal, setEffectiveTotal] = useState(cartTotal);
  const [cashback, setCashback] = useState(() => calculateCashback(cartTotal, userLevel));

  const siteName = SITE_DISPLAY_NAMES[currentSite] ?? currentSite;

  // Offline: aplicar deal del sitio si está disponible antes de que responda el backend.
  useEffect(() => {
    let active = true;
    fetchDeals(currentSite).then((deals) => {
      if (!active || !deals) return;
      const siteDeal = deals.find((d) => d.site === currentSite && d.discountType);
      if (!siteDeal) return;
      const offlineDeal: AppliedDeal = {
        id: siteDeal.id, title: siteDeal.title,
        discountType: siteDeal.discountType ?? '',
        discountValue: siteDeal.discountValue,
      };
      const { effectiveTotal: et, plans: p, cashback: cb } = applyDealOffline(offlineDeal, cartTotal, userLevel);
      if (!active) return;
      setAppliedDeal(offlineDeal);
      setEffectiveTotal(et);
      setCashback(cb);
      setPlans(p);
      setSelectedPlan(p[1] ?? p[0]);
    });
    return () => { active = false; };
  }, [cartTotal, currentSite, userLevel]);

  // El backend es la autoridad: recalcula planes con deal, nivel, crédito y elegibilidad.
  useEffect(() => {
    let active = true;
    calculatePlans(cartTotal, currentSite).then((res) => {
      if (!active || !res) return;
      setApproved(res.approved);
      setRejectMessage(res.approved ? null : res.message);
      if (res.appliedDeal) setAppliedDeal(res.appliedDeal);
      if (typeof res.effectiveTotal === 'number') setEffectiveTotal(res.effectiveTotal);
      if (typeof res.cashback === 'number') setCashback(res.cashback);
      if (res.plans.length > 0) {
        setPlans(res.plans);
        setSelectedPlan(res.plans[1] ?? res.plans[0]);
      }
    });
    return () => { active = false; };
  }, [cartTotal, currentSite]);

  const handleFinalConfirm = () => {
    setShowConfirm(false);
    setConfirmed(true);
    setTimeout(() => {
      onConfirm({
        site: siteName,
        amount: effectiveTotal,
        plan: selectedPlan.periods,
        paymentPerPeriod: selectedPlan.paymentPerPeriod,
        cashback,
        dealId: appliedDeal?.id ?? null,
      });
    }, 1500);
  };

  /** Texto legible del beneficio del deal para mostrar en UI */
  function dealBenefitLabel(deal: AppliedDeal): string {
    switch (deal.discountType) {
      case 'free_shipping':      return `Envio gratis: -${formatMXN(deal.discountValue)}`;
      case 'cashback_bonus':     return `Cashback extra: +${(deal.discountValue * 100).toFixed(0)}%`;
      case 'no_interest':        return 'Sin intereses en todos los planes';
      case 'unlock_installments': return `Hasta ${deal.discountValue} quincenas disponibles`;
      default: return deal.title;
    }
  }

  // Pantalla de confirmación previa
  if (showConfirm) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        <div className="text-center">
          <h3 className="font-bold text-gray-900 text-lg">Confirmar compra</h3>
          <p className="text-xs text-gray-500 mt-1">Revisa los detalles antes de continuar</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl divide-y divide-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-600">Tienda</span>
            <span className="text-sm font-semibold text-gray-900">{siteName}</span>
          </div>
          {effectiveTotal !== cartTotal && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-600">Precio original</span>
              <span className="text-sm text-gray-400 line-through">{formatMXN(cartTotal)}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-600">Total a pagar</span>
            <span className="text-sm font-bold text-gray-900">{formatMXN(effectiveTotal)}</span>
          </div>
          {appliedDeal && (
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-50">
              <span className="text-sm text-emerald-700 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Promocion
              </span>
              <span className="text-xs font-semibold text-emerald-700">{dealBenefitLabel(appliedDeal)}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-600">Plan</span>
            <span className="text-sm font-semibold text-gray-900">
              {selectedPlan.periods} quincenas x {formatMXN(selectedPlan.paymentPerPeriod)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-600">Cashback estimado</span>
            <span className="text-sm font-semibold text-emerald-600">{formatMXN(cashback)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Volver
          </button>
          <button
            onClick={handleFinalConfirm}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            Si, confirmar
          </button>
        </div>
      </motion.div>
    );
  }

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
        {effectiveTotal !== cartTotal ? (
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900">{formatMXN(effectiveTotal)}</p>
            <p className="text-sm text-gray-400 line-through">{formatMXN(cartTotal)}</p>
          </div>
        ) : (
          <p className="text-2xl font-bold text-gray-900">{formatMXN(cartTotal)}</p>
        )}
      </div>

      {appliedDeal && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-start gap-2">
          <Tag className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-emerald-800">{appliedDeal.title}</p>
            <p className="text-xs text-emerald-700">{dealBenefitLabel(appliedDeal)}</p>
          </div>
        </div>
      )}

      {!approved && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            {rejectMessage ?? 'Esta compra no puede aprobarse en este momento.'}
          </p>
        </div>
      )}

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
          {appliedDeal && (
            <p className="text-emerald-700 font-semibold flex items-center gap-1">
              <Tag className="w-3 h-3" /> {dealBenefitLabel(appliedDeal)}
            </p>
          )}
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
          onClick={() => setShowConfirm(true)}
          disabled={!approved}
          className="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
        >
          <span>Confirmar con</span>
          {' '}
          <KueskiPayLogo size="sm" variant="white" />
        </button>
      </div>
    </div>
  );
}
