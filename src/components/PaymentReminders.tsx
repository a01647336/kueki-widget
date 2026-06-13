import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Clock, Calendar } from 'lucide-react';
import type { Purchase, UpcomingPayment } from '../types';
import { buildPaymentSchedule } from '../utils/payments';
import { fetchUpcomingPayments, payInstallment } from '../utils/api';
import { SITE_DISPLAY_NAMES } from '../constants/kueski';
import { formatMXN } from '../utils/payments';

interface PaymentRemindersProps {
  purchases: Purchase[];
  onPayInstallment: (purchaseId: string) => Promise<void>;
}

function dueDateLabel(payment: UpcomingPayment): string {
  const d = new Date(payment.dueDate);
  const label = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
  if (payment.overdue) return `Vencio el ${label}`;
  if (payment.daysUntilDue === 0) return 'Vence hoy';
  if (payment.daysUntilDue === 1) return 'Vence mañana';
  return `Vence el ${label}`;
}

export function PaymentReminders({ purchases, onPayInstallment }: PaymentRemindersProps) {
  const [payments, setPayments] = useState<UpcomingPayment[]>(() =>
    buildPaymentSchedule(purchases)
  );
  const [paying, setPaying] = useState<string | null>(null);
  const [paid, setPaid] = useState<string | null>(null);

  // Hidratar desde el backend (autoridad)
  useEffect(() => {
    fetchUpcomingPayments().then((data) => {
      if (data) setPayments(data);
    });
  }, []);

  // Re-derivar offline si cambian las compras locales
  useEffect(() => {
    setPayments(buildPaymentSchedule(purchases));
  }, [purchases]);

  const handlePay = useCallback(async (purchaseId: string) => {
    setPaying(purchaseId);
    try {
      await onPayInstallment(purchaseId);
      setPaid(purchaseId);
      // Tras confirmar, refrescar la lista desde el backend
      const data = await fetchUpcomingPayments();
      if (data) setPayments(data);
      setTimeout(() => setPaid(null), 2000);
    } finally {
      setPaying(null);
    }
  }, [onPayInstallment]);

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <p className="font-semibold text-gray-800">Sin pagos pendientes</p>
        <p className="text-xs text-gray-500">Cuando hagas una compra con Kueski Pay apareceran aqui tus proximos pagos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Proximos pagos</p>

      {payments.map((payment) => {
        const isUrgent = payment.overdue || payment.daysUntilDue <= 3;
        const isPaying = paying === payment.purchaseId;
        const isPaid = paid === payment.purchaseId;
        const siteName = SITE_DISPLAY_NAMES[payment.site] ?? payment.site;

        return (
          <motion.div
            key={`${payment.purchaseId}-${payment.installmentNumber}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-3 space-y-2 ${
              isUrgent ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200'
            }`}
          >
            {isPaid ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 py-1"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">Pago registrado</span>
              </motion.div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{siteName}</p>
                    <p className="text-xs text-gray-500">
                      Pago {payment.installmentNumber} de {payment.totalInstallments}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900">{formatMXN(payment.amount)}</p>
                    <div className={`flex items-center gap-1 justify-end text-[10px] font-semibold ${
                      isUrgent ? 'text-amber-600' : 'text-gray-500'
                    }`}>
                      {isUrgent
                        ? <AlertTriangle className="w-3 h-3" />
                        : <Calendar className="w-3 h-3" />
                      }
                      <span>{dueDateLabel(payment)}</span>
                    </div>
                  </div>
                </div>

                {payment.remaining > 1 && (
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {payment.remaining - 1} {payment.remaining - 1 === 1 ? 'pago restante' : 'pagos restantes'} despues de este
                  </p>
                )}

                <button
                  onClick={() => handlePay(payment.purchaseId)}
                  disabled={isPaying}
                  className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isUrgent
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-[#173CEC] hover:bg-[#1230CC] text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isPaying ? 'Procesando...' : `Pagar ${formatMXN(payment.amount)}`}
                </button>
              </>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
