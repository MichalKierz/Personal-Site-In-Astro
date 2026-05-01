import { collection, fields, singleton } from "@keystatic/core";

export const projectsPage = singleton({
  label: "Projects Page",
  path: "src/content/projects",
  format: {
    data: "json",
  },

  schema: {
    html: fields.text({
      label: "Projects page HTML",
      multiline: true,
      validation: { isRequired: true },
    }),
  },
});

export const projectItems = collection({
  label: "Projects",
  path: "src/content/projects/*",
  slugField: "title",
  format: {
    data: "json",
  },

  schema: {
    title: fields.slug({
      name: {
        label: "Project name",
        validation: { isRequired: true },
      },
    }),

    status: fields.text({
      label: "Project status",
      description: "Optional. Example: In Progress",
    }),

    sourcePath: fields.text({
      label: "Source file path",
      description:
        "Paste local file path here. After Save it will be copied automatically.",
    }),

    image: fields.text({
      label: "Public image path",
      description:
        "Generated automatically after Save. Example: /images/projects/my-project/image.png",
    }),

    descriptionHtml: fields.text({
      label: "Project description HTML",
      multiline: true,
      validation: { isRequired: true },
    }),
  },
});

export const projectOrder = singleton({
  label: "Project Order",
  path: "src/content/project-order",
  format: {
    data: "json",
  },

  schema: {
    projects: fields.array(
      fields.object({
        slug: fields.text({
          label: "Project slug",
          description: "Must match the file name in src/content/projects.",
          validation: { isRequired: true },
        }),

        label: fields.text({
          label: "Admin label",
          description: "Only used in the panel to make the list readable.",
        }),
      }),
      {
        label: "Project order",
        itemLabel: (props) =>
          props.fields.label.value || props.fields.slug.value || "Project",
      }
    ),
  },
});