# Kueski Smart Widget

Extensión de Google Chrome que integra los servicios de **Kueski Pay** en la navegación cotidiana del usuario. Detecta cuando el usuario visita tiendas compatibles, muestra planes de pago en quincenas personalizados según su perfil, gamifica el uso del servicio con un sistema de niveles y ofrece recordatorios de pago contextuales.

Proyecto académico de **Construcción de Software y Toma de Decisiones (Gpo 501) — Tecnológico de Monterrey**.  
El sistema es completamente simulado: no usa datos reales de Kueski ni está afiliado a la empresa.

---

## Contexto y problema que resuelve

Kueski sufre de **baja recurrencia de uso**: los usuarios recurren al servicio solo en situaciones de urgencia y después lo olvidan. Este widget propone tres palancas de valor:

- **Mas transacciones**: recordatorios contextuales en el momento exacto de la compra.
- **Menos friccion**: simulación de pagos sin salir de la tienda.
- **Mas recurrencia**: sistema de puntos (Score Coach) que premia volver a usar Kueski.

**Sitios compatibles**: Amazon, Mercado Libre, Liverpool, Coppel y Elektra (todos en .com.mx).

---

## Tecnologias utilizadas

| Capa | Tecnologia | Proposito |
|---|---|---|
| Extension | **Plasmo 0.90** | Framework para extensiones de Chrome (MV3) |
| UI | **React 18** + **TypeScript** | Componentes y tipado estricto |
| Estilos | **Tailwind CSS v3** | Utilidades CSS en el Shadow DOM del widget |
| Animaciones | **Framer Motion** (motion/react) | Transiciones y barras de progreso animadas |
| Iconos | **Lucide React** | Iconografia consistente |
| Persistencia local | **@plasmohq/storage** | Abstraccion sobre chrome.storage.local con fallback a localStorage |
| Backend | **Node.js** + **Express 4** | API REST con 18 endpoints |
| Base de datos | **PostgreSQL** (Aiven, plan gratuito) | Persistencia real multiusuario |
| Driver BD | **pg** (node-postgres) | Queries SQL nativas sin ORM |
| Autenticacion | **bcryptjs** + **JWT HS256** | Hash de contraseñas y tokens de sesion (crypto nativo) |
| Deploy backend | **Render** (Web Service, plan gratuito) | Hosting del servidor en la nube |
| Pruebas | **Vitest 4** + **Testing Library** + **Supertest** + **pg-mem** | Suite completa frontend y backend |
| Control de versiones | **Git** + **GitHub** | Repositorio en `a01647336/kueki-widget` |

---

## Como funciona la extension en Chrome

La extension sigue el modelo **content script + Shadow DOM** de Chrome MV3, gestionado por el framework **Plasmo**:

```
1. El usuario instala la extension y navega a amazon.com.mx
         |
2. Plasmo detecta que el host coincide con host_permissions
   e inyecta kueski.tsx como content script
         |
3. PriceDetector arranca un MutationObserver que lee el DOM
   del sitio anfitrion con selectores especificos por tienda
   (precio del carrito, nombre y cantidad de productos)
         |
4. hydrateStorage() carga chrome.storage.local de forma
   asincrona antes de montar React, para que los hooks
   (useAuth, useScore) tengan la sesion previa disponible
         |
5. El componente App se monta dentro de un Shadow DOM.
   El Shadow DOM aísla completamente los estilos del widget
   de los del sitio anfitrion (Tailwind no interfiere con Amazon)
         |
6. api.ts envia peticiones HTTPS a Render con Authorization: Bearer <JWT>
   Si el servidor no responde en 8s, el widget sigue funcionando
   con los datos locales (localStorage como fallback)
```

**Deteccion del sitio**: el content script lee `window.location.hostname` y lo mapea a una clave interna (`amazon`, `mercadolibre`, `liverpool`, `coppel`, `elektra`). Cada clave tiene sus propios selectores CSS configurados en `PriceDetector`.

