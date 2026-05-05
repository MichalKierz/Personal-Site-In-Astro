import {
  cleanupDeletedArtCategoryFolders,
  processAllArtFiles,
} from "./art-importer.mjs";

import {
  cleanupDeletedItemImageFolders,
  processItemImages,
} from "./item-image-importer.mjs";

import { syncOrderFile } from "./order-sync.mjs";

const artOrderConfig = {
  contentDir: "src/content/art/categories",
  orderFile: "src/content/art-category-order.json",
  orderKey: "categories",
  logLabel: "art-order",
};

const projectOrderConfig = {
  contentDir: "src/content/projects",
  orderFile: "src/content/project-order.json",
  orderKey: "projects",
  logLabel: "project-order",
};

const gameOrderConfig = {
  contentDir: "src/content/games",
  orderFile: "src/content/game-order.json",
  orderKey: "games",
  logLabel: "game-order",
};

const projectImageConfig = {
  contentDir: "src/content/projects",
  publicBaseDir: "public/images/projects",
  publicBasePath: "/images/projects",
  logLabel: "project-importer",
  createThumbnail: true,
};

const gameImageConfig = {
  contentDir: "src/content/games",
  publicBaseDir: "public/images/games",
  publicBasePath: "/images/games",
  logLabel: "game-importer",
  createThumbnail: false,
};

export async function processAllLocalContentFiles() {
  await processAllArtFiles();

  await processItemImages(projectImageConfig);
  await processItemImages(gameImageConfig);

  syncOrderFile(artOrderConfig);
  syncOrderFile(projectOrderConfig);
  syncOrderFile(gameOrderConfig);

  cleanupDeletedArtCategoryFolders();

  cleanupDeletedItemImageFolders({
    contentDir: "src/content/projects",
    publicBaseDir: "public/images/projects",
    cleanupLabel: "project images",
  });

  cleanupDeletedItemImageFolders({
    contentDir: "src/content/games",
    publicBaseDir: "public/images/games",
    cleanupLabel: "game images",
  });
}

export async function processAllArtCategoryFiles() {
  await processAllLocalContentFiles();
}