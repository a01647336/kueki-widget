import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minimize2, CreditCard, Trophy, Tag, ShoppingCart } from 'lucide-react';
import { SmartReminder } from './SmartReminder';
import { ScoreCoach } from './ScoreCoach';
import { DealsFinder } from './DealsFinder';
import { KueskiBenefits } from './KueskiBenefits';
import { AuthModal } from './AuthModal';
import { UserProfile } from './UserProfile';
import { KueskiPayLogo } from './KueskiPayLogo';
import type { User, Purchase, CartItem } from '../types';
import type { ApiUser } from '../utils/api';
import type { useScore } from '../hooks/useScore';
import { storage } from '../utils/storage';
import { formatMXN } from '../utils/payments';

type TabType = 'reminder' | 'score' | 'deals';

interface KueskiWidgetProps {
  currentSite: string;
  isLoggedIn: boolean;
  user: User | null;
  cartTotal: number;
  cartItems: CartItem[];
  purchases: Purchase[];
  score: ReturnType<typeof useScore>;
  showAuthModal: boolean;
  forceShowSimulator: boolean;
  onLoginClick: () => void;
  onAuthSuccess: (user: ApiUser) => void;
  onAuthClose: () => void;
  onLogout: () => void;
  onConfirmPurchase: (purchase: Omit<Purchase, 'id' | 'date' | 'status'>) => void;
  onSimulatorClose: () => void;
  onOpenCheckout: () => void;
}

const TABS: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'reminder', label: 'Smart', icon: CreditCard },
  { id: 'score',    label: 'Score', icon: Trophy     },
  { id: 'deals',    label: 'Deals', icon: Tag        },
];

export function KueskiWidget({
  currentSite,
  isLoggedIn,
  user,
  cartTotal,
  cartItems,
  purchases,
  score,
  showAuthModal,
  forceShowSimulator,
  onLoginClick,
  onAuthSuccess,
  onAuthClose,
  onLogout,
  onConfirmPurchase,
  onSimulatorClose,
  onOpenCheckout,
}: KueskiWidgetProps) {
  const [isOpen, setIsOpen]           = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab]     = useState<TabType>('reminder');
  const [showSimulator, setShowSimulator] = useState(false);
  const [disabledSites, setDisabledSites] = useState<string[]>(
    () => storage.getPrefs().disabledSites
  );

  const siteEnabled = !disabledSites.includes(currentSite);

  // Sync external simulator trigger from CartPopup
  useEffect(() => {
    if (forceShowSimulator && isLoggedIn) {
      setActiveTab('reminder');
      setShowSimulator(true);
      if (isMinimized) setIsMinimized(false);
    }
  }, [forceShowSimulator, isLoggedIn, isMinimized]);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setShowSimulator(false);
    onSimulatorClose();
  }, [onSimulatorClose]);

  const handleToggleSite = useCallback(() => {
    setDisabledSites((prev) => {
      const next = prev.includes(currentSite)
        ? prev.filter((s) => s !== currentSite)
        : [...prev, currentSite];
      storage.setPrefs({ disabledSites: next });
      return next;
    });
  }, [currentSite]);

  const handleCloseSimulator = useCallback(() => {
    setShowSimulator(false);
    onSimulatorClose();
  }, [onSimulatorClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-6 right-6 z-50"
      >
        {isMinimized ? (
          <motion.button
            onClick={() => setIsMinimized(false)}
            className="relative bg-[#173CEC] text-white rounded-2xl px-3 py-2.5 shadow-2xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <KueskiPayLogo size="sm" variant="white" />
            {/* Badge de carrito */}
            {cartTotal > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-blue-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                $
              </span>
            )}
          </motion.button>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl w-96 overflow-hidden border border-blue-200"
            style={{ boxShadow: '0 8px 40px rgba(23,60,236,0.20), 0 2px 8px rgba(0,0,0,0.08)' }}
          >
            {/* Header */}
            <div className="bg-[#173CEC] text-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col gap-0.5">
                  <KueskiPayLogo size="md" variant="white" />
                  {isLoggedIn && user && (
                    <p className="text-white/80 text-xs mt-0.5">{user.name} · Nivel {user.level}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Botón "Ver carrito" — aparece cuando hay precio detectado */}
              {cartTotal > 0 && isLoggedIn && !showSimulator && (
                <motion.button
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={onOpenCheckout}
                  className="w-full mb-2 flex items-center justify-between bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span>Ver carrito</span>
                  </div>
                  <span className="font-bold">{formatMXN(cartTotal)}</span>
                </motion.button>
              )}

              {/* Botón "Ver carrito" para usuarios no logueados */}
              {cartTotal > 0 && !isLoggedIn && (
                <motion.button
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={onLoginClick}
                  className="w-full mb-2 flex items-center justify-between bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span>Pagar con Kueski</span>
                  </div>
                  <span className="font-bold">{formatMXN(cartTotal)}</span>
                </motion.button>
              )}

              {isLoggedIn && (
                <div className="flex gap-1 bg-white/10 rounded-lg p-1">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-sm transition-all ${
                        activeTab === tab.id
                          ? 'bg-white text-[#173CEC] font-semibold'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="text-xs">{tab.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4 bg-gray-50 max-h-[500px] overflow-y-auto">
              <AnimatePresence mode="wait">
                {!isLoggedIn && !showAuthModal && (
                  <motion.div
                    key="benefits"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <KueskiBenefits onLoginClick={onLoginClick} />
                  </motion.div>
                )}

                {!isLoggedIn && showAuthModal && (
                  <motion.div
                    key="auth"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <AuthModal onSuccess={onAuthSuccess} onClose={onAuthClose} />
                  </motion.div>
                )}

                {isLoggedIn && user && activeTab === 'reminder' && (
                  <motion.div
                    key="reminder"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <SmartReminder
                      currentSite={currentSite}
                      isLoggedIn={isLoggedIn}
                      cartTotal={cartTotal}
                      userLevel={score.level}
                      showSimulator={showSimulator}
                      onOpenSimulator={() => setShowSimulator(true)}
                      onCloseSimulator={handleCloseSimulator}
                      onConfirmPurchase={onConfirmPurchase}
                      onLoginClick={onLoginClick}
                    />
                  </motion.div>
                )}

                {isLoggedIn && user && activeTab === 'score' && (
                  <motion.div
                    key="score"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <ScoreCoach score={score} />
                    <UserProfile
                      user={user}
                      currentSite={currentSite}
                      purchases={purchases}
                      siteEnabled={siteEnabled}
                      onToggleSite={handleToggleSite}
                      onLogout={onLogout}
                    />
                  </motion.div>
                )}

                {isLoggedIn && user && activeTab === 'deals' && (
                  <motion.div
                    key="deals"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <DealsFinder currentSite={currentSite} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
