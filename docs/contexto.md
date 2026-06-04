# Kueski Smart Widget — Contexto del sistema

## ¿Qué es?

Extensión de Chrome (construida con **Plasmo**) que se inyecta como **content script** en sitios de e-commerce reales y muestra un widget flotante con los servicios de Kueski Pay. Integra Kueski en la navegación cotidiana del usuario mediante intervenciones inteligentes y no intrusivas, con el objetivo de aumentar la recurrencia de uso más allá de situaciones de urgencia.

A diferencia de un mockup aislado, el widget **se inyecta en las páginas reales** (Amazon, Mercado Libre, Liverpool, Coppel, Elektra `.com.mx`), detecta los precios del DOM y se monta dentro de un **Shadow DOM** para no contaminar los estilos del sitio anfitrión.

---

## Arquitectura general

```
src/contents/kueski.tsx   → content script: detecta el sitio, monta el widget en Shadow DOM
   │
   ├── PriceDetector (utils/priceDetector.ts) → lee el total/ítems del carrito del DOM real
   ├── hydrateStorage()                       → carga chrome.storage.local antes de renderizar
   └── App.tsx                                → estado global y composición del widget
         ├── useAuth()   → isLoggedIn, user, login(), logout()
         ├── useScore()  → points, level, achievements, addPoints()
         ├── cart state  → total e ítems detectados por el PriceDetector
         └── purchases[] → historial persistido vía storage
```

**Modelo híbrido offline-first.** El cliente HTTP (`utils/api.ts`) sincroniza con el backend cuando está disponible (es la autoridad para auth, planes personalizados y persistencia en DB), y cae silenciosamente a `localStorage`/`chrome.storage` cuando no responde — cumpliendo el requisito de funcionar sin APIs externas.

---

## Módulos del sistema

### 1. Autenticación usuario/contraseña (multiusuario)

Login real contra el backend: `POST /api/auth/login` con `{ username, password }`. El servidor valida la contraseña con **bcrypt** y emite un **access token JWT** (`sub = userId`) + el perfil del usuario. El token se guarda (`kueski_token`) y se adjunta como `Authorization: Bearer` en cada llamada protegida.

**Multiusuario:** hay un set de cuentas predefinidas (sembradas en MongoDB), cada una con **su propio perfil, score, nivel, crédito, compras y cashback**. Al iniciar sesión, el widget **hidrata** el score y el historial de ese usuario desde el backend, de modo que cada quien ve su propia información (ya no hay un usuario hardcodeado).

Cuentas de demo (password `kueski123`): `carlos` (Bronce), `ana` (Plata), `diego` (Oro), `sofia` (Platino), `pedro` (Plata, con un pago vencido). Un enlace **"Regístrate en Kueski"** abre el sitio de Kueski.

La sesión se persiste en `kueski_auth`/`kueski_token`; al cerrar sesión se limpian auth, token, score e historial para no mezclar usuarios.

### 2. Carrito por detección de precios

`PriceDetector` observa el DOM del sitio anfitrión y extrae el total e ítems del carrito en tiempo real. El widget muestra el total detectado y habilita la simulación de pago.

### 3. Smart Reminder

Detecta el sitio actual y actúa según el estado (sin sesión → CTA de login; con sesión y carrito → botón "Simular pago $X"). En sitios no compatibles muestra un mensaje de espera no intrusivo.

### 4. Simulación de pagos (personalizada + elegibilidad)

Pide los planes al backend con `POST /api/purchases/calculate-plans`, que los calcula **según el nivel y el crédito disponible** del usuario y evalúa la **elegibilidad** (motor `evaluateEligibility`): rechaza por `MONTO_INVALIDO`, `MORA`, `LIMITE_COMPRAS_ACTIVAS` o `CREDITO_INSUFICIENTE`. Cuando no es aprobable, el simulador muestra el motivo y **deshabilita el botón de confirmar**. Sin backend, usa el motor local (`utils/payments.ts`) con las mismas reglas de planes. Al confirmar: +50 puntos y registro en el historial con cashback calculado.

### 5. Score Coach — gamificación

Sistema de puntos y niveles (ver tabla abajo). Los logros son interactivos: al completarlos se suman puntos y se sincroniza con el backend (`/user/score`, `/achievements/:id/complete`). Barra de progreso animada con Framer Motion. Persistencia en `kueski_score`.

