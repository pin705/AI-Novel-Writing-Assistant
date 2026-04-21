import { promises as fs } from "node:fs";
import path from "node:path";
import ts from "typescript";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const HAN_REGEX = /\p{Script=Han}/u;

export function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

export function containsHan(value) {
  return HAN_REGEX.test(value);
}

function getScriptKind(filePath) {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (filePath.endsWith(".ts")) return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

function getCallName(expression) {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    const base = getCallName(expression.expression);
    return base ? `${base}.${expression.name.text}` : expression.name.text;
  }
  return null;
}

export async function walkSourceFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkSourceFiles(fullPath));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

export function collectHanStrings(content) {
  const found = new Map();

  const stringLiteralRegex = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/gu;
  let match = stringLiteralRegex.exec(content);
  while (match) {
    const normalized = normalizeText(match[2]);
    if (normalized && containsHan(normalized)) {
      found.set(normalized, (found.get(normalized) ?? 0) + 1);
    }
    match = stringLiteralRegex.exec(content);
  }

  const jsxTextRegex = />\s*([^<>{]*\p{Script=Han}[^<>{]*)\s*</gu;
  match = jsxTextRegex.exec(content);
  while (match) {
    const normalized = normalizeText(match[1]);
    if (normalized && containsHan(normalized)) {
      found.set(normalized, (found.get(normalized) ?? 0) + 1);
    }
    match = jsxTextRegex.exec(content);
  }

  return found;
}

export async function buildHanInventory(rootDir) {
  const files = await walkSourceFiles(rootDir);
  const inventory = new Map();

  for (const filePath of files) {
    const content = await fs.readFile(filePath, "utf8");
    const matches = collectHanStrings(content);

    for (const [text, count] of matches) {
      const current = inventory.get(text) ?? {
        text,
        occurrences: 0,
        files: [],
      };
      current.occurrences += count;
      current.files.push(path.relative(process.cwd(), filePath));
      inventory.set(text, current);
    }
  }

  return [...inventory.values()]
    .map((item) => ({
      ...item,
      files: [...new Set(item.files)].sort(),
    }))
    .sort((left, right) => {
      if (right.occurrences !== left.occurrences) {
        return right.occurrences - left.occurrences;
      }
      if (right.text.length !== left.text.length) {
        return right.text.length - left.text.length;
      }
      return left.text.localeCompare(right.text);
    });
}

export function collectI18nKeys(content, filePath = "source.ts") {
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, getScriptKind(filePath));
  const found = new Map();

  function add(text) {
    const normalized = normalizeText(text);
    if (!normalized) {
      return;
    }
    found.set(normalized, (found.get(normalized) ?? 0) + 1);
  }

  function visit(node) {
    if (ts.isCallExpression(node) && getCallName(node.expression) === "t") {
      const [firstArg] = node.arguments;
      if (firstArg && (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg))) {
        add(firstArg.text);
      }
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

export async function buildI18nKeyInventory(rootDir) {
  const files = await walkSourceFiles(rootDir);
  const inventory = new Map();

  for (const filePath of files) {
    const content = await fs.readFile(filePath, "utf8");
    const matches = collectI18nKeys(content, filePath);

    for (const [text, count] of matches) {
      const current = inventory.get(text) ?? {
        text,
        occurrences: 0,
        files: [],
      };
      current.occurrences += count;
      current.files.push(path.relative(process.cwd(), filePath));
      inventory.set(text, current);
    }
  }

  return [...inventory.values()]
    .map((item) => ({
      ...item,
      files: [...new Set(item.files)].sort(),
    }))
    .sort((left, right) => {
      if (right.occurrences !== left.occurrences) {
        return right.occurrences - left.occurrences;
      }
      if (right.text.length !== left.text.length) {
        return right.text.length - left.text.length;
      }
      return left.text.localeCompare(right.text);
    });
}

export async function ensureParentDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}
