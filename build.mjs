import { cp, mkdir, rm, writeFile } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await Promise.all([
  mkdir("dist/assets", { recursive: true }),
  mkdir("dist/server", { recursive: true }),
  mkdir("dist/.openai", { recursive: true }),
]);

await Promise.all([
  cp("index.html", "dist/index.html"),
  cp("styles.css", "dist/styles.css"),
  cp("app.js", "dist/app.js"),
  cp("assets/multiplication-sky.png", "dist/assets/multiplication-sky.png"),
  cp(".openai/hosting.json", "dist/.openai/hosting.json"),
  writeFile(
    "dist/server/index.js",
    `export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
`,
  ),
]);

console.log("Static game built in dist/");
