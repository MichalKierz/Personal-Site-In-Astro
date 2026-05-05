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

function toAbsolutePath(root, value) {
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function normalizeItem(item, createThumbnail) {
  const normalizedItem = {
    ...item,
    sourcePath: typeof item?.sourcePath === "string" ? item.sourcePath : "",
    image: typeof item?.image === "string" ? item.image : "",
  };

  if (createThumbnail) {
    normalizedItem.thumbnail =
      typeof item?.thumbnail === "string" ? item.thumbnail : "";
  }

  return normalizedItem;
}

export async function processItemImages({
  contentDir,
  publicBaseDir,
  publicBasePath,
  logLabel,
  createThumbnail = false,
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

    const normalizedItem = normalizeItem(item, createThumbnail);

    let changed = JSON.stringify(normalizedItem) !== JSON.stringify(item);

    const movedImage = movePublicImageToSlug({
      publicPath: normalizedItem.image,
      publicBaseDir: absolutePublicBaseDir,
      publicBasePath,
      targetSlug: file.slug,
      logLabel,
    });

    if (movedImage && movedImage !== normalizedItem.image) {
      normalizedItem.image = movedImage;
      changed = true;
    }

    if (createThumbnail) {
      const movedThumbnail = movePublicImageToSlug({
        publicPath: normalizedItem.thumbnail,
        publicBaseDir: absolutePublicBaseDir,
        publicBasePath,
        targetSlug: file.slug,
        logLabel,
      });

      if (movedThumbnail && movedThumbnail !== normalizedItem.thumbnail) {
        normalizedItem.thumbnail = movedThumbnail;
        changed = true;
      }
    }

    const result = importImageFromSourcePath({
      sourcePath: normalizedItem.sourcePath,
      targetDir: path.join(absolutePublicBaseDir, file.slug),
      publicDir: `${publicBasePath}/${file.slug}`,
      logLabel,
    });

    if (result) {
      const resultImage = movePublicImageToSlug({
        publicPath: result.publicPath,
        publicBaseDir: absolutePublicBaseDir,
        publicBasePath,
        targetSlug: file.slug,
        logLabel,
      });

      changed = true;

      normalizedItem.sourcePath = "";
      normalizedItem.image = resultImage ?? result.publicPath;

      if (createThumbnail) {
        normalizedItem.thumbnail = "";
      }
    }

    if (createThumbnail && normalizedItem.image) {
      const thumbnail = await ensureImageThumbnail({
        imagePath: normalizedItem.image,
        logLabel,
      });

      if (thumbnail && thumbnail !== normalizedItem.thumbnail) {
        normalizedItem.thumbnail = thumbnail;
        changed = true;
      }
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