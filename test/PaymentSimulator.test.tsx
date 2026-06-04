import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentSimulator } from '../src/components/PaymentSimulator';

const DEFAULT_PROPS = {
  cartTotal: 2000,
  currentSite: 'amazon',
  userLevel: 'Bronce' as const,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

describe('PaymentSimulator', () => {
  it('muestra el total del carrito formateado', () => {
    render(<PaymentSimulator {...DEFAULT_PROPS} />);
    // El total aparece en el header y en la sección de info — getAllByText acepta múltiples
    const matches = screen.getAllByText(/2,000/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('muestra el nombre del sitio actual', () => {
    render(<PaymentSimulator {...DEFAULT_PROPS} />);
    expect(screen.getByText(/Amazon/i)).toBeInTheDocument();
  });

  it('muestra opciones de 2 y 4 quincenas para nivel Bronce', () => {
    render(<PaymentSimulator {...DEFAULT_PROPS} />);
    expect(screen.getByText(/2 quincenas/i)).toBeInTheDocument();
    expect(screen.getByText(/4 quincenas/i)).toBeInTheDocument();
  });

  it('no muestra 8 quincenas para nivel Bronce', () => {
    render(<PaymentSimulator {...DEFAULT_PROPS} />);
    expect(screen.queryByText(/8 quincenas/i)).not.toBeInTheDocument();
  });

  it('muestra opciones hasta 6 quincenas para nivel Plata', () => {
    render(<PaymentSimulator {...DEFAULT_PROPS} userLevel="Plata" />);
    expect(screen.getByText(/6 quincenas/i)).toBeInTheDocument();
  });

  it('muestra el cashback estimado según el nivel', () => {
    render(<PaymentSimulator {...DEFAULT_PROPS} />);
    expect(screen.getByText(/Cashback estimado/i)).toBeInTheDocument();
    expect(screen.getByText(/Bronce/i)).toBeInTheDocument();
  });

  it('muestra el pago por quincena correcto para $2000 en 2 quincenas', () => {
    render(<PaymentSimulator {...DEFAULT_PROPS} />);
    // $2000 / 2 = $1,000 por quincena
    expect(screen.getByText(/1,000\.00/)).toBeInTheDocument();
  });

  it('muestra "Sin intereses" en los planes base', () => {
    render(<PaymentSimulator {...DEFAULT_PROPS} />);
    const sinIntereses = screen.getAllByText(/Sin intereses/i);
    expect(sinIntereses.length).toBeGreaterThan(0);
  });

  it('llama a onClose al cancelar', () => {
    const onClose = vi.fn();
    render(<PaymentSimulator {...DEFAULT_PROPS} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('muestra pantalla de confirmacion al dar clic en Confirmar', async () => {
    render(<PaymentSimulator {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /Confirmar con Kueski Pay/i }));
    await waitFor(() => {
      expect(screen.getByText(/Confirmar compra/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Si, confirmar/i })).toBeInTheDocument();
    });
  });

  it('llama a onConfirm con los datos correctos al confirmar', async () => {
    const onConfirm = vi.fn();
    render(<PaymentSimulator {...DEFAULT_PROPS} onConfirm={onConfirm} />);
    // Paso 1: abrir confirmación
    fireEvent.click(screen.getByRole('button', { name: /Confirmar con Kueski Pay/i }));
    await waitFor(() => screen.getByRole('button', { name: /Si, confirmar/i }));
    // Paso 2: confirmar definitivamente
    fireEvent.click(screen.getByRole('button', { name: /Si, confirmar/i }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledOnce();
      const call = onConfirm.mock.calls[0][0];
      expect(call.amount).toBe(2000);
      expect(call.site).toBe('Amazon');
      expect(call.cashback).toBeDefined();
    }, { timeout: 2500 });
  });

  it('muestra pantalla de exito despues de confirmar', async () => {
    render(<PaymentSimulator {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /Confirmar con Kueski Pay/i }));
    await waitFor(() => screen.getByRole('button', { name: /Si, confirmar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Si, confirmar/i }));
    await waitFor(() => {
      expect(screen.getByText(/Compra confirmada/i)).toBeInTheDocument();
    }, { timeout: 2500 });
  });

  it('adapta el monto dinámicamente (cartTotal = 5000)', () => {
    render(<PaymentSimulator {...DEFAULT_PROPS} cartTotal={5000} />);
    // El total $5,000 aparece en el header y en info box
    const fiveThousandMatches = screen.getAllByText(/5,000/);
    expect(fiveThousandMatches.length).toBeGreaterThan(0);
    // 5000 / 2 = 2,500 por quincena
    const planMatches = screen.getAllByText(/2,500\.00/);
    expect(planMatches.length).toBeGreaterThan(0);
  });
});
