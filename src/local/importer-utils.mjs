import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
]);

export function cleanSourcePath(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  let cleaned = value.trim();

  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  if (cleaned.startsWith("file://")) {
    try {
      cleaned = fileURLToPath(cleaned);
    } catch {
      cleaned = decodeURIComponent(cleaned.replace("file:///", ""));
    }
  }

  return cleaned;
}

export function slugify(value, fallback = "item") {
  const rawValue = String(value ?? "").trim();

  const slug = rawValue
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return slug || fallback;
}

export function safeFileName(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, extension);

  const safeBase = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `${safeBase || "image"}${extension}`;
}

export function getAvailableFileName(directory, fileName) {
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);

  let candidate = fileName;
  let counter = 2;

  while (fs.existsSync(path.join(directory, candidate))) {
    candidate = `${baseName}-${counter}${extension}`;
    counter += 1;
  }

  return candidate;
}

function findExistingIdenticalFile(directory, sourcePath) {
  if (!fs.existsSync(directory)) {
    return null;
  }

  const sourceExtension = path.extname(sourcePath).toLowerCase();
  const sourceStats = fs.statSync(sourcePath);
  const sourceBuffer = fs.readFileSync(sourcePath);

  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (path.extname(entry.name).toLowerCase() !== sourceExtension) {
      continue;
    }

    const candidatePath = path.join(directory, entry.name);
    const candidateStats = fs.statSync(candidatePath);

    if (candidateStats.size !== sourceStats.size) {
      continue;
    }

    const candidateBuffer = fs.readFileSync(candidatePath);

    if (candidateBuffer.equals(sourceBuffer)) {
      return entry.name;
    }
  }

  return null;
}

export function readJsonFile(filePath, logLabel) {
  if (!filePath.endsWith(".json")) {
    return null;
  }

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`[${logLabel}] Invalid JSON: ${filePath}`);
    console.error(error.message);
    return null;
  }
}

export function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function getJsonFilesFromDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  return fs
    .readdirSync(directoryPath)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => ({
      fileName,
      slug: path.basename(fileName, ".json"),
      filePath: path.join(directoryPath, fileName),
    }));
}

export function cleanupDeletedPublicFolders({
  existingSlugs,
  publicDirectory,
  label,
}) {
  if (!fs.existsSync(publicDirectory)) {
    return;
  }

  const entries = fs.readdirSync(publicDirectory, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const folderSlug = entry.name;

    if (existingSlugs.has(folderSlug)) {
      continue;
    }

    const folderPath = path.join(publicDirectory, folderSlug);

    console.log(`[local-cleaner] Removing ${label} folder: ${folderSlug}`);

    fs.rmSync(folderPath, {
      recursive: true,
      force: true,
    });
  }
}

export function importImageFromSourcePath({
  sourcePath,
  targetDir,
  publicDir,
  logLabel,
}) {
  const cleanedSourcePath = cleanSourcePath(sourcePath);

  if (!cleanedSourcePath) {
    return null;
  }

  const normalizedSourcePath = cleanedSourcePath.replaceAll("\\", "/");

  if (normalizedSourcePath.startsWith("/images/")) {
    return {
      publicPath: normalizedSourcePath,
      fileName: path.basename(normalizedSourcePath),
      copied: false,
    };
  }

  if (normalizedSourcePath.startsWith("public/")) {
    const publicPath = normalizedSourcePath.replace(/^public/, "");

    return {
      publicPath,
      fileName: path.basename(publicPath),
      copied: false,
    };
  }

  const absoluteSourcePath = path.isAbsolute(cleanedSourcePath)
    ? cleanedSourcePath
    : path.resolve(process.cwd(), cleanedSourcePath);

  if (!fs.existsSync(absoluteSourcePath)) {
    console.warn(`[${logLabel}] Source file does not exist: ${cleanedSourcePath}`);
    return null;
  }

  const extension = path.extname(absoluteSourcePath).toLowerCase();

  if (!allowedExtensions.has(extension)) {
    console.warn(`[${logLabel}] Unsupported image type: ${cleanedSourcePath}`);
    return null;
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const existingFileName = findExistingIdenticalFile(
    targetDir,
    absoluteSourcePath
  );

  if (existingFileName) {
    const publicPath = `${publicDir}/${existingFileName}`;

    console.log(`[${logLabel}] Reused existing image: ${publicPath}`);

    return {
      publicPath,
      fileName: existingFileName,
      copied: false,
    };
  }

  const safeName = safeFileName(path.basename(absoluteSourcePath));
  const finalName = getAvailableFileName(targetDir, safeName);
  const targetPath = path.join(targetDir, finalName);

  fs.copyFileSync(absoluteSourcePath, targetPath);

  const publicPath = `${publicDir}/${finalName}`;

  console.log(`[${logLabel}] Copied: ${absoluteSourcePath}`);
  console.log(`[${logLabel}]     to: ${publicPath}`);

  return {
    publicPath,
    fileName: finalName,
    copied: true,
  };
}