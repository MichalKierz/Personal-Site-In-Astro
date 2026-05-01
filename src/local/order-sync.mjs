import path from "node:path";

import {
  getJsonFilesFromDirectory,
  readJsonFile,
  writeJsonFile,
} from "./importer-utils.mjs";

function toAbsolutePath(root, value) {
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function getLabelFromContent(content, fallback) {
  if (typeof content?.title === "string" && content.title.trim()) {
    return content.title.trim();
  }

  if (typeof content?.label === "string" && content.label.trim()) {
    return content.label.trim();
  }

  return fallback;
}

export function syncOrderFile({
  contentDir,
  orderFile,
  orderKey,
  logLabel,
}) {
  const root = process.cwd();

  const absoluteContentDir = toAbsolutePath(root, contentDir);
  const absoluteOrderFile = toAbsolutePath(root, orderFile);

  const contentFiles = getJsonFilesFromDirectory(absoluteContentDir);

  const availableItems = contentFiles
    .map((file) => {
      const content = readJsonFile(file.filePath, logLabel);

      if (!content) {
        return null;
      }

      return {
        slug: file.slug,
        label: getLabelFromContent(content, file.slug),
      };
    })
    .filter(Boolean);

  const availableSlugSet = new Set(
    availableItems.map((item) => item.slug)
  );

  const currentOrderContent =
    readJsonFile(absoluteOrderFile, logLabel) ?? { [orderKey]: [] };

  const currentOrder = Array.isArray(currentOrderContent[orderKey])
    ? currentOrderContent[orderKey]
    : [];

  const usedSlugs = new Set();
  const nextOrder = [];

  for (const orderItem of currentOrder) {
    const slug =
      typeof orderItem?.slug === "string" ? orderItem.slug.trim() : "";

    if (!slug || usedSlugs.has(slug) || !availableSlugSet.has(slug)) {
      continue;
    }

    const matchingItem = availableItems.find((item) => item.slug === slug);

    nextOrder.push({
      slug,
      label:
        typeof orderItem?.label === "string" && orderItem.label.trim()
          ? orderItem.label
          : matchingItem?.label ?? slug,
    });

    usedSlugs.add(slug);
  }

  for (const item of availableItems) {
    if (usedSlugs.has(item.slug)) {
      continue;
    }

    nextOrder.push({
      slug: item.slug,
      label: item.label,
    });

    usedSlugs.add(item.slug);
  }

  const nextOrderContent = {
    ...currentOrderContent,
    [orderKey]: nextOrder,
  };

  if (JSON.stringify(nextOrderContent) === JSON.stringify(currentOrderContent)) {
    return;
  }

  writeJsonFile(absoluteOrderFile, nextOrderContent);

  console.log(`[${logLabel}] Synced: ${absoluteOrderFile}`);
}