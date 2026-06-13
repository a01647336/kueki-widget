"""
Genera docs/Documentacion_Tecnica_Kueski.docx
Ejecutar: python3.13 docs/generar_documento.py
"""
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

OUTPUT = os.path.join(os.path.dirname(__file__), "Documentacion_Tecnica_Kueski.docx")


def set_font(run, size=11, bold=False, color=None):
    run.font.size = Pt(size)
    run.font.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)


def add_heading(doc, text, level):
    p = doc.add_heading(text, level=level)
    p.paragraph_format.space_before = Pt(10 if level <= 2 else 6)
    p.paragraph_format.space_after = Pt(4)
    return p


def add_para(doc, text, size=11, bold=False, italic=False, space_after=6):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(0)
    return p


def add_table(doc, headers, rows, col_widths=None):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Light Shading Accent 1"
    # Header row
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        run = hdr_cells[i].paragraphs[0].runs[0]
        run.font.bold = True
        run.font.size = Pt(10)
    # Data rows
    for r_idx, row_data in enumerate(rows):
        row_cells = table.rows[r_idx + 1].cells
        for c_idx, cell_text in enumerate(row_data):
            row_cells[c_idx].text = str(cell_text)
            for run in row_cells[c_idx].paragraphs[0].runs:
                run.font.size = Pt(9.5)
    # Column widths
    if col_widths:
        for row in table.rows:
            for i, cell in enumerate(row.cells):
                cell.width = Inches(col_widths[i])
    doc.add_paragraph()  # spacing after table
    return table


