# Pruebas del Sistema — Kueski Smart Widget

## Resumen de resultados

| Archivo de pruebas | Tests | Estado |
|---|---|---|
| `payments.test.ts` | 16 | ✅ Todos pasan |
| `storage.test.ts` | 12 | ✅ Todos pasan |
| `constants.test.ts` | 19 | ✅ Todos pasan |
| `useScore.test.ts` | 12 | ✅ Todos pasan |
| `useCart.test.ts` | 10 | ✅ Todos pasan |
| `useAuth.test.ts` | 8 | ✅ Todos pasan |
| `KueskiBenefits.test.tsx` | 6 | ✅ Todos pasan |
| `AuthModal.test.tsx` | 8 | ✅ Todos pasan |
| `PaymentSimulator.test.tsx` | 12 | ✅ Todos pasan |
| `api.test.ts` | 11 | ✅ Todos pasan |
| `server.test.ts` | 18 | ✅ Todos pasan |
| `eligibility.test.ts` | 11 | ✅ Todos pasan |
| **Total** | **143** | **✅ 143 / 143** |

> Las pruebas se ejecutan con `npm test`. Cubren la lógica del frontend (utils, hooks, componentes), el cliente HTTP (`api.ts`), la integración del backend multiusuario (Supertest + **MongoDB en memoria**) y los **escenarios de rechazo de compra** (`eligibility.test.ts`).

---

## Stack de pruebas

- **Framework**: Vitest 4.x
- **Utilidades de componentes**: @testing-library/react + @testing-library/user-event
- **Matchers adicionales**: @testing-library/jest-dom
- **Pruebas de backend**: Supertest (peticiones HTTP en memoria contra el `app` de Express)
- **Entorno**: jsdom (navegador simulado en Node.js)
- **Comando para ejecutar**: `npm test`

### Configuración relevante (`vitest.config.ts`)
```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./test/setup.ts'],
}
```

### Mocks globales (`test/setup.ts`)
- `localStorage`: mapeado a un `Map` en memoria para aislar pruebas
- `crypto.randomUUID`: devuelve un UUID secuencial (`uuid-1`, `uuid-2`, …)
- `motion/react`: todos los componentes `motion.*` se renderizan como su equivalente HTML nativo; `AnimatePresence` es un passthrough

---

## Detalle por módulo

### 1. `payments.test.ts` — Lógica de pagos (16 tests)

**Módulo probado**: `src/utils/payments.ts`

#### `calculateInstallmentPlans`
| Test | Descripción | Resultado |
|---|---|---|
| Bronce: planes 2 y 4 quincenas | Verifica que Bronce solo genera los planes de 2 y 4, sin 6 ni 8 | ✅ |
| Plata: hasta 6 quincenas | Plata incluye 6 pero no 8 | ✅ |
| Oro: hasta 8 quincenas con comisión | Oro incluye plan de 8 con `commissionRate = 0.015` y `totalAmount > monto base` | ✅ |
| Pago por quincena sin intereses | $2,000 / 2 quincenas = $1,000 exacto, comisión 0 | ✅ |
| Comisión correcta en plan extendido | $10,000 × 1.015 ≈ $10,150 para plan de 8 quincenas nivel Oro | ✅ |
| Límite de quincenas por nivel | Bronce no genera planes con más de 4 quincenas | ✅ |
| Monto cero | Con $0, el pago por quincena de cada plan también es $0 | ✅ |

#### `calculateCashback`
| Test | Descripción | Resultado |
|---|---|---|
| Bronce 0.5% | $1,000 × 0.005 = $5.00 | ✅ |
| Plata 1.5% | $2,000 × 0.015 = $30.00 | ✅ |
| Oro 2.5% | $4,000 × 0.025 = $100.00 | ✅ |
| Platino 5% | $10,000 × 0.05 = $500.00 | ✅ |
| Redondeo a 2 decimales | $333 × 0.005 = $1.665 → $1.67 | ✅ |

#### `formatMXN`
| Test | Descripción | Resultado |
|---|---|---|
| Separador de miles y decimales | 1299 → contiene `1,299` y `.00` | ✅ |
| Cero | 0 → contiene `0.00` | ✅ |
| Siempre 2 decimales | 500 → contiene `.00` | ✅ |
| Números grandes | 25000 → contiene `25,000` | ✅ |

---

### 2. `storage.test.ts` — Abstracción de localStorage (15 tests)

**Módulo probado**: `src/utils/storage.ts`

