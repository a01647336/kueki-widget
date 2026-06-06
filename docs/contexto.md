# Kueski Smart Widget — Contexto del sistema

## Que es

Extension de Chrome construida con **Plasmo** que se inyecta como content script en sitios de e-commerce reales y muestra un widget flotante con los servicios de Kueski Pay. El objetivo es aumentar la recurrencia de uso mas alla de situaciones de urgencia, integrando Kueski en la navegacion cotidiana del usuario.

A diferencia de un mockup, el widget **se inyecta en las paginas reales** (Amazon, Mercado Libre, Liverpool, Coppel y Elektra .com.mx), detecta los precios del DOM y se monta dentro de un **Shadow DOM** para no contaminar los estilos del sitio anfitrion.

---

## Arquitectura general

```
src/contents/kueski.tsx   → content script: detecta el sitio, monta el widget en Shadow DOM
   ├── PriceDetector (utils/priceDetector.ts)  → lee total/items del carrito del DOM real
   ├── hydrateStorage()                         → carga chrome.storage.local antes de React
   └── App.tsx                                  → estado global y composicion del widget
         ├── useAuth()    → isLoggedIn, user, login(), logout()
         ├── useScore()   → points, level, achievements, addPoints(), setFromServer()
         ├── cart state   → total e items detectados por PriceDetector
         └── purchases[]  → historial persistido via storage
```

**Modelo hibrido offline-first**: `api.ts` sincroniza con el backend cuando esta disponible (es la autoridad para auth, planes personalizados y persistencia en DB), y cae silenciosamente a `localStorage` cuando no responde.

---

## Modulos del sistema

### 1. Autenticacion usuario/contraseña (multiusuario)

Login real contra el backend: `POST /api/auth/login` con `{ username, password }`. El servidor valida con **bcrypt** y emite un **access token JWT** (sub = userId). El token se guarda en `kueski_token` y se adjunta como `Authorization: Bearer` en cada llamada protegida.

El sistema es **multiusuario**: hay 5 cuentas predefinidas en PostgreSQL, cada una con su propio perfil, score, nivel, credito, compras y logros. Al iniciar sesion el widget hidrata el score y el historial desde el backend. Al cerrar sesion se limpia auth, token, score e historial.

Usuarios de demo (contraseña `kueski123`): `carlos` (Bronce), `ana` (Plata), `diego` (Oro), `sofia` (Platino), `pedro` (Plata, con pago vencido para demostrar el rechazo por mora). Un enlace en el AuthModal abre `https://www.kueski.com` para registro real.

### 2. Carrito por deteccion de precios

`PriceDetector` observa el DOM del sitio anfitrion con un `MutationObserver` y extrae el total del carrito en tiempo real usando selectores CSS configurados por sitio. Para Mercado Libre tambien intercepta `history.pushState` (SPA). Los items se deduaplican en CartPopup (el mismo item puede aparecer en varios nodos del DOM) usando la primera ocurrencia por nombre+precio.

### 3. Smart Reminder

Detecta el sitio actual y actua segun el contexto:
- Sin sesion: CTA de login
- Con sesion y carrito vacio: mensaje informativo
- Con sesion y carrito con items: boton "Simular pago $X,XXX"

Adicionalmente, muestra un banner de aviso cuando el proximo pago del usuario vence en 7 dias o menos (ambar si quedan 3 dias o menos, azul si quedan hasta 7).

### 4. Simulacion de pagos (personalizada + elegibilidad)

Pide los planes al backend con `POST /api/purchases/calculate-plans`, que los calcula **segun el nivel y el credito disponible** del usuario y evalua la elegibilidad. Cuando no es aprobable, el simulador muestra el motivo especifico y deshabilita el boton de confirmar. Antes de registrar la compra muestra una pantalla de confirmacion con el resumen (tienda, total, plan, cashback). Sin backend, usa `src/utils/payments.ts` con las mismas reglas.

### 5. Score Coach

Sistema de puntos y niveles (Bronce → Platino). Al iniciar sesion, los logros y puntos se toman de la DB del usuario (no del localStorage de otra sesion). Los logros muestran el estado real y no son clickeables manualmente. La barra de progreso se anima con Framer Motion.

### 6. Deals Finder

Carga las ofertas desde `GET /api/deals?site=` con fallback a ofertas estaticas. Cada tarjeta (la activa y las de otras tiendas) es clickeable y abre el sitio correspondiente en una nueva pestana para que el usuario vea la promo en contexto real con el widget activo.

### 7. Perfil de usuario

