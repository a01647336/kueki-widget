export type LevelName = 'Bronce' | 'Plata' | 'Oro' | 'Platino';

export interface User {
  name: string;
  email: string;
  level: LevelName;
  creditLimit: number;
  availableCredit: number;
  cashbackRate: number;
  nextPayment: { date: string; amount: number };
  score: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface Achievement {
  id: string;
  title: string;
  completed: boolean;
  points: number;
}

export interface ScoreState {
  points: number;
  level: LevelName;
  achievements: Achievement[];
}

export interface Purchase {
  id: string;
  site: string;
  amount: number;
  plan: number;
  paymentPerPeriod: number;
  date: string;
  cashback: number;
  status: 'activo' | 'pagado' | 'vencido';
  dealId?: string | number | null;
  installmentsPaid?: number;
}

export interface UpcomingPayment {
  purchaseId: string;
  site: string;
  amount: number;
  dueDate: string;
  installmentNumber: number;
  totalInstallments: number;
  remaining: number;
  overdue: boolean;
  daysUntilDue: number;
}

export interface UserPreferences {
  disabledSites: string[];
}

/** Datos del carrito detectados desde el DOM del sitio host */
export interface CartData {
  total: number;
  items: CartItem[];
}
