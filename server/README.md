# Kueski Widget — Backend

Servidor simple en **Express.js** con persistencia en **archivo JSON** (`kueski_db.json`). No requiere instalación de bases de datos.

## Requisitos

- Node.js 18+

## Instalación y arranque

```bash
cd server
npm install
npm start
```

El servidor queda disponible en `http://localhost:3001`.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/api/health` | Health check |
| `GET`  | `/api/user` | Datos del usuario (Carlos Mendoza) |
| `PUT`  | `/api/user/score` | Actualizar puntos `{ points: number }` |
| `GET`  | `/api/deals?site=amazon` | Ofertas activas filtradas por sitio |
| `GET`  | `/api/purchases` | Historial de compras |
| `POST` | `/api/purchases` | Registrar nueva compra |

## Base de datos

Los datos se guardan en `server/kueski_db.json` (generado automáticamente al primer arranque).

**Estructura:**
```json
{
  "users": [...],
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
