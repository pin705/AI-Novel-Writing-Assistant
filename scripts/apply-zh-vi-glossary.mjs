import { promises as fs } from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  buildHanInventory,
  containsHan,
  ensureParentDir,
  walkSourceFiles,
} from "./localization/zh-text-tools.mjs";

const DISPLAY_PROPERTY_NAMES = new Set([
  "label",
  "title",
  "description",
  "summary",
  "hint",
  "helperText",
  "emptyText",
  "placeholder",
  "message",
  "content",
  "dialogTitle",
  "aria-label",
  "ariaLabel",
  "tooltip",
  "caption",
]);

const DISPLAY_VARIABLE_PATTERN = /(label|title|description|summary|message|hint|text|caption)$/i;
const DISPLAY_FUNCTION_PATTERN = /(format|resolve|get).*(label|title|description|summary|message|text|status|kind|checkpoint|hint)|.*(label|title|description|summary|message|text|status|kind|checkpoint|hint)$/i;
const DISPLAY_SETTER_PATTERN = /^set[A-Z].*(Message|Result|Title|Hint|Summary|Description|Text)$/;
const DISPLAY_CALLEE_NAMES = new Set(["confirm", "alert"]);
const DISPLAY_PROPERTY_ACCESS_NAMES = new Set(["success", "error", "info", "warning"]);

function parseArgs(argv) {
  const args = {
    targetDir: argv[2] ?? "client/src",
    glossaryFile: argv[3] ?? "scripts/localization/zh-vi-glossary.json",
    reportOut: "",
  };

  for (let index = 4; index < argv.length; index += 1) {
    if (argv[index] === "--report-out") {
      args.reportOut = argv[index + 1] ?? "";
      index += 1;
    }
  }

  return args;
}

function getPropertyLikeName(node) {
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
    return node.text;
  }

  if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }

  if (ts.isComputedPropertyName(node) && ts.isStringLiteralLike(node.expression)) {
    return node.expression.text;
  }

  return "";
}

function getJsxAttributeName(node) {
  if (ts.isJsxAttribute(node)) {
    return node.name.text;
  }
  return "";
}

function getFunctionName(node) {
  if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name) {
    return node.name.getText();
  }

  if ((ts.isFunctionExpression(node) || ts.isArrowFunction(node)) && node.parent) {
    if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
      return node.parent.name.text;
    }
    if (ts.isPropertyAssignment(node.parent)) {
      return getPropertyLikeName(node.parent.name);
    }
  }

  return "";
}

function isDisplayCall(node) {
  if (ts.isIdentifier(node.expression)) {
    return DISPLAY_CALLEE_NAMES.has(node.expression.text) || DISPLAY_SETTER_PATTERN.test(node.expression.text);
  }

  if (ts.isPropertyAccessExpression(node.expression)) {
    return DISPLAY_PROPERTY_ACCESS_NAMES.has(node.expression.name.text);
  }

  return false;
}

function findContext(node) {
  let current = node.parent;

  while (current) {
    if (ts.isJsxAttribute(current)) {
      const name = getJsxAttributeName(current);
      return DISPLAY_PROPERTY_NAMES.has(name);
    }

    if (ts.isPropertyAssignment(current)) {
      const name = getPropertyLikeName(current.name);
      return DISPLAY_PROPERTY_NAMES.has(name) || DISPLAY_VARIABLE_PATTERN.test(name);
    }

    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      if (DISPLAY_VARIABLE_PATTERN.test(current.name.text)) {
        return true;
      }
    }

    if (ts.isReturnStatement(current)) {
      let fn = current.parent;
      while (fn) {
        if (ts.isFunctionLike(fn)) {
          const functionName = getFunctionName(fn);
          return DISPLAY_FUNCTION_PATTERN.test(functionName);
        }
        fn = fn.parent;
      }
      return false;
    }

    if (ts.isCallExpression(current)) {
      return isDisplayCall(current);
    }

    if (ts.isNewExpression(current) && ts.isIdentifier(current.expression) && current.expression.text === "Error") {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function escapeTemplateText(value) {
  return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function escapeQuotedText(value, quote) {
  const escapedQuote = quote === "'" ? /'/g : /"/g;
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(escapedQuote, `\\${quote}`);
}

function applyGlossary(text, replacements) {
  let next = text;
  for (const [sourceText, targetText] of replacements) {
    if (!sourceText || sourceText === targetText) {
      continue;
    }
    next = next.split(sourceText).join(targetText);
  }
  return next;
}

function buildReplacementText(node, translatedText, sourceFile) {
  if (ts.isJsxText(node)) {
    return translatedText;
  }

  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return `\`${escapeTemplateText(translatedText)}\``;
  }

  if (ts.isStringLiteral(node)) {
    const raw = sourceFile.text.slice(node.getStart(sourceFile), node.end);
    const quote = raw.startsWith("'") ? "'" : "\"";
    return `${quote}${escapeQuotedText(translatedText, quote)}${quote}`;
  }

  return null;
}

async function main() {
  const { targetDir, glossaryFile, reportOut } = parseArgs(process.argv);
  const glossaryContent = await fs.readFile(path.resolve(glossaryFile), "utf8");
  const glossary = JSON.parse(glossaryContent);
  const replacements = Object.entries(glossary).sort((left, right) => right[0].length - left[0].length);
  const files = await walkSourceFiles(targetDir);

  let changedFileCount = 0;
  let replacementCount = 0;

  for (const filePath of files) {
    const original = await fs.readFile(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, original, ts.ScriptTarget.Latest, true, filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const edits = [];

    function visit(node) {
      if (ts.isJsxText(node)) {
        const raw = original.slice(node.pos, node.end);
        if (containsHan(raw)) {
          const translated = applyGlossary(raw, replacements);
          if (translated !== raw) {
            edits.push({ start: node.pos, end: node.end, text: translated });
            replacementCount += 1;
          }
        }
      } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && containsHan(node.text) && findContext(node)) {
        const translated = applyGlossary(node.text, replacements);
        if (translated !== node.text) {
          const replacementText = buildReplacementText(node, translated, sourceFile);
          if (replacementText) {
            edits.push({
              start: node.getStart(sourceFile),
              end: node.end,
              text: replacementText,
            });
            replacementCount += 1;
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    if (edits.length === 0) {
      continue;
    }

    edits.sort((left, right) => right.start - left.start);
    let nextContent = original;
    for (const edit of edits) {
      nextContent = `${nextContent.slice(0, edit.start)}${edit.text}${nextContent.slice(edit.end)}`;
    }

    if (nextContent !== original) {
      await fs.writeFile(filePath, nextContent, "utf8");
      changedFileCount += 1;
    }
  }

  if (reportOut) {
    const inventory = await buildHanInventory(targetDir);
    const reportPayload = {
      targetDir: path.resolve(targetDir),
      glossaryFile: path.resolve(glossaryFile),
      generatedAt: new Date().toISOString(),
      changedFileCount,
      replacementCount,
      remainingUniqueStrings: inventory.length,
      items: inventory,
    };
    const resolvedReportOut = path.resolve(reportOut);
    await ensureParentDir(resolvedReportOut);
    await fs.writeFile(resolvedReportOut, JSON.stringify(reportPayload, null, 2), "utf8");
  }

  console.log(
    JSON.stringify(
      {
        targetDir: path.resolve(targetDir),
        glossaryFile: path.resolve(glossaryFile),
        changedFileCount,
        replacementCount,
      },
      null,
      2,
    ),
  );
}

await main();
