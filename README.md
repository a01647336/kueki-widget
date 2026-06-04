# Kueski Smart Widget

Extensión de Chrome que te acompaña mientras navegas por tus tiendas favoritas y te ayuda a descubrir, entender y usar Kueski Pay en el momento exacto de la compra.

Proyecto académico de **Construcción de Software y Toma de Decisiones (Gpo 501)**. Toda la información es simulada: no usa datos reales de Kueski ni está afiliado a la marca.

---

## Que problema resuelve

Los servicios de financiamiento como Kueski sufren de **baja recurrencia**: la gente los usa solo en emergencias y luego los olvida. Este widget integra Kueski en la navegación diaria con intervenciones inteligentes y no intrusivas, para generar más clientes y más transacciones por usuario.

Propuesta de valor:

- **Mas transacciones** — recordatorios contextuales justo cuando el usuario está comprando.
- **Menos friccion** — simula el pago en quincenas sin salir de la tienda.
- **Mas recurrencia** — gamificación (Score Coach) que premia volver a usar Kueski.

---

## Que ofrece la extensión

| Función | Descripción |
|---|---|
| **Smart Reminder** | Detecta sitios compatibles, recuerda que puedes pagar en quincenas y muestra un aviso cuando se acerca la fecha de tu próximo pago. |
| **Simulación de pagos** | Calcula el pago por quincena según tu nivel y crédito disponible, con una pantalla de confirmación antes de registrar la compra. |
| **Score Coach** | Gana puntos, sube de nivel (Bronce a Platino) y desbloquea más quincenas y mejor cashback. Logros reales basados en tu historial. |
| **Deals Finder** | Muestra las promociones disponibles en cada tienda compatible. Al dar clic en una oferta se abre el sitio para verla en contexto. |
| **Cashback** | Cada compra acumula cashback según tu nivel (hasta 5%). |

**Sitios compatibles:** Amazon, Mercado Libre, Liverpool, Coppel y Elektra (.com.mx).

---

## Motor de score, nivel y beneficios

El score del usuario determina su nivel, y el nivel determina el cashback, el crédito disponible y cuántas quincenas puede diferir. Las reglas son idénticas en el frontend (`src/constants/kueski.ts`) y el backend (`server/lib/rules.js`).

| Nivel | Puntos | Cashback | Credito (MXN) | Quincenas | Comision |
|---|---|---|---|---|---|
| Bronce | 0 a 499 | 0.5% | $500 a $2,500 | 2, 4 | 0% |
| Plata | 500 a 1,499 | 1.5% | $2,501 a $8,000 | 2, 4, 6 | 0% |
| Oro | 1,500 a 3,999 | 2.5% | $8,001 a $15,000 | 2, 4, 6, 8 | 8q: +1.5% |
| Platino | 4,000+ | 5.0% | $15,001 a $25,000 | 2, 4, 6, 8, 12 | mayor a 6q: +1.5% |

## Aprobacion de compra (elegibilidad)

Antes de registrar una compra el backend evalúa múltiples factores. Si no es elegible, el simulador muestra el motivo y bloquea la confirmación:

| Motivo | Cuando ocurre |
|---|---|
| MONTO_INVALIDO | El monto es menor a $50. |
| MORA | El usuario tiene un pago vencido. |
| LIMITE_COMPRAS_ACTIVAS | Ya tiene 5 compras activas simultáneas. |
| CREDITO_INSUFICIENTE | El monto supera su crédito disponible. |

---

## Cuentas de demo

Cada cuenta tiene su propio perfil, score, nivel, crédito, historial de compras y logros. Contraseña de todas: `kueski123`.

| Usuario | Nivel | Logros completados | Para demostrar |
|---|---|---|---|
| `carlos` | Bronce | Ninguno | planes de 2 y 4 quincenas |
| `ana` | Plata | Pago a tiempo, 3 compras | hasta 6 quincenas |
| `diego` | Oro | Pago a tiempo, 3 compras, 30 dias | hasta 8 quincenas |
| `sofia` | Platino | Todos | hasta 12 quincenas, 5% cashback |
| `pedro` | Plata | Pago a tiempo | rechazo por mora (tiene un pago vencido) |

No tienes cuenta? El widget incluye un enlace "Registrate en Kueski" que abre el sitio oficial.

---

## Arquitectura

