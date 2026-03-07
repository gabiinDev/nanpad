/**
 * FsService — capa de abstracción sobre @tauri-apps/plugin-fs y plugin-dialog.
 * Expone operaciones de sistema de archivos tipadas para el explorador de NANPAD.
 */

import {
  readDir,
  readTextFile,
  writeTextFile,
  remove,
  rename,
  mkdir,
  exists,
  BaseDirectory,
  type DirEntry,
} from "@tauri-apps/plugin-fs";
import { open as dialogOpen, save as dialogSave } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { homeDir, join, appLocalDataDir } from "@tauri-apps/api/path";

/** Nodo del árbol de archivos. */
export interface FsNode {
  /** Nombre del archivo o carpeta. */
  name: string;
  /** Ruta absoluta. */
  path: string;
  /** Es directorio. */
  isDir: boolean;
  /** Hijos cargados (undefined = aún no cargados). */
  children?: FsNode[];
  /** Extensión sin punto, solo para archivos. */
  ext?: string;
}

/** Directorio temporal de NANPAD dentro de AppLocalData. */
export const TEMP_DIR = "nanpad/temp";

/** Prefijo que identifica un archivo temporal por su nombre. */
const TEMP_PREFIX = "nanpad_temp_";

// ─── Helpers de path ─────────────────────────────────────────────────────────

/**
 * Retorna el directorio home del usuario.
 */
export async function getHomeDir(): Promise<string> {
  return homeDir();
}

/**
 * Retorna la ruta absoluta del directorio temporal de NANPAD.
 */
export async function getTempDirPath(): Promise<string> {
  const base = await appLocalDataDir();
  return join(base, "nanpad", "temp");
}

// ─── Árbol de directorios ─────────────────────────────────────────────────────

/**
 * Lee el contenido de un directorio y lo convierte en FsNode[].
 * Los hijos de subdirectorios no se cargan (lazy).
 * @param dirPath - Ruta absoluta del directorio a leer.
 */
export async function listDir(dirPath: string): Promise<FsNode[]> {
  let entries: DirEntry[];
  try {
    entries = await readDir(dirPath);
  } catch {
    return [];
  }

  const nodes: FsNode[] = entries
    .filter((e) => e.name !== undefined)
    .map((e) => {
      const name = e.name ?? "";
      const isDir = e.isDirectory;
      const ext = isDir ? undefined : getExtension(name);
      return {
        name,
        path: dirPath.replace(/\\/g, "/").replace(/\/$/, "") + "/" + name,
        isDir,
        ext,
        children: isDir ? undefined : undefined,
      };
    })
    .sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return nodes;
}

// ─── Lectura y escritura de archivos ─────────────────────────────────────────

/**
 * Lee el contenido de texto de un archivo.
 * @param filePath - Ruta absoluta del archivo.
 */
export async function readFile(filePath: string): Promise<string> {
  return readTextFile(filePath);
}

/**
 * Escribe contenido de texto en un archivo (crea o sobreescribe).
 * @param filePath - Ruta absoluta del archivo.
 * @param content - Contenido a escribir.
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await writeTextFile(filePath, content);
}

/**
 * Crea un nuevo archivo vacío en la ruta dada.
 * @param filePath - Ruta absoluta del nuevo archivo.
 */
export async function createFile(filePath: string): Promise<void> {
  await writeTextFile(filePath, "");
}

/**
 * Elimina un archivo o directorio (con recursive para directorios).
 * @param path - Ruta absoluta.
 * @param recursive - Para directorios, eliminar recursivamente.
 */
export async function deleteEntry(path: string, recursive = false): Promise<void> {
  await remove(path, { recursive });
}

/**
 * Renombra o mueve un archivo/directorio.
 * @param oldPath - Ruta actual.
 * @param newPath - Nueva ruta.
 */
export async function renameEntry(oldPath: string, newPath: string): Promise<void> {
  await rename(oldPath, newPath);
}

/**
 * Crea un directorio (y padres si no existen).
 * @param dirPath - Ruta absoluta del directorio a crear.
 */
export async function createDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

// ─── Diálogos nativos ─────────────────────────────────────────────────────────

