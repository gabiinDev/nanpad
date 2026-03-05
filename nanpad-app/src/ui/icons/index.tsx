/**
 * Iconos de NANPAD — FontAwesome Free.
 * Exporta componentes wrapper tipados sobre <FontAwesomeIcon>.
 * Usar estos en lugar de importar FontAwesomeIcon directamente
 * para mantener el contrato de API uniforme en el proyecto.
 */

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faListCheck,
  faFileLines,
  faGear,
  faMoon,
  faSun,
  faBolt,
  faPlus,
  faXmark,
  faPenToSquare,
  faTrashCan,
  faFloppyDisk,
  faArrowLeft,
  faChevronRight,
  faChevronDown,
  faCheck,
  faCircleHalfStroke,
  faBoxArchive,
  faRotateLeft,
  faSpinner,
  faCircleDot,
  faFolder,
  faFolderOpen,
  faFolderPlus,
  faTag,
  faEllipsisVertical,
  faTerminal,
  faCode,
  faUpload,
  faDownload,
  faFileMedical,
  faFileCode,
  faFileAlt,
  faFileImage,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFileCsv,
  faFileZipper,
  faFileVideo,
  faFileAudio,
  faNoteSticky,
  faHardDrive,
  faRefresh,
  faPencil,
  faColumns,
  faEye,
  faMagnifyingGlass,
  faHouse,
  faCopy,
  faScissors,
  faPaste,
} from "@fortawesome/free-solid-svg-icons";
import {
  faSquare,
  faClock,
  faCircle,
} from "@fortawesome/free-regular-svg-icons";
import type { SizeProp } from "@fortawesome/fontawesome-svg-core";

interface IconProps {
  className?: string;
  /** Tamaño en píxeles lógicos (se convierte a SizeProp de FA). */
  size?: number;
}

/** Convierte px numérico a SizeProp de FontAwesome. */
function toPx(size = 18): SizeProp {
  if (size <= 12) return "xs";
  if (size <= 14) return "sm";
  if (size <= 18) return "lg";
  if (size <= 24) return "xl";
  return "2xl";
}

/** Crea un componente icono a partir de un ícono de FA. */
function fa(icon: Parameters<typeof FontAwesomeIcon>[0]["icon"]) {
  return function Icon({ className = "", size = 18 }: IconProps) {
    return (
      <FontAwesomeIcon
        icon={icon}
        size={toPx(size)}
        className={className}
        aria-hidden="true"
      />
    );
  };
}

/* ── Navegación / Shell ──────────────────────────────────────── */
/** Inicio / home */
export const IconHome     = fa(faHouse);
/** Lista de tareas */
export const IconTasks    = fa(faListCheck);
/** Documento / archivo */
export const IconDocument = fa(faFileLines);
/** Ajustes / engranaje */
export const IconSettings = fa(faGear);
/** Luna — modo oscuro */
export const IconMoon     = fa(faMoon);
/** Sol — modo claro */
export const IconSun      = fa(faSun);
/** Rayo — High Performance */
export const IconZap      = fa(faBolt);
/** Terminal */
export const IconTerminal = fa(faTerminal);
/** Código */
export const IconCode     = fa(faCode);

/* ── Acciones generales ──────────────────────────────────────── */
/** Añadir / crear */
export const IconPlus    = fa(faPlus);
/** Cerrar / eliminar (×) */
export const IconClose   = fa(faXmark);
/** Editar */
export const IconEdit    = fa(faPenToSquare);
/** Eliminar */
export const IconDelete  = fa(faTrashCan);
/** Guardar */
export const IconSave    = fa(faFloppyDisk);
/** Volver atrás */
export const IconBack    = fa(faArrowLeft);
/** Chevron derecho */
export const IconChevron = fa(faChevronRight);
/** Menú vertical (⋮) */
export const IconMenu    = fa(faEllipsisVertical);
/** Subir */
export const IconUpload  = fa(faUpload);
/** Descargar */
export const IconDownload = fa(faDownload);
/** Copiar */
export const IconCopy = fa(faCopy);
/** Cortar */
export const IconCut = fa(faScissors);
/** Pegar */
export const IconPaste = fa(faPaste);

