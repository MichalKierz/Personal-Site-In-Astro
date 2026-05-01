import { collection, fields, singleton } from "@keystatic/core";

export const gamesPage = singleton({
  label: "Games Page",
  path: "src/content/games",
  format: {
    data: "json",
  },

  schema: {
    html: fields.text({
      label: "Games page HTML",
      multiline: true,
      validation: { isRequired: true },
    }),
  },
});

export const gameItems = collection({
  label: "Games",
  path: "src/content/games/*",
  slugField: "title",
  format: {
    data: "json",
  },

  schema: {
    title: fields.slug({
      name: {
        label: "Game name",
        validation: { isRequired: true },
      },
    }),

    sourcePath: fields.text({
      label: "Source file path",
      description:
        "Paste local image path here. After Save it will be copied automatically.",
    }),

    image: fields.text({
      label: "Public image path",
      description:
        "Generated automatically after Save. Example: /images/games/paddle-ball/image.png",
    }),

    description: fields.text({
      label: "Short description",
      multiline: true,
    }),
  },
});

export const gameOrder = singleton({
  label: "Game Order",
  path: "src/content/game-order",
  format: {
    data: "json",
  },

  schema: {
    games: fields.array(
      fields.object({
        slug: fields.text({
          label: "Game slug",
          description: "Must match the file name in src/content/games.",
          validation: { isRequired: true },
        }),

        label: fields.text({
          label: "Admin label",
          description: "Only used in the panel to make the list readable.",
        }),
      }),
      {
        label: "Game order",
        itemLabel: (props) =>
          props.fields.label.value || props.fields.slug.value || "Game",
      }
    ),
  },
});