import { promises as fs } from "node:fs";
import path from "node:path";
import { buildI18nKeyInventory, ensureParentDir } from "./localization/zh-text-tools.mjs";

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, "client/src");
const ZH_FILE = path.join(ROOT, "client/src/locales/zh-CN/common.json");
const VI_FILE = path.join(ROOT, "client/src/locales/vi-VN/common.json");
const GLOSSARY_FILE = path.join(ROOT, "scripts/localization/zh-vi-glossary.json");
const MISSING_REPORT_FILE = path.join(ROOT, ".tmp/locale-vi-missing.json");

const EXTRA_ENTRIES = {
  "AI Novel Production Engine": {
    zh: "AI Novel Production Engine",
    vi: "Bộ máy sản xuất tiểu thuyết AI",
  },
};

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return {};
  }
}

function toSortedObject(entries) {
  return Object.fromEntries(
    [...entries].sort((left, right) => left[0].localeCompare(right[0], "zh-CN")),
  );
}

async function main() {
  const inventory = await buildI18nKeyInventory(TARGET_DIR);
  const glossary = await readJson(GLOSSARY_FILE);
  const existingZh = await readJson(ZH_FILE);
  const existingVi = await readJson(VI_FILE);

  const keys = new Set([
    ...inventory.map((item) => item.text),
    ...Object.keys(glossary),
    ...Object.keys(EXTRA_ENTRIES),
  ]);

  const zhEntries = [];
  const viEntries = [];
  const missing = [];

  for (const key of keys) {
    const extra = EXTRA_ENTRIES[key];
    const zhValue = existingZh[key] ?? extra?.zh ?? key;
    const existingViValue = existingVi[key];
    const hasDedicatedViTranslation = typeof existingViValue === "string"
      && existingViValue.trim().length > 0
      && existingViValue !== key
      && existingViValue !== zhValue;
    const viValue = hasDedicatedViTranslation
      ? existingViValue
      : glossary[key] ?? extra?.vi ?? existingViValue ?? key;

    zhEntries.push([key, zhValue]);
    viEntries.push([key, viValue]);

    if (viValue === zhValue) {
      missing.push(key);
    }
  }

  await ensureParentDir(ZH_FILE);
  await ensureParentDir(VI_FILE);
  await ensureParentDir(MISSING_REPORT_FILE);

  await fs.writeFile(ZH_FILE, `${JSON.stringify(toSortedObject(zhEntries), null, 2)}\n`, "utf8");
  await fs.writeFile(VI_FILE, `${JSON.stringify(toSortedObject(viEntries), null, 2)}\n`, "utf8");
  await fs.writeFile(
    MISSING_REPORT_FILE,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), missingCount: missing.length, items: missing }, null, 2)}\n`,
    "utf8",
  );

  console.log(`Generated ${keys.size} locale keys.`);
  console.log(`Missing Vietnamese translations: ${missing.length}`);
  console.log(`Missing report: ${path.relative(ROOT, MISSING_REPORT_FILE)}`);
}

await main();
