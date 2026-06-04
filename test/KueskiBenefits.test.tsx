import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KueskiBenefits } from '../src/components/KueskiBenefits';

describe('KueskiBenefits', () => {
  it('muestra el título de bienvenida', () => {
    render(<KueskiBenefits onLoginClick={() => {}} />);
    expect(screen.getByText('Bienvenido a Kueski Smart Widget')).toBeInTheDocument();
  });

  it('muestra los 5 beneficios', () => {
    render(<KueskiBenefits onLoginClick={() => {}} />);
    expect(screen.getByText('Paga en quincenas')).toBeInTheDocument();
    expect(screen.getByText('Gana puntos')).toBeInTheDocument();
    expect(screen.getByText('Cashback real')).toBeInTheDocument();
    expect(screen.getByText('Ofertas personalizadas')).toBeInTheDocument();
    expect(screen.getByText('Recordatorios inteligentes')).toBeInTheDocument();
  });

  it('muestra el botón de iniciar sesión', () => {
    render(<KueskiBenefits onLoginClick={() => {}} />);
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
  });

  it('llama a onLoginClick al hacer clic en el botón', () => {
    const onLoginClick = vi.fn();
    render(<KueskiBenefits onLoginClick={onLoginClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
    expect(onLoginClick).toHaveBeenCalledOnce();
  });

  it('muestra el mensaje sobre cashback hasta 5%', () => {
    render(<KueskiBenefits onLoginClick={() => {}} />);
    expect(screen.getByText(/Hasta 5%/i)).toBeInTheDocument();
  });

  it('muestra el mensaje sobre quincenas', () => {
    render(<KueskiBenefits onLoginClick={() => {}} />);
    expect(screen.getByText(/12 pagos/i)).toBeInTheDocument();
  });
});
