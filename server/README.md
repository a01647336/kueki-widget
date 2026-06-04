# Kueski Widget — Backend

Servidor simple en **Express.js** con persistencia en **archivo JSON** (`kueski_db.json`). No requiere instalación de bases de datos ni dependencias nativas.

- **Auth**: JWT simulado HS256 (`lib/jwt.js`) — el OTP del demo acepta cualquier código de 6 dígitos.
- **Reglas de negocio**: score → nivel → cashback/crédito/quincenas en `lib/rules.js` (espejo de `src/constants/kueski.ts`).

## Requisitos

- Node.js 18+

## Instalación y arranque

```bash
cd server
npm install
npm start
```

El servidor queda disponible en `http://localhost:3001`.

Variables de entorno opcionales: `PORT` (default 3001), `DB_FILE` (ruta del JSON), `JWT_SECRET`.

## Endpoints

Autenticación con `Authorization: Bearer <accessToken>` salvo auth y health. Documentación completa en [`../docs/endpoints.md`](../docs/endpoints.md).

| # | Método | Ruta | Descripción |
|---|--------|------|-------------|
| 1 | `POST` | `/api/auth/send-otp` | Envía código OTP (en dev devuelve `devCode`) |
| 2 | `POST` | `/api/auth/verify-otp` | Valida código → emite tokens + perfil |
| 3 | `POST` | `/api/auth/logout` | Cierra sesión |
| 4 | `POST` | `/api/auth/refresh-token` | Renueva el access token |
| 5 | `GET`  | `/api/user` | Perfil del usuario autenticado |
| 6 | `GET`/`PUT` | `/api/user/preferences` | Sitios desactivados y notificaciones |
| 7 | `GET`/`PUT` | `/api/user/score` | Score Coach (nivel, puntos, logros) |
| 8 | `POST` | `/api/user/achievements/:id/complete` | Completa un logro (idempotente) |
| 9 | `GET`  | `/api/deals?site=amazon` | Ofertas activas filtradas por sitio |
| 10 | `POST` | `/api/deals/:id/subscribe` | Suscribe a alertas de un deal |
| 11 | `POST` | `/api/purchases/calculate-plans` | **Planes personalizados** por nivel y crédito |
| 12 | `POST`/`GET` | `/api/purchases` | Registrar / listar compras |
| 13 | `GET`  | `/api/purchases/:id` | Detalle de una compra |
| 14 | `PUT`  | `/api/purchases/:id/status` | Actualiza estado (activo → pagado) |
| 15 | `GET`  | `/api/user/cashback` | Cashback total acumulado y detalle |
| 16 | `GET`  | `/api/health` | Health check (sin auth) |

## Base de datos

Los datos se guardan en `server/kueski_db.json` (generado automáticamente al primer arranque).

**Estructura:**
```json
{
  "users": [{ "id", "name", "level", "scorePoints", "availableCredit",
              "preferences", "achievements", "subscriptions", ... }],
  "deals": [...],
  "purchases": [...]
}
```

## Hot-reload en desarrollo

```bash
npm run dev
```

## Cómo funciona con la extensión

1. Inicia el servidor: `cd server && npm start`
2. Abre Chrome con la extensión cargada
3. Navega a un sitio compatible (ej: amazon.com.mx)
4. El widget intentará conectarse a `http://localhost:3001`
5. Si el servidor no está disponible, el widget sigue funcionando con localStorage
