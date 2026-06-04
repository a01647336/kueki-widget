import { motion } from 'motion/react';
import { ShoppingBag, CheckCircle, Clock } from 'lucide-react';
import type { Purchase } from '../types';
import { formatMXN } from '../utils/payments';

interface PurchaseHistoryProps {
  purchases: Purchase[];
}

export function PurchaseHistory({ purchases }: PurchaseHistoryProps) {
  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
          <ShoppingBag className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-600">Sin compras aún</p>
        <p className="text-xs text-gray-400">
          Usa Kueski Pay en una tienda compatible para ver tu historial aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-800">Historial de compras</h4>
      {purchases.map((purchase, index) => (
        <motion.div
          key={purchase.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white border border-gray-200 rounded-xl p-3 space-y-2"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{purchase.site}</p>
              <p className="text-xs text-gray-500">
                {new Date(purchase.date).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {purchase.status === 'activo' ? (
                <Clock className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              )}
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  purchase.status === 'activo'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {purchase.status === 'activo' ? 'En curso' : 'Pagado'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-gray-600">{formatMXN(purchase.amount)} en {purchase.plan} quincenas</span>
            <span className="text-gray-700 font-semibold">{formatMXN(purchase.paymentPerPeriod)}/qna</span>
          </div>

          {purchase.cashback > 0 && (
            <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Cashback ganado: {formatMXN(purchase.cashback)}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