def build():
    doc = Document()
    # Default style
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    # ── PORTADA ──────────────────────────────────────────────────────────────
    doc.add_paragraph()
    doc.add_paragraph()
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("Kueski Smart Widget")
    run.font.size = Pt(22)
    run.font.bold = True

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run2 = subtitle.add_run("Documentacion Tecnica — Ciclo 2")
    run2.font.size = Pt(14)
    run2.font.bold = False

    doc.add_paragraph()
    doc.add_paragraph()

    meta = [
        ("Materia", "Construccion de Software y Toma de Decisiones (Gpo 501)"),
        ("Profesores", "Edgar Gerardo Salinas Gurrion · Mara Felix Fornes\n"
                       "Sergio A. Hernandez Villalvazo · Luis Raul Guerrero Aguilar"),
        ("Equipo", "Isaac Daniel Chavez Mares — A01647336\n"
                   "Gabriela Ruelas Gaytan — A01640880\n"
                   "Emilio Guzman Flores — A016434085\n"
                   "Samantha Mailen Gallardo Mota — A01640886"),
        ("Fecha", "12 de junio del 2026"),
    ]
    for label, value in meta:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r1 = p.add_run(label + ": ")
        r1.font.bold = True
        r1.font.size = Pt(11)
        r2 = p.add_run(value)
        r2.font.size = Pt(11)

    doc.add_page_break()

    # ── 1. FRONT-END ─────────────────────────────────────────────────────────
    add_heading(doc, "1. Front-End", 1)
    add_para(doc,
        "El Front-End del proyecto es una extension de navegador para Google Chrome desarrollada con el "
        "framework Plasmo (version 0.90). Su arquitectura sigue el Manifest V3 (MV3) de Chrome Extensions: "
        "un content script se inyecta en las paginas detectadas como sitios de e-commerce compatibles "
        "(Amazon, MercadoLibre, Liverpool, Coppel y Elektra) y monta el widget dentro de un Shadow DOM "
        "aislado, de modo que los estilos del sitio anfitron no interfieren con los del widget ni viceversa."
    )

    add_heading(doc, "1.1 Arquitectura de la extension", 2)
    add_para(doc,
        "El punto de entrada es contents/kueski-widget.tsx, que Plasmo compila como content script. "
        "Este archivo usa PriceDetector (src/utils/priceDetector.ts) para observar cambios en el DOM "
        "mediante MutationObserver y extraer el precio del carrito del sitio activo. El widget en si "
        "esta compuesto por los siguientes elementos:"
    )

    arch_items = [
        ("App.tsx", "Componente raiz que mantiene el estado global: sesion del usuario, historial de "
                    "compras, carrito y logros. Orquesta los handlers de compra y pago."),
        ("KueskiWidget.tsx", "Shell visual del widget: header con controles (minimizar, recordatorios, "
                             "cerrar), tabs de navegacion (Smart, Score, Deals) y renderizado condicional "
                             "del panel de recordatorios de pago."),
        ("PaymentSimulator.tsx", "Muestra los planes de pago disponibles para el monto del carrito "
                                  "detectado. Calcula quincenas, comisiones y cashback estimado."),
        ("ScoreCoach.tsx", "Panel de gamificacion: puntos, nivel, barra de progreso y logros con "
                           "indicadores de avance. Se auto-completan logros al detectar actividad real."),
        ("DealsFinder.tsx", "Muestra la oferta activa del sitio actual y el comparativo de beneficios "
                             "por tienda, consumiendo el endpoint GET /api/deals."),
        ("PaymentReminders.tsx", "Panel de recordatorios de pago. Muestra las proximas quincenas "
                                  "pendientes de cada compra activa y permite pagarlas de forma simulada."),
        ("AuthModal.tsx", "Formulario de inicio de sesion usuario/contrasena con validacion de "
                          "campos y manejo de errores de red o credenciales invalidas."),
    ]
    add_table(doc,
              ["Componente", "Responsabilidad"],
              arch_items,
              col_widths=[1.8, 4.5])

    add_heading(doc, "1.2 Patron offline-first", 2)
    add_para(doc,
        "El cliente HTTP (src/utils/api.ts) aplica un timeout de 8 segundos a cada peticion al backend. "
        "Si el servidor no responde o devuelve un error, el frontend recae sobre los datos guardados en "
        "localStorage mediante @plasmohq/storage. Los calculos de elegibilidad, planes de pago y calendario "
        "de pagos estan duplicados en el frontend (src/utils/payments.ts y src/utils/payments.ts) con las "
        "mismas reglas de negocio que el servidor, para garantizar coherencia sin conexion."
    )

    add_heading(doc, "1.3 Tecnologias del Front-End", 2)
    fe_techs = [
        ("Plasmo 0.90", "Framework para extensiones Chrome/Firefox con recarga en caliente y empaquetado MV3"),
        ("React 18", "Libreria de UI basada en componentes funcionales y hooks"),
        ("TypeScript", "Superset de JavaScript con tipado estatico; todos los archivos .tsx/.ts"),
        ("Tailwind CSS v3", "Utilidades CSS aplicadas directamente en JSX; estilos aislados en Shadow DOM"),
        ("Framer Motion", "Animaciones declarativas para transiciones de componentes"),
        ("Lucide React", "Libreria de iconos SVG ligeros"),
        ("@plasmohq/storage", "Abstraccion sobre chrome.storage / localStorage con API reactiva"),
        ("Vitest 4.x", "Framework de pruebas unitarias e integracion (frontend)"),
        ("@testing-library/react", "Utilidades para renderizar y consultar componentes en jsdom"),
    ]
    add_table(doc,
              ["Tecnologia", "Proposito"],
              fe_techs,
              col_widths=[2.0, 4.3])

    doc.add_page_break()

    # ── 2. BACK-END + API ─────────────────────────────────────────────────────
    add_heading(doc, "2. Back-End y API", 1)
    add_para(doc,
        "El Back-End es un servidor REST desarrollado con Node.js y el framework Express 4. "
        "Se comunica con una base de datos PostgreSQL alojada en Aiven usando el driver nativo pg, "
        "sin ORM. La autenticacion se implementa con bcrypt para el hash de contrasenas y JWT "
        "(algoritmo HS256) para las sesiones. Todos los endpoints (excepto login, refresh-token y health) "
        "requieren el header Authorization: Bearer <accessToken>."
    )

    add_heading(doc, "2.1 Motor de reglas de negocio (rules.js)", 2)
    add_para(doc,
        "El archivo server/lib/rules.js centraliza toda la logica de negocio en funciones puras "
        "sin efectos secundarios. Esto facilita las pruebas unitarias y garantiza coherencia entre "
        "los calculos del servidor y el fallback offline del frontend. Las funciones mas relevantes son:"
    )
    rules_items = [
        ("computeLevel(points)", "Devuelve el nivel (Bronce/Plata/Oro/Platino) segun los puntos acumulados"),
        ("applyDeal(amount, deal)", "Aplica el descuento de un deal al monto de la compra"),
        ("calculateCashback(amount, rate)", "Calcula el cashback redondeado a 2 decimales"),
        ("evaluateEligibility(user, amount)", "Valida si una compra puede aprobarse (mora, credito, limite activas, monto minimo)"),
        ("calculatePlans(amount, level)", "Genera los planes de quincenas disponibles segun nivel y comisiones"),
        ("buildPaymentSchedule(purchases)", "Calcula el calendario de pagos pendientes derivado de installments_paid"),
        ("nextPaymentFrom(purchases)", "Extrae el proximo pago mas cercano del calendario"),
    ]
    add_table(doc,
              ["Funcion", "Descripcion"],
              rules_items,
              col_widths=[2.5, 3.8])

    add_heading(doc, "2.2 Tecnologias del Back-End", 2)
    be_techs = [
        ("Node.js 20", "Entorno de ejecucion JavaScript del servidor"),
        ("Express 4", "Framework web minimalista para definir rutas y middlewares"),
        ("pg (node-postgres)", "Driver nativo PostgreSQL sin ORM; consultas parametrizadas"),
        ("bcrypt", "Hash seguro de contrasenas con sal aleatoria"),
        ("jsonwebtoken", "Generacion y verificacion de JWT HS256"),
        ("PostgreSQL (Aiven)", "Base de datos relacional en la nube; plan gratuito"),
        ("Render", "Plataforma PaaS para despliegue del servidor Node.js"),
        ("Supertest", "Pruebas de integracion HTTP en memoria contra la app Express"),
        ("pg-mem", "PostgreSQL en memoria para pruebas de backend sin BD real"),
    ]
    add_table(doc,
              ["Tecnologia", "Proposito"],
              be_techs,
              col_widths=[2.0, 4.3])

    add_heading(doc, "2.3 Descripcion de la API REST", 2)
    add_para(doc,
        "La API expone 20 endpoints agrupados en ocho secciones. El formato de intercambio es JSON "
        "en todos los casos. Los errores siguen convenciones HTTP estandar (400 datos invalidos, "
        "401 no autenticado, 404 recurso no encontrado, 409 conflicto, 422 no elegible). "
        "El campo nextPayment del perfil de usuario no es un valor estatico en la base de datos: "
        "se calcula dinamicamente en cada login y en cada GET /api/user a partir del calendario de "
        "pagos activos del usuario."
    )

    endpoints = [
        ("POST", "/api/auth/login", "Autentica usuario/contrasena; devuelve tokens y perfil completo"),
        ("POST", "/api/auth/logout", "Invalida el token de sesion actual"),
        ("POST", "/api/auth/refresh-token", "Renueva el access token con el refresh token"),
        ("GET", "/api/user", "Devuelve perfil (credito, nivel, nextPayment derivado)"),
        ("GET", "/api/user/preferences", "Preferencias: sitios desactivados y notificaciones"),
        ("PUT", "/api/user/preferences", "Actualiza preferencias (campos parciales)"),
        ("GET", "/api/user/score", "Puntos, nivel, progreso y lista de logros"),
        ("PUT", "/api/user/score", "Suma puntos y recalcula nivel/cashback/credito"),
        ("POST", "/api/user/achievements/:id/complete", "Marca logro completado e idempotente (+puntos)"),
        ("GET", "/api/deals", "Lista de deals activos, filtrable por sitio"),
        ("POST", "/api/deals/:id/subscribe", "Suscribe al usuario a alertas de un deal"),
        ("POST", "/api/purchases/calculate-plans", "Calcula planes y evalua elegibilidad para un monto"),
        ("POST", "/api/purchases", "Registra compra y descuenta credito disponible"),
        ("GET", "/api/purchases", "Historial de compras del usuario (filtros: status, site)"),
        ("GET", "/api/purchases/:id", "Detalle de una compra especifica"),
        ("PUT", "/api/purchases/:id/status", "Actualiza estado de una compra (activo/pagado)"),
        ("GET", "/api/user/payments/upcoming", "Proximas quincenas pendientes derivadas del calendario"),
        ("POST", "/api/purchases/:id/pay-installment", "Paga siguiente quincena; restaura credito"),
        ("GET", "/api/user/cashback", "Cashback total acumulado y detalle por compra"),
        ("GET", "/api/health", "Estado del servidor (sin autenticacion)"),
    ]
    add_table(doc,
              ["Metodo", "Ruta", "Descripcion"],
              endpoints,
              col_widths=[0.7, 2.8, 2.8])

    doc.add_page_break()

    # ── 3. BASE DE DATOS ──────────────────────────────────────────────────────
    add_heading(doc, "3. Interaccion con la Base de Datos", 1)
    add_para(doc,
        "La base de datos es PostgreSQL alojada en Aiven. El servidor se conecta mediante el driver "
        "nativo pg usando una cadena de conexion SSL con rejectUnauthorized: false para compatibilidad "
        "con los certificados de Aiven. No se utiliza ORM: todas las consultas son SQL parametrizado "
        "($1, $2, ...), lo que previene inyeccion SQL y permite control preciso sobre los queries. "
        "El esquema se crea al arrancar el servidor (migraciones idempotentes con IF NOT EXISTS)."
    )

    add_heading(doc, "3.1 Esquema de tablas", 2)
    add_para(doc, "La base de datos contiene tres tablas:", bold=False)

    tables_summary = [
        ("users", "Perfil del usuario: credenciales (hash bcrypt), nivel, credito disponible, "
                  "cashback_rate, score_points, logros (JSON), preferencias (JSON)"),
        ("purchases", "Compras registradas por usuario: monto, plan de quincenas, status "
                      "(activo/pagado/vencido), cashback otorgado e installments_paid para el calendario"),
        ("deals", "Promociones por sitio: tipo de descuento, valor y estado activo/inactivo"),
    ]
    add_table(doc,
              ["Tabla", "Contenido"],
              tables_summary,
              col_widths=[1.3, 5.0])

    add_para(doc,
        "El campo installments_paid en purchases permite derivar el calendario de pagos sin una tabla "
        "adicional: el vencimiento de la siguiente quincena de una compra se calcula como "
        "fecha_compra + 15 * (installments_paid + 1) dias. Cuando se paga una quincena, "
        "installments_paid sube en 1 y el available_credit del usuario se restaura por payment_per_period "
        "(con tope en credit_limit). Si installments_paid alcanza el total del plan, el status cambia "
        "automaticamente a 'pagado'."
    )

    add_heading(doc, "3.2 Operaciones principales", 2)
    ops = [
        ("Login", "users", "SELECT por username; bcrypt.compare; genera JWT"),
        ("Perfil", "users, purchases", "SELECT usuario + SELECT compras activas; nextPayment derivado en Node"),
        ("Calcular planes", "users", "SELECT credito y nivel; reglas en rules.js (sin escribir)"),
        ("Registrar compra", "purchases, users", "INSERT en purchases + UPDATE available_credit (dos statements)"),
        ("Pagar quincena", "purchases, users", "UPDATE installments_paid + UPDATE available_credit (dos statements)"),
        ("Completar logro", "users", "UPDATE achievements JSON + suma score_points + recalcula nivel"),
        ("Historial compras", "purchases", "SELECT filtrado por user_id, status y site opcionales"),
        ("Deals", "deals", "SELECT filtrado por site y active=true"),
        ("Cashback", "purchases", "SELECT SUM(cashback) + detalle por compra del usuario"),
    ]
    add_table(doc,
              ["Operacion", "Tabla(s)", "Descripcion"],
              ops,
              col_widths=[1.6, 1.7, 3.0])

    # ── ANEXO A ───────────────────────────────────────────────────────────────
    add_heading(doc, "Anexo A — Stored Procedures (Equivalente en Node.js)", 1)
    add_para(doc,
        "El proyecto no utiliza procedimientos almacenados en PL/pgSQL porque el driver pg con Express "
        "no requiere de ellos para implementar logica transaccional. La logica equivalente se encuentra "
        "en server/lib/rules.js (funciones puras) y en los handlers de server/server.js. Esta decision "
        "simplifica el despliegue (sin dependencias de esquema adicionales en Aiven) y facilita las "
        "pruebas unitarias, ya que las funciones de negocio se pueden invocar directamente sin una BD."
    )

    add_heading(doc, "A.1 Funciones equivalentes a procedimientos almacenados", 2)
    sp_equiv = [
        ("calculatePlans(amount, level)",
         "Genera los planes de quincenas con comisiones segun nivel. "
         "Equivale a un SP que recibe monto y nivel y devuelve un conjunto de filas con opciones de pago."),
        ("evaluateEligibility(user, amount)",
         "Valida mora, limite de compras activas, credito suficiente y monto minimo. "
         "Devuelve {approved, reason, message}. Equivale a un SP de validacion previa a una transaccion."),
        ("buildPaymentSchedule(purchases, now)",
         "Calcula el calendario completo de pagos pendientes a partir de installments_paid. "
         "Equivale a una funcion de tabla (table-valued function) que devuelve las proximas quincenas."),
        ("nextPaymentFrom(purchases, now)",
         "Extrae el pago mas proximo del calendario. Equivale a un SP que devuelve un unico registro."),
        ("applyDeal + calculateCashback",
         "Aplica el descuento de un deal y calcula el cashback. Equivale a un SP de calculo de beneficios."),
    ]
    add_table(doc,
              ["Funcion (Node.js)", "Equivalencia con Stored Procedure"],
              sp_equiv,
              col_widths=[2.3, 4.0])

    add_heading(doc, "A.2 Operaciones multi-statement con transacciones explicitas", 2)
    add_para(doc,
        "Dos operaciones del sistema involucran mas de un statement SQL que deben ejecutarse "
        "atomicamente. A continuacion se describe el patron BEGIN/COMMIT/ROLLBACK recomendado para "
        "garantizar atomicidad, equivalente a un stored procedure con transaccion explicita:"
    )

    add_para(doc, "Registrar compra (POST /api/purchases):", bold=True, size=10)
    add_para(doc,
        "BEGIN;\n"
        "  INSERT INTO purchases (id, user_id, site, amount, plan, ...) VALUES ($1, $2, ...);\n"
        "  UPDATE users SET available_credit = available_credit - $amount WHERE id = $user_id;\n"
        "COMMIT;\n"
        "-- En caso de error: ROLLBACK;",
        italic=True, size=10
    )

    add_para(doc, "Pagar quincena (POST /api/purchases/:id/pay-installment):", bold=True, size=10)
    add_para(doc,
        "BEGIN;\n"
        "  UPDATE purchases SET installments_paid = installments_paid + 1,\n"
        "         status = CASE WHEN installments_paid + 1 >= plan THEN 'pagado' ELSE status END\n"
        "  WHERE id = $purchaseId AND user_id = $userId;\n"
        "  UPDATE users SET available_credit = LEAST(credit_limit, available_credit + $paymentPerPeriod)\n"
        "  WHERE id = $userId;\n"
        "COMMIT;\n"
        "-- En caso de error: ROLLBACK;",
        italic=True, size=10
    )
    add_para(doc,
        "Estas transacciones garantizan que si una de las dos actualizaciones falla (por ejemplo, "
        "un error de red o restriccion de la BD), la otra se revierte automaticamente, evitando "
        "estados inconsistentes como credito descontado sin compra registrada."
    )

    # ── ANEXO B ───────────────────────────────────────────────────────────────
    add_heading(doc, "Anexo B — Triggers (Equivalente en la capa de aplicacion)", 1)
    add_para(doc,
        "PostgreSQL soporta triggers (disparadores) que ejecutan funciones automaticamente ante "
        "eventos como INSERT o UPDATE. En este proyecto, los efectos automaticos equivalentes "
        "se implementan en la capa de aplicacion (Node.js y React), invocando las funciones de "
        "negocio definidas en rules.js. A continuacion se describen los principales:"
    )

    triggers = [
        ("AFTER INSERT ON purchases",
         "Handler POST /api/purchases en server.js",
         "Al insertar una compra, descuenta el monto del available_credit del usuario. "
         "Equivale a un trigger que llame a un SP de actualizacion de credito."),
        ("AFTER UPDATE OF installments_paid ON purchases (cuando llega a plan)",
         "Handler POST /api/purchases/:id/pay-installment",
         "Cuando installments_paid alcanza el total del plan, cambia status a 'pagado' "
         "y restaura el credito. Equivale a un trigger de completado de compra."),
        ("AFTER POST /pay-installment (primer pago)",
         "App.tsx — handlePayInstallment",
         "Al pagar la primera quincena, dispara el logro 'on-time-payment' (+25 pts). "
         "Equivale a un trigger que invoca el SP de completar logro."),
        ("AFTER UPDATE OF score_points ON users",
         "PUT /api/user/score en server.js",
         "Al actualizar los puntos, recalcula nivel, cashback_rate y credit_limit segun los "
         "umbrales. Equivale a un trigger que invoca computeLevel y actualiza beneficios."),
        ("AFTER UPDATE en compras activas (frontend)",
         "useEffect en ScoreCoach.tsx",
         "Cuando cambia el historial de compras, evalua automaticamente si los logros "
         "'three-purchases' y 'thirty-days' deben completarse. Equivale a un trigger en el cliente."),
        ("MutationObserver (frontend)",
         "PriceDetector.ts en el content script",
         "Observa cambios en el DOM del sitio de e-commerce y extrae el precio del carrito "
         "cada vez que cambia. Equivale a un trigger de nivel de interfaz."),
    ]
    add_table(doc,
              ["Evento / Trigger equivalente", "Implementacion", "Efecto"],
              triggers,
              col_widths=[1.9, 1.7, 2.7])

    # ── ANEXO C ───────────────────────────────────────────────────────────────
    add_heading(doc, "Anexo C — Vistas (Equivalente: modelos de lectura derivados)", 1)
    add_para(doc,
        "Las vistas (Views) de SQL son consultas nombradas que presentan datos de una o varias "
        "tablas con transformaciones o agregaciones. En este proyecto, el equivalente son las "
        "funciones de serializacion y agregacion del servidor que producen representaciones "
        "derivadas de los datos almacenados:"
    )

    views = [
        ("Vista de perfil de usuario",
         "publicUser(user, purchases) en server.js",
         "Combina datos de users con nextPayment derivado de buildPaymentSchedule(purchases). "
         "Equivale a una vista JOIN users + sub-SELECT de proximos pagos."),
        ("Vista de calendario de pagos",
         "buildPaymentSchedule(purchases) en rules.js",
         "Proyeccion de las proximas quincenas pendientes de cada compra activa, ordenadas "
         "por vencimiento. Equivale a una vista sobre purchases con columnas calculadas."),
        ("Vista de cashback acumulado",
         "GET /api/user/cashback",
         "Agrega SUM(cashback) de todas las compras del usuario y devuelve el total mas el "
         "detalle. Equivale a una vista con GROUP BY + SUM."),
        ("Vista de score y logros",
         "GET /api/user/score",
         "Proyecta score_points, nivel calculado, pointsToNextLevel y logros deserializados "
         "del campo JSON. Equivale a una vista con campos calculados."),
        ("Vista de compra serializada",
         "serializePurchase(p) en server.js",
         "Transforma la fila de la tabla purchases (snake_case) al formato JSON camelCase "
         "que consume el frontend. Equivale a una vista de presentacion."),
        ("Vista de deals activos",
         "GET /api/deals",
         "Filtra deals por active=true y opcionalmente por site. "
         "Equivale a una vista filtrada sobre la tabla deals."),
    ]
    add_table(doc,
              ["Vista equivalente", "Implementacion", "Descripcion"],
              views,
              col_widths=[1.7, 2.0, 2.6])

    add_heading(doc, "Confirmacion de diseno de consultas", 2)
    add_para(doc,
        "Las consultas de lectura utilizan SQL parametrizado simple y no requieren cambios: "
        "los SELECT estan acotados por user_id (no hay fugas de datos entre usuarios) y los "
        "filtros opcionales se construyen con arrays de condiciones para evitar concatenacion "
        "de strings que podria introducir inyeccion SQL."
    )
    add_para(doc,
        "La mejora de diseno identificada es envolver las operaciones de escritura multi-statement "
        "(registrar compra y pagar quincena) en transacciones explicitas BEGIN/COMMIT/ROLLBACK, "
        "como se describe en el Anexo A. Esto garantizaria atomicidad completa ante fallos "
        "parciales y es la siguiente iteracion recomendada del backend."
    )

    doc.add_page_break()

    # ── 4. PRUEBAS ────────────────────────────────────────────────────────────
    add_heading(doc, "4. Pruebas", 1)
    add_para(doc,
        "El proyecto cuenta con una suite de pruebas automatizadas compuesta por 144 pruebas "
        "distribuidas en 12 archivos. Las pruebas cubren la logica del frontend (utilerias, hooks, "
        "componentes), el cliente HTTP, la integracion del backend multiusuario y los escenarios "
        "de rechazo de compras. Se ejecutan con el comando npm test."
    )

    add_heading(doc, "4.1 Stack de pruebas", 2)
    test_stack = [
        ("Vitest 4.x", "Framework de pruebas unitarias e integracion; compatible con la config de Vite/Plasmo"),
        ("@testing-library/react", "Renderiza componentes React en jsdom y permite consultas semanticas"),
        ("@testing-library/user-event", "Simula interacciones de usuario (click, type, etc.)"),
        ("@testing-library/jest-dom", "Matchers adicionales como toBeInTheDocument, toHaveTextContent"),
        ("Supertest", "Lanza peticiones HTTP en memoria contra la app Express sin iniciar un puerto real"),
        ("pg-mem", "Implementacion de PostgreSQL en memoria para aislar las pruebas de backend"),
        ("jsdom", "Entorno de navegador simulado en Node.js para los tests de componentes"),
    ]
    add_table(doc,
              ["Herramienta", "Proposito"],
              test_stack,
              col_widths=[2.0, 4.3])

    add_heading(doc, "4.2 Resumen de archivos de prueba", 2)
    test_files = [
        ("payments.test.ts", "16", "calculateInstallmentPlans, calculateCashback, formatMXN"),
        ("storage.test.ts", "12", "Persistencia y aislamiento en localStorage (auth, score, prefs)"),
        ("constants.test.ts", "19", "Umbrales de nivel, tasas de cashback, limites de credito"),
        ("useScore.test.ts", "12", "Hook de gamificacion: puntos, nivel, logros, persistencia"),
        ("useCart.test.ts", "10", "Hook de carrito: agregar, remover, total, checkout"),
        ("useAuth.test.ts", "8", "Hook de autenticacion: login, logout, persistencia, multiusuario"),
        ("KueskiBenefits.test.tsx", "6", "Pantalla de bienvenida: beneficios, boton de login"),
        ("AuthModal.test.tsx", "8", "Validacion de campos vacios, credenciales invalidas, error de red"),
        ("PaymentSimulator.test.tsx", "12", "Planes por nivel, cashback, confirmacion de compra"),
        ("api.test.ts", "11", "Token roundtrip, header Authorization, fallback offline"),
        ("server.test.ts", "18", "Integracion: login, perfil, score, compras, multiusuario, cashback"),
        ("eligibility.test.ts", "11", "Rechazos: MORA, MONTO_INVALIDO, CREDITO_INSUFICIENTE, LIMITE_COMPRAS"),
        ("TOTAL", "144", "Todos pasan"),
    ]
    add_table(doc,
              ["Archivo", "Tests", "Cobertura principal"],
              test_files,
              col_widths=[2.3, 0.6, 3.4])

    add_heading(doc, "4.3 Validaciones de datos destacadas", 2)
    add_para(doc,
        "La suite incluye validaciones especificas de datos de entrada y reglas de negocio. "
        "Los casos mas relevantes son los siguientes:"
    )
    validations = [
        ("MONTO_INVALIDO", "eligibility.test.ts",
         "Un monto menor a $50 es rechazado con approved: false y reason: MONTO_INVALIDO "
         "sin registrar la compra ni descontar credito."),
        ("MORA", "eligibility.test.ts",
         "El usuario pedro tiene una compra con status vencido. Cualquier intento de compra "
         "devuelve reason: MORA, con prioridad sobre las demas validaciones."),
        ("LIMITE_COMPRAS_ACTIVAS", "eligibility.test.ts",
         "Con 5 o mas compras activas, el sistema rechaza nuevas compras "
         "con reason: LIMITE_COMPRAS_ACTIVAS."),
        ("CREDITO_INSUFICIENTE", "eligibility.test.ts",
         "Si el monto supera el available_credit, approved: false y reason: CREDITO_INSUFICIENTE. "
         "El POST /purchases responde 422 y no modifica el credito."),
        ("Campos vacios en login", "AuthModal.test.tsx",
         "Si el usuario o la contrasena estan vacios al enviar el formulario, se muestra el "
         "mensaje 'Ingresa tu usuario y contrasena' sin realizar peticion al servidor."),
        ("Credenciales invalidas", "AuthModal.test.tsx",
         "Una respuesta 401 del backend muestra 'Usuario o contrasena incorrectos' al usuario."),
        ("Aislamiento multiusuario", "server.test.ts",
         "Una compra registrada por un usuario no aparece en el historial de otro usuario. "
         "El credito solo se descuenta de la cuenta que realizo la compra."),
        ("Logro idempotente", "server.test.ts",
         "Completar el mismo logro dos veces devuelve 409 en el segundo intento "
         "y no suma puntos adicionales."),
    ]
    add_table(doc,
              ["Validacion", "Archivo", "Descripcion"],
              validations,
              col_widths=[1.7, 1.5, 3.1])

    add_heading(doc, "4.4 Escenarios de prueba manual", 2)
    add_para(doc,
        "Ademas de la suite automatizada, se definieron escenarios de prueba manual para las "
        "funcionalidades nuevas del Ciclo 2:"
    )

    add_para(doc, "Recordatorios de pago:", bold=True, size=10)
    reminders_scenarios = [
        ("Login con diego/kueski123", "Badge amarillo en el icono de campana muestra 2 pagos pendientes"),
        ("Clic en el icono de campana", "Panel de recordatorios se abre con 2 pagos (Amazon ~19 jun, Coppel ~15 jun)"),
        ("Clic en Pagar en el pago de Coppel", "Confirmacion verde; el item desaparece o muestra la siguiente quincena"),
        ("Revisar tab Score", "El credito disponible subio en $666.67 tras el pago"),
    ]
    add_table(doc,
              ["Accion", "Resultado esperado"],
              reminders_scenarios,
              col_widths=[2.5, 3.8])

    add_para(doc, "Sistema de logros:", bold=True, size=10)
    logros_scenarios = [
        ("Login con carlos/kueski123", "Todos los logros bloqueados; 'three-purchases' muestra barra 1/3"),
        ("Pagar una quincena via recordatorios", "Logro 'pago a tiempo' se desbloquea (+25 pts)"),
        ("Login con sofia/kueski123", "Todos los logros completados (check verde)"),
        ("Login con ana/kueski123", "'three-purchases' muestra barra 2/3"),
    ]
    add_table(doc,
              ["Accion", "Resultado esperado"],
              logros_scenarios,
              col_widths=[2.5, 3.8])

    add_para(doc, "Credito y proximo pago dinamicos:", bold=True, size=10)
    credit_scenarios = [
        ("Login con ana/kueski123", "Credito disponible: $6,000; proximo pago ~17 jun $525"),
        ("Confirmar compra de $1,000", "Credito baja a ~$5,000 sin re-login"),
        ("Pagar una quincena", "Credito sube en $525; proximo pago avanza a la siguiente quincena"),
    ]
    add_table(doc,
              ["Accion", "Resultado esperado"],
              credit_scenarios,
              col_widths=[2.5, 3.8])

    add_para(doc, "Fix visual de Deals Finder:", bold=True, size=10)
    deals_scenarios = [
        ("Abrir tab Deals en sitio compatible", "La tarjeta de Oferta activa tiene fondo azul/gradiente legible de inmediato"),
        ("Esperar 2 segundos (carga de API)", "El color de la tarjeta NO cambia ni se vuelve transparente"),
        ("Probar con amazon y liverpool", "Cada sitio muestra su color de marca; texto siempre legible"),
    ]
    add_table(doc,
              ["Accion", "Resultado esperado"],
              deals_scenarios,
              col_widths=[2.5, 3.8])

    # Save
    doc.save(OUTPUT)
    print(f"Documento generado: {OUTPUT}")


if __name__ == "__main__":
    build()
