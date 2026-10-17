// server.js
// Simple Express server to serve protected media resources and a /redeem flow using token-based access.
// Purpose: Protect /media/T0_RECU/* and /media/PISOS/* so only holders of a valid QR token can access their purchased tomos.

const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cookieParser());

// Allow your frontend to call these endpoints. Adjust origin in production.
app.use(cors({ origin: true, credentials: true }));

const PORT = process.env.PORT || 3000;
const ENABLE_LICENSES = (process.env.ENABLE_LICENSES || 'true') === 'true';

// tokens.json is a small mapping token -> { allowed: [slug...], meta }
const TOKENS_FILE = path.join(__dirname, 'tokens.json');
let TOKENS = {};
function loadTokens() {
  try {
    TOKENS = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8') || '{}');
  } catch (e) {
    TOKENS = {};
  }
}
loadTokens();

// Helper: save tokens (admin may edit file directly)
function saveTokens() {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(TOKENS, null, 2));
}

// Middleware: require license for media routes if ENABLE_LICENSES
function requireLicenseFor(slugCheck) {
  return function (req, res, next) {
    if (!ENABLE_LICENSES) return next();

    const token = req.cookies && req.cookies.license_token;
    if (!token) return res.status(403).json({ error: 'Acceso denegado: sin token' });

    const entry = TOKENS[token];
    if (!entry) return res.status(403).json({ error: 'Acceso denegado: token inválido' });

    // Allow if the requested slug is in entry.allowed
    if (!entry.allowed || !Array.isArray(entry.allowed)) return res.status(403).json({ error: 'Acceso denegado' });

    const requested = slugCheck(req);
    if (entry.allowed.includes(requested)) {
      // optionally attach user info
      req.license = { token, allowed: entry.allowed, name: entry.name || null };
      return next();
    }

    return res.status(403).json({ error: 'Acceso denegado: no autorizado para este recurso' });
  };
}

// Redeem endpoint: /redeem?token=ABC&name=Nombre
// Sets a cookie with license_token and returns JSON { ok: true, allowed: [...] }
app.get('/redeem', (req, res) => {
  const token = String(req.query.token || '').trim();
  const name = String(req.query.name || '').trim();
  if (!token) return res.status(400).json({ error: 'Falta token' });

  loadTokens();
  const entry = TOKENS[token];
  if (!entry) return res.status(404).json({ error: 'Token no encontrado' });

  // Optionally verify expiry
  if (entry.expires) {
    const exp = new Date(entry.expires);
    if (isFinite(exp) && exp < new Date()) return res.status(410).json({ error: 'Token expirado' });
  }

  // Save name on token (optional, not required)
  if (name) entry.name = name;
  saveTokens();

  // Set cookie (httpOnly recommended); for local dev secure=false
  res.cookie('license_token', token, { httpOnly: true, sameSite: 'Lax' });

  return res.json({ ok: true, allowed: entry.allowed || [] });
});

// Serve media T0_RECU: /media/T0_RECU/:slug
app.get('/media/T0_RECU/:slug', requireLicenseFor((req) => String(req.params.slug)), (req, res) => {
  const slug = req.params.slug;
  const filePath = path.join(__dirname, 'media', 'T0_RECU', `${slug}.mp4`);
  if (!fs.existsSync(filePath)) return res.status(404).send('No encontrado');
  res.setHeader('Content-Type', 'video/mp4');
  res.sendFile(filePath);
});

// Serve media PISOS: /media/PISOS/:id
app.get('/media/PISOS/:id', requireLicenseFor((req) => String(req.params.id)), (req, res) => {
  const id = req.params.id;
  const filePath = path.join(__dirname, 'media', 'PISOS', `${id}.mp4`);
  if (!fs.existsSync(filePath)) return res.status(404).send('No encontrado');
  res.setHeader('Content-Type', 'video/mp4');
  res.sendFile(filePath);
});

// Simple tts proxy: not implemented here, placeholder for server-side TTS if available
app.get('/media/tts', (req, res) => {
  res.status(501).json({ error: 'TTS no implementado en este servidor. Use servicio externo o deje que el navegador haga speechSynthesis.' });
});

// Basic status route
app.get('/status', (req, res) => {
  res.json({ ok: true, env: { ENABLE_LICENSES } });
});

// Admin helper to list tokens (for deployment only; DO NOT enable on public servers without auth)
app.get('/admin/tokens', (req, res) => {
  res.json(TOKENS);
});

// Serve a minimal index for testing (optional)
app.use('/public', express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Media server running on port ${PORT} - ENABLE_LICENSES=${ENABLE_LICENSES}`);
});
