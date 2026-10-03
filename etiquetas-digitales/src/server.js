// Servidor de etiquetas digitales.
//  - /admin            Panel para dar de alta productos, precios y pantallas
//  - /display/:id      Página que se abre en cada mini pantalla (tablet, Raspberry Pi, etc.)
//  - /api/...          API REST; los cambios se envían al instante a las pantallas (SSE)
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const bwipjs = require('bwip-js');
const store = require('./store');
const { parseCsv } = require('./csv');

const PORT = Number(process.env.PORT) || 8080;
const ADMIN_KEY = process.env.ADMIN_KEY || crypto.randomBytes(4).toString('hex');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (_req, res) => res.redirect('/admin'));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin.html')));
app.get('/display/:id', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'display.html')));

function requireAdmin(req, res, next) {
  if (req.get('x-admin-key') !== ADMIN_KEY) return res.status(401).json({ error: 'Clave de administrador incorrecta' });
  next();
}

// ---------- Tiempo real: pantallas conectadas por Server-Sent Events ----------
const clients = new Map(); // screenId -> Set<res>
const lastSeen = {}; // screenId -> ISO date

function displayPayload(screenId) {
  const db = store.load();
  const screen = db.screens[screenId];
  if (!screen) return null;
  return {
    settings: db.settings,
    screen,
    products: screen.skus.map((sku) => db.products[sku]).filter(Boolean),
  };
}

function notifyScreens(filter = () => true) {
  const db = store.load();
  for (const [screenId, set] of clients) {
    const screen = db.screens[screenId];
    if (screen && !filter(screen)) continue;
    const data = `data: ${JSON.stringify(displayPayload(screenId))}\n\n`;
    for (const res of set) res.write(data);
  }
}

app.get('/api/display/:id', (req, res) => {
  const payload = displayPayload(req.params.id);
  if (!payload) return res.status(404).json({ error: 'Pantalla no registrada' });
  res.json(payload);
});

app.get('/api/display/:id/events', (req, res) => {
  const id = req.params.id;
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  if (!clients.has(id)) clients.set(id, new Set());
  clients.get(id).add(res);
  lastSeen[id] = new Date().toISOString();
  res.write(`data: ${JSON.stringify(displayPayload(id))}\n\n`);
  const ping = setInterval(() => {
    lastSeen[id] = new Date().toISOString();
    res.write(': ping\n\n');
  }, 25000);
  req.on('close', () => {
    clearInterval(ping);
    clients.get(id)?.delete(res);
  });
});

// ---------- Códigos de barras y QR (SVG generado en el servidor, sin internet) ----------
function sendSvg(res, opts) {
  try {
    res.type('image/svg+xml').set('Cache-Control', 'public, max-age=86400').send(bwipjs.toSVG(opts));
  } catch (err) {
    res.status(400).send(String(err.message || err));
  }
}

app.get('/barcode/:code.svg', (req, res) => {
  const code = req.params.code;
  // EAN-13 / UPC-A si el código lo permite; Code 128 para todo lo demás.
  const bcid = /^\d{13}$/.test(code) ? 'ean13' : /^\d{12}$/.test(code) ? 'upca' : 'code128';
  sendSvg(res, { bcid, text: code, height: 12, includetext: false });
});

app.get('/qr.svg', (req, res) => sendSvg(res, { bcid: 'qrcode', text: String(req.query.text || ' ') }));

// ---------- Administración ----------
app.post('/api/login', requireAdmin, (_req, res) => res.json({ ok: true }));

app.get('/api/state', requireAdmin, (_req, res) => {
  const db = store.load();
  const screens = Object.values(db.screens).map((s) => ({
    ...s,
    online: (clients.get(s.id)?.size || 0) > 0,
    lastSeen: lastSeen[s.id] || null,
  }));
  res.json({ settings: db.settings, products: Object.values(db.products), screens });
});

function cleanProduct(input) {
  const sku = String(input.sku || '').trim();
  const name = String(input.name || '').trim();
  const price = Number(input.price);
  if (!sku || !name || !Number.isFinite(price) || price < 0) {
    throw new Error(`Producto inválido (SKU, nombre y precio son obligatorios): ${sku || name || '?'}`);
  }
  const regular = Number(input.regularPrice);
  return {
    sku,
    name,
    department: String(input.department || '').trim(),
    price: Math.round(price * 100) / 100,
    regularPrice: Number.isFinite(regular) && regular > price ? Math.round(regular * 100) / 100 : null,
    barcode: String(input.barcode || sku).trim(),
    updatedAt: new Date().toISOString(),
  };
}

const showsSku = (sku) => (screen) => screen.skus.includes(sku);

app.put('/api/products/:sku', requireAdmin, (req, res) => {
  const db = store.load();
  let product;
  try {
    product = cleanProduct({ ...req.body, sku: req.params.sku });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  db.products[product.sku] = product;
  store.save();
  notifyScreens(showsSku(product.sku));
  res.json(product);
});

app.delete('/api/products/:sku', requireAdmin, (req, res) => {
  const db = store.load();
  delete db.products[req.params.sku];
  store.save();
  notifyScreens(showsSku(req.params.sku));
  res.json({ ok: true });
});

// Importación masiva: pega/sube un CSV exportado de tu sistema de punto de venta o Excel.
app.post('/api/products/import', requireAdmin, (req, res) => {
  const db = store.load();
  const rows = parseCsv(typeof req.body === 'string' ? req.body : '');
  const errors = [];
  let count = 0;
  for (const row of rows) {
    try {
      const prev = db.products[row.sku] || {};
      const product = cleanProduct({ ...prev, ...row });
      db.products[product.sku] = product;
      count++;
    } catch (err) {
      errors.push(err.message);
    }
  }
  store.save();
  notifyScreens();
  res.json({ imported: count, errors });
});

app.put('/api/screens/:id', requireAdmin, (req, res) => {
  const db = store.load();
  const id = req.params.id.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
  if (!id) return res.status(400).json({ error: 'ID de pantalla inválido' });
  const skus = (Array.isArray(req.body.skus) ? req.body.skus : String(req.body.skus || '').split(/[\s,;]+/))
    .map((s) => String(s).trim())
    .filter(Boolean);
  db.screens[id] = {
    id,
    name: String(req.body.name || id).trim(),
    skus,
    rotateSeconds: Math.max(3, Number(req.body.rotateSeconds) || 8),
    theme: req.body.theme === 'dark' ? 'dark' : 'light',
  };
  store.save();
  notifyScreens((s) => s.id === id);
  res.json(db.screens[id]);
});

app.delete('/api/screens/:id', requireAdmin, (req, res) => {
  const db = store.load();
  delete db.screens[req.params.id];
  store.save();
  res.json({ ok: true });
});

app.put('/api/settings', requireAdmin, (req, res) => {
  const db = store.load();
  const allowed = ['storeName', 'appUrl', 'regularPriceLabel', 'footer'];
  for (const key of allowed) if (key in req.body) db.settings[key] = String(req.body[key]);
  store.save();
  notifyScreens();
  res.json(db.settings);
});

store.load();
app.listen(PORT, () => {
  console.log(`Etiquetas digitales en http://localhost:${PORT}`);
  console.log(`Panel: http://localhost:${PORT}/admin   Pantalla de ejemplo: http://localhost:${PORT}/display/pasillo-1`);
  if (!process.env.ADMIN_KEY) console.log(`ADMIN_KEY no definida; clave temporal para el panel: ${ADMIN_KEY}`);
});
