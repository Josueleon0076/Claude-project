// Almacenamiento sencillo en un archivo JSON (data/db.json).
// Suficiente para una tienda con miles de productos y decenas de pantallas;
// se escribe de forma atómica (archivo temporal + rename) para no corromperlo.
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const SAMPLE = {
  settings: {
    storeName: 'Mi Farmacia',
    appUrl: 'https://example.com/app',
    regularPriceLabel: 'Precio regular',
    footer: 'Consulta los términos y condiciones en tienda',
  },
  products: {
    '020800755726': {
      sku: '020800755726',
      name: 'PEPTO BISMOL PLUS ORAL 236 ML LIQ',
      department: 'GASTROENTEROLOGIA',
      price: 245,
      regularPrice: 279,
      barcode: '020800755726',
      updatedAt: new Date().toISOString(),
    },
  },
  screens: {
    'pasillo-1': {
      id: 'pasillo-1',
      name: 'Pasillo 1 - Estante A',
      skus: ['020800755726'],
      rotateSeconds: 8,
      theme: 'light',
    },
  },
};

let db;

function load() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } else {
    db = SAMPLE;
    save();
  }
  return db;
}

function save() {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

module.exports = { load, save };
