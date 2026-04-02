#!/usr/bin/env -S bun run

import { promises as fs } from "fs";
import path from "path";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function toKebab(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function toPascal(str: string): string {
  return str
    .replace(/(^\w|[-_\s]\w)/g, m => m.replace(/[-_\s]/, "").toUpperCase());
}

function toCamel(str: string): string {
  const p = toPascal(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function toTitle(str: string): string {
  return toKebab(str)
    .split("-")
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

// --------------------------------------------------
// TRANSFORM FILE CONTENT
// --------------------------------------------------

function transformContent(content: string, ctx: any): string {
  let out = content;

  // SampleModel → ProductModel
  out = out.replace(/\bSampleModel\b/g, `${ctx.modulePascal}Model`);

  // SampleUpsertModel → ProductUpsertModel
  out = out.replace(/\bSampleUpsertModel\b/g, `${ctx.modulePascal}UpsertModel`);

  // SampleWidget → ProductWidget
  out = out.replace(/\bSampleWidget\b/g, `${ctx.modulePascal}Widget`);

  // Sample → Product
  out = out.replace(/\bSample\b/g, ctx.modulePascal);

  // "Sample" → "Sản phẩm"
  out = out.replace(/"Label"/g, `"${ctx.label}"`);

  // {Sample} → "Sản phẩm"
  out = out.replace(/\{Label\}/g, `${ctx.label}`);

  // {sample} → "sản phẩm"
  out = out.replace(/\{label\}/g, `${ctx.labelLower}`);

  // samples → modules
  out = out.replace(/\bsamples\b/g, ctx.modulePlural);

  // sample → clinic/product...
  out = out.replace(/\bsample\b/g, ctx.moduleId);

  // sampleId → productId...
  out = out.replace(/\bsampleId\b/g, `${ctx.moduleCamel}Id`);

  return out;
}

// --------------------------------------------------
// COPY DIRECTORY RECURSIVELY
// --------------------------------------------------

async function copyDirRecursive(src: string, dest: string, ctx: any) {
  await fs.mkdir(dest, { recursive: true });

  const items = await fs.readdir(src, { withFileTypes: true });

  for (const item of items) {
    const srcPath = path.join(src, item.name);

    let renamed = item.name.replace(/sample/gi, match => {
      if (match === "sample") return ctx.moduleId;
      if (match === "Sample") return ctx.modulePascal;
      return match;
    });

    let isTemplate = false;
    if (renamed.endsWith(".tmpl")) {
      isTemplate = true;
      renamed = renamed.replace(/\.tmpl$/, "");
    }

    const destPath = path.join(dest, renamed);

    if (item.isDirectory()) {
      await copyDirRecursive(srcPath, destPath, ctx);
    } else {
      let content = await fs.readFile(srcPath, "utf8");

      // Only transform content of template files
      if (isTemplate) {
        content = transformContent(content, ctx);
      }

      await fs.writeFile(destPath, content, "utf8");
      console.log("  > Created:", destPath);
    }
  }
}


// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {
  const [, , rawName, rawLabel] = process.argv;

  if (!rawName) {
    console.error("Usage:");
    console.error("  bun scripts/create-module/index.ts <module-name> [Label]");
    process.exit(1);
  }

  const moduleId = toKebab(rawName);
  const modulePascal = toPascal(rawName);
  const moduleCamel = toCamel(rawName);
  const modulePlural = moduleId.endsWith("s") ? moduleId : moduleId + "s";
  const label = rawLabel || toTitle(rawName);
  const labelLower = rawLabel.toLowerCase();

  const templateRoot = path.resolve("scripts/create-module/template");
  const destRoot = path.resolve("src/features", moduleId);

  try {
    await fs.stat(templateRoot);
  } catch {
    console.error("Template root does not exist:", templateRoot);
    process.exit(1);
  }

  try {
    await fs.stat(destRoot);
    console.error("Module already exists:", destRoot);
    process.exit(1);
  } catch {
  }

  console.log("Generating module:");
  console.log("  id       :", moduleId);
  console.log("  pascal   :", modulePascal);
  console.log("  plural   :", modulePlural);
  console.log("  label    :", label);
  console.log("  dest     :", destRoot);
  console.log("");

  await copyDirRecursive(templateRoot, destRoot, {
    moduleId,
    modulePascal,
    moduleCamel,
    modulePlural,
    label,
    labelLower,
  });

  console.log("\n✔ DONE.");
}

main();