**Actualizacion del carrito en tiempo real**: el `MutationObserver` escucha cambios en el DOM y re-ejecuta la deteccion con debounce de 500ms. También intercepta `history.pushState` para detectar navegacion en SPAs (Mercado Libre).

---

## Arquitectura del sistema

```
┌──────────────────────────────────────────────────────────────┐
│  Extensión de Chrome  (Plasmo + React 18 + TypeScript)       │
│                                                              │
│  src/contents/kueski.tsx  → content script (Shadow DOM)      │
│    PriceDetector          → lee DOM del sitio en tiempo real │
│    App.tsx                → estado global: auth, score, cart │
│    useAuth / useScore     → hooks con persistencia local     │
│    api.ts                 → cliente HTTP offline-first        │
└──────────────────────────┬───────────────────────────────────┘
                           │  HTTPS + Authorization: Bearer JWT
              ┌────────────▼──────────────┐
              │  Render (cloud hosting)   │
              │  Node.js + Express 4      │
              │  server.js — 18 endpoints │
              │  lib/jwt.js  — auth HS256 │
              │  lib/rules.js — negocio   │
              └────────────┬──────────────┘
                           │  pg (driver nativo)
              ┌────────────▼──────────────┐
              │  Aiven PostgreSQL         │
              │  Tablas: users            │
              │          purchases        │
              │          deals            │
              └───────────────────────────┘
```

**Modo offline-first**: si Render no responde, el widget usa `localStorage` para autenticacion, score e historial de compras. Los planes de pago se calculan localmente con las mismas reglas que el backend (`src/constants/kueski.ts` es espejo de `server/lib/rules.js`).

---

## Estructura del proyecto

```
kueki-widget/
│
├── src/                          Extensión de Chrome
│   ├── contents/
│   │   └── kueski.tsx            Content script — punto de entrada en cada pagina
│   ├── App.tsx                   Componente raiz: estado global y coordinacion
│   ├── components/
│   │   ├── KueskiWidget.tsx      Contenedor flotante con tabs y header
│   │   ├── SmartReminder.tsx     Recordatorio contextual + banner de pago proximo
│   │   ├── PaymentSimulator.tsx  Selector de planes + pantalla de confirmacion
│   │   ├── ScoreCoach.tsx        Gamificacion: nivel, progreso y logros
│   │   ├── DealsFinder.tsx       Ofertas por tienda (tarjetas clickeables)
│   │   ├── AuthModal.tsx         Login usuario/contraseña + link a Kueski
│   │   ├── UserProfile.tsx       Perfil, credito, cashback e historial
│   │   ├── CartPopup.tsx         Resumen del carrito detectado
│   │   ├── KueskiBenefits.tsx    Pantalla de bienvenida sin sesion
│   │   └── PurchaseHistory.tsx   Lista de compras confirmadas
│   ├── hooks/
│   │   ├── useAuth.ts            Estado de sesion (login/logout + persistencia)
│   │   ├── useScore.ts           Score Coach: puntos, nivel, logros
│   │   └── useCart.ts            Estado del carrito (solo para modo dev)
│   ├── utils/
│   │   ├── api.ts                Cliente HTTP con manejo de token y fallback
│   │   ├── storage.ts            Abstraccion sobre @plasmohq/storage
│   │   ├── payments.ts           Calculo de planes, cashback y formato MXN
│   │   └── priceDetector.ts      MutationObserver + selectores por sitio
│   ├── constants/
│   │   └── kueski.ts             Reglas de negocio: niveles, tasas, puntos
│   ├── styles/
│   │   └── globals.css           Estilos base (inyectados en Shadow DOM)
│   └── types/
│       └── index.ts              Interfaces TypeScript del dominio
│
├── server/                       Backend API REST
│   ├── server.js                 18 endpoints Express con manejo async
│   └── lib/
│       ├── db.js                 Pool pg + initSchema (CREATE TABLE IF NOT EXISTS)
│       ├── seed.js               Usuarios, deals y compras de demo
│       ├── rules.js              Motor de negocio: niveles, planes, elegibilidad
│       └── jwt.js                Firma/verificacion JWT HS256 + authMiddleware
│
├── test/                         Suite de pruebas Vitest
│   ├── setup.ts                  Mocks globales (localStorage, crypto, motion, fetch)
│   ├── payments.test.ts          Logica de calculo de planes y cashback
│   ├── storage.test.ts           Abstraccion de storage
│   ├── constants.test.ts         Reglas de negocio
│   ├── useScore.test.ts          Hook de gamificacion
│   ├── useCart.test.ts           Hook del carrito
│   ├── useAuth.test.ts           Hook de autenticacion
│   ├── KueskiBenefits.test.tsx   Componente de bienvenida
│   ├── AuthModal.test.tsx        Formulario de login
│   ├── PaymentSimulator.test.tsx Simulador de pagos con confirmacion
│   ├── api.test.ts               Cliente HTTP (fetch mockeado)
│   ├── server.test.ts            Integracion backend (pg-mem)
│   └── eligibility.test.ts      Escenarios de rechazo de compra
│
├── docs/
│   ├── contexto.md               Vision completa del sistema
│   ├── endpoints.md              Referencia detallada de la API
│   ├── PRUEBAS.md                Detalle de las 144 pruebas
│   └── indicaciones.md           Brief original de Kueski
│
├── landing/
│   └── index.html                Landing page estatica (Tailwind CDN)
│
├── render.yaml                   Blueprint de despliegue en Render
└── .env.example                  Variables de entorno necesarias
```

