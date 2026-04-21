import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEFAULT_SOURCE_FILE = "client/src/locales/zh-CN/common.json";
const DEFAULT_TARGET_FILE = "client/src/locales/vi-VN/common.json";
const DEFAULT_SOURCE_LANGUAGE = "zh-CN";
const DEFAULT_TARGET_LANGUAGE = "vi";
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_CHARS = 24_000;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_TRANSPORT = "auto";
const WEB_BATCH_SIZE_LIMIT = 20;
const WEB_MAX_CHARS_LIMIT = 3_500;
const PLACEHOLDER_REGEX = /{{\s*[^{}]+\s*}}/g;
const HAN_REGEX = /\p{Script=Han}/u;
const LETTER_REGEX = /\p{L}/u;
const TRANSPORTS = new Set(["auto", "official", "web"]);

function printHelp() {
  console.log(`Translate client common.json into Vietnamese with Google Translate.

Usage:
  pnpm locale:i18n:translate:vi
  GOOGLE_TRANSLATE_API_KEY=... pnpm locale:i18n:translate:vi

Options:
  --source <path>      Source JSON file. Default: ${DEFAULT_SOURCE_FILE}
  --target <path>      Target JSON file. Default: ${DEFAULT_TARGET_FILE}
  --from <lang>        Google source language. Default: ${DEFAULT_SOURCE_LANGUAGE}
  --to <lang>          Google target language. Default: ${DEFAULT_TARGET_LANGUAGE}
  --batch-size <num>   Max strings per request. Default: ${DEFAULT_BATCH_SIZE}
  --max-chars <num>    Max source characters per request. Default: ${DEFAULT_MAX_CHARS}
  --concurrency <num>  Number of batches to translate in parallel. Default: ${DEFAULT_CONCURRENCY}
  --transport <mode>   auto, official, or web. Default: ${DEFAULT_TRANSPORT}
  --limit <num>        Translate only the first N eligible entries.
  --all                Retranslate every source entry.
  --dry-run            Show what would be translated without calling Google or writing files.
  --api-key <key>      Google Translate API key. Prefer GOOGLE_TRANSLATE_API_KEY env.
  --help               Show this help.

By default, the script only translates missing, empty, unchanged, or still-Chinese
vi-VN entries, then backs up the existing target file before writing.

When no API key is available, auto mode uses Google's public web translate
endpoint. It is convenient but unofficial, so use smaller batches if it rate
limits.`);
}

function parseArgs(argv) {
  const options = {
    sourceFile: DEFAULT_SOURCE_FILE,
    targetFile: DEFAULT_TARGET_FILE,
    sourceLanguage: DEFAULT_SOURCE_LANGUAGE,
    targetLanguage: DEFAULT_TARGET_LANGUAGE,
    batchSize: DEFAULT_BATCH_SIZE,
    maxChars: DEFAULT_MAX_CHARS,
    concurrency: DEFAULT_CONCURRENCY,
    transport: DEFAULT_TRANSPORT,
    limit: null,
    forceAll: false,
    dryRun: false,
    apiKey: process.env.GOOGLE_TRANSLATE_API_KEY ?? process.env.GOOGLE_API_KEY ?? "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      const value = argv[index];
      if (!value) {
        throw new Error(`Missing value for ${arg}`);
      }
      return value;
    };

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--") {
      continue;
    } else if (arg === "--source") {
      options.sourceFile = next();
    } else if (arg === "--target") {
      options.targetFile = next();
    } else if (arg === "--from") {
      options.sourceLanguage = normalizeLanguage(next(), "source");
    } else if (arg === "--to") {
      options.targetLanguage = normalizeLanguage(next(), "target");
    } else if (arg === "--batch-size") {
      options.batchSize = parsePositiveInteger(next(), arg);
    } else if (arg === "--max-chars") {
      options.maxChars = parsePositiveInteger(next(), arg);
    } else if (arg === "--concurrency") {
      options.concurrency = parsePositiveInteger(next(), arg);
    } else if (arg === "--transport") {
      options.transport = parseTransport(next());
    } else if (arg === "--limit") {
      options.limit = parsePositiveInteger(next(), arg);
    } else if (arg === "--api-key") {
      options.apiKey = next();
    } else if (arg === "--all") {
      options.forceAll = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function parseTransport(value) {
  const transport = value.trim().toLowerCase();
  if (!TRANSPORTS.has(transport)) {
    throw new Error("--transport must be auto, official, or web");
  }
  return transport;
}

function normalizeLanguage(language, role) {
  const normalized = language.trim();
  if (!normalized) {
    throw new Error(`Empty ${role} language`);
  }

  if (role === "target" && normalized.toLowerCase() === "vi-vn") {
    return "vi";
  }

  return normalized;
}

function parsePositiveInteger(value, optionName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${optionName} must be a positive integer`);
  }
  return parsed;
}

function resolveFromRoot(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT" && fallback !== null) {
      return fallback;
    }
    throw error;
  }
}

function isPlainStringMap(value, filePath) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path.relative(ROOT, filePath)} must be a JSON object`);
  }

  for (const [key, entryValue] of Object.entries(value)) {
    if (typeof entryValue !== "string") {
      throw new Error(`${path.relative(ROOT, filePath)} has a non-string value at key: ${key}`);
    }
  }
}

