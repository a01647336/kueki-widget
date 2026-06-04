# API Endpoints — Kueski Smart Widget

Documentación de todos los endpoints REST que requiere la versión funcional final del widget.

**Base URL:** `http://localhost:3001` (local) · `https://<app>.onrender.com` (producción)  
**Prefijo:** `/api`  
**Formato:** JSON  
**Autenticación:** Bearer JWT en el header `Authorization` (excepto `login`, `refresh-token` y `health`)

> **Multiusuario:** todos los endpoints de usuario operan sobre la cuenta del JWT (`req.userId`). Cada usuario ve y modifica únicamente **su** perfil, score, compras y cashback.
>
> Backend: **Express + MongoDB (Mongoose)**. Auth: **usuario/contraseña → JWT** (bcrypt + HS256).

---

## Índice

1. [Autenticación](#1-autenticación)
2. [Usuario](#2-usuario)
3. [Score y Gamificación](#3-score-y-gamificación)
4. [Deals / Promociones](#4-deals--promociones)
5. [Compras](#5-compras)
6. [Cashback](#6-cashback)
7. [Health Check](#7-health-check)

---

## 1. Autenticación

### 1.1 Iniciar sesión ✅

```
POST /api/auth/login
```

Valida usuario y contraseña (bcrypt). Si son correctos, devuelve el perfil y los tokens de sesión.

**Request body:**
```json
{
  "username": "ana",
  "password": "kueski123"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `username` | `string` | ✓ | Usuario de la cuenta |
| `password` | `string` | ✓ | Contraseña |

**Response `200 OK`:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "dGhpcyBp...",
  "user": {
    "id": "664f...",
    "name": "Ana Torres",
    "username": "ana",
    "email": "ana",
    "level": "Plata",
    "creditLimit": 8000,
    "availableCredit": 6000,
    "cashbackRate": 0.015,
    "score": 800,
    "nextPayment": { "date": "2026-06-01", "amount": 649.50 }
  }
}
```

**Errores:**

| Código | Descripción |
|--------|-------------|
| `400` | Faltan usuario o contraseña |
| `401` | Usuario o contraseña incorrectos |

> **Cuentas de demo** (password `kueski123`): `carlos` (Bronce), `ana` (Plata), `diego` (Oro), `sofia` (Platino), `pedro` (Plata, con pago vencido → demuestra el rechazo por mora).

---

### 1.3 Cerrar sesión ✅

```
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

Invalida el token de sesión actual en el servidor.

**Request body:** _(vacío)_

**Response `200 OK`:**
```json
{
  "ok": true
}
```

**Errores:**

| Código | Descripción |
|--------|-------------|
| `401` | Token inválido o ya expirado |

---

### 1.4 Renovar token de sesión ✅

```
POST /api/auth/refresh-token
```

Genera un nuevo access token usando el refresh token almacenado. Permite mantener la sesión activa sin volver a pedir OTP.

**Request body:**
```json
{
  "refreshToken": "dGhpcyBp..."
}
```

**Response `200 OK`:**
```json
{
  "accessToken": "eyJhbGci...",
  "expiresIn": 3600
}
```

**Errores:**

| Código | Descripción |
|--------|-------------|
| `401` | Refresh token inválido o expirado |

---

## 2. Usuario

### 2.1 Obtener perfil del usuario ✅

```
GET /api/user
Authorization: Bearer <accessToken>
```

Devuelve el perfil completo del usuario autenticado: datos personales, nivel, crédito disponible y próximo pago.

> Implementado con `authMiddleware` (requiere JWT). El demo opera sobre el usuario id=1.

**Response `200 OK`:**
```json
{
  "id": "u_001",
  "name": "Carlos Mendoza",
  "email": "ejemplo@correo.com",
  "level": "Bronce",
  "creditLimit": 2500,
  "availableCredit": 1950,
  "cashbackRate": 0.005,
  "score": 250,
  "nextPayment": {
    "date": "2026-06-01",
    "amount": 649.50
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `string` | Identificador único del usuario |
| `name` | `string` | Nombre completo |
| `email` | `string` | Email o teléfono con el que inició sesión |
| `level` | `"Bronce" \| "Plata" \| "Oro" \| "Platino"` | Nivel actual del programa de lealtad |
| `creditLimit` | `number` | Límite de crédito total en MXN |
| `availableCredit` | `number` | Crédito disponible para nuevas compras en MXN |
| `cashbackRate` | `number` | Tasa de cashback según nivel (0.005 – 0.05) |
| `score` | `number` | Puntuación interna (diferente a los puntos del Score Coach) |
| `nextPayment.date` | `string` | Fecha del próximo pago en formato `YYYY-MM-DD` |
| `nextPayment.amount` | `number` | Monto del próximo pago en MXN |

**Errores:**

| Código | Descripción |
|--------|-------------|
| `401` | Token inválido o no proporcionado |

---

### 2.2 Obtener preferencias del usuario ✅

```
GET /api/user/preferences
Authorization: Bearer <accessToken>
```

Devuelve la configuración personal del usuario: sitios desactivados y preferencias de notificaciones.

> Implementado en el backend (persiste en `kueski_db.json`). El frontend además guarda una copia en `localStorage` (`kueski_prefs`) como fallback.

**Response `200 OK`:**
```json
{
  "disabledSites": ["coppel"],
  "notifications": {
    "deals": true,
    "reminders": true
  }
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `disabledSites` | `string[]` | Sitios donde el widget está desactivado |
| `notifications.deals` | `boolean` | Alertas de nuevas promociones habilitadas |
| `notifications.reminders` | `boolean` | Recordatorios de pago habilitados |

**Errores:**

| Código | Descripción |
|--------|-------------|
| `401` | Token inválido o no proporcionado |

---

### 2.3 Actualizar preferencias del usuario ✅

```
PUT /api/user/preferences
Authorization: Bearer <accessToken>
```

Actualiza la configuración del usuario. Acepta campos parciales (solo enviar lo que cambia).

**Request body:**
```json
{
  "disabledSites": ["coppel", "elektra"],
  "notifications": {
    "deals": false
  }
}
```

**Response `200 OK`:**
```json
{
  "ok": true,
  "preferences": {
    "disabledSites": ["coppel", "elektra"],
    "notifications": {
      "deals": false,
      "reminders": true
    }
  }
}
```

**Errores:**

| Código | Descripción |
|--------|-------------|
| `400` | Cuerpo de la solicitud inválido |
| `401` | Token inválido o no proporcionado |

---

## 3. Score y Gamificación

### 3.1 Obtener score del usuario ✅

```
GET /api/user/score
Authorization: Bearer <accessToken>
```

Devuelve el estado actual del programa de puntos: puntos acumulados, nivel, progreso al siguiente nivel y logros.

> Implementado: calcula nivel, `pointsToNextLevel` y logros desde la DB. El frontend mantiene una copia en `localStorage` (`kueski_score`).

**Response `200 OK`:**
```json
{
  "points": 350,
  "level": "Bronce",
  "pointsToNextLevel": 150,
  "nextLevel": "Plata",
  "achievements": [
    {
      "id": "first-payment",
      "title": "Primer pago a tiempo",
      "completed": false,
      "points": 25
    },
    {
      "id": "three-purchases",
      "title": "Usa Kueski Pay 3 veces",
      "completed": false,
      "points": 150
    },
    {
      "id": "thirty-days",
      "title": "Mantén buen historial 30 días",
      "completed": false,
      "points": 150
    },
    {
      "id": "referral",
      "title": "Invita a un amigo",
      "completed": false,
      "points": 300
    }
  ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `points` | `number` | Puntos acumulados totales |
| `level` | `LevelName` | Nivel actual |
| `pointsToNextLevel` | `number` | Puntos necesarios para subir de nivel (`null` si es Platino) |
| `nextLevel` | `LevelName \| null` | Siguiente nivel disponible |
| `achievements` | `Achievement[]` | Lista de logros con su estado |

**Umbrales de nivel:**

| Nivel | Puntos mínimos | Cashback | Crédito | Quincenas máx. |
|-------|----------------|----------|---------|----------------|
| Bronce | 0 | 0.5% | $500 – $2,500 | 4 |
| Plata | 500 | 1.5% | $2,501 – $8,000 | 6 |
| Oro | 1,500 | 2.5% | $8,001 – $15,000 | 8 |
| Platino | 4,000 | 5.0% | $15,001 – $25,000 | 12 |

**Errores:**

| Código | Descripción |
|--------|-------------|
| `401` | Token inválido o no proporcionado |

---

### 3.2 Actualizar puntos del usuario ✅

```
PUT /api/user/score
Authorization: Bearer <accessToken>
```

Suma puntos al usuario por una acción específica. Recalcula automáticamente el nivel si se cruza un umbral.

> Implementado con auth. Recalcula nivel, cashback y crédito según el motor de `lib/rules.js`.

**Request body:**
```json
{
  "points": 50,
  "action": "purchase"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `points` | `number` | ✓ | Puntos a sumar |
| `action` | `string` | — | Acción que origina los puntos (para auditoría) |

**Acciones válidas y sus puntos:**

| Acción | Puntos |
|--------|--------|
| `welcome` | 200 |
| `purchase` | 50 |
| `on-time-payment` | 25 |
| `purchase-complete` | 100 |
| `thirty-day-streak` | 150 |
| `referral` | 300 |

**Response `200 OK`:**
```json
{
  "ok": true,
  "points": 400,
  "level": "Bronce",
  "levelChanged": false
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `points` | `number` | Nuevo total de puntos |
| `level` | `LevelName` | Nivel actualizado |
| `levelChanged` | `boolean` | `true` si el usuario subió de nivel |

**Errores:**

| Código | Descripción |
|--------|-------------|
| `400` | `points` no es un número positivo |
| `401` | Token inválido o no proporcionado |

---

### 3.3 Completar un logro ✅

```
POST /api/user/achievements/:achievementId/complete
Authorization: Bearer <accessToken>
```

Marca un logro como completado y otorga los puntos correspondientes. Idempotente: si el logro ya fue completado, no suma puntos de nuevo.

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `achievementId` | `string` | ID del logro (`first-payment`, `three-purchases`, `thirty-days`, `referral`) |

**Response `200 OK`:**
```json
{
  "ok": true,
  "achievement": {
    "id": "first-payment",
    "title": "Primer pago a tiempo",
    "completed": true,
    "points": 25
  },
  "pointsAwarded": 25,
  "newTotal": 375
}
```

**Errores:**

| Código | Descripción |
|--------|-------------|
| `400` | `achievementId` no reconocido |
| `401` | Token inválido o no proporcionado |
| `409` | El logro ya fue completado previamente (no se suman puntos) |

---

## 4. Deals / Promociones

### 4.1 Obtener deals activos ✅

```
GET /api/deals
Authorization: Bearer <accessToken>
```

Devuelve la lista de promociones activas. Opcionalmente filtra por sitio de e-commerce.

> Implementado con auth. Datos en `kueski_db.json`.

**Query parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `site` | `string` | — | Filtrar por sitio: `amazon`, `mercadolibre`, `liverpool`, `coppel`, `elektra` |

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "site": "amazon",
    "title": "Amazon — Sin intereses",
    "description": "Divide tu compra en hasta 4 quincenas sin costo adicional",
    "discount": "Sin intereses",
    "tag": "Kueski Pay",
    "color": "from-orange-400 to-orange-600",
    "isActive": true
  }
]
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `number` | Identificador del deal |
| `site` | `string` | Sitio al que aplica |
| `title` | `string` | Título de la promoción |
| `description` | `string` | Descripción del beneficio |
| `discount` | `string` | Etiqueta corta del descuento |
| `tag` | `string` | Categoría del deal |
| `color` | `string` | Clases de color Tailwind para el UI |
| `isActive` | `boolean` | `true` si la promoción está vigente |

**Errores:**

| Código | Descripción |
|--------|-------------|
| `401` | Token inválido o no proporcionado |

---

### 4.2 Suscribirse a alertas de un deal ✅

```
POST /api/deals/:dealId/subscribe
Authorization: Bearer <accessToken>
```

Registra al usuario para recibir alertas cuando haya cambios en una promoción específica.

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `dealId` | `number` | ID del deal |

**Response `200 OK`:**
```json
{
  "ok": true,
  "dealId": 1,
  "subscribed": true
}
```

**Errores:**

| Código | Descripción |
|--------|-------------|
| `401` | Token inválido o no proporcionado |
| `404` | Deal no encontrado |

---

## 5. Compras

### 5.1 Calcular planes de pago disponibles ✅

```
POST /api/purchases/calculate-plans
Authorization: Bearer <accessToken>
```

Calcula los planes de pago disponibles para un monto de carrito dado, según el nivel y crédito disponible del usuario.

> Implementado: el backend calcula los planes según el nivel y el crédito disponible del usuario (`lib/rules.js`) y devuelve `approved`. El frontend usa `src/utils/payments.ts` como fallback offline con las mismas reglas.

**Request body:**
```json
{
  "cartTotal": 5000
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `cartTotal` | `number` | ✓ | Monto total del carrito en MXN |

**Response `200 OK`:**
```json
{
  "approved": true,
  "reason": null,
  "message": null,
  "availableCredit": 1950,
  "plans": [
    {
      "periods": 2,
      "paymentPerPeriod": 2500.00,
      "totalAmount": 5000.00,
      "commissionRate": 0,
      "commissionAmount": 0,
      "requiresLevel": null
    },
    {
      "periods": 4,
      "paymentPerPeriod": 1250.00,
      "totalAmount": 5000.00,
      "commissionRate": 0,
      "commissionAmount": 0,
      "requiresLevel": null
    }
  ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `approved` | `boolean` | `false` si el monto supera el crédito disponible |
| `availableCredit` | `number` | Crédito disponible actual del usuario |
| `plans` | `InstallmentPlan[]` | Planes disponibles según el nivel del usuario |
| `plans[].periods` | `number` | Número de quincenas |
| `plans[].paymentPerPeriod` | `number` | Pago por quincena en MXN |
| `plans[].totalAmount` | `number` | Total a pagar incluyendo comisión |
| `plans[].commissionRate` | `number` | Tasa de comisión (0 para ≤ 6 quincenas, 0.015 para > 6) |
| `plans[].commissionAmount` | `number` | Monto de comisión en MXN |
| `plans[].requiresLevel` | `LevelName \| null` | Nivel mínimo requerido para este plan |

**Reglas de planes:**

| Quincenas | Comisión | Nivel mínimo |
|-----------|----------|--------------|
| 2 | 0% | Bronce |
| 4 | 0% | Bronce |
| 6 | 0% | Plata |
| 8 | 1.5% | Oro |
| 12 | 1.5% | Platino |

**Elegibilidad (`approved`, `reason`, `message`):** si la compra no es elegible, `approved` es `false` y `reason`/`message` indican por qué:

| `reason` | Condición |
|---|---|
| `MONTO_INVALIDO` | monto menor a $50 |
| `MORA` | el usuario tiene un pago `vencido` |
| `LIMITE_COMPRAS_ACTIVAS` | ≥ 5 compras activas |
| `CREDITO_INSUFICIENTE` | monto > crédito disponible |

`POST /api/purchases` revalida la elegibilidad y responde **`422`** (sin registrar ni bajar crédito) cuando la compra no es aprobable.

**Errores:**

| Código | Descripción |
|--------|-------------|
| `400` | `cartTotal` inválido o menor a $1 |
| `401` | Token inválido o no proporcionado |

---

### 5.2 Registrar una compra ✅

```
POST /api/purchases
Authorization: Bearer <accessToken>
```

Confirma una compra, reduce el crédito disponible del usuario y registra el cashback obtenido.

> Implementado con auth. Recalcula el cashback server-side si se omite y reduce el crédito disponible. Devuelve `201 Created`.

**Request body:**
```json
{
  "id": "purch_abc123",
  "site": "amazon",
  "amount": 5000,
  "plan": 4,
  "paymentPerPeriod": 1250.00,
  "cashback": 25.00,
  "date": "2026-05-29T18:30:00.000Z",
  "status": "activo"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | `string` | ✓ | UUID único de la compra |
| `site` | `string` | ✓ | Sitio donde se realizó (`amazon`, `mercadolibre`, etc.) |
| `amount` | `number` | ✓ | Monto total de la compra en MXN |
| `plan` | `number` | ✓ | Número de quincenas elegidas |
| `paymentPerPeriod` | `number` | — | Pago por quincena (calculado automáticamente si se omite) |
| `cashback` | `number` | — | Cashback otorgado (calculado por el servidor si se omite) |
| `date` | `string` | — | Fecha ISO de la compra (usa fecha actual si se omite) |
| `status` | `string` | — | Estado inicial (default: `"activo"`) |

**Response `201 Created`:**
```json
{
  "ok": true,
  "id": "purch_abc123"
}
```

**Errores:**

| Código | Descripción |
|--------|-------------|
| `400` | Faltan campos requeridos (`id`, `site`, `amount`, `plan`) |
| `401` | Token inválido o no proporcionado |
| `409` | Ya existe una compra con ese `id` |

---

### 5.3 Obtener historial de compras ✅

```
GET /api/purchases
Authorization: Bearer <accessToken>
```

Devuelve el historial de compras del usuario ordenado por fecha descendente.

> Implementado con auth y filtros opcionales `status` y `site`.

**Query parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | `string` | Filtrar por estado: `activo` o `pagado` |
| `site` | `string` | Filtrar por sitio de e-commerce |

**Response `200 OK`:**
```json
[
  {
    "id": "purch_abc123",
    "site": "amazon",
    "amount": 5000,
    "plan": 4,
    "paymentPerPeriod": 1250.00,
    "cashback": 25.00,
    "date": "2026-05-29T18:30:00.000Z",
    "status": "activo"
  }
]
```

**Errores:**

| Código | Descripción |
|--------|-------------|
| `401` | Token inválido o no proporcionado |

---

### 5.4 Obtener detalle de una compra ✅

```
GET /api/purchases/:purchaseId
Authorization: Bearer <accessToken>
```

Devuelve el detalle completo de una compra específica.

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `purchaseId` | `string` | ID de la compra |

**Response `200 OK`:**
```json
{
  "id": "purch_abc123",
  "site": "amazon",
  "amount": 5000,
  "plan": 4,
  "paymentPerPeriod": 1250.00,
  "cashback": 25.00,
  "date": "2026-05-29T18:30:00.000Z",
  "status": "activo"
}
```

**Errores:**

| Código | Descripción |
|--------|-------------|
| `401` | Token inválido o no proporcionado |
| `404` | Compra no encontrada |

---

### 5.5 Actualizar estado de una compra ✅

```
PUT /api/purchases/:purchaseId/status
Authorization: Bearer <accessToken>
```

Actualiza el estado de una compra de `activo` a `pagado`. Puede ser invocado por un administrador o como resultado de confirmar un pago.

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `purchaseId` | `string` | ID de la compra |

**Request body:**
```json
{
  "status": "pagado"
}
```

**Response `200 OK`:**
```json
{
  "ok": true,
  "id": "purch_abc123",
  "status": "pagado"
}
```

**Errores:**

| Código | Descripción |
|--------|-------------|
| `400` | Estado inválido |
| `401` | Token inválido o no proporcionado |
| `404` | Compra no encontrada |

---

## 6. Cashback

### 6.1 Obtener historial de cashback ✅

```
GET /api/user/cashback
Authorization: Bearer <accessToken>
```

Devuelve el cashback total acumulado del usuario y el detalle por compra.

> Implementado: agrega el cashback de todas las compras registradas en la DB y devuelve el total y el detalle.

**Response `200 OK`:**
```json
{
  "totalEarned": 87.50,
  "history": [
    {
      "purchaseId": "purch_abc123",
      "site": "amazon",
      "purchaseAmount": 5000,
      "cashbackAmount": 25.00,
      "date": "2026-05-29T18:30:00.000Z"
    }
  ]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `totalEarned` | `number` | Cashback total acumulado en MXN |
| `history` | `array` | Lista de compras que generaron cashback |

**Errores:**

| Código | Descripción |
|--------|-------------|
| `401` | Token inválido o no proporcionado |

---

## 7. Health Check

### 7.1 Verificar estado del servidor ✅

```
GET /api/health
```

Verifica que el servidor esté activo. No requiere autenticación.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-29T18:00:00.000Z"
}
```

---

## Resumen de endpoints

| # | Método | Ruta | Estado |
|---|--------|------|--------|
| 1 | POST | `/api/auth/login` | ✅ Implementado |
| 2 | — | _(reemplaza al OTP anterior)_ | — |
| 3 | POST | `/api/auth/logout` | ✅ Implementado |
| 4 | POST | `/api/auth/refresh-token` | ✅ Implementado |
| 5 | GET | `/api/user` | ✅ Implementado |
| 6 | GET | `/api/user/score` | ✅ Implementado |
| 7 | PUT | `/api/user/score` | ✅ Implementado |
| 8 | POST | `/api/user/achievements/:achievementId/complete` | ✅ Implementado |
| 9 | GET | `/api/user/preferences` | ✅ Implementado |
| 10 | PUT | `/api/user/preferences` | ✅ Implementado |
| 11 | GET | `/api/deals` | ✅ Implementado |
| 12 | POST | `/api/deals/:dealId/subscribe` | ✅ Implementado |
| 13 | POST | `/api/purchases/calculate-plans` | ✅ Implementado |
| 14 | POST | `/api/purchases` | ✅ Implementado |
| 15 | GET | `/api/purchases` | ✅ Implementado |
| 16 | GET | `/api/purchases/:purchaseId` | ✅ Implementado |
| 17 | PUT | `/api/purchases/:purchaseId/status` | ✅ Implementado |
| 18 | GET | `/api/user/cashback` | ✅ Implementado |
| 19 | GET | `/api/health` | ✅ Implementado |

> **Estado:** los 19 endpoints están implementados en `server/server.js` y cubiertos por pruebas de integración (`test/server.test.ts`). Todos requieren `Authorization: Bearer <accessToken>` salvo los de autenticación y health.
