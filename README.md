# Kueski Smart Widget

Extensión de Chrome que muestra el widget de Kueski Pay en tiendas compatibles (Amazon, MercadoLibre, Liverpool, Coppel, Elektra).

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- npm (incluido con Node.js)
- Google Chrome

## Instalación

```bash
# 1. Clona el repositorio
git clone https://github.com/a01647336/kueki-widget.git
cd kueki-widget

# 2. Instala las dependencias del frontend
npm install

# 3. Instala las dependencias del backend
cd server && npm install && cd ..
```

## Desarrollo

Abre dos terminales:

**Terminal 1 — Widget (frontend):**
```bash
npm run dev
```
Abre el navegador en `http://localhost:1012` para ver el widget sobre una página en blanco.

**Terminal 2 — Backend (opcional):**
```bash
cd server
npm start
```
Levanta la API en `http://localhost:3001`. Si no corre el backend, el widget usa localStorage como fallback.

## Build de la extensión

```bash
npm run build
```

Genera la extensión lista para instalar en `build/chrome-mv3-prod/`.

## Cargar la extensión en Chrome

1. Abre Chrome y ve a `chrome://extensions`
2. Activa el **Modo desarrollador** (toggle en la esquina superior derecha)
3. Haz clic en **"Cargar descomprimida"**
4. Selecciona la carpeta `build/chrome-mv3-prod/`
5. La extensión aparecerá en tu barra de Chrome

Después de cualquier cambio en el código, repite `npm run build` y recarga la extensión desde `chrome://extensions` con el botón de actualizar.

## Tests

```bash
npm test
```

## Sitios compatibles

- amazon.com.mx
- mercadolibre.com.mx
- liverpool.com.mx
- coppel.com
- elektra.com.mx
