import { fileURLToPath } from "url";
import { createServer } from "vite";

const __dirname = fileURLToPath(new URL("..", import.meta.url));

(async () => {
  const server = await createServer({
    configFile: "vite.config.ts",
    root: __dirname,
    server: {
      port: 3000,
    },
  });
  await server.listen();
  server.printUrls();
})();
