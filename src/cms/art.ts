import { collection, fields, singleton } from "@keystatic/core";

export const artPage = singleton({
  label: "Art Page",
  path: "src/content/art",
  format: {
    data: "json",
  },

  schema: {
    html: fields.text({
      label: "Art page HTML",
      multiline: true,
      validation: { isRequired: true },
    }),
  },
});

export const artCategories = collection({
  label: "Art Categories",
  path: "src/content/art/categories/*",
  slugField: "title",
  format: {
    data: "json",
  },

  schema: {
    title: fields.slug({
      name: {
        label: "Category title",
        validation: { isRequired: true },
      },
    }),

    description: fields.text({
      label: "Description",
      multiline: true,
    }),

    images: fields.array(
      fields.object({
        sourcePath: fields.text({
          label: "Source file path",
          description:
            "Paste local file path here. After Save it will be copied automatically.",
        }),

        image: fields.text({
          label: "Public image path",
          description:
            "Generated automatically after Save. This is the full image used for fullscreen view and download.",
        }),

        thumbnail: fields.text({
          label: "Public thumbnail path",
          description:
            "Generated automatically after Save. This is the compressed image used in the category gallery.",
        }),

        adminLabel: fields.text({
          label: "Admin label",
          description: "Only visible in the panel. Not shown on the website.",
        }),
      }),
      {
        label: "Images",
        itemLabel: (props) => {
          const adminLabel = props.fields.adminLabel.value as
            | string
            | null
            | undefined;

          const image = props.fields.image.value as
            | string
            | null
            | undefined;

          const sourcePath = props.fields.sourcePath.value as
            | string
            | null
            | undefined;

          if (adminLabel && adminLabel.trim()) {
            return adminLabel;
          }

          if (image && image.trim()) {
            return image.split(/[\\/]/).pop() || "Image";
          }

          if (sourcePath && sourcePath.trim()) {
            return sourcePath.split(/[\\/]/).pop() || "Pending image";
          }

          return "Image";
        },
      }
    ),
  },
});

export const artCategoryOrder = singleton({
  label: "Art Category Order",
  path: "src/content/art-category-order",
  format: {
    data: "json",
  },

  schema: {
    categories: fields.array(
      fields.object({
        slug: fields.text({
          label: "Category slug",
          description:
            "Must match the file name in src/content/art/categories.",
          validation: { isRequired: true },
        }),

        label: fields.text({
          label: "Admin label",
          description: "Only used in the panel to make the list readable.",
        }),
      }),
      {
        label: "Category order",
        itemLabel: (props) =>
          props.fields.label.value || props.fields.slug.value || "Category",
      }
    ),
  },
});