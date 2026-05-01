import { fields, singleton } from "@keystatic/core";

export const navigationSettings = singleton({
  label: "Navigation",
  path: "src/content/navigation",
  format: {
    data: "json",
  },

  schema: {
    tabs: fields.array(
      fields.object({
        label: fields.text({
          label: "Label",
          validation: { isRequired: true },
        }),

        path: fields.text({
          label: "Internal path",
          description: "Example: /, /projects, /games, /art",
          validation: { isRequired: true },
        }),

        subdomain: fields.text({
          label: "Subdomain",
          description: "Example: art, games, projects. Leave empty for main domain.",
        }),
      }),
      {
        label: "Tabs",
        itemLabel: (props) => props.fields.label.value || "Tab",
      }
    ),
  },
});