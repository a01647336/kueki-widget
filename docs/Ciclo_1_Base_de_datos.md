# Construcción de Software y Toma de Decisiones (Gpo 501)
### Ciclo 1 — Mockup

**Equipo:**
- Isaac Daniel Chavez Mares — A01647336
- Gabriela Ruelas Gaytán — A01640880
- Emilio Guzman Flores — A016434085
- Samantha Mailen Gallardo Mota — A01640886

**Fecha:** 15 de abril del 2026

**Profesores:**
Edgar Gerardo Salinas Gurrión · Mara Félix Fornés · Sergio A. Hernández Villalvazo · Luis Raúl Guerrero Aguilar

---

## 1. Introducción / Contexto

Actualmente, los servicios digitales como Kueski presentan un problema de baja recurrencia de uso, debido a que los usuarios tienden a utilizarlos solamente cuando la situación es urgente y después la plataforma deja de existir.

**Factores del problema:**
- Falta de integración en la vida cotidiana de los usuarios
- Ausencia de recordatorios
- Bajo valor percibido fuera de situaciones urgentes

**Solución propuesta:** Desarrollo del **Kueski Smart Widget**, una extensión de navegador que integra los servicios de Kueski en la navegación diaria del usuario mediante intervenciones inteligentes.

---

## 2. Requerimientos Funcionales

| ID       | Requerimiento |
|----------|---------------|
| FR-001   | El sistema debe reconocer cuando el usuario visita páginas web de tiendas en línea. |
| FR-002   | El sistema deberá mostrar recordatorios contextuales (Smart Reminder). |
| FR-003   | El sistema debe mostrar recomendaciones para pagar con Kueski. |
| FR-004   | El sistema debe indicar el progreso del usuario (Score Coach). |
| FR-005   | El sistema debe simular un sistema de niveles que funcione como gamificación. |
| FR-006   | El sistema debe identificar los sitios compatibles (Buscador de ofertas). |
| FR-007   | El sistema debe ofrecer sugerencias de uso en estos sitios. |
| FR-008   | El usuario debe poder cerrar o ignorar el widget. |

### 2.1 Casos de Uso (Diagramas UML)

**Caso 1: Smart Reminder**
Modela el proceso de cuando la extensión detecta que el usuario está en un sitio de comercio electrónico y muestra un recordatorio para utilizar los servicios de Kueski.
Flujo: Usuario abre navegador → navega a sitio web → el sistema detecta URL → si es tienda online, muestra widget Kueski → el usuario visualiza widget → si da clic en "Simular", se muestra simulación (calcular pagos + mostrar UI resultado); si no, ignora el widget.

**Caso 2: Score Coach**
Modela el progreso del usuario dentro del sistema usando gamificación, incentivando el uso frecuente.
Flujo: Usuario abre extensión → carga datos desde localStorage → si existen datos, muestra nivel y progreso; si no, inicializa en Nivel Bronce → usuario visualiza Score → si interactúa, actualiza progreso (guarda datos + actualiza barra visual); si no, mantiene estado.

**Caso 3: Deals Finder**
Modela la detección de sitios compatibles y muestra sugerencias al usuario para fomentar el uso de los servicios.
Flujo idéntico al Score Coach en cuanto a carga de datos y lógica de interacción, orientado a identificar ofertas relevantes.

---

## 3. Requerimientos No Funcionales

| ID       | Requerimiento |
|----------|---------------|
| NFR-001  | El sistema debe ejecutarse completamente en el frontend (extensión de navegador). |
| NFR-002  | El sistema debe responder en ≤ 2 segundos. |
| NFR-003  | El sistema no debe afectar el rendimiento del navegador (≤ 5%). |
| NFR-004  | La interfaz debe ser intuitiva y fácil de usar. |
| NFR-005  | El sistema debe ser no intrusivo. |
| NFR-006  | El sistema debe ser compatible con Google Chrome. |
| NFR-007  | El sistema debe funcionar sin conexión a APIs externas. |
| NFR-008  | El sistema debe garantizar una experiencia fluida en tiempo real. |

---

## 4. Requerimientos de Usabilidad (5 E's)