```
Extensión de Chrome (Plasmo + React + TypeScript + Tailwind)
  src/contents/kueski.tsx  -- content script (Shadow DOM)
    PriceDetector          -- lee precios del DOM real
    App.tsx + hooks        -- useAuth / useScore / cart
    api.ts                 -- cliente HTTP (offline-first)
         |
         |  HTTPS · Authorization: Bearer JWT
         v
Backend (Express + PostgreSQL) · Render
  server.js          -- API REST multiusuario
  lib/db.js          -- pool pg + schema SQL
  lib/seed.js        -- usuarios, deals y compras de demo
  lib/jwt.js         -- login usuario/contraseña -> JWT
  lib/rules.js       -- score/nivel/planes + elegibilidad
  Aiven PostgreSQL   -- persistencia real
```

**Offline-first:** una sesión iniciada sigue funcionando con `localStorage` si el server no responde. El login y los planes personalizados usan el backend como autoridad cuando está disponible.

---

## Requisitos previos

- Node.js v18 o superior (incluye npm)
- Google Chrome

## Instalacion

```bash
git clone https://github.com/a01647336/kueki-widget.git
cd kueki-widget

npm install
cd server && npm install && cd ..
```

## Desarrollo local

```bash
# Terminal 1 — backend (requiere DATABASE_URL de Aiven o PostgreSQL local)
cd server && DATABASE_URL="postgresql://..." npm start

# Terminal 2 — widget en modo dev
npm run dev
```

## Despliegue del backend (Aiven + Render)

1. Crea una instancia de **PostgreSQL en Aiven** (plan gratuito). Copia el Service URI.
2. En **Render**, crea un Web Service con rootDir: `server`, build: `npm install`, start: `npm start`. Agrega las variables de entorno `DATABASE_URL` (el Service URI de Aiven), `JWT_SECRET` y `NODE_ENV=production`.
3. Toma la URL publica del servicio (`https://<app>.onrender.com`).

Ver instrucciones detalladas en [`server/README.md`](server/README.md).

## Build de la extensión

```bash
# Para produccion (apuntando al backend en la nube):
PLASMO_PUBLIC_API_URL=https://kueski-widget-api.onrender.com/api npm run build

# Para desarrollo local:
npm run build
```

Genera `build/chrome-mv3-prod/`. Ver [`.env.example`](.env.example).

## Cargar la extensión en Chrome

1. Abre `chrome://extensions`.
2. Activa el Modo desarrollador (arriba a la derecha).
3. Clic en "Cargar descomprimida".
4. Selecciona la carpeta `build/chrome-mv3-prod/`.
5. Navega a un sitio compatible (ej. amazon.com.mx) y el widget aparecerá abajo a la derecha.

Tras cada cambio: `npm run build` y recarga la extensión con el boton actualizar en `chrome://extensions`.

## Tests

```bash
npm test    # 144 pruebas (frontend + backend) con Vitest
```

Incluye pruebas de integración del backend con PostgreSQL en memoria (`pg-mem`) y escenarios de rechazo de compra (`test/eligibility.test.ts`).

## Landing page

Pagina estatica en `landing/index.html`. Abrir con doble clic o publicar en GitHub Pages.

---

## Estructura del proyecto

```
.
├── src/                     -- extensión (React + Plasmo)
│   ├── contents/kueski.tsx  -- content script (inyeccion + Shadow DOM)
│   ├── components/          -- widget, simulador, score, deals, auth...
│   ├── hooks/               -- useAuth, useScore, useCart
│   ├── utils/               -- api.ts, storage.ts, payments.ts, priceDetector.ts
│   └── constants/kueski.ts  -- reglas de negocio (espejo de server/lib/rules.js)
├── server/                  -- backend Express + PostgreSQL
│   ├── server.js            -- API REST multiusuario (19 endpoints)
│   └── lib/                 -- db.js, seed.js, rules.js, jwt.js
├── render.yaml              -- blueprint de despliegue en Render
├── landing/index.html       -- landing page estatica
├── test/                    -- pruebas Vitest (componentes, hooks, api, server, eligibility)
└── docs/                    -- contexto, endpoints, pruebas, indicaciones
```

## Documentacion

- `docs/contexto.md` — vision completa del sistema.
- `docs/endpoints.md` — referencia de la API REST.
- `docs/PRUEBAS.md` — detalle de las pruebas.

---

## Equipo

Isaac Daniel Chavez Mares · Gabriela Ruelas Gaytan · Emilio Guzman Flores · Samantha Mailen Gallardo Mota

Proyecto exclusivamente academico. No se publica en la Chrome Web Store bajo la marca Kueski.
