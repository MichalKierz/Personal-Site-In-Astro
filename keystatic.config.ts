import { config } from "@keystatic/core";

import { navigationSettings } from "./src/cms/navigation";
import { mainPage } from "./src/cms/main";

import {
  projectsPage,
  projectItems,
  projectOrder,
} from "./src/cms/projects";

import {
  gamesPage,
  gameItems,
  gameOrder,
} from "./src/cms/games";

import {
  artPage,
  artCategories,
  artCategoryOrder,
} from "./src/cms/art";

export default config({
  storage: {
    kind: "local",
  },

  ui: {
    brand: {
      name: "Michał Kierzkowski Site",
    },

    navigation: {
      Site: ["navigationSettings"],
      Pages: ["mainPage", "projectsPage", "gamesPage", "artPage"],

      Projects: ["projectItems", "projectOrder"],
      Games: ["gameItems", "gameOrder"],
      Art: ["artCategories", "artCategoryOrder"],
    },
  },

  singletons: {
    navigationSettings,

    mainPage,
    projectsPage,
    gamesPage,
    artPage,

    projectOrder,
    gameOrder,
    artCategoryOrder,
  },

  collections: {
    projectItems,
    gameItems,
    artCategories,
  },
});