import { motion } from 'motion/react';
import { CreditCard, Trophy, BadgeDollarSign, Tag, Bell } from 'lucide-react';

interface KueskiBenefitsProps {
  onLoginClick: () => void;
}

const BENEFITS = [
  {
    icon: CreditCard,
    title: 'Paga en quincenas',
    description: 'Divide tu compra en 2, 4, 6 o hasta 12 pagos sin intereses según tu nivel.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Trophy,
    title: 'Gana puntos',
    description: 'Sube de Bronce a Platino y desbloquea más crédito, cashback y beneficios.',
    color: 'bg-teal-100 text-teal-600',
  },
  {
    icon: BadgeDollarSign,
    title: 'Cashback real',
    description: 'Hasta 5% de reembolso en tiendas seleccionadas según tu nivel de Score Coach.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Tag,
    title: 'Ofertas personalizadas',
    description: 'El Deals Finder detecta promos activas en la tienda donde estás navegando.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Bell,
    title: 'Recordatorios inteligentes',
    description: 'Te avisamos cuando Kueski Pay está disponible en el sitio que visitas.',
    color: 'bg-blue-100 text-blue-600',
  },
] as const;

export function KueskiBenefits({ onLoginClick }: KueskiBenefitsProps) {
  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h3 className="font-bold text-gray-900 text-base">Bienvenido a Kueski Smart Widget</h3>
        <p className="text-xs text-gray-500 mt-1">Compra ahora, paga después — con ventajas reales</p>
      </motion.div>

      <div className="space-y-2">
        {BENEFITS.map((benefit, index) => (
          <motion.div
            key={benefit.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.07 }}
            className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl p-3"
          >
            <div className={`${benefit.color} rounded-lg p-2 shrink-0`}>
              <benefit.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{benefit.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{benefit.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onLoginClick}
        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm shadow-sm"
      >
        Iniciar sesión / Crear cuenta
      </motion.button>

      <p className="text-center text-[10px] text-gray-400">
        Al ingresar aceptas los términos y condiciones de Kueski Pay.
      </p>
    </div>
  );
}
