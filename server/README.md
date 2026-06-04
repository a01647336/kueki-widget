# Kueski Widget — Backend

API REST en **Express.js** con **MongoDB** (Mongoose) y autenticación **usuario/contraseña → JWT** (bcrypt + HS256). Multiusuario: cada cuenta tiene su propio perfil, score, crédito, compras y cashback.

- **Reglas de negocio** (score → nivel → cashback/crédito/quincenas) y **motor de elegibilidad** (mora, límite de compras, crédito, monto): `lib/rules.js`.
- **Modelos y conexión**: `lib/db.js`. **Seed** de usuarios y deals: `lib/seed.js`.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | Connection string de MongoDB (Atlas o local). **Requerida.** |
| `JWT_SECRET` | Secreto para firmar los JWT. |
| `PORT` | Puerto (default `3001`). |
| `NODE_ENV` | `production` en Render. |

## Correr en local

```bash
cd server
npm install
MONGODB_URI="mongodb+srv://...." npm start
```

Al primer arranque se siembran los deals y los **usuarios de demo** (password de todos: `kueski123`):

| Usuario | Nivel | Notas |
|---|---|---|
| `carlos` | Bronce | |
| `ana` | Plata | |
| `diego` | Oro | |
| `sofia` | Platino | |
| `pedro` | Plata | tiene un pago **vencido** (demuestra el rechazo por mora) |

## Desplegar en Render

1. Crea un cluster gratis en **MongoDB Atlas** (M0), un usuario de DB y permite el acceso desde `0.0.0.0/0` (Network Access). Copia la connection string.
2. En **Render** → *New* → *Blueprint* y conecta este repo (usa el `render.yaml` de la raíz), o crea un *Web Service* manual con `rootDir: server`, build `npm install`, start `npm start`.
3. Configura las env vars: `MONGODB_URI` (tu string de Atlas), `JWT_SECRET`, `NODE_ENV=production`.
4. La URL pública (`https://<app>.onrender.com`) se usa para construir la extensión:
   `PLASMO_PUBLIC_API_URL=https://<app>.onrender.com/api npm run build`.

> Plan gratuito: el servicio "duerme" tras ~15 min de inactividad (primer request lento) y el almacenamiento del contenedor es efímero, pero **los datos viven en Atlas**, así que persisten.

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
