import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const imageItemSchema = z.union([
  z.string(),
  z.object({
    sourcePath: z.string().optional(),
    image: z.string().optional(),
    src: z.string().optional(),
    file: z.string().optional(),
    fileName: z.string().optional(),
    adminLabel: z.string().optional(),
  }),
]);

const art = defineCollection({
  loader: glob({
    pattern: "categories/*.json",
    base: "./src/content/art",
  }),

  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    images: z.array(imageItemSchema).optional(),
  }),
});

const games = defineCollection({
  loader: glob({
    pattern: "*.json",
    base: "./src/content/games",
  }),

  schema: z.object({
    title: z.string(),
    sourcePath: z.string().optional(),
    image: z.string().optional(),
    description: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({
    pattern: "*.json",
    base: "./src/content/projects",
  }),

  schema: z.object({
    title: z.string(),
    status: z.string().optional(),
    sourcePath: z.string().optional(),
    image: z.string().optional(),
    descriptionHtml: z.string(),
  }),
});

export const collections = {
  art,
  games,
  projects,
};