---

## Estructura de la base de datos

La base de datos en **Aiven PostgreSQL** tiene 3 tablas. El esquema se crea automaticamente al arrancar el servidor (`initSchema` en `server/lib/db.js`).

### Tabla `users`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | TEXT PK | UUID generado en Node.js |
| `username` | TEXT UNIQUE | Nombre de usuario (minusculas) |
| `password_hash` | TEXT | Hash bcrypt de la contraseña |
| `name` | TEXT | Nombre completo para mostrar |
| `level` | TEXT | Nivel actual: Bronce, Plata, Oro, Platino |
| `credit_limit` | REAL | Limite de credito en MXN |
| `available_credit` | REAL | Credito disponible para nuevas compras |
| `cashback_rate` | REAL | Tasa de cashback (0.005 a 0.05) |
| `score_points` | INTEGER | Puntos acumulados en el Score Coach |
| `next_payment_date` | TEXT | Fecha del proximo pago (YYYY-MM-DD) |
| `next_payment_amount` | REAL | Monto del proximo pago en MXN |
| `achievements` | TEXT | JSON array de logros con su estado (completed) |
| `disabled_sites` | TEXT | JSON array de sitios donde el widget esta desactivado |
| `notif_deals` | BOOLEAN | Notificaciones de deals habilitadas |
| `notif_reminders` | BOOLEAN | Recordatorios de pago habilitados |
| `subscriptions` | TEXT | JSON array de IDs de deals suscritos |

### Tabla `purchases`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | TEXT PK | UUID de la compra (generado en frontend) |
| `user_id` | TEXT FK → users.id | Propietario de la compra |
| `site` | TEXT | Tienda donde se realizo (amazon, liverpool, etc.) |
| `amount` | REAL | Monto total en MXN |
| `plan` | INTEGER | Numero de quincenas elegidas |
| `payment_per_period` | REAL | Pago por quincena en MXN |
| `cashback` | REAL | Cashback otorgado en MXN |
| `date` | TEXT | Fecha ISO de la compra |
| `status` | TEXT | Estado: activo, pagado o vencido |

