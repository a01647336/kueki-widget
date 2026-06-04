import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Loader2, ShieldCheck, User, Lock, ExternalLink } from 'lucide-react';
import { login, type ApiUser } from '../utils/api';

interface AuthModalProps {
  onSuccess: (user: ApiUser) => void;
  onClose?: () => void;
}

const KUESKI_SIGNUP_URL = 'https://www.kueski.com';

export function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!username.trim() || !password) {
      setError('Ingresa tu usuario y contraseña');
      return;
    }
    setError('');
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);

    if (result.ok && result.user) {
      onSuccess(result.user);
    } else if (result.invalidCredentials) {
      setError('Usuario o contraseña incorrectos');
    } else {
      setError('No se pudo conectar con el servidor. Intenta de nuevo.');
    }
  }, [username, password, onSuccess]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <h3 className="font-bold text-gray-900">Inicia sesión en Kueski</h3>
        <p className="text-xs text-gray-500 mt-1">Accede con tu usuario y contraseña</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
          <User className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Usuario"
            autoComplete="username"
            className="w-full py-3 text-sm outline-none bg-transparent"
            autoFocus
          />
        </div>
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
          <Lock className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Contraseña"
            autoComplete="current-password"
            className="w-full py-3 text-sm outline-none bg-transparent"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</> : 'Iniciar sesión'}
      </button>

      <div className="text-center">
        <a
          href={KUESKI_SIGNUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:underline"
        >
          ¿No tienes cuenta? Regístrate en Kueski
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors py-1"
        >
          Cancelar
        </button>
      )}
    </motion.div>
  );
}
