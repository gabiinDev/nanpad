/**
 * Sirve Monaco Editor desde node_modules (dev) o desde dist (build) para evitar CDN y Tracking Prevention.
 * Dev: monta node_modules/monaco-editor/min en /monaco-editor-min.
 * Build: copia min a dist/monaco-editor-min para que la app cargue Monaco en mismo origen.
 *
 * Además reemplaza el config por defecto de @monaco-editor/loader para que paths.vs apunte
 * a /monaco-editor-min/vs (mismo origen), así todas las instancias del loader usan esa ruta.
 */

import path from "path";
import fs from "fs";
import type { Plugin } from "vite";

const MONACO_LOADER_CONFIG_VIRTUAL = "\0monaco-local-loader-config";
const MONACO_VS_PATH = "/monaco-editor-min/vs";

const MIME: Record<string, string> = {
  ".js": "application/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".wasm": "application/wasm",
};

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name);
    const destPath = path.join(dest, name);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function monacoLocalPlugin(): Plugin {
  let monacoRoot: string;
  let buildOutDir: string;

  return {
    name: "monaco-local",
    enforce: "pre",
    configResolved(config) {
      monacoRoot = path.resolve(config.root, "node_modules/monaco-editor/min");
      buildOutDir = path.resolve(config.root, config.build?.outDir ?? "dist");
    },
    resolveId(id, importer) {
      if (id === MONACO_LOADER_CONFIG_VIRTUAL) return id;
      if (!importer) return null;
      // Interceptar solo el config por defecto de @monaco-editor/loader (../config/index.js).
      const fromLoader = importer.replace(/\\/g, "/").includes("@monaco-editor/loader");
      const isLoaderConfig =
        id === "../config/index.js" || id.replace(/\\/g, "/") === "../config/index.js";
      if (fromLoader && isLoaderConfig) return MONACO_LOADER_CONFIG_VIRTUAL;
      return null;
    },
    load(id) {
      if (id !== MONACO_LOADER_CONFIG_VIRTUAL) return null;
      return `var config = {
  paths: {
    vs: ${JSON.stringify(MONACO_VS_PATH)}
  }
};
export { config as default };
`;
    },
    configureServer(server) {
      server.middlewares.use("/monaco-editor-min", (req, res, next) => {
        const url = req.url ?? "/";
        const decoded = decodeURIComponent(url).replace(/^\//, "").replace(/\?.*$/, "");
        const file = path.join(monacoRoot, decoded);
        const relative = path.relative(monacoRoot, path.resolve(monacoRoot, decoded));
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          next();
          return;
        }
        if (!fs.existsSync(file)) {
          next();
          return;
        }
        const stat = fs.statSync(file);
        if (!stat.isFile()) {
          next();
          return;
        }
        const ext = path.extname(file);
        const contentType = MIME[ext] ?? "application/octet-stream";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000");
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      const dest = path.join(buildOutDir, "monaco-editor-min");
      if (fs.existsSync(monacoRoot)) {
        fs.rmSync(dest, { recursive: true, force: true });
        copyDir(monacoRoot, dest);
      }
    },
  };
}
