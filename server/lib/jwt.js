/**
 * jwt.js — Firma y verificación de JSON Web Tokens (HS256)
 *
 * Implementación mínima usando solo el módulo `crypto` nativo de Node,
 * sin dependencias externas. Apropiada para el demo académico: no usa
 * datos reales de Kueski y la sesión es simulada.
 */

const crypto = require('crypto');

// Secreto de firma. En un entorno real vendría de una variable de entorno
// gestionada de forma segura; aquí tiene un default para el demo.
const SECRET = process.env.JWT_SECRET || 'kueski-smart-widget-dev-secret';

const ACCESS_TTL = 3600; // 1 hora
const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 días

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(payload, ttlSeconds = ACCESS_TTL) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedBody = base64url(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedBody}`;
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
}

/**
 * Verifica un token. Devuelve el payload si es válido y no ha expirado,
 * o `null` en cualquier otro caso.
 */
function verify(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedBody, signature] = parts;
  const data = `${encodedHeader}.${encodedBody}`;
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  // Comparación en tiempo constante para evitar timing attacks.
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedBody, 'base64').toString('utf8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Genera el par access/refresh para un usuario. */
function issueTokens(userId) {
  return {
    accessToken: sign({ sub: userId, type: 'access' }, ACCESS_TTL),
    refreshToken: sign({ sub: userId, type: 'refresh' }, REFRESH_TTL),
    expiresIn: ACCESS_TTL,
  };
}

/**
 * Middleware de Express: exige `Authorization: Bearer <accessToken>` válido.
 * Si pasa, deja el payload en `req.auth` y `req.userId`.
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const payload = match ? verify(match[1]) : null;

  if (!payload || payload.type !== 'access') {
    return res.status(401).json({ error: 'Token inválido o no proporcionado' });
  }
  req.auth = payload;
  req.userId = payload.sub;
  next();
}

module.exports = {
  sign,
  verify,
  issueTokens,
  authMiddleware,
  ACCESS_TTL,
  REFRESH_TTL,
};