### Tabla `deals`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | INTEGER PK | Identificador del deal |
| `site` | TEXT | Tienda a la que aplica |
| `title` | TEXT | Titulo de la promocion |
| `description` | TEXT | Descripcion del beneficio |
| `discount` | TEXT | Etiqueta corta (ej. "Sin intereses") |
| `tag` | TEXT | Categoria (ej. "Kueski Pay") |
| `color` | TEXT | Clases Tailwind de color para la UI |
| `active` | BOOLEAN | Si la promocion esta vigente |

---

## API REST — Endpoints

Base URL en produccion: `https://kueski-widget-api.onrender.com/api`  
Todos los endpoints (salvo `login`, `refresh-token` y `health`) requieren `Authorization: Bearer <accessToken>`.

### Autenticacion

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/auth/login` | Usuario + contraseña → access token + refresh token + perfil |
| POST | `/auth/logout` | Invalida la sesion en el servidor |
| POST | `/auth/refresh-token` | Renueva el access token con el refresh token |

### Usuario

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/user` | Perfil completo del usuario autenticado |
| GET/PUT | `/user/preferences` | Preferencias (sitios desactivados, notificaciones) |
| GET/PUT | `/user/score` | Estado del Score Coach (puntos, nivel, logros) |
| POST | `/user/achievements/:id/complete` | Marca un logro como completado (idempotente) |
| GET | `/user/cashback` | Total de cashback acumulado y detalle por compra |

### Deals

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/deals?site=amazon` | Ofertas activas, marcando la del sitio actual |
| POST | `/deals/:id/subscribe` | Suscribe al usuario a alertas de un deal |

### Compras

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/purchases/calculate-plans` | Planes personalizados + evaluacion de elegibilidad |
| POST | `/purchases` | Registra una compra (valida elegibilidad, baja credito) |
| GET | `/purchases` | Historial de compras del usuario (filtros: status, site) |
| GET | `/purchases/:id` | Detalle de una compra especifica |
| PUT | `/purchases/:id/status` | Actualiza estado: activo, pagado o vencido |

### Health

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/health` | Verifica que el servidor este activo |

---

## Motor de score, nivel y beneficios

El score del usuario determina su nivel, y el nivel determina el cashback, el credito y los planes disponibles. Las reglas son identicas en `src/constants/kueski.ts` (frontend) y `server/lib/rules.js` (backend).

| Nivel | Puntos | Cashback | Credito MXN | Quincenas | Comision |
|---|---|---|---|---|---|
| Bronce | 0 a 499 | 0.5% | $500 a $2,500 | 2, 4 | 0% |
| Plata | 500 a 1,499 | 1.5% | $2,501 a $8,000 | 2, 4, 6 | 0% |
| Oro | 1,500 a 3,999 | 2.5% | $8,001 a $15,000 | 2, 4, 6, 8 | 8q: +1.5% |
| Platino | 4,000+ | 5.0% | $15,001 a $25,000 | 2, 4, 6, 8, 12 | mayor a 6q: +1.5% |

**Puntos por accion**: Pago a tiempo +25, Compra con Kueski +50, Compra completada +100, 30 dias sin mora +150, Referido +300.

**Elegibilidad de compra**: el backend rechaza la compra (HTTP 422) si el usuario tiene un pago vencido (MORA), supera 5 compras activas (LIMITE_COMPRAS_ACTIVAS), el monto excede su credito disponible (CREDITO_INSUFICIENTE) o el monto es menor a $50 (MONTO_INVALIDO).

---

## Funcionalidades del widget

**Smart Reminder**: detecta el sitio actual y actua segun el contexto. Si hay carrito con productos muestra "Simular pago $X,XXX". Incluye un banner de aviso cuando el proximo pago del usuario vence en 7 dias o menos (ambar si quedan 3 dias o menos, azul si quedan hasta 7).

**Simulacion de pagos**: pide al backend los planes personalizados para el monto del carrito. Si la compra no es elegible, muestra el motivo especifico y bloquea la confirmacion. Antes de registrar la compra muestra una pantalla de resumen (tienda, total, plan, cashback) que el usuario debe confirmar.

**Score Coach**: muestra el nivel actual, la barra de progreso hacia el siguiente nivel y los logros del usuario. Los logros completados se muestran con estado real (tomado de la base de datos al iniciar sesion), no simulados.

**Deals Finder**: lista las ofertas disponibles en todas las tiendas compatibles. Cada tarjeta es clickeable y abre el sitio de la tienda en una nueva pestana para que el usuario vea la promo en contexto real con el widget activo.

**Perfil de usuario**: muestra nombre, nivel, credito disponible, limite de credito, tasa de cashback, fecha y monto del proximo pago, e historial de compras expandible.

**Autenticacion**: formulario de usuario y contraseña. Al iniciar sesion el backend valida con bcrypt y emite un JWT. El widget hidrata el score e historial del usuario desde la base de datos. Incluye un enlace a https://www.kueski.com para registro.

---

## Cuentas de demo

Contrasena de todas: `kueski123`

| Usuario | Nivel | Logros completados | Historial | Para demostrar |
|---|---|---|---|---|
| `carlos` | Bronce | Ninguno | 1 compra activa | Planes de 2 y 4 quincenas |
| `ana` | Plata | Pago a tiempo, 3 compras | 1 pagada + 1 activa | Hasta 6 quincenas |
| `diego` | Oro | Pago a tiempo, 3 compras, 30 dias | 2 activas | Hasta 8 quincenas |
| `sofia` | Platino | Todos | 1 pagada + 1 activa | Hasta 12 quincenas, 5% cashback |
| `pedro` | Plata | Pago a tiempo | 1 vencida | Rechazo por mora |

---

## Instalacion y ejecucion

### Requisitos

- Node.js 18 o superior
- Google Chrome

### Clonar e instalar

```bash
git clone https://github.com/a01647336/kueki-widget.git
cd kueki-widget

