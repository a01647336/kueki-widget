import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthModal } from '../src/components/AuthModal';
import * as api from '../src/utils/api';

const fakeUser: api.ApiUser = {
  id: 'u_ana', name: 'Ana Torres', username: 'ana', email: 'ana', level: 'Plata',
  creditLimit: 8000, availableCredit: 6000, cashbackRate: 0.015, score: 800,
  nextPayment: { date: '2026-06-01', amount: 649.5 },
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('AuthModal — login usuario/contraseña', () => {
  it('muestra los campos de usuario y contraseña', () => {
    render(<AuthModal onSuccess={() => {}} />);
    expect(screen.getByPlaceholderText(/usuario/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/contraseña/i)).toBeInTheDocument();
  });

  it('muestra el botón "Iniciar sesión"', () => {
    render(<AuthModal onSuccess={() => {}} />);
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
  });

  it('muestra el enlace de registro a Kueski', () => {
    render(<AuthModal onSuccess={() => {}} />);
    const link = screen.getByRole('link', { name: /Regístrate en Kueski/i });
    expect(link).toHaveAttribute('href', 'https://www.kueski.com');
  });

  it('valida campos vacíos', async () => {
    render(<AuthModal onSuccess={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
    expect(await screen.findByText(/Ingresa tu usuario y contraseña/i)).toBeInTheDocument();
  });

  it('llama a onSuccess con el perfil cuando el login es correcto', async () => {
    vi.spyOn(api, 'login').mockResolvedValue({ ok: true, user: fakeUser, invalidCredentials: false });
    const onSuccess = vi.fn();
    render(<AuthModal onSuccess={onSuccess} />);
    await userEvent.type(screen.getByPlaceholderText(/usuario/i), 'ana');
    await userEvent.type(screen.getByPlaceholderText(/contraseña/i), 'kueski123');
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(fakeUser));
  });

  it('muestra error con credenciales inválidas', async () => {
    vi.spyOn(api, 'login').mockResolvedValue({ ok: false, user: null, invalidCredentials: true });
    render(<AuthModal onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/usuario/i), 'ana');
    await userEvent.type(screen.getByPlaceholderText(/contraseña/i), 'mala');
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
    expect(await screen.findByText(/usuario o contraseña incorrectos/i)).toBeInTheDocument();
  });

  it('muestra error de conexión si el servidor no responde', async () => {
    vi.spyOn(api, 'login').mockResolvedValue({ ok: false, user: null, invalidCredentials: false });
    render(<AuthModal onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/usuario/i), 'ana');
    await userEvent.type(screen.getByPlaceholderText(/contraseña/i), 'kueski123');
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
    expect(await screen.findByText(/no se pudo conectar/i)).toBeInTheDocument();
  });

  it('llama a onClose al cancelar', () => {
    const onClose = vi.fn();
    render(<AuthModal onSuccess={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