function shouldTranslate({ sourceValue, targetValue, forceAll }) {
  const sourceTextWithoutPlaceholders = sourceValue.replace(PLACEHOLDER_REGEX, "").trim();
  if (!sourceTextWithoutPlaceholders || !LETTER_REGEX.test(sourceTextWithoutPlaceholders)) {
    return false;
  }
  if (forceAll) {
    return true;
  }
  if (typeof targetValue !== "string" || !targetValue.trim()) {
    return true;
  }
  if (targetValue === sourceValue) {
    return true;
  }
  return HAN_REGEX.test(targetValue);
}

function maskPlaceholders(value) {
  const placeholders = [];
  const masked = value.replace(PLACEHOLDER_REGEX, (placeholder) => {
    const token = `__I18N_PH_${placeholders.length}__`;
    placeholders.push({ token, placeholder });
    return token;
  });
  return { masked, placeholders };
}

function restorePlaceholders(value, placeholders) {
  return placeholders.reduce(
    (current, { token, placeholder }) => current.replaceAll(token, placeholder),
    value,
  );
}

function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    gt: ">",
    lt: "<",
    quot: "\"",
    apos: "'",
    "#39": "'",
  };

  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    }
    if (lower.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    }
    return named[lower] ?? match;
  });
}

function makeTranslationItems(sourceEntries, targetEntries, options) {
  const items = [];

  for (const [key, sourceValue] of sourceEntries) {
    const targetValue = targetEntries[key];
    if (!shouldTranslate({ sourceValue, targetValue, forceAll: options.forceAll })) {
      continue;
    }

    const { masked, placeholders } = maskPlaceholders(sourceValue);
    items.push({
      key,
      sourceValue,
      masked,
      placeholders,
    });
  }

  return items;
}

function makeBatches(items, batchSize, maxChars) {
  const batches = [];
  let current = [];
  let currentChars = 0;

  for (const item of items) {
    const itemChars = item.masked.length;
    const wouldExceedCount = current.length >= batchSize;
    const wouldExceedChars = current.length > 0 && currentChars + itemChars > maxChars;

    if (wouldExceedCount || wouldExceedChars) {
      batches.push(current);
      current = [];
      currentChars = 0;
    }

    current.push(item);
    currentChars += itemChars;
  }

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
}

function resolveTransport(options) {
  if (options.transport === "official") {
    if (!options.apiKey) {
      throw new Error("Official Google Translate transport needs GOOGLE_TRANSLATE_API_KEY or --api-key");
    }
    return "official";
  }
  if (options.transport === "web") {
    return "web";
  }
  return options.apiKey ? "official" : "web";
}

function getBatchConfig(options) {
  if (options.resolvedTransport !== "web") {
    return {
      batchSize: options.batchSize,
      maxChars: options.maxChars,
    };
  }

  return {
    batchSize: Math.min(options.batchSize, WEB_BATCH_SIZE_LIMIT),
    maxChars: Math.min(options.maxChars, WEB_MAX_CHARS_LIMIT),
  };
}

async function translateOfficialBatch(batch, options) {
  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(options.apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: batch.map((item) => item.masked),
        source: options.sourceLanguage,
        target: options.targetLanguage,
        format: "text",
      }),
    },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message ?? response.statusText;
    throw new Error(`Google Translate failed (${response.status}): ${message}`);
  }

  const translations = payload?.data?.translations;
  if (!Array.isArray(translations) || translations.length !== batch.length) {
    throw new Error("Google Translate returned an unexpected response shape");
  }

  return translations.map((translation, index) => {
    const raw = String(translation.translatedText ?? "");
    const decoded = decodeHtmlEntities(raw);
    return restorePlaceholders(decoded, batch[index].placeholders);
  });
}

function parsePublicTranslateResponse(payload) {
  const sentenceParts = payload?.[0];
  if (!Array.isArray(sentenceParts)) {
    throw new Error("Google web translate returned an unexpected response shape");
  }

  return sentenceParts.map((part) => part?.[0] ?? "").join("");
}

async function translatePublicText(text, options) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", options.sourceLanguage);
  url.searchParams.set("tl", options.targetLanguage);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message ?? response.statusText;
    throw new Error(`Google web translate failed (${response.status}): ${message}`);
  }

  return decodeHtmlEntities(parsePublicTranslateResponse(payload));
}

function makePublicBatchText(batch) {
  return batch
    .map((item, index) => `[[[I18N_ITEM_${String(index).padStart(4, "0")}]]]\n${item.masked}`)
    .join("\n");
}

function splitPublicBatchText(translatedText, batch) {
  const parts = translatedText.split(/\[\[\[I18N_ITEM_(\d{4})\]\]\]/g);
  const translationsByIndex = new Map();

  for (let index = 1; index < parts.length; index += 2) {
    const itemIndex = Number.parseInt(parts[index], 10);
    translationsByIndex.set(itemIndex, parts[index + 1]?.trim() ?? "");
  }

  if (translationsByIndex.size !== batch.length) {
    return null;
  }

  return batch.map((_, index) => translationsByIndex.get(index) ?? "");
}

