export type TranslationDict = { [key: string]: string | TranslationDict };

export type TranslateValues = Record<string, string | number | undefined | null>;

export function lookup(dict: TranslationDict, key: string): string | undefined {
  const path = key.split(".");
  let current: string | TranslationDict | undefined = dict;
  for (const segment of path) {
    if (current === undefined || typeof current === "string") {
      return undefined;
    }
    current = current[segment];
  }
  return typeof current === "string" ? current : undefined;
}

export function interpolate(template: string, values?: TranslateValues): string {
  if (!values) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (raw, name: string) => {
    const v = values[name];
    return v === undefined || v === null ? raw : String(v);
  });
}

export function createTranslator(
  primary: TranslationDict,
  fallback: TranslationDict,
) {
  return function t(key: string, values?: TranslateValues): string {
    const hit = lookup(primary, key) ?? lookup(fallback, key);
    if (hit === undefined) {
      return key;
    }
    return interpolate(hit, values);
  };
}
