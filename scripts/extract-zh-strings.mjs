import { promises as fs } from "node:fs";
import path from "node:path";
import { buildHanInventory, ensureParentDir } from "./localization/zh-text-tools.mjs";

function parseArgs(argv) {
  const args = {
    targetDir: argv[2] ?? "client/src",
    outFile: "",
  };

  for (let index = 3; index < argv.length; index += 1) {
    if (argv[index] === "--out") {
      args.outFile = argv[index + 1] ?? "";
      index += 1;
    }
  }

  return args;
}

async function main() {
  const { targetDir, outFile } = parseArgs(process.argv);
  const inventory = await buildHanInventory(targetDir);
  const payload = {
    targetDir: path.resolve(targetDir),
    generatedAt: new Date().toISOString(),
    totalUniqueStrings: inventory.length,
    items: inventory,
  };

  if (outFile) {
    const resolvedOutFile = path.resolve(outFile);
    await ensureParentDir(resolvedOutFile);
    await fs.writeFile(resolvedOutFile, JSON.stringify(payload, null, 2), "utf8");
    console.log(`Wrote inventory to ${resolvedOutFile}`);
    return;
  }

  console.log(JSON.stringify(payload, null, 2));
}

await main();
