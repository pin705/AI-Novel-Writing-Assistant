import { promises as fs } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { containsHan, normalizeText, walkSourceFiles } from "./localization/zh-text-tools.mjs";

const ROOT = process.cwd();
const SOURCE_ROOT = path.join(ROOT, "client/src");

const SAFE_JSX_ATTRIBUTES = new Set([
  "title",
  "label",
  "placeholder",
  "description",
  "aria-label",
  "alt",
  "helperText",
  "emptyText",
  "searchPlaceholder",
  "confirmText",
  "cancelText",
]);

const SAFE_PROPERTY_NAMES = new Set([
  "label",
  "description",
  "summary",
  "hint",
  "placeholder",
  "emptyText",
  "searchPlaceholder",
  "helperText",
  "message",
  "title",
  "subtitle",
]);

const SKIP_PROPERTY_NAMES = new Set([
  "value",
  "defaultValue",
  "id",
  "key",
  "provider",
  "model",
  "taskType",
  "status",
  "mode",
  "kind",
  "route",
  "path",
  "to",
  "href",
  "variant",
  "queryKey",
  "checkpointType",
  "currentItemKey",
  "currentStage",
  "reviewScope",
  "name",
  "type",
]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function shouldProcessFile(filePath) {
  const relativePath = toPosix(path.relative(ROOT, filePath));
  if (!relativePath.startsWith("client/src/")) {
    return false;
  }
  if (
    relativePath.startsWith("client/src/api/")
    || relativePath.startsWith("client/src/types/")
    || relativePath.startsWith("client/src/store/")
    || relativePath.startsWith("client/src/i18n/")
    || relativePath.startsWith("client/src/locales/")
  ) {
    return false;
  }
  return /\.(ts|tsx|js|jsx)$/.test(relativePath);
}

function getScriptKind(filePath) {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (filePath.endsWith(".ts")) return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

function getPropertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }
  return null;
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

function findAncestor(node, predicate) {
  let current = node.parent;
  while (current) {
    if (predicate(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function isImportLike(node) {
  return ts.isImportDeclaration(node)
    || ts.isExportDeclaration(node)
    || ts.isImportEqualsDeclaration(node)
    || ts.isExternalModuleReference(node);
}

function isComparisonLiteral(node) {
  const parent = node.parent;
  return ts.isBinaryExpression(parent)
    && (
      parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
      || parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
      || parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken
      || parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken
    );
}

function isInsideTranslationCall(node) {
  return Boolean(findAncestor(node, (current) => ts.isCallExpression(current) && getCallName(current.expression) === "t"));
}

function isSafeCall(node) {
  const parent = node.parent;
  if (!ts.isCallExpression(parent)) {
    return false;
  }
  const callName = getCallName(parent.expression);
  return callName === "t"
    || callName === "toast"
    || callName?.startsWith("toast.")
    || callName === "confirm"
    || callName === "alert"
    || callName === "window.confirm"
    || callName === "window.alert";
}

function createTranslatorCall(text) {
  return `t(${JSON.stringify(text)})`;
}

function sanitizePlaceholderName(value) {
  const sanitized = value.replace(/[^A-Za-z0-9_$]+/g, "_").replace(/^\d+/, "").replace(/^_+/, "");
  return sanitized || "value";
}

function derivePlaceholderBase(expression) {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  if (ts.isElementAccessExpression(expression)) {
    return derivePlaceholderBase(expression.expression);
  }
  if (ts.isCallExpression(expression)) {
    if (expression.arguments.length === 1) {
      const fromArgument = derivePlaceholderBase(expression.arguments[0]);
      if (fromArgument) {
        return fromArgument;
      }
    }
    const callName = getCallName(expression.expression);
    if (callName) {
      const segments = callName.split(".");
      return segments[segments.length - 1] ?? callName;
    }
  }
  return "value";
}

function parseExpressionFromText(expressionText) {
  const wrapped = `(${expressionText})`;
  const sourceFile = ts.createSourceFile("inline-expression.ts", wrapped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const statement = sourceFile.statements[0];
  if (!statement || !ts.isExpressionStatement(statement)) {
    return null;
  }
  return ts.isParenthesizedExpression(statement.expression) ? statement.expression.expression : statement.expression;
}

function buildInlineTemplateTranslatorCall(templateContent) {
  const usedNames = new Set();
  const placeholders = [];
  let key = "";
  let cursor = 0;
  const expressionRegex = /\$\{([^}]+)\}/g;
  let match = expressionRegex.exec(templateContent);

  while (match) {
    key += templateContent.slice(cursor, match.index);
    const expressionSource = match[1].trim();
    const expressionNode = parseExpressionFromText(expressionSource);
    const baseName = sanitizePlaceholderName(expressionNode ? derivePlaceholderBase(expressionNode) : "value");
    let placeholderName = baseName;
    let suffix = 1;
    while (usedNames.has(placeholderName)) {
      placeholderName = `${baseName}${suffix}`;
      suffix += 1;
    }
    usedNames.add(placeholderName);
    placeholders.push({
      name: placeholderName,
      source: localizeInlineStringLiterals(expressionSource),
    });
    key += `{{${placeholderName}}}`;
    cursor = match.index + match[0].length;
    match = expressionRegex.exec(templateContent);
  }

  key += templateContent.slice(cursor);
  const normalizedKey = normalizeText(key);
  if (placeholders.length === 0) {
    return createTranslatorCall(normalizedKey);
  }

  return `t(${JSON.stringify(normalizedKey)}, { ${placeholders.map((item) => `${item.name}: ${item.source}`).join(", ")} })`;
}

function localizeInlineStringLiterals(expressionText) {
  const withTemplateLiterals = expressionText.replace(/`((?:\\.|[^`])*)`/gu, (match, inner) => {
    if (!containsHan(inner)) {
      return match;
    }
    return buildInlineTemplateTranslatorCall(inner);
  });

  return withTemplateLiterals.replace(/(["'])((?:\\.|(?!\1)[\s\S])*?)\1/gu, (match, quote, inner) => {
    const normalized = normalizeText(inner);
    if (!normalized || !containsHan(normalized)) {
      return match;
    }
    return createTranslatorCall(normalized);
  });
}

function buildTemplateText(node) {
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return normalizeText(node.text);
  }
  let combined = node.head.text;
  for (const span of node.templateSpans) {
    combined += span.literal.text;
  }
  return normalizeText(combined);
}

function buildTemplateTranslatorCall(node, sourceFile, content) {
  const usedNames = new Set();
  const placeholders = [];
  let key = node.head.text;

  for (const span of node.templateSpans) {
    const baseName = sanitizePlaceholderName(derivePlaceholderBase(span.expression));
    let placeholderName = baseName;
    let suffix = 1;
    while (usedNames.has(placeholderName)) {
      placeholderName = `${baseName}${suffix}`;
      suffix += 1;
    }
    usedNames.add(placeholderName);

    const expressionSource = content.slice(span.expression.getStart(sourceFile), span.expression.getEnd());
    placeholders.push({
      name: placeholderName,
      source: localizeInlineStringLiterals(expressionSource),
    });
    key += `{{${placeholderName}}}${span.literal.text}`;
  }

  const normalizedKey = normalizeText(key);
  if (placeholders.length === 0) {
    return createTranslatorCall(normalizedKey);
  }

  const options = placeholders.map((item) => `${item.name}: ${item.source}`).join(", ");
  return `t(${JSON.stringify(normalizedKey)}, { ${options} })`;
}

function shouldSkipPropertyAssignment(node) {
  const parent = node.parent;
  if (!ts.isPropertyAssignment(parent)) {
    return false;
  }
  const propertyName = getPropertyName(parent.name);
  return Boolean(propertyName && SKIP_PROPERTY_NAMES.has(propertyName));
}

function shouldTranslateDirectly(node) {
  if (isInsideTranslationCall(node)) {
    return false;
  }
  if (shouldSkipPropertyAssignment(node)) {
    return false;
  }
  if (ts.isTemplateExpression(node.parent) || ts.isTemplateSpan(node.parent)) {
    return false;
  }
  if (isComparisonLiteral(node)) {
    return false;
  }
  if (isSafeCall(node)) {
    return true;
  }

  const parent = node.parent;
  if (ts.isJsxAttribute(parent)) {
    return SAFE_JSX_ATTRIBUTES.has(parent.name.text);
  }

  if (ts.isPropertyAssignment(parent)) {
    const propertyName = getPropertyName(parent.name);
    return Boolean(propertyName && SAFE_PROPERTY_NAMES.has(propertyName));
  }

  return true;
}

function collectReplacements(sourceFile, content) {
  const replacements = [];
  const seen = new Set();

  function pushReplacement(start, end, nextText) {
    const key = `${start}:${end}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    replacements.push({ start, end, nextText });
  }

  function visit(node) {
    if (isImportLike(node)) {
      return;
    }

    if (ts.isJsxText(node)) {
      const normalized = normalizeText(node.getText(sourceFile));
      if (normalized && containsHan(normalized)) {
        pushReplacement(node.getStart(sourceFile), node.getEnd(), `{${createTranslatorCall(normalized)}}`);
      }
      return;
    }

    if (ts.isTemplateExpression(node)) {
      const templateText = buildTemplateText(node);
      if (templateText && containsHan(templateText) && shouldTranslateDirectly(node)) {
        pushReplacement(node.getStart(sourceFile), node.getEnd(), buildTemplateTranslatorCall(node, sourceFile, content));
        return;
      }
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = normalizeText(node.text);
      if (!text || !containsHan(text)) {
        return;
      }
      if (!shouldTranslateDirectly(node)) {
        return;
      }

      const parent = node.parent;
      if (ts.isJsxAttribute(parent) && SAFE_JSX_ATTRIBUTES.has(parent.name.text)) {
        pushReplacement(node.getStart(sourceFile), node.getEnd(), `{${createTranslatorCall(text)}}`);
        return;
      }

      pushReplacement(node.getStart(sourceFile), node.getEnd(), createTranslatorCall(text));
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return replacements.sort((left, right) => right.start - left.start);
}

function addImportIfNeeded(content, filePath) {
  if (/from\s+["']@\/i18n["']/.test(content)) {
    return content;
  }

  const importLine = 'import { t } from "@/i18n";\n';
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, getScriptKind(filePath));
  const importDeclarations = sourceFile.statements.filter(ts.isImportDeclaration);
  if (importDeclarations.length === 0) {
    return `${importLine}${content}`;
  }
  const lastImport = importDeclarations[importDeclarations.length - 1];
  const insertAt = lastImport.end;
  const separator = content.slice(insertAt).startsWith("\n") ? "" : "\n";
  return `${content.slice(0, insertAt)}\n${importLine}${separator}${content.slice(insertAt)}`;
}

async function main() {
  const files = (await walkSourceFiles(SOURCE_ROOT)).filter(shouldProcessFile);
  let changedFiles = 0;
  let replacementCount = 0;

  for (const filePath of files) {
    const content = await fs.readFile(filePath, "utf8");
    if (!containsHan(content)) {
      continue;
    }

    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, getScriptKind(filePath));
    const replacements = collectReplacements(sourceFile, content);
    if (replacements.length === 0) {
      continue;
    }

    let nextContent = content;
    for (const replacement of replacements) {
      nextContent = `${nextContent.slice(0, replacement.start)}${replacement.nextText}${nextContent.slice(replacement.end)}`;
    }
    nextContent = addImportIfNeeded(nextContent, filePath);

    if (nextContent !== content) {
      await fs.writeFile(filePath, nextContent, "utf8");
      changedFiles += 1;
      replacementCount += replacements.length;
    }
  }

  console.log(`Updated ${changedFiles} files with ${replacementCount} i18n replacements.`);
}

await main();
