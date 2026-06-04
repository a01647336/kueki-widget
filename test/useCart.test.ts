import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCart } from '../src/hooks/useCart';

const PRODUCT = { id: 'p1', name: 'Laptop', price: 12999 };
const PRODUCT2 = { id: 'p2', name: 'Mouse', price: 299 };

describe('useCart', () => {
  it('inicia con carrito vacío y total 0', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it('addItem agrega un producto con qty 1', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.addItem(PRODUCT); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].qty).toBe(1);
  });

  it('addItem incrementa qty si el producto ya existe', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.addItem(PRODUCT); });
    act(() => { result.current.addItem(PRODUCT); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].qty).toBe(2);
  });

  it('calcula el total correctamente con múltiples productos', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.addItem(PRODUCT); });
    act(() => { result.current.addItem(PRODUCT2); });
    expect(result.current.total).toBe(12999 + 299);
  });

  it('calcula el total con cantidades múltiples', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.addItem(PRODUCT); });
    act(() => { result.current.addItem(PRODUCT); });
    expect(result.current.total).toBe(12999 * 2);
  });

  it('removeItem decrementa qty en 1', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.addItem(PRODUCT); });
    act(() => { result.current.addItem(PRODUCT); });
    act(() => { result.current.removeItem(PRODUCT.id); });
    expect(result.current.items[0].qty).toBe(1);
  });

  it('removeItem elimina el producto cuando qty llega a 0', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.addItem(PRODUCT); });
    act(() => { result.current.removeItem(PRODUCT.id); });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it('clearCart vacía el carrito completamente', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.addItem(PRODUCT); });
    act(() => { result.current.addItem(PRODUCT2); });
    act(() => { result.current.clearCart(); });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it('openCheckout y closeCheckout cambian isCheckingOut', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.isCheckingOut).toBe(false);
    act(() => { result.current.openCheckout(); });
    expect(result.current.isCheckingOut).toBe(true);
    act(() => { result.current.closeCheckout(); });
    expect(result.current.isCheckingOut).toBe(false);
  });

  it('removeItem con id inexistente no modifica el carrito', () => {
    const { result } = renderHook(() => useCart());
    act(() => { result.current.addItem(PRODUCT); });
    act(() => { result.current.removeItem('no-existe'); });
    expect(result.current.items).toHaveLength(1);
  });
});
