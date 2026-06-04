# Kueski Smart Widget — Contexto del sistema

## ¿Qué es?

Extensión de navegador simulada como app React que integra los servicios de Kueski Pay en la navegación cotidiana del usuario mediante intervenciones inteligentes y no intrusivas. El objetivo es aumentar la recurrencia de uso de Kueski más allá de situaciones de urgencia.

---

## Módulos del sistema

### 1. Autenticación con 2FA

Flujo en 2 pasos:
1. **Identificación**: el usuario ingresa su email o número de teléfono (10 dígitos)
2. **Verificación**: se ingresan 6 dígitos en inputs individuales con auto-focus (cualquier combinación válida para el demo)

Estado persistido en `localStorage` bajo la clave `kueski_auth`. Al iniciar sesión, se otorgan puntos de bienvenida (+200) si es la primera vez.

Usuario simulado post-login:
- Nombre: Carlos Mendoza
- Nivel: Bronce
- Crédito disponible: $1,950 MXN (de $2,500 MXN)
- Próximo pago: 1 de junio 2026

---

### 2. Carrito dinámico

El carrito vive como estado en `App.tsx` y se comparte entre `MockWebsite` (escribe) y `KueskiWidget` (lee):

- Cada producto en el sitio simulado tiene botón **Agregar al carrito** con control de cantidad
- El header del sitio muestra badge con total actualizado en tiempo real
- Botón **Ir al pago** dispara el `CartPopup`
- `CartPopup` muestra el resumen del carrito y el CTA de Kueski Pay

---

### 3. Smart Reminder

Detecta el sitio actual y actúa según el estado:

| Sitio | Sin sesión | Con sesión + carrito vacío | Con sesión + carrito con items |
|---|---|---|---|
| Compatible | CTA "Inicia sesión" | "Agrega productos al carrito" | Botón "Simular pago ($X,XXX)" |
| No compatible | Mensaje de espera | Mensaje de espera | Mensaje de espera |

Sitios compatibles: Amazon, Mercado Libre, Liverpool, Coppel, Elektra.

---

### 4. Simulación de pagos

Recibe el `cartTotal` dinámico del carrito y muestra planes quincenales según el nivel del usuario:

| Plan | Condición | Comisión |
|---|---|---|
| 2 quincenas | Todos los niveles | Sin intereses |
| 4 quincenas | Todos los niveles | Sin intereses |
| 6 quincenas | Plata o superior | Sin intereses |
| 8 quincenas | Oro o superior | +1.5% |
| 12 quincenas | Platino | +1.5% |

Al confirmar: +50 puntos al Score Coach + registro en historial con cashback calculado.

---

### 5. Score Coach — Sistema de gamificación

| Nivel | Puntos | Límite de crédito | Cashback | Quincenas disponibles |
|---|---|---|---|---|
| **Bronce** | 0 – 499 | $500 – $2,500 MXN | 0.5% | 2 – 4 |
| **Plata** | 500 – 1,499 | $2,501 – $8,000 MXN | 1.5% | 4 – 6 |
| **Oro** | 1,500 – 3,999 | $8,001 – $15,000 MXN | 2.5% | Hasta 8 |
| **Platino** | 4,000+ | $15,001 – $25,000 MXN | 5% | Hasta 12 |

**Puntos por acción:**
| Acción | Puntos |
|---|---|
| Bienvenida (primer login) | +200 |
| Compra con Kueski Pay | +50 |
| Pago a tiempo (por quincena) | +25 |
| Compra completada (todos los pagos) | +100 |
| 30 días consecutivos sin mora | +150 |
| Referir a un amigo | +300 |

Los logros son interactivos: al hacer clic en un logro pendiente se completa y se suman los puntos correspondientes. La barra de progreso se anima con Framer Motion. Todo se persiste en `localStorage`.

*Fuente de valores: Kueski Pay T&C de cashback vigentes, mercado BNPL México (Aplazo, Klarna México, Mercado Pago).*

---

### 6. Deals Finder

- Muestra la **oferta activa** según el sitio actual (resaltada con color de la tienda)
- Lista todas las ofertas disponibles con indicador de activo/inactivo
- Sección **Próximamente** con promociones futuras (Hot Sale, El Buen Fin)

---

### 7. Perfil de usuario (post-login)

Visible en la pestaña **Score** después de las métricas de gamificación:
- Nombre, inicial/avatar, nivel
- Crédito disponible y límite total
- Próximo pago (fecha y monto)
- Porcentaje de cashback según nivel
- **Toggle** para activar/desactivar el widget en el sitio actual
- **Historial de compras** expandible con transacciones registradas durante el demo

