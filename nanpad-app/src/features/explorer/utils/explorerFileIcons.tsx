/**
 * Iconos de archivo para el explorador y buscador (react-icons).
 * - Simple Icons (Si) para lenguajes/frameworks (TS, JS, Vue, etc.), estética coherente con FA.
 * - FontAwesome 6 (fa6) para documento genérico, PDF, imagen, Word, Excel, zip, código genérico.
 * Se usa en FileTree, ExplorerSearchBar, TabBar y EditorPanel.
 */

import type { IconType } from "react-icons";
import {
  FaFileCode,
  FaFilePdf,
  FaFileImage,
  FaFileWord,
  FaFileExcel,
  FaFileCsv,
  FaFileZipper,
  FaFileVideo,
  FaFileAudio,
  FaFileLines,
  FaSquareBinary,
} from "react-icons/fa6";
import {
  SiMarkdown,
  SiTypescript,
  SiJavascript,
  SiHtml5,
  SiCss,
  SiJson,
  SiVuedotjs,
  SiYaml,
  SiXml,
  SiPython,
  SiRust,
  SiGo,
  SiSvelte,
  SiAstro,
  SiPhp,
  SiSwift,
  SiKotlin,
  SiRuby,
  SiC,
  SiCplusplus,
  SiDart,
  SiElm,
} from "react-icons/si";

/** Normaliza extensión: sin punto y en minúscula. */
function normExt(ext: string | undefined): string {
  if (!ext) return "";
  return ext.replace(/^\./, "").toLowerCase();
}

/** Mapeo extensión → componente (Simple Icons para lenguajes, FA6 para el resto). */
const EXT_TO_ICON: Record<string, IconType> = {
  // Markdown (Si, coherente con el resto de Si)
  md: SiMarkdown,
  mdx: SiMarkdown,
  mdc: SiMarkdown,
  // Config / data
  json: SiJson,
  jsonc: SiJson,
  json5: SiJson,
  yaml: SiYaml,
  yml: SiYaml,
  xml: SiXml,
  toml: FaFileCode,
  // JS/TS
  ts: SiTypescript,
  tsx: SiTypescript,
  mts: SiTypescript,
  cts: SiTypescript,
  js: SiJavascript,
  jsx: SiJavascript,
  mjs: SiJavascript,
  cjs: SiJavascript,
  // Web
  html: SiHtml5,
  htm: SiHtml5,
  xhtml: SiHtml5,
  css: SiCss,
  scss: SiCss,
  sass: SiCss,
  less: SiCss,
  vue: SiVuedotjs,
  svelte: SiSvelte,
  astro: SiAstro,
  // Lenguajes con icono propio
  py: SiPython,
  pyw: SiPython,
  pyi: SiPython,
  rs: SiRust,
  go: SiGo,
  rb: SiRuby,
  php: SiPhp,
  swift: SiSwift,
  kt: SiKotlin,
  kts: SiKotlin,
  cs: FaFileCode,
  c: SiC,
  cpp: SiCplusplus,
  cc: SiCplusplus,
  cxx: SiCplusplus,
  h: SiC,
  hpp: SiCplusplus,
  dart: SiDart,
  elm: SiElm,
  // Ejecutables / binarios
  exe: FaSquareBinary,
  dll: FaSquareBinary,
};

/** Extensiones que usan icono genérico de código (FA6, mismo estilo que el resto de la app). */
const CODE_FALLBACK_EXTS = new Set([
  "java", "sql", "sh", "bash", "zsh", "ps1", "psm1", "bat", "cmd",
  "graphql", "gql", "env", "prisma", "lua", "r", "ex", "exs", "heex", "erl", "hrl",
  "scala", "hs", "lhs", "nim", "zig", "v", "sol", "txt", "log", "rst", "tex",
]);

/** Imagen → FA6 (mismo icono que en fileIconByExt). */
const IMAGE_EXTS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "avif", "tiff",
]);

/** Office / documento → FA6. */
const WORD_EXTS = new Set(["doc", "docx", "odt"]);
const EXCEL_EXTS = new Set(["xls", "xlsx", "ods"]);
const ARCHIVE_EXTS = new Set([
  "zip", "7z", "tar", "gz", "gzip", "bz2", "xz", "rar", "zst",
]);
const VIDEO_EXTS = new Set([
  "mp4", "webm", "avi", "mov", "mkv", "m4v", "wmv", "flv", "ogv",
]);
const AUDIO_EXTS = new Set([
  "mp3", "wav", "ogg", "flac", "m4a", "aac", "wma", "opus",
]);

function getIconForExt(ext: string): IconType {
  const e = normExt(ext);
  const exact = EXT_TO_ICON[e];
  if (exact) return exact;
  if (IMAGE_EXTS.has(e)) return FaFileImage;
  if (e === "pdf") return FaFilePdf;
  if (WORD_EXTS.has(e)) return FaFileWord;
  if (EXCEL_EXTS.has(e)) return FaFileExcel;
  if (e === "csv") return FaFileCsv;
  if (ARCHIVE_EXTS.has(e)) return FaFileZipper;
  if (VIDEO_EXTS.has(e)) return FaFileVideo;
  if (AUDIO_EXTS.has(e)) return FaFileAudio;
  if (CODE_FALLBACK_EXTS.has(e)) return FaFileCode;
  return FaFileLines;
}

export interface ExplorerFileIconProps {
  /** Extensión del archivo (con o sin punto). */
  ext?: string;
  /** Tamaño en píxeles. */
  size?: number;
  /** Clase CSS adicional. */
  className?: string;
}

/**
 * Icono de archivo por extensión para explorador y buscador.
 * Simple Icons para lenguajes/frameworks; FA6 para documento, PDF, imagen, Office, zip, etc.
 */
export function ExplorerFileIcon({ ext, size = 13, className = "" }: ExplorerFileIconProps) {
  const Icon = getIconForExt(ext ?? "");
  return (
    <Icon
      size={size}
      color="currentColor"
      className={className}
      style={{ flexShrink: 0, verticalAlign: "middle" }}
      aria-hidden
    />
  );
}
