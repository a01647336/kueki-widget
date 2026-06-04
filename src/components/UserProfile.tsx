import { useState } from 'react';
import { motion } from 'motion/react';
import { LogOut, History, ChevronDown, ChevronUp } from 'lucide-react';
import type { User, Purchase } from '../types';
import { LEVEL_COLORS } from '../constants/kueski';
import { formatMXN } from '../utils/payments';
import { PurchaseHistory } from './PurchaseHistory';

interface UserProfileProps {
  user: User;
  currentSite: string;
  purchases: Purchase[];
  onLogout: () => void;
}

export function UserProfile({
  user,
  currentSite,
  purchases,
  onLogout,
}: UserProfileProps) {
  const [showHistory, setShowHistory] = useState(false);
  const levelGradient = LEVEL_COLORS[user.level];

  return (
    <div className="space-y-3">
      {/* Header del perfil */}
      <div className={`${levelGradient} text-white rounded-xl p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-base leading-tight">{user.name}</p>
              <p className="text-white/80 text-xs">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="hover:bg-white/20 rounded-lg p-1.5 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold bg-white/20 rounded-lg px-2 py-1 w-fit">
          Nivel {user.level}
        </div>
      </div>

      {/* Datos de cuenta */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 mb-1">Crédito disponible</p>
          <p className="font-bold text-gray-900 text-base">{formatMXN(user.availableCredit)}</p>
          <p className="text-[10px] text-gray-400">de {formatMXN(user.creditLimit)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 mb-1">Próximo pago</p>
          <p className="font-bold text-gray-900 text-base">{formatMXN(user.nextPayment.amount)}</p>
          <p className="text-[10px] text-gray-400">
            {new Date(user.nextPayment.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700 font-semibold">
        Tu cashback: {(user.cashbackRate * 100).toFixed(1)}% en tiendas compatibles
      </div>

      {/* Historial */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-800">Historial de compras</span>
            {purchases.length > 0 && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                {purchases.length}
              </span>
            )}
          </div>
          {showHistory ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 p-3"
          >
            <PurchaseHistory purchases={purchases} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