/* ── Estados de tarea ────────────────────────────────────────── */
/** Check / completado */
export const IconCheck    = fa(faCheck);
/** Checkbox vacío */
export const IconSquare   = fa(faSquare);
/** En progreso */
export const IconProgress = fa(faCircleHalfStroke);
/** Archivado */
export const IconArchive  = fa(faBoxArchive);
/** Restaurar */
export const IconRestore  = fa(faRotateLeft);
/** Reloj / pendiente */
export const IconClock    = fa(faClock);
/** Punto / círculo pequeño */
export const IconDot      = fa(faCircleDot);
/** Círculo vacío */
export const IconCircle   = fa(faCircle);

/* ── Categorías / etiquetas ──────────────────────────────────── */
/** Carpeta cerrada */
export const IconFolder     = fa(faFolder);
/** Carpeta abierta */
export const IconFolderOpen = fa(faFolderOpen);
/** Nueva carpeta */
export const IconFolderNew  = fa(faFolderPlus);
/** Etiqueta */
export const IconTag        = fa(faTag);

/* ── Explorador de archivos ──────────────────────────────────── */
/** Chevron abajo (expandido) */
export const IconChevronDown = fa(faChevronDown);
/** Nuevo archivo */
export const IconFileNew     = fa(faFileMedical);
/** Archivo de código */
export const IconFileCode    = fa(faFileCode);
/** Archivo de texto */
export const IconFileText    = fa(faFileAlt);
/** Archivo de imagen */
export const IconFileImage   = fa(faFileImage);
/** PDF */
export const IconFilePdf     = fa(faFilePdf);
/** Word (doc, docx) */
export const IconFileWord    = fa(faFileWord);
/** Excel (xls, xlsx) */
export const IconFileExcel   = fa(faFileExcel);
/** CSV */
export const IconFileCsv     = fa(faFileCsv);
/** Archivo comprimido (zip, 7z, tar, etc.) */
export const IconFileZipper  = fa(faFileZipper);
/** Vídeo */
export const IconFileVideo   = fa(faFileVideo);
/** Audio */
export const IconFileAudio   = fa(faFileAudio);
/** Nota / archivo temporal */
export const IconNote        = fa(faNoteSticky);
/** Disco / almacenamiento */
export const IconDisk        = fa(faHardDrive);
/** Refrescar */
export const IconRefresh     = fa(faRefresh);
/** Modo editor */
export const IconEditorMode  = fa(faPencil);
/** Modo split */
export const IconSplitMode   = fa(faColumns);
/** Modo preview */
export const IconPreviewMode = fa(faEye);
/** Búsqueda / lupa */
export const IconSearch = fa(faMagnifyingGlass);

/* ── Spinner ─────────────────────────────────────────────────── */
/** Indicador de carga (animado vía Tailwind spin) */
export const IconSpinner = ({ className = "", size = 18 }: IconProps) => (
  <FontAwesomeIcon
    icon={faSpinner}
    size={toPx(size)}
    className={`animate-spin ${className}`}
    aria-hidden="true"
  />
);

/* ── Logo NANPAD ─────────────────────────────────────────────── */
/**
 * Logo de NANPAD.
 * Usa un SVG custom ya que FontAwesome free no tiene un ícono "N" cuadrado.
 */
export const IconLogo = ({ className = "", size = 24 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <rect x="1" y="1" width="22" height="22" rx="5" />
    <text
      x="12"
      y="17"
      textAnchor="middle"
      fontSize="13"
      fontWeight="800"
      fill="var(--color-surface)"
      fontFamily="'JetBrains Mono', monospace"
    >
      N
    </text>
  </svg>
);
