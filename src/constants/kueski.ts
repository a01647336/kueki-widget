import type { LevelName } from '../types';

export const LEVEL_THRESHOLDS: Record<LevelName, number> = {
  Bronce: 0,
  Plata: 500,
  Oro: 1500,
  Platino: 4000,
};

export const LEVEL_CASHBACK_RATES: Record<LevelName, number> = {
  Bronce: 0.005,
  Plata: 0.015,
  Oro: 0.025,
  Platino: 0.05,
};

export const LEVEL_CREDIT_LIMITS: Record<LevelName, { min: number; max: number }> = {
  Bronce:  { min: 500,   max: 2500  },
  Plata:   { min: 2501,  max: 8000  },
  Oro:     { min: 8001,  max: 15000 },
  Platino: { min: 15001, max: 25000 },
};

export const LEVEL_MAX_INSTALLMENTS: Record<LevelName, number> = {
  Bronce:  4,
  Plata:   6,
  Oro:     8,
  Platino: 12,
};

export const LEVEL_COLORS: Record<LevelName, string> = {
  Bronce:  'bg-orange-500',
  Plata:   'bg-gray-400',
  Oro:     'bg-yellow-500',
  Platino: 'bg-purple-500',
};

export const LEVEL_ORDER: LevelName[] = ['Bronce', 'Plata', 'Oro', 'Platino'];

export const POINTS = {
  WELCOME:             200,
  PURCHASE:             50,
  ON_TIME_PAYMENT:      25,
  PURCHASE_COMPLETE:   100,
  THIRTY_DAY_STREAK:   150,
  REFERRAL:            300,
} as const;

export const COMPATIBLE_SITES = [
  'amazon',
  'mercadolibre',
  'liverpool',
  'coppel',
  'elektra',
] as const;

export type CompatibleSite = typeof COMPATIBLE_SITES[number];

export const SITE_DISPLAY_NAMES: Record<string, string> = {
  amazon:       'Amazon',
  mercadolibre: 'Mercado Libre',
  liverpool:    'Liverpool',
  coppel:       'Coppel',
  elektra:      'Elektra',
};