| Test | Descripción | Resultado |
|---|---|---|
| Auth: getAuth sin datos | Devuelve `{ isLoggedIn: false, user: null }` | ✅ |
| Auth: setAuth y getAuth | Persiste y recupera el estado de autenticación | ✅ |
| Auth: clearAuth | Vuelve al estado inicial después de limpiar | ✅ |
| Score: getScore sin datos | Devuelve `{ points: 0, level: 'Bronce', achievements: [] }` | ✅ |
| Score: setScore y getScore | Persiste y recupera puntos y nivel | ✅ |
| History: getHistory vacío | Devuelve array vacío | ✅ |
| History: setHistory y getHistory | Persiste y recupera el historial de compras | ✅ |
| Prefs: getPrefs sin datos | Devuelve `{ disabledSites: [] }` | ✅ |
| Prefs: setPrefs y getPrefs | Persiste sitios desactivados | ✅ |
| Aislamiento entre pruebas (auth) | `clearAuth` no afecta otras claves | ✅ |
| Aislamiento entre pruebas (score) | Datos de score no se mezclan con auth | ✅ |
| Auth: múltiples actualizaciones | La última escritura es la que persiste | ✅ |
| History: append manual | Agregar un elemento al historial funciona correctamente | ✅ |
| Prefs: múltiples sitios | Guarda y recupera array con múltiples sitios desactivados | ✅ |
| Limpieza entre pruebas | El mock de localStorage se reinicia antes de cada test | ✅ |

---

### 3. `constants.test.ts` — Constantes centralizadas (6 tests)

**Módulo probado**: `src/constants/kueski.ts`

| Test | Descripción | Resultado |
|---|---|---|
| Umbrales de nivel ascendentes | Bronce < Plata < Oro < Platino | ✅ |
| Tasas de cashback correctas | 0.5%, 1.5%, 2.5%, 5% respectivamente | ✅ |
| Límites de crédito sin huecos | El `max` de un nivel ≥ `min` del siguiente menos 1 | ✅ |
| Máximos de quincenas por nivel | Bronce ≤ 4, Plata ≤ 6, Oro ≤ 8, Platino ≤ 12 | ✅ |
| Todos los POINTS son positivos | Bienvenida, Compra, Pago, etc. tienen valores > 0 | ✅ |
| COMPATIBLE_SITES no vacío | Lista de sitios compatibles contiene al menos un elemento | ✅ |

---

### 4. `useScore.test.ts` — Hook de gamificación (11 tests)

**Módulo probado**: `src/hooks/useScore.ts`

| Test | Descripción | Resultado |
|---|---|---|
| Estado inicial | points=0, level='Bronce', achievements=[] | ✅ |
| addPoints suma puntos | Agregar 100 puntos resulta en 100 puntos totales | ✅ |
| Sube a Plata con 500 pts | Al llegar a 500 puntos el nivel cambia a Plata | ✅ |
| Sube a Oro con 1500 pts | Al llegar a 1500 el nivel cambia a Oro | ✅ |
| Sube a Platino con 4000 pts | Al llegar a 4000 el nivel cambia a Platino | ✅ |
| Persiste en localStorage | Los puntos y nivel se guardan en `kueski_score` | ✅ |
| Restaura desde localStorage | Al montar el hook recupera el estado previo | ✅ |
| completeAchievement suma puntos | Completar un logro añade sus puntos al total | ✅ |
| No duplica logros completados | Completar el mismo logro dos veces no duplica puntos | ✅ |
| reset vuelve al estado inicial | Puntos, nivel y logros se reinician | ✅ |
| nextLevelThreshold correcto | Para Bronce con 100 pts, el umbral del siguiente nivel es 500 | ✅ |

---

### 5. `useCart.test.ts` — Hook de carrito (10 tests)

**Módulo probado**: `src/hooks/useCart.ts`

| Test | Descripción | Resultado |
|---|---|---|
| Estado inicial vacío | items=[], total=0, isCheckingOut=false | ✅ |
| addItem agrega producto | El carrito contiene el artículo y el total es correcto | ✅ |
| addItem incrementa qty | Agregar el mismo artículo dos veces resulta en qty=2 | ✅ |
| total calculado | items con precio × qty se suman correctamente | ✅ |
| removeItem elimina un artículo | El carrito queda vacío después de remover el único artículo | ✅ |
| clearCart vacía el carrito | items=[], total=0 | ✅ |
| openCheckout activa la bandera | isCheckingOut pasa a true | ✅ |
| closeCheckout desactiva la bandera | isCheckingOut pasa a false | ✅ |
| total con múltiples artículos | Suma correcta de varios items con distintos precios y qtys | ✅ |
| removeItem no afecta otros items | Remover un artículo no altera los demás | ✅ |