npm install                          # dependencias de la extension
cd server && npm install && cd ..    # dependencias del backend
```

### Desarrollo local

```bash
# Terminal 1 — backend
cd server && DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require" npm start

# Terminal 2 — extension en modo dev
npm run dev    # abre http://localhost:1012
```

### Build de produccion

```bash
PLASMO_PUBLIC_API_URL=https://kueski-widget-api.onrender.com/api npm run build
```

Genera `build/chrome-mv3-prod/`. Ver `.env.example` para la variable de entorno.

### Cargar en Chrome

1. Ir a `chrome://extensions`
2. Activar el Modo desarrollador
3. Clic en "Cargar descomprimida"
4. Seleccionar `build/chrome-mv3-prod/`
5. Navegar a amazon.com.mx — el widget aparece abajo a la derecha

### Deploy del backend (Aiven + Render)

1. Crear instancia PostgreSQL en **Aiven** (plan gratuito). Copiar el Service URI.
2. En **Render**, crear Web Service con Root Directory `server`, Build `npm install`, Start `npm start`. Agregar variables `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`.
3. Ver instrucciones detalladas en `server/README.md`.

---

## Tests

```bash
npm test    # ejecuta las 144 pruebas con Vitest
```

La suite cubre:

- Logica de calculo de planes, cashback y formateo (payments, constants)
- Hooks de estado (useAuth, useScore, useCart) con persistencia real en localStorage
- Componentes de UI (AuthModal, PaymentSimulator, KueskiBenefits) con Testing Library
- Cliente HTTP `api.ts` con fetch mockeado — manejo de token, fallback silencioso
- Integracion del backend con **PostgreSQL en memoria** (pg-mem) via Supertest
- Escenarios de rechazo de compra: mora, credito insuficiente, limite de compras activas, monto invalido

---

## Equipo

Isaac Daniel Chavez Mares · Gabriela Ruelas Gaytan · Emilio Guzman Flores · Samantha Mailen Gallardo Mota

Proyecto academico — no publicado en la Chrome Web Store bajo la marca Kueski.
