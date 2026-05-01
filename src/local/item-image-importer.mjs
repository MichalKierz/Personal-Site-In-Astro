import path from "node:path";

import {
  cleanupDeletedPublicFolders,
  getJsonFilesFromDirectory,
  importImageFromSourcePath,
  readJsonFile,
  writeJsonFile,
} from "./importer-utils.mjs";

function toAbsolutePath(root, value) {
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function normalizeItem(item) {
  return {
    ...item,
    sourcePath: typeof item?.sourcePath === "string" ? item.sourcePath : "",
    image: typeof item?.image === "string" ? item.image : "",
  };
}

export function processItemImages({
  contentDir,
  publicBaseDir,
  publicBasePath,
  logLabel,
}) {
  const root = process.cwd();

  const absoluteContentDir = toAbsolutePath(root, contentDir);
  const absolutePublicBaseDir = toAbsolutePath(root, publicBaseDir);

  const files = getJsonFilesFromDirectory(absoluteContentDir);

  for (const file of files) {
    const item = readJsonFile(file.filePath, logLabel);

    if (!item) {
      continue;
    }

    const normalizedItem = normalizeItem(item);

    let changed =
      JSON.stringify(normalizedItem) !== JSON.stringify(item);

    const result = importImageFromSourcePath({
      sourcePath: normalizedItem.sourcePath,
      targetDir: path.join(absolutePublicBaseDir, file.slug),
      publicDir: `${publicBasePath}/${file.slug}`,
      logLabel,
    });

    if (result) {
      changed = true;

      normalizedItem.sourcePath = "";
      normalizedItem.image = result.publicPath;
    }

    if (!changed) {
      continue;
    }

    writeJsonFile(file.filePath, normalizedItem);

    console.log(`[${logLabel}] Updated: ${file.filePath}`);
  }
}

export function cleanupDeletedItemImageFolders({
  contentDir,
  publicBaseDir,
  cleanupLabel,
}) {
  const root = process.cwd();

  const absoluteContentDir = toAbsolutePath(root, contentDir);
  const absolutePublicBaseDir = toAbsolutePath(root, publicBaseDir);

  const existingSlugs = new Set(
    getJsonFilesFromDirectory(absoluteContentDir).map((file) => file.slug)
  );

  cleanupDeletedPublicFolders({
    existingSlugs,
    publicDirectory: absolutePublicBaseDir,
    label: cleanupLabel,
  });
}