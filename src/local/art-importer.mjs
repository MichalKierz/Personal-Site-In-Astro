import path from "node:path";

import {
  cleanupDeletedPublicFolders,
  ensureImageThumbnail,
  getJsonFilesFromDirectory,
  importImageFromSourcePath,
  movePublicImageToSlug,
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
      thumbnail: "",
      adminLabel: "",
    };
  }

  return {
    sourcePath: item?.sourcePath ?? "",
    image: item?.image ?? item?.src ?? item?.file ?? item?.fileName ?? "",
    thumbnail: item?.thumbnail ?? "",
    adminLabel: item?.adminLabel ?? "",
  };
}

export async function processArtCategoryFile(filePath) {
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

  const nextImages = [];

  for (const rawImage of category.images) {
    const item = normalizeImageItem(rawImage);

    if (JSON.stringify(item) !== JSON.stringify(rawImage)) {
      changed = true;
    }

    const movedImage = movePublicImageToSlug({
      publicPath: item.image,
      publicBaseDir: path.join(root, "public", "images", "art"),
      publicBasePath: "/images/art",
      targetSlug: slug,
      logLabel: "art-importer",
    });

    if (movedImage && movedImage !== item.image) {
      item.image = movedImage;
      changed = true;
    }

    const movedThumbnail = movePublicImageToSlug({
      publicPath: item.thumbnail,
      publicBaseDir: path.join(root, "public", "images", "art"),
      publicBasePath: "/images/art",
      targetSlug: slug,
      logLabel: "art-importer",
    });

    if (movedThumbnail && movedThumbnail !== item.thumbnail) {
      item.thumbnail = movedThumbnail;
      changed = true;
    }

    const result = importImageFromSourcePath({
      sourcePath: item.sourcePath,
      targetDir: path.join(root, "public", "images", "art", slug),
      publicDir: `/images/art/${slug}`,
      logLabel: "art-importer",
    });

    if (result) {
      const resultImage = movePublicImageToSlug({
        publicPath: result.publicPath,
        publicBaseDir: path.join(root, "public", "images", "art"),
        publicBasePath: "/images/art",
        targetSlug: slug,
        logLabel: "art-importer",
      });

      item.sourcePath = "";
      item.image = resultImage ?? result.publicPath;
      item.thumbnail = "";
      item.adminLabel =
        item.adminLabel ||
        path.basename(result.fileName, path.extname(result.fileName));

      changed = true;
    }

    if (item.image) {
      const thumbnail = await ensureImageThumbnail({
        imagePath: item.image,
        logLabel: "art-importer",
      });

      if (thumbnail && thumbnail !== item.thumbnail) {
        item.thumbnail = thumbnail;
        changed = true;
      }
    }

    nextImages.push(item);
  }

  if (!changed) {
    return;
  }

  writeJsonFile(filePath, {
    ...category,
    images: nextImages,
  });

  console.log(`[art-importer] Updated: ${filePath}`);
}

export async function processAllArtFiles() {
  const root = process.cwd();
  const categoriesDir = getArtCategoriesDir(root);

  const files = getJsonFilesFromDirectory(categoriesDir);

  for (const file of files) {
    await processArtCategoryFile(file.filePath);
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