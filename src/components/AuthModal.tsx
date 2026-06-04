import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { sendOtp, verifyOtp } from '../utils/api';

interface AuthModalProps {
  onSuccess: (email: string) => void;
  onClose?: () => void;
}

type Step = 'identify' | 'verify' | 'loading';

function isValidIdentifier(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\d{10}$/;
  return emailRegex.test(value.trim()) || phoneRegex.test(value.replace(/\s/g, ''));
}

export function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleIdentifierSubmit = useCallback(() => {
    if (!isValidIdentifier(identifier)) {
      setIdentifierError('Ingresa un email o teléfono de 10 dígitos válido');
      return;
    }
    setIdentifierError('');
    // Solicita el OTP al backend (silencioso: si no hay server, seguimos en modo demo).
    void sendOtp(identifier.trim());
    setStep('verify');
  }, [identifier]);

  const handleCodeChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleCodeKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code]
  );

  const handleCodeSubmit = useCallback(() => {
    if (code.filter(Boolean).length < 6) return;
    setStep('loading');
    const id = identifier.trim();
    // Verifica el código en el backend. El efecto guarda el JWT para autenticar
    // las llamadas siguientes. Si el server no responde, `verifyOtp` devuelve
    // null y continuamos en modo demo con localStorage.
    verifyOtp(id, code.join('')).finally(() => onSuccess(id));
  }, [code, identifier, onSuccess]);

  const handleCodePaste = useCallback((e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  }, []);

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {step === 'identify' && (
          <motion.div
            key="identify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900">Inicia sesión en Kueski</h3>
              <p className="text-xs text-gray-500 mt-1">Ingresa tu email o número de teléfono</p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setIdentifierError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleIdentifierSubmit()}
                placeholder="ejemplo@correo.com o 5512345678"
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow ${
                  identifierError ? 'border-red-400' : 'border-gray-200'
                }`}
                autoFocus
              />
              {identifierError && (
                <p className="text-xs text-red-500">{identifierError}</p>
              )}
            </div>

            <button
              onClick={handleIdentifierSubmit}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm"
            >
              Continuar
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors py-1"
              >
                Cancelar
              </button>
            )}
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center">
              <button
                onClick={() => setStep('identify')}
                className="flex items-center gap-1 text-gray-500 text-xs hover:text-gray-700 mb-3 mx-auto"
              >
                <ArrowLeft className="w-3 h-3" />
                Cambiar identificador
              </button>
              <h3 className="font-bold text-gray-900">Verifica tu identidad</h3>
              <p className="text-xs text-gray-500 mt-1">
                Enviamos un código a <span className="font-semibold text-gray-700">{identifier}</span>
              </p>
            </div>

            <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  className="w-10 h-12 text-center text-lg font-bold border-2 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all border-gray-200"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <button
              onClick={handleCodeSubmit}
              disabled={code.filter(Boolean).length < 6}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Verificar código
            </button>

            <p className="text-center text-xs text-gray-500">
              ¿No recibiste el código?{' '}
              <button className="text-emerald-600 font-semibold hover:underline">
                Reenviar
              </button>
            </p>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-8 gap-4"
          >
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-sm font-semibold text-gray-700">Verificando tu identidad...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
