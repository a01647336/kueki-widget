import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthModal } from '../src/components/AuthModal';

describe('AuthModal — Paso 1: Identificación', () => {
  it('muestra el input de email/teléfono al renderizar', () => {
    render(<AuthModal onSuccess={() => {}} />);
    expect(screen.getByPlaceholderText(/correo/i)).toBeInTheDocument();
  });

  it('muestra el botón "Continuar"', () => {
    render(<AuthModal onSuccess={() => {}} />);
    expect(screen.getByRole('button', { name: /Continuar/i })).toBeInTheDocument();
  });

  it('muestra error si el email es inválido', async () => {
    render(<AuthModal onSuccess={() => {}} />);
    const input = screen.getByPlaceholderText(/correo/i);
    await userEvent.type(input, 'noesun@email');
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    expect(await screen.findByText(/email o teléfono/i)).toBeInTheDocument();
  });

  it('avanza al paso 2 con email válido', async () => {
    render(<AuthModal onSuccess={() => {}} />);
    const input = screen.getByPlaceholderText(/correo/i);
    await userEvent.type(input, 'carlos@ejemplo.com');
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    await waitFor(() => {
      expect(screen.getByText(/Verifica tu identidad/i)).toBeInTheDocument();
    });
  });

  it('avanza al paso 2 con teléfono de 10 dígitos', async () => {
    render(<AuthModal onSuccess={() => {}} />);
    const input = screen.getByPlaceholderText(/correo/i);
    await userEvent.type(input, '5512345678');
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    await waitFor(() => {
      expect(screen.getByText(/Verifica tu identidad/i)).toBeInTheDocument();
    });
  });

  it('llama a onClose al cancelar', () => {
    const onClose = vi.fn();
    render(<AuthModal onSuccess={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('AuthModal — Paso 2: Verificación', () => {
  async function goToStep2() {
    render(<AuthModal onSuccess={vi.fn()} />);
    const input = screen.getByPlaceholderText(/correo/i);
    await userEvent.type(input, 'carlos@ejemplo.com');
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    await waitFor(() => screen.getByText(/Verifica tu identidad/i));
  }

  it('muestra 6 inputs numéricos', async () => {
    await goToStep2();
    const codeInputs = screen.getAllByRole('textbox');
    expect(codeInputs.length).toBeGreaterThanOrEqual(6);
  });

  it('el botón "Verificar código" está desactivado si los 6 dígitos no están completos', async () => {
    await goToStep2();
    const verifyBtn = screen.getByRole('button', { name: /Verificar/i });
    expect(verifyBtn).toBeDisabled();
  });

  it('el botón "Verificar" se activa al llenar los 6 dígitos', async () => {
    await goToStep2();
    const firstInput = document.querySelector<HTMLInputElement>('input[inputmode="numeric"]')!;
    fireEvent.paste(firstInput, { clipboardData: { getData: () => '123456' } });
    await waitFor(() => {
      const verifyBtn = screen.getByRole('button', { name: /Verificar/i });
      expect(verifyBtn).not.toBeDisabled();
    });
  });

  it('muestra el email enviado en el mensaje de verificación', async () => {
    await goToStep2();
    expect(screen.getByText(/carlos@ejemplo\.com/i)).toBeInTheDocument();
  });

  it('muestra el link "Reenviar"', async () => {
    await goToStep2();
    expect(screen.getByText(/Reenviar/i)).toBeInTheDocument();
  });

  it('permite volver al paso 1', async () => {
    await goToStep2();
    fireEvent.click(screen.getByText(/Cambiar identificador/i));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/correo/i)).toBeInTheDocument();
    });
  });

  it('llama a onSuccess con el email al completar el código', async () => {
    const onSuccess = vi.fn();
    render(<AuthModal onSuccess={onSuccess} />);
    const input = screen.getByPlaceholderText(/correo/i);
    await userEvent.type(input, 'test@ejemplo.com');
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    await waitFor(() => screen.getByText(/Verifica tu identidad/i));
    const firstInput = document.querySelector<HTMLInputElement>('input[inputmode="numeric"]')!;
    fireEvent.paste(firstInput, { clipboardData: { getData: () => '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verificar/i }));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('test@ejemplo.com');
    }, { timeout: 2000 });
  });
});
