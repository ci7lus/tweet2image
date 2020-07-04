module.exports = {
  purge: {
    enabled: process.env.NODE_ENV === "production",
    mode: "postcss",
    content: [
      "./src/frontend/**/*.html",
      "./src/frontend/**/*.ts",
      "./src/frontend/**/*.tsx",
    ],
    whitelist: ["body", "html", "svg"],
    whitelistPatterns: [/Toastify.+/],
  },
}
