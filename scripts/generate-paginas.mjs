import fs from "node:fs";
import path from "node:path";

const PAGES_DIR = path.join("content", "paginas");
const OUT_FILE = path.join("data", "paginas.json");

function parseFrontmatter(md) {
  if (!md.startsWith("---")) return {};
  const end = md.indexOf("\n---", 3);
  if (end === -1) return {};

  const raw = md.slice(3, end).trim();
  const data = {};

  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf(":");
    if (i === -1) continue;

    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();

    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    data[key] = val;
  }
  return data;
}

const entries = fs.readdirSync(PAGES_DIR, { withFileTypes: true })
  .filter(e => e.isFile() && e.name.endsWith(".md"))
  .map(e => e.name)
  .sort((a, b) => a.localeCompare(b, "pt"));

const items = [];

for (const filename of entries) {
  const fullPath = path.join(PAGES_DIR, filename);
  const slug = filename.replace(/\.md$/i, "");

  const md = fs.readFileSync(fullPath, "utf8");
  const fm = parseFrontmatter(md);

  // extrair conteúdo (body)
  let body = md;
  if (md.startsWith("---")) {
    const end = md.indexOf("\n---", 3);
    if (end !== -1) {
      body = md.slice(end + 4);
    }
  }

  const title = (fm.title || slug).trim();

  // Mantém apenas páginas válidas
  if (!slug || !title) continue;

  items.push({
    slug,
    title,
    description: (fm.description || "").trim(),
    body: body.trim()
  });
}

// Ordenação por título
items.sort((a, b) =>
  a.title.localeCompare(b.title, "pt", { sensitivity: "base" })
);

// garantir pasta data
fs.mkdirSync(path.join("data"), { recursive: true });

fs.writeFileSync(OUT_FILE, JSON.stringify(items, null, 2) + "\n", "utf8");

console.log(`✔ Gerado ${OUT_FILE} com ${items.length} página(s).`);