| Categoría           | Requerimiento | Métrica |
|---------------------|---------------|---------|
| Efectividad         | El usuario debe identificar correctamente las opciones de pago con Kueski en sitios de e-commerce. | ≥ 90% de usuarios reconocen la opción mostrada. |
| Efectividad         | El usuario debe poder visualizar su nivel y progreso en el Score Coach. | ≥ 95% de usuarios comprenden su nivel sin ayuda. |
| Efectividad         | El usuario debe entender las recomendaciones mostradas por el widget. | ≥ 90% de usuarios interpretan correctamente el mensaje. |
| Eficiencia          | El widget debe desplegarse automáticamente en menos de 2 segundos al detectar un sitio relevante. | Tiempo de respuesta ≤ 2 segundos. |
| Eficiencia          | El usuario debe acceder a la información principal sin interrumpir su navegación. | ≤ 1 interacción para visualizar información. |
| Eficiencia          | Las acciones del widget no deben ralentizar la navegación del usuario. | Impacto en rendimiento ≤ 5% del tiempo de carga. |
| Atractivo           | El diseño del widget debe ser visualmente atractivo y generar confianza. | Calificación de usuarios ≥ 4/5. |
| Atractivo           | El sistema debe motivar el uso recurrente mediante gamificación (Score Coach). | Incremento ≥ 30% en uso semanal. |
| Atractivo           | El usuario debe captar valor en las sugerencias del Deals Finder. | ≥ 85% de usuarios ven útiles las recomendaciones. |
| Tolerante a errores | El widget no puede mostrar información irrelevante para el usuario. | ≤ 5% de recomendaciones irrelevantes. |
| Tolerante a errores | El usuario debe poder cerrar el widget de manera sencilla. | ≥ 95% de usuarios logran cerrarlo fácilmente. |
| Tolerante a errores | El sistema tiene que prohibir invasiones durante la navegación. | ≥ 90% de usuarios no perciben interrupciones. |
| Fácil de aprender   | Cualquier usuario nuevo debe poder entender y navegar por el widget desde el primer uso. | ≥ 80% de éxito en el primer uso. |
| Fácil de aprender   | La interfaz tiene que ser intuitiva sin necesidad de instrucciones previas. | ≥ 85% de los usuarios concluyen las acciones necesarias sin ayuda. |
| Fácil de aprender   | Todas las partes del widget deben ser constantes y sencillas. | ≥ 90% de los usuarios entienden todos los elementos visuales. |

---

## 5. Definición de Perfiles de Usuario

### 5.1 Personas

**Perfil 1: Carlos**
- Comprador digital frecuente
- Edad: 25 años
- Ocupación: Profesionista joven
- Actividad: Compra frecuentemente en e-commerce
- Objetivo: Aprovechar ofertas y encontrar mejores formas de pago
- Frustraciones: No entender cuándo y cuánto terminará pagando; perder buenas ofertas
- Necesidad: Información clara al momento de realizar la compra

**Perfil 2: Ana**
- Usuaria ocasional
- Edad: 50 años
- Ocupación: Ama de casa
- Actividad: Compra ocasionalmente, solo por emergencia
- Objetivo: Comprar de forma clara, sencilla y segura
- Frustraciones: Desconfianza e interfaces complicadas
- Necesidad: Simplicidad, seguridad y confianza

### 5.2 Historias de Usuario

**Carlos:**
- Como usuario frecuente, **quiero** recibir sugerencias de pago en tiempo real **para** tomar mejores decisiones.
- Como usuario, **quiero** imitar pagos **para** entender cuánto pagaré antes de comprar.
- Como usuario, **quiero** poder seguir mi progreso en Score Coach **para** motivarme a usar el servicio.
- Como usuario, **quiero** ignorar o cerrar el widget fácilmente **para** no interrumpir mi navegación.
- Como usuario, **quiero** recibir sugerencias relevantes según el sitio donde estoy comprando.

**Ana:**
- Como usuaria ocasional, **quiero** poder ver información clara **para** confiar en el sistema.
- Como usuaria, **quiero** tener la posibilidad de cerrar el widget de manera sencilla **para** evitar interrupciones.
- Como usuaria, **quiero** poder entender fácilmente los beneficios.

### 5.3 Journey Maps

**Carlos:**

| Etapa          | Acción de usuario    | Emoción     | Problema            | Oportunidad       |
|----------------|----------------------|-------------|---------------------|-------------------|
| Descubrimiento | Navega en la tienda  | Neutral     | No conoce opciones  | Mostrar widget    |
| Evaluación     | Ve recomendación     | Interés     | Falta de claridad   | Simulación clara  |
| Decisión       | Usa Kueski           | Satisfacción| —                   | Refuerzo positivo |
| Retención      | Visualiza progreso   | Motivación  | —                   | Gamificación      |

**Ana:**