---

### 8. KueskiBenefits (vista sin sesión)

Pantalla de bienvenida que muestra los beneficios del widget antes de pedir inicio de sesión:
1. 💳 Paga en quincenas
2. 🏆 Gana puntos (Score Coach)
3. 💰 Cashback real (hasta 5%)
4. 🎯 Ofertas personalizadas (Deals Finder)
5. 🔔 Recordatorios inteligentes (Smart Reminder)

CTA principal: **Iniciar sesión / Crear cuenta** → abre el flujo de 2FA.

---

## Stack técnico

| Tecnología | Uso |
|---|---|
| React 18 + TypeScript | Framework principal |
| Tailwind CSS | Estilos utilitarios |
| Framer Motion (`motion/react`) | Animaciones |
| Lucide React | Íconos |
| Vite | Bundler y dev server |
| localStorage | Persistencia de datos (sin backend) |

---

## Arquitectura del estado

```
App.tsx (estado global)
  ├── useAuth()         → isLoggedIn, user, login(), logout()
  ├── useCart()         → items, total, addItem(), removeItem(), openCheckout()
  ├── useScore()        → points, level, achievements, addPoints()
  └── purchases[]       → historial, persistido via storage.setHistory()
       │
       ├── MockWebsite   ← escribe al carrito, muestra productos dinámicos por sitio
       ├── KueskiWidget  ← lee auth, carrito, score; coordina todos los flujos
       └── CartPopup     ← lee carrito, dispara auth o simulador
```

---

## Datos persistidos en localStorage

| Clave | Tipo | Contenido |
|---|---|---|
| `kueski_auth` | `AuthData` | `{ isLoggedIn, user }` |
| `kueski_score` | `ScoreState` | `{ points, level, achievements }` |
| `kueski_history` | `Purchase[]` | Lista de compras confirmadas |
| `kueski_prefs` | `UserPreferences` | `{ disabledSites: string[] }` |

---

## Estructura de archivos

```
src/app/
├── App.tsx                        — estado global, composición de la app
├── components/
│   ├── AuthModal.tsx              — login 2FA en 2 pasos
│   ├── CartPopup.tsx              — popup de carrito y CTA de pago
│   ├── DealsFinder.tsx            — ofertas por tienda
│   ├── KueskiBenefits.tsx         — pantalla de bienvenida sin sesión
│   ├── KueskiWidget.tsx           — contenedor del widget flotante
│   ├── MockWebsite.tsx            — sitio web simulado con carrito
│   ├── PaymentSimulator.tsx       — simulador de pagos quincenales
│   ├── PurchaseHistory.tsx        — historial de compras
│   ├── ScoreCoach.tsx             — gamificación y niveles
│   ├── SmartReminder.tsx          — recordatorio contextual
│   └── UserProfile.tsx            — perfil post-login
├── hooks/
│   ├── useAuth.ts                 — estado de autenticación
│   ├── useCart.ts                 — estado del carrito
│   └── useScore.ts                — puntos, nivel y logros
├── constants/
│   └── kueski.ts                  — umbrales, tasas, puntos — sin números mágicos en componentes
├── utils/
│   ├── storage.ts                 — abstracción de localStorage (funciones tipadas)
│   └── payments.ts                — cálculo de quincenas, cashback, formateo MXN
└── types/
    └── index.ts                   — interfaces TypeScript: User, CartItem, Purchase, etc.
```

---

## Flujo de verificación

1. Abrir app → widget muestra **KueskiBenefits** con 5 cards de beneficios
2. "Iniciar sesión" → AuthModal Paso 1: email o teléfono → Continuar
3. Paso 2: ingresar 6 dígitos → Verificar → 1 segundo de loading → login exitoso
4. Widget muestra nombre y nivel del usuario en el header
5. Agregar productos al carrito en Amazon → badge del header se actualiza en tiempo real
6. Botón "Ir al pago" → CartPopup con resumen y CTA "Simular pago"
7. SmartReminder muestra "Simular pago — $X,XXX MXN" con el total real del carrito
8. PaymentSimulator: elegir 4 quincenas → cashback calculado → Confirmar
9. ScoreCoach: +50 pts, barra de progreso animada
10. Historial registra la transacción con cashback
11. Toggle en perfil desactiva el CartPopup para Amazon
12. Cerrar sesión → vuelve a KueskiBenefits
13. Recargar página → localStorage mantiene sesión, historial y puntos