Nombre, nivel, credito disponible/limite, proximo pago (fecha y monto), tasa de cashback e historial de compras expandible.

---

## Motor de score, nivel y beneficios

Fuente unica de verdad: `src/constants/kueski.ts` (frontend) y `server/lib/rules.js` (backend), identicos.

| Nivel | Puntos | Credito MXN | Cashback | Quincenas |
|---|---|---|---|---|
| Bronce | 0 a 499 | $500 a $2,500 | 0.5% | 2, 4 |
| Plata | 500 a 1,499 | $2,501 a $8,000 | 1.5% | 2, 4, 6 |
| Oro | 1,500 a 3,999 | $8,001 a $15,000 | 2.5% | 2, 4, 6, 8 (+1.5% en 8q) |
| Platino | 4,000+ | $15,001 a $25,000 | 5% | 2, 4, 6, 8, 12 (+1.5% en >6q) |

**Puntos por accion**: Pago a tiempo +25, Compra +50, Compra completada +100, 30 dias sin mora +150, Referido +300.

**Elegibilidad de compra** (evaluada por el backend antes de registrar):

| Codigo | Condicion |
|---|---|
| MONTO_INVALIDO | monto menor a $50 |
| MORA | el usuario tiene un pago con status vencido |
| LIMITE_COMPRAS_ACTIVAS | 5 o mas compras activas simultaneas |
| CREDITO_INSUFICIENTE | monto mayor al credito disponible |

---

## Stack tecnico

| Capa | Tecnologia |
|---|---|
| Extension | Plasmo 0.90 + React 18 + TypeScript |
| Estilos | Tailwind CSS v3 |
| Animaciones | Framer Motion (motion/react) |
| Iconos | Lucide React |
| Persistencia local | @plasmohq/storage (chrome.storage.local + localStorage) |
| Backend | Express 4 + Node.js |
| Base de datos | PostgreSQL (Aiven, plan gratuito) — driver pg nativo |
| Autenticacion | bcryptjs (hash) + JWT HS256 (crypto nativo de Node) |
| Deploy | Render (Web Service, plan gratuito) |
| Pruebas | Vitest 4 + Testing Library + Supertest + pg-mem |

---

## Datos persistidos en el cliente

| Clave | Contenido |
|---|---|
| `kueski_auth` | `{ isLoggedIn, user }` |
| `kueski_token` | Access token JWT de la sesion |
| `kueski_score` | `{ points, level, achievements }` (cache de la sesion actual) |
| `kueski_history` | Lista de compras confirmadas |
| `kueski_prefs` | `{ disabledSites }` |

---

## Estructura de archivos

```
src/
├── App.tsx                     — estado global y composicion
├── contents/kueski.tsx         — content script (inyeccion + Shadow DOM)
├── components/                 — KueskiWidget, SmartReminder, PaymentSimulator,
│                                 ScoreCoach, DealsFinder, AuthModal, UserProfile,
│                                 CartPopup, KueskiBenefits, PurchaseHistory
├── hooks/                      — useAuth, useScore, useCart
├── utils/                      — api.ts, storage.ts, payments.ts, priceDetector.ts
├── constants/kueski.ts         — reglas de negocio (espejo de server/lib/rules.js)
└── types/index.ts              — interfaces TypeScript

server/
├── server.js                   — 18 endpoints REST
├── lib/db.js                   — pool pg + initSchema (CREATE TABLE IF NOT EXISTS)
├── lib/seed.js                 — 5 usuarios, 5 deals y compras de demo
├── lib/rules.js                — motor score/nivel/planes/cashback + elegibilidad
└── lib/jwt.js                  — firma/verificacion JWT HS256 + authMiddleware
```

---

## Flujo de verificacion end-to-end

1. Backend activo: `cd server && DATABASE_URL="..." npm start`
2. Build: `PLASMO_PUBLIC_API_URL=https://kueski-widget-api.onrender.com/api npm run build`
3. Cargar `build/chrome-mv3-prod/` en `chrome://extensions`
4. Navegar a un sitio compatible → aparece el widget → pantalla KueskiBenefits
5. Login con `ana` / `kueski123` → perfil Plata con logros reales
6. Agregar productos → PriceDetector actualiza el total → "Simular pago $X"
7. Simulador muestra planes hasta 6 quincenas (nivel Plata)
8. Confirmar → pantalla de resumen → Si, confirmar → compra registrada en DB
9. Login con `pedro` → simulador muestra "Tienes un pago vencido"
10. Login con `sofia` → nivel Platino, 12 quincenas disponibles, 5% cashback
