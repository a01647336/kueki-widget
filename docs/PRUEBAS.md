# Pruebas del Sistema — Kueski Smart Widget

## Resumen de resultados

| Archivo de pruebas | Tests | Estado |
|---|---|---|
| `payments.test.ts` | 16 | ✅ Todos pasan |
| `storage.test.ts` | 15 | ✅ Todos pasan |
| `constants.test.ts` | 6 | ✅ Todos pasan |
| `useScore.test.ts` | 11 | ✅ Todos pasan |
| `useCart.test.ts` | 10 | ✅ Todos pasan |
| `useAuth.test.ts` | 8 | ✅ Todos pasan |
| `KueskiBenefits.test.tsx` | 6 | ✅ Todos pasan |
| `AuthModal.test.tsx` | 13 | ✅ Todos pasan |
| `PaymentSimulator.test.tsx` | 13 | ✅ Todos pasan |
| **Total** | **108** | **✅ 108 / 108** |

---

## Stack de pruebas

- **Framework**: Vitest 4.x
- **Utilidades de componentes**: @testing-library/react + @testing-library/user-event
- **Matchers adicionales**: @testing-library/jest-dom
- **Entorno**: jsdom (navegador simulado en Node.js)
- **Comando para ejecutar**: `npm test`

### Configuración relevante (`vite.config.ts`)
```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
}
```

### Mocks globales (`src/test/setup.ts`)
- `localStorage`: mapeado a un `Map` en memoria para aislar pruebas
- `crypto.randomUUID`: devuelve un UUID secuencial (`uuid-1`, `uuid-2`, …)
- `motion/react`: todos los componentes `motion.*` se renderizan como su equivalente HTML nativo; `AnimatePresence` es un passthrough

---

## Detalle por módulo

### 1. `payments.test.ts` — Lógica de pagos (16 tests)

**Módulo probado**: `src/app/utils/payments.ts`

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

**Módulo probado**: `src/app/utils/storage.ts`

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

**Módulo probado**: `src/app/constants/kueski.ts`

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

**Módulo probado**: `src/app/hooks/useScore.ts`

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

**Módulo probado**: `src/app/hooks/useCart.ts`

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

**Módulo probado**: `src/app/hooks/useAuth.ts`

| Test | Descripción | Resultado |
|---|---|---|
| Estado inicial sin sesión | isLoggedIn=false, user=null | ✅ |
| login establece sesión | isLoggedIn=true, user tiene nombre y nivel | ✅ |
| logout cierra sesión | isLoggedIn=false, user=null | ✅ |
| Persiste en localStorage | Tras login, `kueski_auth` guarda la sesión | ✅ |
| Restaura sesión previa | Al montar recupera sesión existente en localStorage | ✅ |
| Usuario tiene nivel Bronce inicial | El nivel inicial del usuario simulado es 'Bronce' | ✅ |
| Usuario tiene nombre | El campo `name` del usuario no está vacío | ✅ |
| login inicializa ScoreCoach | Al hacer login, `kueski_score` se inicializa con WELCOME_POINTS | ✅ |

---

### 7. `KueskiBenefits.test.tsx` — Pantalla de bienvenida (6 tests)

**Componente probado**: `src/app/components/KueskiBenefits.tsx`

| Test | Descripción | Resultado |
|---|---|---|
| Título de bienvenida | Muestra "Bienvenido a Kueski Smart Widget" | ✅ |
| 5 tarjetas de beneficios | Paga en quincenas, Gana puntos, Cashback real, Ofertas personalizadas, Recordatorios inteligentes | ✅ |
| Botón de iniciar sesión | Existe un botón con texto /Iniciar sesión/i | ✅ |
| Callback onLoginClick | Al hacer clic en el botón, se llama onLoginClick | ✅ |
| Mensaje cashback 5% | Contiene texto /Hasta 5%/i | ✅ |
| Mensaje sobre quincenas | Contiene texto /12 pagos/i | ✅ |

---

### 8. `AuthModal.test.tsx` — Modal de autenticación 2 pasos (13 tests)

**Componente probado**: `src/app/components/AuthModal.tsx`

#### Paso 1: Identificación
| Test | Descripción | Resultado |
|---|---|---|
| Input de email/teléfono visible | Placeholder /correo/i presente al renderizar | ✅ |
| Botón "Continuar" visible | Botón con nombre /Continuar/i presente | ✅ |
| Error con email inválido | "noesun@email" muestra mensaje de error /email o teléfono/i | ✅ |
| Avanza con email válido | "carlos@ejemplo.com" muestra /Verifica tu identidad/i | ✅ |
| Avanza con teléfono de 10 dígitos | "5512345678" avanza al paso 2 | ✅ |
| Botón Cancelar llama onClose | Clic en /Cancelar/i invoca el callback onClose | ✅ |

#### Paso 2: Verificación
| Test | Descripción | Resultado |
|---|---|---|
| Muestra 6 inputs numéricos | `getAllByRole('textbox').length >= 6` | ✅ |
| Botón "Verificar" desactivado sin código | Botón disabled cuando el código está vacío | ✅ |
| Botón se activa con 6 dígitos | Tras pegar "123456", el botón ya no está disabled | ✅ |
| Muestra el email enviado | El identificador ingresado aparece en el texto | ✅ |
| Link "Reenviar" presente | Texto /Reenviar/i visible | ✅ |
| Volver al paso 1 | Clic en /Cambiar identificador/i regresa al input de email | ✅ |
| onSuccess con el email correcto | Tras completar el código, `onSuccess` se llama con el email ingresado | ✅ |

> **Nota técnica**: Los tests del paso 2 que completan el código usan `fireEvent.paste` con un `clipboardData` mock que devuelve `'123456'`. Esto aprovecha el handler `onPaste` del componente, que establece los 6 dígitos en un solo `setState`. Este enfoque fue necesario porque jsdom no replica el comportamiento de auto-focus que el componente usa para mover el cursor entre inputs.

---

### 9. `PaymentSimulator.test.tsx` — Simulador de pagos (13 tests)

**Componente probado**: `src/app/components/PaymentSimulator.tsx`

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

## Notas de implementación de pruebas

### Mock de localStorage
Cada prueba opera sobre un `Map` en memoria que se reinicia antes de cada test (`beforeEach`). Esto garantiza aislamiento total entre pruebas sin tocar el localStorage real del navegador.

### Mock de motion/react
Los componentes de Framer Motion (`motion.div`, `AnimatePresence`, etc.) se reemplazan por sus equivalentes HTML simples. Esto evita errores de contexto de animación en jsdom y hace las pruebas más rápidas y predecibles.

### Estrategia para inputs OTP (código de 6 dígitos)
El componente `AuthModal` usa refs y auto-focus para mover el cursor entre inputs al escribir. Como jsdom no soporta el comportamiento de focus del navegador real, las pruebas que necesitan rellenar el código usan `fireEvent.paste` con un `clipboardData` mock, aprovechando el handler de pegado que el componente ya incluye (`handleCodePaste`).

### Tiempos de espera
El componente `AuthModal` simula 1 segundo de carga antes de llamar a `onSuccess`. Las pruebas que verifican este comportamiento usan `waitFor` con `timeout: 2000` para dar margen suficiente.
