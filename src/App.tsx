import { useState, useCallback, useEffect } from 'react';
import { KueskiWidget } from './components/KueskiWidget';
import { CartPopup } from './components/CartPopup';
import { useAuth } from './hooks/useAuth';
import { useScore } from './hooks/useScore';
import { storage } from './utils/storage';
import { savePurchase, fetchScore, fetchPurchases, type ApiUser } from './utils/api';
import { POINTS } from './constants/kueski';
import type { Purchase, CartItem } from './types';

interface AppProps {
  /** Identificador del sitio actual (p.ej. "amazon", "mercadolibre").
   *  En la extensión lo provee el content script via detección de hostname.
   *  En el modo dev (mockup) puede pasarse manualmente. */
  currentSite?: string;
  /** Total del carrito detectado por el PriceDetector del content script. */
  detectedCartTotal?: number;
  /** Ítems detectados desde el DOM del sitio. */
  detectedCartItems?: CartItem[];
  /** Callback para que el content script registre el setter de cartData. */
  onRegisterCartSetter?: (setter: (data: { total: number; items: CartItem[] }) => void) => void;
}

export default function App({
  currentSite = 'unknown',
  detectedCartTotal = 0,
  detectedCartItems = [],
  onRegisterCartSetter,
}: AppProps) {
  const [showAuthModal, setShowAuthModal]       = useState(false);
  const [widgetSimulatorOpen, setWidgetSimulatorOpen] = useState(false);
  const [purchases, setPurchases]               = useState<Purchase[]>(() => storage.getHistory());
  const [cartTotal, setCartTotal]               = useState(detectedCartTotal);
  const [cartItems, setCartItems]               = useState<CartItem[]>(detectedCartItems);
  const [checkoutOpen, setCheckoutOpen]         = useState(false);

  const auth  = useAuth();
  const score = useScore();

  // Sync precio detectado externamente cuando cambia via prop (para modo dev)
  useEffect(() => {
    setCartTotal(detectedCartTotal);
    setCartItems(detectedCartItems);
  }, [detectedCartTotal, detectedCartItems]);

  // Registrar el setter para que el PriceDetector del content script actualice el estado
  useEffect(() => {
    onRegisterCartSetter?.((data) => {
      setCartTotal(data.total);
      setCartItems(data.items);
    });
  // Solo en mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = useCallback((apiUser: ApiUser) => {
    auth.login(apiUser);
    setShowAuthModal(false);
    // Hidratar score e historial del usuario autenticado desde el backend,
    // de modo que cada usuario vea su propia información (no la hardcodeada).
    fetchScore().then((s) => { if (s) score.setFromServer(s); });
    fetchPurchases().then((p) => {
      if (p) {
        setPurchases(p);
        storage.setHistory(p);
      }
    });
  }, [auth, score]);

  const handleLogout = useCallback(() => {
    auth.logout();
    storage.clearHistory();
    setPurchases([]);
    setCartTotal(0);
    setCartItems([]);
    setCheckoutOpen(false);
    setWidgetSimulatorOpen(false);
  }, [auth]);

  const handleConfirmPurchase = useCallback(
    (purchase: Omit<Purchase, 'id' | 'date' | 'status'>) => {
      const newPurchase: Purchase = {
        ...purchase,
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        status: 'activo',
      };
      const updated = [newPurchase, ...purchases];
      setPurchases(updated);
      storage.setHistory(updated);
      score.addPoints(POINTS.PURCHASE);
      // Persistir en la base de datos (si el servidor está disponible)
      savePurchase(newPurchase).catch(() => {/* fallback silencioso */});
      setCheckoutOpen(false);
      setWidgetSimulatorOpen(false);
    },
    [purchases, score]
  );

  const handlePayWithKueski = useCallback(() => {
    setCheckoutOpen(false);
    setWidgetSimulatorOpen(true);
  }, []);

  return (
    <>
      <KueskiWidget
        currentSite={currentSite}
        isLoggedIn={auth.isLoggedIn}
        user={auth.user}
        cartTotal={cartTotal}
        cartItems={cartItems}
        purchases={purchases}
        score={score}
        showAuthModal={showAuthModal}
        forceShowSimulator={widgetSimulatorOpen}
        onLoginClick={() => setShowAuthModal(true)}
        onAuthSuccess={handleLogin}
        onAuthClose={() => setShowAuthModal(false)}
        onLogout={handleLogout}
        onConfirmPurchase={handleConfirmPurchase}
        onSimulatorClose={() => setWidgetSimulatorOpen(false)}
        onOpenCheckout={() => setCheckoutOpen(true)}
      />

      <CartPopup
        isOpen={checkoutOpen}
        cartItems={cartItems}
        cartTotal={cartTotal}
        isLoggedIn={auth.isLoggedIn}
        onClose={() => setCheckoutOpen(false)}
        onLoginClick={() => {
          setCheckoutOpen(false);
          setShowAuthModal(true);
        }}
        onPayWithKueski={handlePayWithKueski}
      />
    </>
  );
}