async function translatePublicBatch(batch, options) {
  if (batch.length === 1) {
    const translatedText = await translatePublicText(batch[0].masked, options);
    return [restorePlaceholders(translatedText, batch[0].placeholders)];
  }

  const translatedBatchText = await translatePublicText(makePublicBatchText(batch), options);
  const splitTranslations = splitPublicBatchText(translatedBatchText, batch);
  const translations = splitTranslations
    ?? await Promise.all(batch.map((item) => translatePublicText(item.masked, options)));

  return translations.map((translatedText, index) => (
    restorePlaceholders(translatedText, batch[index].placeholders)
  ));
}

async function translateBatch(batch, options) {
  if (options.resolvedTransport === "official") {
    return translateOfficialBatch(batch, options);
  }
  return translatePublicBatch(batch, options);
}

async function translateBatches(batches, options) {
  const translatedByKey = new Map();
  let nextBatchIndex = 0;

  async function worker() {
    while (nextBatchIndex < batches.length) {
      const batchIndex = nextBatchIndex;
      nextBatchIndex += 1;

      const batch = batches[batchIndex];
      const translations = await translateBatch(batch, options);
      translations.forEach((translatedText, itemIndex) => {
        translatedByKey.set(batch[itemIndex].key, translatedText);
      });
      console.log(`Translated batch ${batchIndex + 1}/${batches.length} (${batch.length} entries).`);
    }
  }

  const workerCount = Math.min(options.concurrency, batches.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return translatedByKey;
}

function timestampForFileName() {
  return new Date().toISOString().replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

async function backupTargetFile(targetPath) {
  try {
    const targetStat = await fs.stat(targetPath);
    if (!targetStat.isFile()) {
      throw new Error(`${path.relative(ROOT, targetPath)} exists but is not a file`);
    }

    const backupPath = path.join(
      ROOT,
      ".tmp/i18n-backups",
      `vi-VN-common-${timestampForFileName()}.json`,
    );
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.copyFile(targetPath, backupPath);

    const backupStat = await fs.stat(backupPath);
    if (backupStat.size <= 0 || backupStat.size !== targetStat.size) {
      throw new Error(`Backup validation failed for ${path.relative(ROOT, backupPath)}`);
    }

    return backupPath;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  options.resolvedTransport = resolveTransport(options);

  const sourcePath = resolveFromRoot(options.sourceFile);
  const targetPath = resolveFromRoot(options.targetFile);
  const sourceEntriesObject = await readJson(sourcePath);
  const targetEntriesObject = await readJson(targetPath, {});

  isPlainStringMap(sourceEntriesObject, sourcePath);
  isPlainStringMap(targetEntriesObject, targetPath);

  const sourceEntries = Object.entries(sourceEntriesObject);
  const allItems = makeTranslationItems(sourceEntries, targetEntriesObject, options);
  const items = options.limit ? allItems.slice(0, options.limit) : allItems;
  const skippedCount = sourceEntries.length - allItems.length;

  console.log(`Source: ${path.relative(ROOT, sourcePath)}`);
  console.log(`Target: ${path.relative(ROOT, targetPath)}`);
  console.log(`Transport: ${options.resolvedTransport}`);
  console.log(`Eligible for translation: ${allItems.length}`);
  if (options.limit) {
    console.log(`Limited to: ${items.length}`);
  }
  console.log(`Skipped: ${skippedCount}`);

  if (options.dryRun) {
    console.log("Dry run only. No Google request was sent and no file was written.");
    for (const item of items.slice(0, 20)) {
      console.log(`- ${item.key}`);
    }
    if (items.length > 20) {
      console.log(`... ${items.length - 20} more`);
    }
    return;
  }

  if (items.length === 0) {
    console.log("No translations needed.");
    return;
  }

  const batchConfig = getBatchConfig(options);
  const batches = makeBatches(items, batchConfig.batchSize, batchConfig.maxChars);
  console.log(`Batch size: ${batchConfig.batchSize}; max chars: ${batchConfig.maxChars}`);
  console.log(`Batches: ${batches.length}; concurrency: ${Math.min(options.concurrency, batches.length)}`);
  const translatedByKey = await translateBatches(batches, options);

  const nextTargetEntries = {};
  for (const [key, sourceValue] of sourceEntries) {
    nextTargetEntries[key] = translatedByKey.get(key) ?? targetEntriesObject[key] ?? sourceValue;
  }
  const sourceKeys = new Set(sourceEntries.map(([key]) => key));
  for (const [key, targetValue] of Object.entries(targetEntriesObject)) {
    if (!sourceKeys.has(key)) {
      nextTargetEntries[key] = targetValue;
    }
  }

  const backupPath = await backupTargetFile(targetPath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(nextTargetEntries, null, 2)}\n`, "utf8");

  if (backupPath) {
    console.log(`Backup: ${path.relative(ROOT, backupPath)}`);
  }
  console.log(`Wrote: ${path.relative(ROOT, targetPath)}`);
  console.log(`Translated entries: ${translatedByKey.size}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