---

### 6. `useAuth.test.ts` — Hook de autenticación (8 tests)

**Módulo probado**: `src/hooks/useAuth.ts`

| Test | Descripción | Resultado |
|---|---|---|
| Estado inicial sin sesión | isLoggedIn=false, user=null | ✅ |
| login con perfil del backend | Guarda nombre, nivel y crédito del `ApiUser` recibido | ✅ |
| login guarda el usuario | `user.email` corresponde al usuario logueado | ✅ |
| logout cierra sesión | isLoggedIn=false, user=null | ✅ |
| logout limpia localStorage | `kueski_auth` se elimina | ✅ |
| Persiste en localStorage | Tras login, `kueski_auth` guarda la sesión | ✅ |
| Restaura sesión previa | Al montar recupera sesión existente en localStorage | ✅ |
| Multiusuario | Cada usuario conserva su propio nivel y cashback | ✅ |

---

### 7. `KueskiBenefits.test.tsx` — Pantalla de bienvenida (6 tests)

**Componente probado**: `src/components/KueskiBenefits.tsx`

| Test | Descripción | Resultado |
|---|---|---|
| Título de bienvenida | Muestra "Bienvenido a Kueski Smart Widget" | ✅ |
| 5 tarjetas de beneficios | Paga en quincenas, Gana puntos, Cashback real, Ofertas personalizadas, Recordatorios inteligentes | ✅ |
| Botón de iniciar sesión | Existe un botón con texto /Iniciar sesión/i | ✅ |
| Callback onLoginClick | Al hacer clic en el botón, se llama onLoginClick | ✅ |
| Mensaje cashback 5% | Contiene texto /Hasta 5%/i | ✅ |
| Mensaje sobre quincenas | Contiene texto /12 pagos/i | ✅ |

---

### 8. `AuthModal.test.tsx` — Login usuario/contraseña (8 tests)

**Componente probado**: `src/components/AuthModal.tsx` (con `api.login` mockeado)

| Test | Descripción | Resultado |
|---|---|---|
| Campos visibles | Inputs de usuario y contraseña presentes | ✅ |
| Botón "Iniciar sesión" | Presente | ✅ |
| Enlace de registro | "Regístrate en Kueski" apunta a `https://www.kueski.com` | ✅ |
| Valida campos vacíos | Muestra "Ingresa tu usuario y contraseña" | ✅ |
| Login correcto | `onSuccess` se llama con el perfil (`ApiUser`) | ✅ |
| Credenciales inválidas | Muestra "Usuario o contraseña incorrectos" (401) | ✅ |
| Servidor no disponible | Muestra "No se pudo conectar..." | ✅ |
| Botón Cancelar llama onClose | Clic en /Cancelar/i invoca el callback | ✅ |

---

### 9. `PaymentSimulator.test.tsx` — Simulador de pagos (12 tests)

**Componente probado**: `src/components/PaymentSimulator.tsx`

| Test | Descripción | Resultado |
|---|---|---|
| Total del carrito formateado | $2,000 aparece en pantalla | ✅ |
| Nombre del sitio visible | "Amazon" se muestra en el componente | ✅ |
| Opciones 2 y 4 quincenas para Bronce | Planes de 2 y 4 quincenas presentes | ✅ |
| No muestra 8 quincenas para Bronce | Plan de 8 quincenas no existe en Bronce | ✅ |
| Hasta 6 quincenas para Plata | Plan de 6 quincenas visible con `userLevel="Plata"` | ✅ |
| Cashback estimado visible | Texto /Cashback estimado/i + /Bronce/i presentes | ✅ |
| Pago por quincena correcto | $2,000 / 2 quincenas = "1,000.00" en pantalla | ✅ |
| Badge "Sin intereses" | Al menos una etiqueta /Sin intereses/i visible | ✅ |
| Botón Cancelar llama onClose | Clic en /Cancelar/i invoca el callback onClose | ✅ |
| onConfirm con datos correctos | Al confirmar, callback recibe `{ amount: 2000, site: 'Amazon', cashback: <definido> }` | ✅ |
| Pantalla de éxito | Tras confirmar, aparece /¡Compra confirmada!/i | ✅ |
| Monto dinámico ($5,000) | Con `cartTotal=5000`, muestra "$5,000" y "$2,500.00" por quincena | ✅ |
| Adapta monto dinámicamente | El componente refleja cualquier `cartTotal` recibido como prop | ✅ |