| Etapa          | Acción de usuario        | Emoción       | Problema              | Oportunidad             |
|----------------|--------------------------|---------------|-----------------------|-------------------------|
| Descubrimiento | Navega en la tienda      | Neutral       | No busca financiamiento | Mostrar widget        |
| Evaluación     | Lee info básica          | Desconfianza  | Percibe posible fraude | Simulación clara       |
| Decisión       | Decide no usar Kueski    | Seguridad     | Falta de confianza    | Construir confianza     |
| Retención      | Recuerda la herramienta  | Más confianza | Uso no inmediato      | Impactar en futuras visitas |

### 5.4 Empathy Maps

**Carlos:**
- **Piensa:** "¿Cuál es la mejor forma de pagar esto?"
- **Siente:** Curiosidad e interés
- **Dice:** "Esto podría ayudarme a pagar mejor"
- **Hace:** Comparar opciones antes de decidir

**Ana:**
- **Piensa:** "No quiero complicarme"
- **Siente:** Desconfianza
- **Dice:** "Solo lo usaré si es sencillo"
- **Hace:** Evita interactuar con herramientas complejas

---

## 6. MockUp

El mockup muestra el widget flotante con tres pestañas principales: **Smart**, **Score** y **Deals**.

Pantallas diseñadas:
- Widget de bienvenida con mensaje "Compra ahora y paga después" y botones "Usar Kueski" / "Ocultar"
- Vista de saldo disponible con próximo pago y botones "Ver progreso" / "Ver recomendaciones"
- Vista Smart Reminder en Amazon: opción de dividir pagos en quincenas sin intereses, lista de sitios compatibles
- Vista Score Coach: nivel actual (Bronce, 450/1000 pts), barra de progreso, niveles disponibles (Bronce → Plata → Oro → Platino), logros y tips
- Vista Deals Finder en Liverpool: oferta activa de envío gratis, comparativa de beneficios por tienda (Amazon, Mercado Libre, Liverpool) y próximas promociones

---

## 7. Ágil

### C. Features

**Smart Reminder**
- Función: Detecta cuando el usuario entra a sitios web compatibles con Kueski y despliega recordatorios sobre opciones de pago disponibles.
- Objetivo: Aumentar el uso de Kueski mediante recordatorios.
- Valor: Ayuda al usuario a considerar Kueski al momento de comprar.

**Simulación de Pagos**
- Función: Permite al usuario visualizar el monto total, plazos y pagos estimados antes de tomar una decisión de compra.
- Objetivo: Reducir incertidumbre y generar confianza.
- Valor: Reduce la desconfianza de los usuarios y mejora la toma de decisiones.

**Score Coach**
- Función: Muestra puntos, niveles y recompensas basados en el uso del servicio.
- Objetivo: Incentivar el uso de Kueski.
- Valor: Aumentar el atractivo hacia el uso de Kueski.

**Deals Finder**
- Función: Identifica promociones, descuentos y ofertas relevantes para el usuario.
- Objetivo: Incrementar el valor de Kueski.
- Valor: Genera ahorro y genera más interés.

**Control de Usuario**
- Función: Permite personalizar la interacción con el Widget.
- Objetivo: Garantizar una experiencia no intrusiva.
- Valor: Mejora la satisfacción del sistema.

### D. Escenarios

**Carlos:** Ingresa a una tienda de e-commerce → el sistema reconoce la página y muestra el widget → Carlos revisa la simulación de pago → elige usar Kueski → el Score Coach se actualiza, incentivando el uso continuo.

**Ana:** Ingresa a una tienda en línea → el widget aparece de forma no invasiva → revisa los datos y entiende cómo funciona → opta por no usarlo → le queda una percepción positiva para futuras ocasiones.

---

## 8. Bases de Datos y Diagramas

### A. Modelo Relacional (Diagrama de Clases)

Entidades y atributos principales:

| Entidad         | Atributos clave |
|-----------------|-----------------|
| Widget          | id_widget (PK), estado, tiempoRespuesta |
| Usuario         | id_usuario (PK), nombre, edad, tipoUsuario, frecuenciaUso |
| Interaccion     | id_interaccion (PK), tipo, fecha, id_usuario (FK) |
| ScoreCoach      | id_score (PK), puntos, progreso, id_usuario (FK) |
| Nivel           | id_nivel (PK), nombre, beneficio |
| SimulacionPago  | id_simulacion (PK), monto, plazo, pagoMensual, id_usuario (FK) |
| Recomendacion   | id_recomendacion (PK), mensaje, tipo, id_usuario (FK), id_sitio (FK) |
| SitioWeb        | id_sitio (PK), nombre, tipo, compatibleKueski (boolean) |
| Oferta          | id_oferta (PK), descripcion, descuento, id_sitio (FK) |

