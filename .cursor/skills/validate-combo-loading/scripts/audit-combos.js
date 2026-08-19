#!/usr/bin/env node
/**
 * Audits that all combos in the registry are loaded from their corresponding APIs.
 * Run from project root: node .cursor/skills/validate-combo-loading/scripts/audit-combos.js
 * Output: docs/COMBO_AUDIT_REPORT.md
 *
 * @see .cursor/skills/validate-combo-loading/SKILL.md
 */
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = process.cwd();
const WEB_SRC = path.join(PROJECT_ROOT, "apps/web/src");
const REGISTRY_PATH = path.join(WEB_SRC, "app/shared/data/combo-registry.ts");
const OUTPUT_PATH = path.join(PROJECT_ROOT, "docs/COMBO_AUDIT_REPORT.md");

function parseRegistry(content) {
  const entries = [];
  const entryRegex = /\{\s*component:\s*["']([^"']+)["'],\s*file:\s*["']([^"']+)["'],\s*field:\s*["']([^"']+)["'],\s*service:\s*["']([^"']+)["'],\s*method:\s*["']([^"']+)["'],\s*api:\s*["']([^"']+)["'][\s\S]*?\},/g;
  let m;
  while ((m = entryRegex.exec(content)) !== null) {
    entries.push({
      component: m[1],
      file: m[2],
      field: m[3],
      service: m[4],
      method: m[5],
      api: m[6],
    });
  }
  return entries;
}

function checkFile(entry) {
  const filePath = path.join(WEB_SRC, entry.file);
  if (!fs.existsSync(filePath)) {
    return { ok: false, reason: "FILE_NOT_FOUND" };
  }
  const content = fs.readFileSync(filePath, "utf8");

  // Check service injection (inject(ServiceName) or private x = inject(ServiceName))
  const serviceVarPattern = new RegExp(
    `(?:inject|private\\s+\\w+\\s*=\\s*inject)\\s*\\(\\s*${entry.service}\\s*\\)`,
    "i"
  );
  if (!serviceVarPattern.test(content)) {
    return { ok: false, reason: "SERVICE_NOT_INJECTED" };
  }

  // Check method call: serviceVar.methodName( or XService.methodName(
  const methodPattern = new RegExp(
    `\\.${escapeRegex(entry.method)}\\s*\\(`,
    "i"
  );
  if (!methodPattern.test(content)) {
    return { ok: false, reason: "METHOD_NOT_CALLED" };
  }

  // Check subscribe (data is actually used)
  if (!/\.subscribe\s*\(/.test(content)) {
    return { ok: false, reason: "NO_SUBSCRIBE" };
  }

  return { ok: true };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findUnregisteredCombos(entries) {
  const patterns = [
    { service: "BranchesService", method: "getAll" },
    { service: "ClientesService", method: "getAll" },
    { service: "ClientTypesService", method: "getAll" },
    { service: "InventarioRefaccionesService", method: "getCategories" },
    { service: "InventarioRefaccionesService", method: "getLocations" },
    { service: "InventarioUnidadesService", method: "getLocations" },
    { service: "InventarioUnidadesService", method: "getUnits" },
    { service: "ComprasService", method: "getSuppliers" },
    { service: "TallerService", method: "getMechanicsForBranch" },
    { service: "TallerService", method: "getVehiclesByClient" },
    { service: "CatalogoService", method: "getBrands" },
    { service: "CatalogoService", method: "getAll" },
    { service: "VehicleTypesService", method: "getAll" },
    { service: "CombustionTypesService", method: "getAll" },
    { service: "GlobalBrandsService", method: "getAll" },
    { service: "GarantiasService", method: "getVehiclesByClient" },
    { service: "VentasUnidadesService", method: "getCompatibleAccessories" },
  ];

  const formFiles = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !item.startsWith(".") && item !== "node_modules") {
        walk(full);
      } else if (stat.isFile() && item.endsWith(".ts") && !item.endsWith(".spec.ts")) {
        const rel = path.relative(WEB_SRC, full);
        if (
          rel.includes("/form/") ||
          rel.includes("/list/") ||
          rel.includes("/detail/") ||
          rel.includes("-form.ts") ||
          rel.includes("-list.ts") ||
          rel.includes("-detail.ts")
        ) {
          formFiles.push(rel);
        }
      }
    }
  }
  walk(WEB_SRC);

  const registryKeys = new Set(
    entries.map((e) => `${e.file}::${e.service}::${e.method}`)
  );

  const unregistered = [];
  for (const file of formFiles) {
    const content = fs.readFileSync(path.join(WEB_SRC, file), "utf8");
    for (const p of patterns) {
      const key = `${file}::${p.service}::${p.method}`;
      if (registryKeys.has(key)) continue;
      const re = new RegExp(`\\.${escapeRegex(p.method)}\\s*\\(`, "i");
      if (re.test(content) && content.includes(p.service)) {
        unregistered.push({ file, service: p.service, method: p.method });
      }
    }
  }
  return unregistered;
}

function main() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error("Registry not found:", REGISTRY_PATH);
    process.exit(1);
  }

  const registryContent = fs.readFileSync(REGISTRY_PATH, "utf8");
  const entries = parseRegistry(registryContent);

  const ok = [];
  const missing = [];
  const errors = [];

  for (const entry of entries) {
    const result = checkFile(entry);
    if (result.ok) {
      ok.push(entry);
    } else {
      missing.push({ ...entry, reason: result.reason });
    }
  }

  // Combos en código que no están en el registro
  const unregistered = findUnregisteredCombos(entries);

  // Build report
  const lines = [
    `# Auditoría de Combos — ${new Date().toISOString().split("T")[0]}`,
    "",
    "## OK (implementación correcta)",
    "",
    "| Componente | Campo | Servicio | API |",
    "|------------|-------|----------|-----|",
    ...ok.map((e) => `| ${e.component} | ${e.field} | ${e.service} | ${e.api} |`),
    "",
    "## Faltantes (en registro pero no implementado correctamente)",
    "",
  ];

  if (missing.length > 0) {
    lines.push("| Componente | Campo | Servicio | Razón |");
    lines.push("|------------|-------|----------|-------|");
    for (const m of missing) {
      const reason =
        m.reason === "FILE_NOT_FOUND"
          ? "Archivo no encontrado"
          : m.reason === "SERVICE_NOT_INJECTED"
            ? "Servicio no inyectado"
            : m.reason === "METHOD_NOT_CALLED"
              ? "Método no llamado"
              : m.reason;
      lines.push(`| ${m.component} | ${m.field} | ${m.service} | ${reason} |`);
    }
  } else {
    lines.push("Ninguno.");
  }

  lines.push("");
  lines.push("## Posibles combos sin registro");
  lines.push("");
  if (unregistered.length > 0) {
    const seen = new Set();
    const unique = unregistered.filter((u) => {
      const key = `${u.file}:${u.service}:${u.method}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    lines.push("| Archivo | Servicio | Método |");
    lines.push("|---------|----------|--------|");
    for (const u of unique) {
      lines.push(`| ${u.file} | ${u.service} | ${u.method} |`);
    }
  } else {
    lines.push("Ninguno detectado.");
  }

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("*Generado por `node .cursor/skills/validate-combo-loading/scripts/audit-combos.js`*");

  const report = lines.join("\n");

  const docsDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, report, "utf8");

  console.log(`Reporte generado: ${OUTPUT_PATH}`);
  console.log(`  OK: ${ok.length}`);
  console.log(`  Faltantes: ${missing.length}`);
  console.log(`  Posibles sin registro: ${unregistered.length}`);
}

main();
