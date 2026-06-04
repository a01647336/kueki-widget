# Kueski Widget — Backend

API REST en **Express.js** con **PostgreSQL** (Aiven, driver `pg` nativo) y autenticación **usuario/contraseña → JWT** (bcrypt + HS256). Multiusuario: cada cuenta tiene su propio perfil, score, crédito, compras y cashback.

- **Reglas de negocio** (score → nivel → cashback/crédito/quincenas) y **motor de elegibilidad** (mora, límite de compras, crédito, monto): `lib/rules.js`.
- **Esquema y pool**: `lib/db.js`. **Seed** de usuarios y deals: `lib/seed.js`.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Service URI de Aiven PostgreSQL (incluye usuario, contraseña, host, puerto y SSL). **Requerida.** |
| `JWT_SECRET` | Secreto para firmar los JWT. |
| `PORT` | Puerto (default `3001`). |
| `NODE_ENV` | `production` en Render. |

## Correr en local

```bash
cd server
npm install
DATABASE_URL="postgresql://user:pass@host:port/defaultdb?sslmode=require" npm start
```

Al primer arranque se crean las tablas (idempotente) y se siembran los **usuarios de demo** (password de todos: `kueski123`):

| Usuario | Nivel | Notas |
|---|---|---|
| `carlos` | Bronce | Planes de 2 y 4 quincenas |
| `ana` | Plata | Hasta 6 quincenas |
| `diego` | Oro | Hasta 8 quincenas |
| `sofia` | Platino | Hasta 12 quincenas, 5% cashback |
| `pedro` | Plata | tiene un pago **vencido** (demuestra el rechazo por mora) |

## Desplegar en Aiven + Render

### 1. Crear la base de datos en Aiven
1. Ve a [aiven.io](https://aiven.io) → **Create service** → **PostgreSQL** → Free plan.
2. Espera a que el servicio quede `Running`.
3. En la vista del servicio copia el **Service URI**:
   `postgresql://avnadmin:xxxx@xx.aivencloud.com:12345/defaultdb?sslmode=require`

### 2. Desplegar en Render
1. Ve a [render.com](https://render.com) → **New → Blueprint** y conecta este repo (usa el [`render.yaml`](../render.yaml)), o crea un **Web Service** manual con:
   - Root directory: `server`
   - Build: `npm install`
   - Start: `npm start`
2. En **Environment variables** agrega:
   - `DATABASE_URL` = (el Service URI de Aiven)
   - `JWT_SECRET` = (genera un string aleatorio, ej. `openssl rand -hex 32`)
   - `NODE_ENV` = `production`
3. Haz **Deploy** y espera ~2 min.
4. Copia la URL pública: `https://<app>.onrender.com`.

### 3. Build de la extensión con la URL de producción
```bash
PLASMO_PUBLIC_API_URL=https://<app>.onrender.com/api npm run build
```

> Plan gratuito de Render: el servicio duerme tras ~15 min de inactividad (primer request lento). Los **datos persisten en Aiven** aunque el contenedor se reinicie.

## Endpoints

`Authorization: Bearer <accessToken>` salvo `login`, `refresh-token` y `health`. Detalle en [`../docs/endpoints.md`](../docs/endpoints.md).

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Usuario + contraseña → tokens + perfil |
| `POST` | `/api/auth/logout` · `/api/auth/refresh-token` | Sesión |
| `GET` | `/api/user` · `/api/user/preferences` · `/api/user/score` · `/api/user/cashback` | Datos del usuario autenticado |
| `PUT` | `/api/user/preferences` · `/api/user/score` | Actualizar |
| `POST` | `/api/user/achievements/:id/complete` | Completar logro |
| `GET`/`POST` | `/api/deals` · `/api/deals/:id/subscribe` | Promociones |
| `POST` | `/api/purchases/calculate-plans` | Planes personalizados + **elegibilidad** |
| `POST`/`GET` | `/api/purchases` | Registrar / listar compras (por usuario) |
| `GET`/`PUT` | `/api/purchases/:id` · `/api/purchases/:id/status` | Detalle / estado |
| `GET` | `/api/health` | Health check |