### 6. Deals Finder

Carga las ofertas desde `GET /api/deals?site=` (con fallback a ofertas estáticas), resalta la del sitio actual y muestra una sección "Próximamente".

### 7. Perfil de usuario

Nombre, nivel, crédito disponible/límite, próximo pago, cashback, toggle para desactivar el widget por sitio, e historial de compras expandible.

### 8. KueskiBenefits (vista sin sesión)

Pantalla de bienvenida con los 5 beneficios antes de pedir login.

---

## Motor de score → nivel → beneficios

Fuente única de verdad: `src/constants/kueski.ts` (frontend) y `server/lib/rules.js` (backend), idénticos.

| Nivel | Puntos | Crédito (MXN) | Cashback | Quincenas |
|---|---|---|---|---|
| **Bronce** | 0 – 499 | $500 – $2,500 | 0.5% | 2, 4 |
| **Plata** | 500 – 1,499 | $2,501 – $8,000 | 1.5% | 2, 4, 6 |
| **Oro** | 1,500 – 3,999 | $8,001 – $15,000 | 2.5% | 2, 4, 6, 8 (8q +1.5%) |
| **Platino** | 4,000+ | $15,001 – $25,000 | 5% | 2, 4, 6, 8, 12 (>6q +1.5%) |

**Puntos por acción:** Bienvenida +200 · Compra +50 · Pago a tiempo +25 · Compra completada +100 · 30 días sin mora +150 · Referido +300.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Extensión | Plasmo 0.90 + React 18 + TypeScript |
| Estilos | Tailwind CSS |
| Animaciones | Framer Motion (`motion/react`) |
| Íconos | Lucide React |
| Persistencia local | `@plasmohq/storage` (chrome.storage.local) + localStorage |
| Backend | Express.js + **MongoDB** (Mongoose), desplegado en Render |
| Auth backend | usuario/contraseña (**bcrypt**) → JWT HS256 (`crypto` nativo) |
| Pruebas | Vitest + Testing Library + Supertest + mongodb-memory-server |

---

## Datos persistidos en el cliente

| Clave | Contenido |
|---|---|
| `kueski_auth` | `{ isLoggedIn, user }` |
| `kueski_token` | Access token JWT de la sesión |
| `kueski_score` | `{ points, level, achievements }` |
| `kueski_history` | Lista de compras confirmadas |
| `kueski_prefs` | `{ disabledSites }` |

---

## Estructura de archivos

```
src/
├── App.tsx                     — estado global y composición
├── contents/kueski.tsx         — content script (inyección + Shadow DOM)
├── components/                 — KueskiWidget, SmartReminder, PaymentSimulator,
│                                 ScoreCoach, DealsFinder, AuthModal, UserProfile,
│                                 CartPopup, KueskiBenefits, PurchaseHistory, ui/...
├── hooks/                      — useAuth, useScore, useCart
├── utils/                      — api.ts, storage.ts, payments.ts, priceDetector.ts
├── constants/kueski.ts         — reglas de negocio (espejo de server/lib/rules.js)
└── types/index.ts              — interfaces TypeScript

server/
├── server.js                   — API REST multiusuario
├── lib/db.js                   — conexión y modelos Mongoose (User/Purchase/Deal)
├── lib/seed.js                 — usuarios y deals de demo
├── lib/rules.js                — score/nivel/planes/cashback + elegibilidad
└── lib/jwt.js                  — firma/verificación JWT + authMiddleware
```

---

## Flujo de verificación end-to-end

1. `cd server && npm start` → backend en `:3001`.
2. `npm run build` → cargar `build/chrome-mv3-prod/` en `chrome://extensions`.
3. Navegar a un sitio compatible → aparece el widget → **KueskiBenefits**.
4. "Iniciar sesión" → email/teléfono → 6 dígitos → login (token JWT emitido).
5. Agregar productos → el `PriceDetector` actualiza el total → "Simular pago $X".
6. El simulador muestra planes **según el nivel** (subir score habilita 6/8/12 quincenas).
7. Confirmar → +50 pts, compra registrada en la DB, crédito disponible reducido.
8. Apagar el backend y repetir → el widget sigue funcionando con `localStorage`.
