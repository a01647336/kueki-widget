import { useState, useCallback, useEffect } from 'react';
import { KueskiWidget } from './components/KueskiWidget';
import { CartPopup } from './components/CartPopup';
import { useAuth } from './hooks/useAuth';
import { useScore } from './hooks/useScore';
import { storage } from './utils/storage';
import { savePurchase, fetchScore, fetchPurchases, payInstallment, fetchUser, type ApiUser } from './utils/api';
import { POINTS } from './constants/kueski';
import { getNextPayment } from './utils/payments';
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
        installmentsPaid: 0,
      };
      const updated = [newPurchase, ...purchases];
      setPurchases(updated);
      storage.setHistory(updated);
      score.addPoints(POINTS.PURCHASE);

      // Actualización optimista de crédito y próximo pago sin esperar al backend
      if (auth.user) {
        const newCredit = Math.max(0, auth.user.availableCredit - purchase.amount);
        const nextPayment = getNextPayment(updated);
        auth.updateUser({
          availableCredit: newCredit,
          ...(nextPayment ? { nextPayment } : {}),
        });
      }

      savePurchase(newPurchase).then(() => {
        // Refrescar datos reales del backend tras guardar
        return fetchUser();
      }).then((apiUser) => {
        if (apiUser) auth.updateUser({
          availableCredit: apiUser.availableCredit,
          nextPayment: apiUser.nextPayment,
        });
        return fetchPurchases();
      }).then((p) => {
        if (p) { setPurchases(p); storage.setHistory(p); }
      }).catch(() => {/* fallback silencioso */});

      setCheckoutOpen(false);
      setWidgetSimulatorOpen(false);
    },
    [purchases, score, auth]
  );

  const handlePayInstallment = useCallback(async (purchaseId: string) => {
    // Actualización optimista local
    const updatedLocal = purchases.map((p) =>
      p.id === purchaseId
        ? { ...p, installmentsPaid: (p.installmentsPaid ?? 0) + 1,
            status: ((p.installmentsPaid ?? 0) + 1 >= p.plan ? 'pagado' : 'activo') as Purchase['status'] }
        : p
    );
    setPurchases(updatedLocal);
    storage.setHistory(updatedLocal);
    if (auth.user) {
      const paid = purchases.find((p) => p.id === purchaseId);
      if (paid) {
        const newCredit = Math.min(auth.user.creditLimit, auth.user.availableCredit + paid.paymentPerPeriod);
        const nextPayment = getNextPayment(updatedLocal);
        auth.updateUser({ availableCredit: newCredit, ...(nextPayment ? { nextPayment } : {}) });
      }
    }

    // Primer pago completa el logro on-time-payment (idempotente)
    const wasPaid = purchases.find((p) => p.id === purchaseId);
    if (wasPaid && (wasPaid.installmentsPaid ?? 0) === 0) {
      score.completeAchievement('on-time-payment');
    }

    // Sincronizar con el backend (autoridad)
    const result = await payInstallment(purchaseId);
    if (result) {
      if (typeof result.availableCredit === 'number') {
        const nextPayment = result.nextPayment ?? getNextPayment(updatedLocal);
        auth.updateUser({ availableCredit: result.availableCredit, ...(nextPayment ? { nextPayment } : {}) });
      }
      // Refrescar historial completo
      const fresh = await fetchPurchases();
      if (fresh) { setPurchases(fresh); storage.setHistory(fresh); }
    }
  }, [purchases, auth, score]);

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
        onPayInstallment={handlePayInstallment}
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
