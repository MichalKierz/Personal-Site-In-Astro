import { fields, singleton } from "@keystatic/core";

export const mainPage = singleton({
  label: "Main Page",
  path: "src/content/main",
  format: {
    data: "json",
  },

  schema: {
    profilePhoto: fields.image({
      label: "Profile photo",
      directory: "public/images/main",
      publicPath: "/images/main/",
    }),

    profileHtml: fields.text({
      label: "Profile box HTML",
      multiline: true,
      validation: { isRequired: true },
    }),

    mainHtml: fields.text({
      label: "Main content HTML",
      multiline: true,
      validation: { isRequired: true },
    }),
  },
});