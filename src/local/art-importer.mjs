import path from "node:path";

import {
  cleanupDeletedPublicFolders,
  getJsonFilesFromDirectory,
  importImageFromSourcePath,
  readJsonFile,
  writeJsonFile,
} from "./importer-utils.mjs";

function getArtCategoriesDir(root) {
  return path.join(root, "src", "content", "art", "categories");
}

function normalizeImageItem(item) {
  if (typeof item === "string") {
    return {
      sourcePath: "",
      image: item,
      adminLabel: "",
    };
  }

  return {
    sourcePath: item?.sourcePath ?? "",
    image: item?.image ?? item?.src ?? item?.file ?? item?.fileName ?? "",
    adminLabel: item?.adminLabel ?? "",
  };
}

export function processArtCategoryFile(filePath) {
  const root = process.cwd();

  const category = readJsonFile(filePath, "art-importer");

  if (!category) {
    return;
  }

  if (!Array.isArray(category.images)) {
    return;
  }

  const slug = path.basename(filePath, ".json");

  let changed = false;

  const nextImages = category.images.map((rawImage) => {
    const item = normalizeImageItem(rawImage);

    if (JSON.stringify(item) !== JSON.stringify(rawImage)) {
      changed = true;
    }

    const result = importImageFromSourcePath({
      sourcePath: item.sourcePath,
      targetDir: path.join(root, "public", "images", "art", slug),
      publicDir: `/images/art/${slug}`,
      logLabel: "art-importer",
    });

    if (!result) {
      return item;
    }

    changed = true;

    return {
      sourcePath: "",
      image: result.publicPath,
      adminLabel:
        item.adminLabel ||
        path.basename(result.fileName, path.extname(result.fileName)),
    };
  });

  if (!changed) {
    return;
  }

  writeJsonFile(filePath, {
    ...category,
    images: nextImages,
  });

  console.log(`[art-importer] Updated: ${filePath}`);
}

export function processAllArtFiles() {
  const root = process.cwd();
  const categoriesDir = getArtCategoriesDir(root);

  const files = getJsonFilesFromDirectory(categoriesDir);

  for (const file of files) {
    processArtCategoryFile(file.filePath);
  }
}

export function cleanupDeletedArtCategoryFolders() {
  const root = process.cwd();

  const categoriesDir = getArtCategoriesDir(root);
  const publicArtDir = path.join(root, "public", "images", "art");

  const existingSlugs = new Set(
    getJsonFilesFromDirectory(categoriesDir).map((file) => file.slug)
  );

  cleanupDeletedPublicFolders({
    existingSlugs,
    publicDirectory: publicArtDir,
    label: "art category images",
  });
}