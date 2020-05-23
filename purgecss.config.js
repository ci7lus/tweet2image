module.exports = {
  mode: "postcss",
  content: [
    "./src/frontend/**/*.html",
    "./src/frontend/**/*.ts",
    "./src/frontend/**/*.tsx",
  ],
  whitelist: ["body", "html", "svg"],
  extractors: [
    {
      extensions: ["html", "ts", "tsx"],
      extractor: class TailwindExtractor {
        static extract(content) {
          return content.match(/[A-Za-z0-9-_:/]+/g) || []
        }
      },
    },
  ],
}