/**
 * Abre un diálogo nativo para seleccionar una carpeta.
 * @returns Ruta de la carpeta seleccionada, o null si se canceló.
 */
export async function openFolderDialog(): Promise<string | null> {
  const result = await dialogOpen({ directory: true, multiple: false });
  if (typeof result === "string") return result;
  return null;
}

/**
 * Abre un diálogo nativo para guardar un archivo.
 * @param defaultName - Nombre sugerido.
 * @returns Ruta elegida por el usuario, o null si canceló.
 */
export async function saveFileDialog(defaultName?: string): Promise<string | null> {
  const result = await dialogSave({
    defaultPath: defaultName,
    filters: [
      { name: "Texto", extensions: ["txt", "md", "ts", "js", "json", "py", "rs"] },
      { name: "Todos los archivos", extensions: ["*"] },
    ],
  });
  return result ?? null;
}

// ─── Archivos temporales ──────────────────────────────────────────────────────

/**
 * Genera un id único para un archivo temporal.
 */
function generateTempId(): string {
  return `${TEMP_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Asegura que el directorio temporal exista.
 */
async function ensureTempDir(): Promise<void> {
  const exists_ = await exists(TEMP_DIR, { baseDir: BaseDirectory.AppLocalData });
  if (!exists_) {
    await mkdir(TEMP_DIR, { baseDir: BaseDirectory.AppLocalData, recursive: true });
  }
}

/**
 * Guarda el contenido de una nota temporal en AppLocalData/nanpad/temp/.
 * @param tempId - ID único del temporal (nombre del archivo sin extensión).
 * @param content - Contenido de texto.
 */
export async function saveTempFile(tempId: string, content: string): Promise<void> {
  await ensureTempDir();
  await writeTextFile(`${TEMP_DIR}/${tempId}.txt`, content, {
    baseDir: BaseDirectory.AppLocalData,
  });
}

/**
 * Lee el contenido de una nota temporal.
 * @param tempId - ID único.
 */
export async function readTempFile(tempId: string): Promise<string> {
  return readTextFile(`${TEMP_DIR}/${tempId}.txt`, {
    baseDir: BaseDirectory.AppLocalData,
  });
}

/**
 * Elimina una nota temporal de disco.
 * @param tempId - ID único.
 */
export async function deleteTempFile(tempId: string): Promise<void> {
  try {
    await remove(`${TEMP_DIR}/${tempId}.txt`, { baseDir: BaseDirectory.AppLocalData });
  } catch {
    // Si no existe, ignorar
  }
}

/** Datos de un archivo temporal almacenado. */
export interface TempFileMeta {
  tempId: string;
  content: string;
}

/**
 * Lista y carga todos los archivos temporales almacenados en AppLocalData.
 * @returns Array con id y contenido de cada temporal.
 */
export async function loadAllTempFiles(): Promise<TempFileMeta[]> {
  await ensureTempDir();
  let entries: DirEntry[];
  try {
    entries = await readDir(TEMP_DIR, { baseDir: BaseDirectory.AppLocalData });
  } catch {
    return [];
  }

  const result: TempFileMeta[] = [];
  for (const entry of entries) {
    if (!entry.isFile || !entry.name?.startsWith(TEMP_PREFIX)) continue;
    const tempId = entry.name.replace(/\.txt$/, "");
    try {
      const content = await readTempFile(tempId);
      result.push({ tempId, content });
    } catch {
      // Ignorar archivos ilegibles
    }
  }
  return result;
}

/**
 * Crea un nuevo archivo temporal vacío en disco y retorna su ID.
 */
export async function createNewTempFile(): Promise<string> {
  const tempId = generateTempId();
  await saveTempFile(tempId, "");
  return tempId;
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/**
 * Comprueba si existe un archivo en la ruta absoluta dada.
 * Usa un comando Tauri para evitar restricciones de scope del plugin fs.
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    return await invoke<boolean>("check_file_exists", { path });
  } catch {
    return false;
  }
}

/**
 * Extrae la extensión de un nombre de archivo (sin punto, en minúsculas).
 */
export function getExtension(filename: string): string | undefined {
  const idx = filename.lastIndexOf(".");
  if (idx < 0 || idx === filename.length - 1) return undefined;
  return filename.slice(idx + 1).toLowerCase();
}
