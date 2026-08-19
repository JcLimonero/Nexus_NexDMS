#!/usr/bin/env node
/**
 * Finds potential Spanish identifiers in apps/web/src.
 * Run from project root: node .cursor/skills/validate-english-naming-and-test/scripts/find-spanish-names.js
 * Output: JSON to stdout for SPANISH_NAMING_REPORT.md
 */
const fs = require('fs');
const path = require('path');

const MAP = {
  clientes: 'clients',
  catalogo: 'catalog',
  'inventario-refacciones': 'parts-inventory',
  'inventario-unidades': 'units-inventory',
  compras: 'purchases',
  almacen: 'warehouse',
  caja: 'cash-register',
  ventas: 'sales',
  cotizaciones: 'quotes',
  taller: 'workshop',
  garantias: 'warranties',
  configuracion: 'settings',
  contactos: 'contacts',
  'ordenes-compra': 'purchase-orders',
  'ordenes-servicio': 'service-orders',
  'tipos-vehiculo': 'vehicle-types',
  'tipos-combustion': 'combustion-types',
  categorias: 'categories',
  ubicaciones: 'locations',
};

function walkDir(dir, ext, results = []) {
  if (!fs.existsSync(dir)) return results;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.isDirectory() && !f.startsWith('.') && f !== 'node_modules') {
      walkDir(fp, ext, results);
    } else if (stat.isFile() && ext.some((e) => f.endsWith(e))) {
      results.push(fp);
    }
  }
  return results;
}

const projectRoot = process.cwd();
const src = path.join(projectRoot, 'apps/web/src');

if (!fs.existsSync(src)) {
  console.log(JSON.stringify({ error: 'apps/web/src not found' }));
  process.exit(1);
}

const files = walkDir(src, ['.ts', '.html']);
const findings = [];

// Sort by path length so compound paths (e.g. inventario-refacciones) match before single words
const sortedEntries = Object.entries(MAP).sort(
  (a, b) => b[0].length - a[0].length
);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    for (const [es, en] of sortedEntries) {
      const escaped = es.replace(/-/g, '[-]');
      const re = new RegExp(`['"\`/]?${escaped}['"\`/]?|\\b${escaped}\\b`, 'gi');
      if (re.test(line)) {
        findings.push({
          file: path.relative(projectRoot, file),
          line: i + 1,
          content: line.trim().substring(0, 120),
          spanish: es,
          suggested: en,
        });
      }
    }
  });
}

console.log(JSON.stringify(findings, null, 2));
