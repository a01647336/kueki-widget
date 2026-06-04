# Kueski Smart Widget

> Extensión de Chrome que te acompaña mientras navegas por tus tiendas favoritas y te ayuda a **descubrir, entender y usar Kueski Pay** en el momento exacto de la compra.

Proyecto académico de **Construcción de Software y Toma de Decisiones (Gpo 501)**. Toda la información es **simulada**: no usa datos reales de Kueski ni está afiliado a la marca.

---

## ¿Qué problema resuelve?

Los servicios de financiamiento como Kueski sufren de **baja recurrencia**: la gente los usa solo en emergencias y luego los olvida. Este widget integra Kueski en la navegación diaria con intervenciones inteligentes y no intrusivas, para generar **más clientes y más transacciones por usuario**.

La propuesta de valor:

- **+ Transacciones** — recordatorios contextuales justo cuando el usuario está comprando.
- **− Fricción** — simula el pago en quincenas sin salir de la tienda.
- **+ Recurrencia** — gamificación (Score Coach) que premia volver a usar Kueski.

---

## Qué ofrece la extensión

| Función | Descripción |
|---|---|
| 🔔 **Smart Reminder** | Detecta sitios compatibles y recuerda que puedes pagar en quincenas sin intereses. |
| 🧮 **Simulación de pagos** | Calcula el pago por quincena **según tu nivel y crédito disponible**, antes de comprar. |
| 🏆 **Score Coach** | Gana puntos, sube de nivel (Bronce → Platino) y desbloquea más quincenas y mejor cashback. |
| 🎯 **Deals Finder** | Muestra promociones relevantes según la tienda donde navegas. |
| 💰 **Cashback real** | Cada compra acumula cashback según tu nivel (hasta 5%). |
| ⚙️ **Control de usuario** | Minimiza, cierra o desactiva el widget por sitio. No intrusivo. |

**Sitios compatibles:** Amazon, Mercado Libre, Liverpool, Coppel y Elektra (`.com.mx`).

---

## Motor de score → nivel → beneficios

El núcleo del sistema: tu **score** determina tu **nivel**, y tu nivel determina tu **cashback**, tu **crédito** y **cuántas quincenas** puedes diferir. Las reglas son idénticas en el frontend (`src/constants/kueski.ts`) y el backend (`server/lib/rules.js`).

| Nivel | Puntos | Cashback | Crédito (MXN) | Quincenas | Comisión |
|---|---|---|---|---|---|
| 🥉 Bronce | 0 – 499 | 0.5% | $500 – $2,500 | 2, 4 | 0% |
| 🥈 Plata | 500 – 1,499 | 1.5% | $2,501 – $8,000 | 2, 4, 6 | 0% |
| 🥇 Oro | 1,500 – 3,999 | 2.5% | $8,001 – $15,000 | 2, 4, 6, 8 | 8q: +1.5% |
| 💎 Platino | 4,000+ | 5.0% | $15,001 – $25,000 | 2, 4, 6, 8, 12 | >6q: +1.5% |

Un plan se ofrece solo si el monto del carrito **no supera el crédito disponible** del usuario.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│  Extensión de Chrome (Plasmo + React + TS + Tailwind)    │
│  src/contents/kueski.tsx  → content script (Shadow DOM)  │
│    PriceDetector          → lee precios del DOM real     │
│    App.tsx + hooks        → useAuth / useScore / cart    │
│    storage.ts             → chrome.storage + localStorage│
│    api.ts                 → cliente HTTP (offline-first)  │
└───────────────┬─────────────────────────────────────────┘
                │  (si el server está activo)
┌───────────────▼─────────────────────────────────────────┐
│  Backend (Express + JSON DB) · localhost:3001            │
│  server.js          → 19 endpoints REST                  │
│  lib/jwt.js         → JWT simulado (HS256)               │
│  lib/rules.js       → motor de score/nivel/planes        │
│  kueski_db.json     → persistencia                       │
└─────────────────────────────────────────────────────────┘
```

**Híbrido offline-first:** cuando el backend está disponible es la **autoridad** (emite el JWT, calcula los planes personalizados y persiste en la DB). Si no responde, el widget sigue funcionando con `localStorage` — cumpliendo el requisito de operar sin APIs externas.

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior (incluye npm)
- Google Chrome

## Instalación

```bash
git clone https://github.com/a01647336/kueki-widget.git
cd kueki-widget

npm install                 # dependencias del frontend
cd server && npm install && cd ..   # dependencias del backend
```

## Desarrollo

```bash
# Terminal 1 — backend (opcional, habilita la persistencia y los planes del server)
cd server && npm start          # API en http://localhost:3001

# Terminal 2 — widget en modo dev
npm run dev                     # http://localhost:1012
```

## Build de la extensión

```bash
npm run build                   # genera build/chrome-mv3-prod/
```

## Cargar la extensión en Chrome

1. Abre `chrome://extensions`.
2. Activa el **Modo desarrollador** (arriba a la derecha).
3. Clic en **"Cargar descomprimida"**.
4. Selecciona la carpeta `build/chrome-mv3-prod/`.
5. Navega a un sitio compatible (ej. `amazon.com.mx`) y el widget aparecerá abajo a la derecha.

Tras cada cambio: `npm run build` y recarga la extensión con el botón ↻ en `chrome://extensions`.

> **Tip de demo:** el código OTP de inicio de sesión acepta **cualquier combinación de 6 dígitos**. Con el backend activo, el endpoint `send-otp` devuelve el código en `devCode`.

## Tests

```bash
npm test                        # 140 pruebas (frontend + backend) con Vitest
```

## Landing page

Página estática en [`landing/index.html`](landing/index.html). Ábrela con doble clic o publícala en GitHub Pages.

---

## Estructura del proyecto

```
.
├── src/                  # extensión (React + Plasmo)
│   ├── contents/kueski.tsx   # content script que inyecta el widget
│   ├── components/           # UI: widget, simulador, score, deals, auth...
│   ├── hooks/                # useAuth, useScore, useCart
│   ├── utils/                # api.ts, storage.ts, payments.ts, priceDetector.ts
│   └── constants/kueski.ts   # reglas de negocio (espejo de server/lib/rules.js)
├── server/               # backend Express + JSON DB
│   ├── server.js             # 19 endpoints REST
│   └── lib/                  # rules.js (motor) + jwt.js (auth)
├── landing/index.html    # landing page estática
├── test/                 # pruebas Vitest (componentes, hooks, api, server)
└── docs/                 # contexto, endpoints, pruebas, indicaciones
```

## Documentación

- [`docs/contexto.md`](docs/contexto.md) — visión completa del sistema.
- [`docs/endpoints.md`](docs/endpoints.md) — referencia de la API REST.
- [`docs/PRUEBAS.md`](docs/PRUEBAS.md) — detalle de las pruebas.

---

## Equipo

Isaac Daniel Chávez Mares · Gabriela Ruelas Gaytán · Emilio Guzmán Flores · Samantha Mailen Gallardo Mota

*Proyecto exclusivamente académico. No se publica en la Chrome Web Store bajo la marca Kueski.*
