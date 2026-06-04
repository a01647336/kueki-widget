import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, X } from 'lucide-react';
import type { CartItem } from '../types';
import { formatMXN } from '../utils/payments';

interface CartPopupProps {
  isOpen: boolean;
  cartItems: CartItem[];
  cartTotal: number;
  isLoggedIn: boolean;
  onClose: () => void;
  onLoginClick: () => void;
  onPayWithKueski: () => void;
}

export function CartPopup({
  isOpen,
  cartItems,
  cartTotal,
  isLoggedIn,
  onClose,
  onLoginClick,
  onPayWithKueski,
}: CartPopupProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4 z-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-100 rounded-full p-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900">Tu carrito</h3>
              </div>
              <button onClick={onClose} className="hover:bg-gray-100 rounded-full p-1.5 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Resumen del carrito — deduplicar ítems detectados en múltiples nodos del DOM */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
              {cartItems.length === 0 ? (
                <p className="text-sm text-gray-500 text-center">El carrito está vacío</p>
              ) : (
                cartItems
                  .reduce<typeof cartItems>((acc, item) => {
                    const found = acc.find(i => i.name === item.name && i.price === item.price);
                    if (found) found.qty += item.qty;
                    else acc.push({ ...item });
                    return acc;
                  }, [])
                  .map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate flex-1 mr-2">{item.name}</span>
                    <span className="text-gray-500 mr-2">x{item.qty}</span>
                    <span className="font-semibold text-gray-900 whitespace-nowrap">
                      {formatMXN(item.price * item.qty)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between font-bold text-base">
              <span className="text-gray-700">Total</span>
              <span className="text-gray-900">{formatMXN(cartTotal)}</span>
            </div>

            {/* CTA según estado de sesión */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div>
                <p className="font-bold text-gray-900 text-sm">💳 Paga con Kueski Pay</p>
                <p className="text-xs text-gray-600 mt-1">
                  {isLoggedIn
                    ? 'Divide tu compra en quincenas sin intereses y gana cashback.'
                    : 'Inicia sesión para dividir tu compra en quincenas sin intereses.'}
                </p>
              </div>

              {isLoggedIn ? (
                <button
                  onClick={onPayWithKueski}
                  className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Simular pago ({formatMXN(cartTotal)})
                </button>
              ) : (
                <button
                  onClick={onLoginClick}
                  className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Iniciar sesión para usar Kueski Pay
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
