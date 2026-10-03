// Lector de CSV mínimo (soporta comillas, comas o punto y coma como separador)
// y acepta encabezados en español o inglés.
const HEADERS = {
  sku: 'sku',
  codigo: 'sku',
  nombre: 'name',
  name: 'name',
  descripcion: 'name',
  departamento: 'department',
  department: 'department',
  categoria: 'department',
  precio: 'price',
  price: 'price',
  precio_regular: 'regularPrice',
  precio_anterior: 'regularPrice',
  regularprice: 'regularPrice',
  codigo_barras: 'barcode',
  barcode: 'barcode',
};

function splitLine(line, sep) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeHeader(h) {
  return h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s-]+/g, '_');
}

// "$1,245.50" -> 1245.5 ; "245,50" (coma decimal) -> 245.5
function parsePrice(value) {
  const s = value.replace(/[$\s]/g, '');
  return /^\d+,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
}

function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const keys = splitLine(lines[0], sep).map((h) => HEADERS[normalizeHeader(h)] || null);
  return lines.slice(1).map((line) => {
    const cells = splitLine(line, sep);
    const row = {};
    keys.forEach((key, i) => {
      if (key && cells[i] !== undefined && cells[i] !== '') row[key] = cells[i];
    });
    for (const k of ['price', 'regularPrice']) if (row[k]) row[k] = parsePrice(row[k]);
    return row;
  });
}

module.exports = { parseCsv };
