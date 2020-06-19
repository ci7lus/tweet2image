module.exports = {
  purge: {
    enabled: true,
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
