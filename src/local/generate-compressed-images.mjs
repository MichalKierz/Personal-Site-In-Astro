import { processAllArtFiles } from "./art-importer.mjs";
import { processItemImages } from "./item-image-importer.mjs";

await processAllArtFiles();

await processItemImages({
  contentDir: "src/content/projects",
  publicBaseDir: "public/images/projects",
  publicBasePath: "/images/projects",
  logLabel: "project-thumbnail-generator",
  createThumbnail: true,
});