import { defineConfig, loadEnv, type UserConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, mode }): UserConfig => {
  const allEnv = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, allEnv);

  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(allEnv)) {
    if (key.startsWith("VITE_")) {
      envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
    }
  }

  const isDevBuild = command === "build" && mode === "development";

  return {
    define: envDefine,
    ...(isDevBuild
      ? {
          environments: {
            client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } },
          },
        }
      : {}),
    css: { transformer: "lightningcss" },
    server: {
      host: "::",
      port: 3000,
    },
    resolve: {
      tsconfigPaths: true,
      alias: {
        "@": `${process.cwd()}/src`,
        "@backend": `${process.cwd()}/backend`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    plugins: [
      tailwindcss(),
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/backend/core/**", "**/backend/runtime/**"],
            specifiers: ["server-only"],
          },
        },
      }),
      ...(command === "build" ? [nitro()] : []),
      viteReact(),
    ],
  };
});
