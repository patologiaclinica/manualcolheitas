import fs from "node:fs";
import path from "node:path";

const TESTS_DIR = path.join("content", "testes");
const OUT_FILE = path.join("data", "index.json");

function parseFrontmatter(md) {
  if (!md.startsWith("---")) return {};

  const end = md.indexOf("\n---", 3);
  if (end === -1) return {};

  const raw = md.slice(3, end).replace(/\r\n/g, "\n");
  const lines = raw.split("\n");

  const data = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ignorar linhas vazias ou comentários
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      i++;
      continue;
    }

    const key = match[1];
    let val = match[2] || "";

    // Campo multilinha YAML (|, |+, |-, >, >+, >-)
    if (/^[|>][+-]?$/.test(val.trim())) {
      i++;

      const blockLines = [];
      while (i < lines.length) {
        const nextLine = lines[i];

        // Se aparecer uma nova chave no mesmo nível, termina o bloco
        if (/^[A-Za-z0-9_-]+:\s*/.test(nextLine) && !nextLine.startsWith(" ")) {
          break;
        }

        // Remove até 2 espaços de indentação comuns do bloco
        blockLines.push(nextLine.replace(/^  /, ""));
        i++;
      }

      val = blockLines.join("\n").trimEnd();
      data[key] = val;
      continue;
    }

    // remover aspas se houver
    val = val.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    data[key] = val;
    i++;
  }

  return data;
}

const entries = fs.readdirSync(TESTS_DIR, { withFileTypes: true })
  .filter(e => e.isFile() && e.name.endsWith(".md"))
  .map(e => e.name)
  .filter(name => name.toLowerCase() !== "index.json")
  .sort((a, b) => a.localeCompare(b, "pt"));

const items = [];

for (const filename of entries) {
  const fullPath = path.join(TESTS_DIR, filename);
  const slug = filename.replace(/\.md$/i, "");

  const md = fs.readFileSync(fullPath, "utf8");
  const fm = parseFrontmatter(md);

  const title = (fm.title || slug).trim();
  const area = (fm.area || "").trim();

  // Mantém apenas entradas válidas para catálogo
  if (!slug || !title || !area) continue;

  items.push({
    slug,
    title,
    area,

    metodo: (fm.metodo || "").trim(),
    amostra: (fm.amostra || "").trim(),
    material_colheita: (fm.material_colheita || "").trim(),

    descricao_clinica: (fm.descricao_clinica || "").trim(),
    indicacao: (fm.indicacao || "").trim(),

    transporte_estabilidade: (fm.transporte_estabilidade || "").trim(),
    tempo_resposta: (fm.tempo_resposta || "").trim(),
    setor: (fm.setor || "").trim(),
    observacoes: (fm.observacoes || "").trim()
  });
}

// Ordenação final por título (pt-PT)
items.sort((a, b) =>
  a.title.localeCompare(b.title, "pt", { sensitivity: "base" })
);

// garantir que a pasta data existe
fs.mkdirSync(path.join("data"), { recursive: true });

fs.writeFileSync(OUT_FILE, JSON.stringify(items, null, 2) + "\n", "utf8");

console.log(`✔ Gerado ${OUT_FILE} com ${items.length} teste(s).`);
