/**
 * Icono de archivo según extensión.
 * Única fuente de verdad para extensiones e iconos en árbol, buscador y tabs.
 */

import {
  IconNote,
  IconFileImage,
  IconFileCode,
  IconFileText,
  IconFilePdf,
  IconFileWord,
  IconFileExcel,
  IconFileCsv,
  IconFileZipper,
  IconFileVideo,
  IconFileAudio,
} from "./index.tsx";

type FileIconComponent = typeof IconFileText;

// ── Conjuntos de extensiones (minúsculas) ─────────────────────────────────────

const MARKDOWN_EXTS = new Set(["md", "mdx", "mdc"]);
const IMAGE_EXTS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "avif", "tiff",
]);
const PDF_EXTS = new Set(["pdf"]);
const WORD_EXTS = new Set(["doc", "docx", "odt"]);
const EXCEL_EXTS = new Set(["xls", "xlsx", "ods"]);
const CSV_EXTS = new Set(["csv"]);
const ARCHIVE_EXTS = new Set([
  "zip", "7z", "tar", "gz", "gzip", "bz2", "xz", "rar", "zst",
]);
const VIDEO_EXTS = new Set([
  "mp4", "webm", "avi", "mov", "mkv", "m4v", "wmv", "flv", "ogv",
]);
const AUDIO_EXTS = new Set([
  "mp3", "wav", "ogg", "flac", "m4a", "aac", "wma", "opus", "webm",
]);
const CODE_EXTS = new Set([
  // JS/TS
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "mts", "cts",
  // Web
  "html", "htm", "xhtml", "css", "scss", "sass", "less",
  "vue", "svelte", "astro",
  // Config / data
  "json", "jsonc", "json5", "yaml", "yml", "toml", "xml",
  "graphql", "gql", "env", "env.example",
  // Archivos de configuración sin extensión visible (.editorconfig, .gitignore, etc.)
  "editorconfig", "gitignore", "npmrc", "nvmrc", "yarnrc",
  "eslintrc", "prettierrc", "prettierignore", "dockerignore",
  "cursorrules", "gitconfig", "dockerfile",
  "babelrc", "browserslist",
  // Lenguajes
  "py", "pyw", "pyi", "rs", "go", "java", "c", "cpp", "cc", "cxx", "h", "hpp", "cs",
  "rb", "php", "swift", "kt", "kts", "scala", "hs", "lhs",
  "sh", "bash", "zsh", "ps1", "psm1", "bat", "cmd",
  "sql", "prisma",
  "lua", "r", "dart", "elm", "ex", "exs", "heex", "erl", "hrl",
  "txt", "log", "rst", "tex", "nim", "zig", "v", "sol",
]);

/** Normaliza extensión: sin punto y en minúscula. */
function normExt(ext: string | undefined): string {
  if (!ext) return "";
  return ext.replace(/^\./, "").toLowerCase();
}

/** Devuelve el componente de icono para la extensión dada. */
function getIconForExt(ext: string): FileIconComponent {
  const e = normExt(ext);
  if (MARKDOWN_EXTS.has(e)) return IconNote as FileIconComponent;
  if (IMAGE_EXTS.has(e)) return IconFileImage as FileIconComponent;
  if (PDF_EXTS.has(e)) return IconFilePdf as FileIconComponent;
  if (WORD_EXTS.has(e)) return IconFileWord as FileIconComponent;
  if (EXCEL_EXTS.has(e)) return IconFileExcel as FileIconComponent;
  if (CSV_EXTS.has(e)) return IconFileCsv as FileIconComponent;
  if (ARCHIVE_EXTS.has(e)) return IconFileZipper as FileIconComponent;
  if (VIDEO_EXTS.has(e)) return IconFileVideo as FileIconComponent;
  if (AUDIO_EXTS.has(e)) return IconFileAudio as FileIconComponent;
  if (CODE_EXTS.has(e)) return IconFileCode as FileIconComponent;
  return IconFileText;
}

export interface FileIconByExtProps {
  /** Extensión del archivo (con o sin punto). */
  ext?: string;
  /** Tamaño en píxeles. */
  size?: number;
}

/**
 * Renderiza el icono de FontAwesome apropiado para la extensión del archivo.
 * Usar en árbol de archivos, buscador y tabs para consistencia.
 */
export function FileIconByExt({ ext, size = 13 }: FileIconByExtProps) {
  const Icon = getIconForExt(ext ?? "");
  return <Icon size={size} />;
}

/** Comprueba si la extensión es de código (abrible en editor). */
export function isCodeExt(ext: string | undefined): boolean {
  return CODE_EXTS.has(normExt(ext ?? ""));
}

/** Comprueba si la extensión es previsualizable (p. ej. markdown). */
export function isPreviewableExt(ext: string | undefined): boolean {
  return MARKDOWN_EXTS.has(normExt(ext ?? ""));
}

/** Comprueba si se puede abrir en editor (código o markdown). */
export function canOpenInCode(ext: string | undefined): boolean {
  return isCodeExt(ext) || isPreviewableExt(ext);
}

/** Extensiones que no se pueden editar ni previsualizar (zip, exe, audio, imagen, video, etc.). */
const NON_EDITABLE_EXTS = new Set([
  ...ARCHIVE_EXTS,
  ...IMAGE_EXTS,
  ...VIDEO_EXTS,
  ...AUDIO_EXTS,
  ...PDF_EXTS,
  ...WORD_EXTS,
  ...EXCEL_EXTS,
  "exe", "dll", "msi", "com", "app", "deb", "rpm", "dmg", "pkg", "so", "dylib",
]);

/** Comprueba si la extensión es NO editable (archivos comprimidos, ejecutables, multimedia, etc.). */
export function isNonEditableExt(ext: string | undefined): boolean {
  return NON_EDITABLE_EXTS.has(normExt(ext ?? ""));
}
