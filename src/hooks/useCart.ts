import { useState, useCallback } from 'react';
import type { CartItem } from '../types';

export interface CartState {
  items: CartItem[];
  total: number;
  isCheckingOut: boolean;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const addItem = useCallback((item: Omit<CartItem, 'qty'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (!existing) return prev;
      if (existing.qty === 1) return prev.filter((i) => i.id !== id);
      return prev.map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i));
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const openCheckout = useCallback(() => setIsCheckingOut(true), []);
  const closeCheckout = useCallback(() => setIsCheckingOut(false), []);

  return {
    items,
    total,
    isCheckingOut,
    addItem,
    removeItem,
    clearCart,
    openCheckout,
    closeCheckout,
  };
}
