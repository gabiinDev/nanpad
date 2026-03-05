/**
 * langDetect — mapeo extensión de archivo → identificador de lenguaje Monaco.
 */

const EXT_TO_LANG: Record<string, string> = {
  // Web (tsx/jsx con resaltado React; Monaco recibe typescript/javascript en el editor)
  ts: "typescript",
  tsx: "typescriptreact",
  js: "javascript",
  jsx: "javascriptreact",
  mjs: "javascript",
  cjs: "javascript",
  html: "html",
  htm: "html",
  vue: "vue",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "less",

  // Datos / config
  json: "json",
  jsonc: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "ini",
  ini: "ini",
  env: "ini",
  xml: "xml",
  svg: "xml",

  // Documentación
  md: "markdown",
  mdx: "markdown",
  rst: "restructuredtext",
  txt: "plaintext",

  // Sistemas
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  fish: "shell",
  ps1: "powershell",
  psm1: "powershell",
  bat: "bat",
  cmd: "bat",

  // Lenguajes de programación
  py: "python",
  pyw: "python",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  rb: "ruby",
  php: "php",
  lua: "lua",
  r: "r",
  scala: "scala",
  clj: "clojure",
  ex: "elixir",
  exs: "elixir",
  hs: "haskell",
  ml: "fsharp",
  fs: "fsharp",
  fsx: "fsharp",

  // SQL
  sql: "sql",
  psql: "pgsql",

  // Docker / infra
  dockerfile: "dockerfile",
  tf: "hcl",
  hcl: "hcl",

  // GraphQL / proto
  graphql: "graphql",
  gql: "graphql",
  proto: "protobuf",
};

/**
 * Retorna el identificador de lenguaje Monaco para una extensión de archivo.
 * Si no se reconoce, devuelve `"plaintext"`.
 * @param ext - Extensión sin punto (ej. `"ts"`, `"py"`). Puede ser undefined.
 */
export function detectLanguage(ext?: string): string {
  if (!ext) return "plaintext";
  return EXT_TO_LANG[ext.toLowerCase()] ?? "plaintext";
}