---

### 10. `api.test.ts` — Cliente HTTP del frontend (9 tests)

**Módulo probado**: `src/utils/api.ts` (con `fetch` mockeado)

| Test | Descripción | Resultado |
|---|---|---|
| Token roundtrip | `setToken`/`getToken` persisten en `localStorage` (`kueski_token`) | ✅ |
| Token: limpiar | `setToken(null)` borra el token | ✅ |
| login guarda token | Guarda el access token y devuelve el perfil | ✅ |
| login 401 | Marca `invalidCredentials` cuando el server responde 401 | ✅ |
| login offline | No marca `invalidCredentials` si el server no responde | ✅ |
| Cabecera Authorization | Adjunta `Bearer <token>` cuando hay sesión | ✅ |
| Sin token | No adjunta `Authorization` si no hay sesión | ✅ |
| Fallback: fetch falla | `fetchUser` devuelve `null` ante error de red | ✅ |
| Fallback: respuesta no-ok | `fetchUser` devuelve `null` si `res.ok === false` | ✅ |
| savePurchase no lanza | Resuelve sin error aunque el servidor falle | ✅ |
| calculatePlans | Devuelve los planes y la elegibilidad del backend | ✅ |

### 11. `server.test.ts` — Integración del backend (18 tests)

**Módulo probado**: `server/server.js` (con Supertest y **MongoDB en memoria**)

| Grupo | Cobertura | Resultado |
|---|---|---|
| Health | `GET /api/health` responde `ok` | ✅ |
| Autenticación | login (200/401/400), refresh-token (200) | ✅ |
| Autorización / multiusuario | `GET /api/user` → 401 sin token; cada usuario obtiene su propio perfil; preferencias merge | ✅ |
| Score | sube de nivel y `levelChanged`; siguiente nivel; logro idempotente (200 → 409) | ✅ |
| **Planes personalizados** | Bronce (carlos) → [2,4]; Oro (diego) → [2,4,6,8] con comisión en 8 | ✅ |
| Compras / aislamiento | una compra de un usuario no aparece en el historial de otro; baja el crédito | ✅ |
| Cashback / Deals | acumula cashback; lista deals y marca el activo; suscribir inexistente (404) | ✅ |

> Usa `mongodb-memory-server` y re-siembra la base antes de cada prueba para aislar el estado.

### 12. `eligibility.test.ts` — Escenarios de rechazo de compra (11 tests)

**Probado**: `evaluateEligibility` (unitario) + `calculate-plans` / `POST /purchases` (integración).

| Caso | Resultado esperado | Resultado |
|---|---|---|
| Al corriente y dentro del crédito | `approved: true` | ✅ |
| Monto menor a $50 | `MONTO_INVALIDO` | ✅ |
| Usuario con pago vencido (`pedro`) | `MORA` (prioridad sobre crédito) | ✅ |
| 5 compras activas | `LIMITE_COMPRAS_ACTIVAS` | ✅ |
| Monto > crédito disponible | `CREDITO_INSUFICIENTE` | ✅ |
| `POST /purchases` no elegible | responde **422** y **no baja el crédito** | ✅ |

---

## Notas de implementación de pruebas

### Mock de fetch (fallback offline)
`test/setup.ts` reemplaza `global.fetch` por un mock que rechaza, simulando que el backend no está disponible. Así los tests de componentes/hooks ejercitan el fallback a `localStorage`. Los tests de `api.test.ts` sobreescriben el mock para simular respuestas concretas.


### Mock de localStorage
Cada prueba opera sobre un `Map` en memoria que se reinicia antes de cada test (`beforeEach`). Esto garantiza aislamiento total entre pruebas sin tocar el localStorage real del navegador.

### Mock de motion/react
Los componentes de Framer Motion (`motion.div`, `AnimatePresence`, etc.) se reemplazan por sus equivalentes HTML simples. Esto evita errores de contexto de animación en jsdom y hace las pruebas más rápidas y predecibles.

### Mock de crypto
`test/setup.ts` define `crypto.randomUUID` (determinista para los tests) **preservando** `getRandomValues`/`subtle` reales de Node, que el driver de MongoDB necesita.

### MongoDB en memoria
Los tests de backend (`server.test.ts`, `eligibility.test.ts`) levantan una instancia efímera con `mongodb-memory-server` y conectan Mongoose a ella vía `connectDB(uri)`. No tocan ninguna base real.