**Esquema real de la base de datos (PostgreSQL)**

Tabla `users`:

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | TEXT (PK) | UUID |
| username | TEXT UNIQUE | Login |
| password_hash | TEXT | Bcrypt hash |
| name | TEXT | Nombre |
| level | TEXT | Bronce / Plata / Oro / Platino |
| credit_limit | REAL | Limite de credito en MXN |
| available_credit | REAL | Credito disponible hoy |
| cashback_rate | REAL | Tasa segun nivel |
| score_points | INTEGER | Puntos acumulados |
| next_payment_date | TEXT | Reservado (nextPayment se deriva del calendario) |
| next_payment_amount | REAL | Reservado |
| achievements | TEXT | JSON array de logros con estado |
| disabled_sites | TEXT | JSON array de sitios desactivados |
| notif_deals | BOOLEAN | Alertas de promociones |
| notif_reminders | BOOLEAN | Recordatorios de pago |
| subscriptions | TEXT | JSON array de deal IDs suscritos |

Tabla `purchases`:

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | TEXT (PK) | UUID |
| user_id | TEXT (FK) | Referencia a users.id |
| site | TEXT | Tienda (amazon, mercadolibre, ...) |
| amount | REAL | Monto original |
| plan | INTEGER | Numero de quincenas |
| payment_per_period | REAL | Monto por quincena |
| cashback | REAL | Cashback otorgado |
| date | TEXT | Fecha ISO de la compra |
| status | TEXT | activo / pagado / vencido |
| deal_id | TEXT | ID del deal aplicado (nullable) |
| installments_paid | INTEGER | Quincenas ya pagadas (0 por defecto) |

> El campo `installments_paid` permite derivar el calendario de pagos sin una tabla separada: el proximo pago de una compra se calcula como `date + 15*(installments_paid+1)` dias. Al pagar una quincena, `installments_paid` sube en 1 y el credito disponible del usuario se restaura por `payment_per_period`.

Tabla `deals`:

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | INTEGER (PK) | |
| site | TEXT | Tienda |
| title | TEXT | Titulo |
| description | TEXT | |
| discount | TEXT | Etiqueta corta |
| tag | TEXT | Categoria |
| color | TEXT | Clases de color (uso interno) |
| active | BOOLEAN | |
| discount_type | TEXT | no_interest / cashback_bonus / free_shipping / unlock_installments |
| discount_value | REAL | Valor del descuento segun tipo |

### B. Modelo Entidad-Relación

Relaciones principales:
- Usuario **clasifica** → Nivel
- Usuario **tiene** → Interaccion
- Usuario **realiza** → SimulacionPago
- Usuario **crea** → Widget
- Usuario **usa** → ScoreCoach
- Usuario **recibe** → Recomendacion
- SitioWeb **genera** → Oferta
- SitioWeb **contiene** → Recomendacion

### C. Diagrama de Clases de Software

Clases del sistema con sus atributos:
- `Usuario`: id_usuario, nombre, edad, tipoUsuario, frecuenciaUso
- `Widget`: id_widget, estado, tiempoRespuesta
- `SimulacionPago`: id_simulacion, monto, plazo, pagoMensual
- `ScoreCoach`: id_score, puntos, progreso
- `Interaccion`: id_interaccion, tipo, fecha
- `Recomendacion`: id_recomendacion, mensaje, tipo
- `SitioWeb`: id_sitio, nombre, tipo, compatibleKueski
- `Oferta`: id_oferta, descripcion, descuento
- `Nivel`: id_nivel, nombre, beneficio

### D. Escenarios por Persona

**Carlos:** Usuario joven que disfruta comprar en e-commerce. Al entrar a una tienda compatible, Kueski detecta el sitio y muestra una recomendación contextual. Carlos revisa la simulación de pagos, compara si la opción se ajusta a su presupuesto y, al decidir utilizar Kueski, el sistema registra la interacción y actualiza su Score Coach.

**Ana:** Usuaria que compra ocasionalmente en línea y desconfía de los servicios financieros. Al navegar en una tienda compatible, Kueski muestra un mensaje simple y no invasivo. Ana revisa la información y observa los beneficios, pero decide cerrar el widget. El sistema detecta la interacción como "cerrar" sin ser invasivo ni interrumpir si decide seguir comprando.

---

## Enlaces

- **Presentación:** https://canva.link/w0jy9e57mru1s3z
- **MockUp (Figma):** https://www.figma.com/make/sMpV1jJ9GxMuUcK4KdH8G7/Kueski-Smart-Widget-Mockup
- **Video:** https://youtu.be/zJIkbBZ4mqo
