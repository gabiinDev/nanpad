/**
 * Validación de nombres de archivo y carpeta.
 * Caracteres no permitidos (Windows): \ / : * ? " < > |
 * También se rechazan nombres vacíos, solo espacios, y segmentos "." o "..".
 */

const INVALID_CHARS = /[\\/:*?"<>|]/;
const INVALID_NAMES = new Set([".", ".."]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida un nombre o ruta relativa para archivo o carpeta.
 * Si el texto contiene "/", se valida cada segmento (para rutas como "mi/carpeta/archivo.txt").
 * @param input - Nombre o ruta ingresada por el usuario.
 * @param isDir - true si se está creando solo una carpeta (cada segmento debe ser nombre de carpeta).
 * @returns Resultado con valid: true o false y mensaje de error si aplica.
 */
export function validateFileNameOrPath(input: string, _isDir: boolean): ValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: "El nombre no puede estar vacío." };
  }

  const segments = trimmed.split("/").map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) {
    return { valid: false, error: "El nombre no puede estar vacío." };
  }

  for (const segment of segments) {
    if (INVALID_NAMES.has(segment)) {
      return { valid: false, error: `Nombre no permitido: "${segment}".` };
    }
    if (INVALID_CHARS.test(segment)) {
      return {
        valid: false,
        error: 'No se permiten los caracteres: \\ / : * ? " < > |',
      };
    }
    if (segment.endsWith(" ") || segment.startsWith(" ")) {
      return { valid: false, error: "El nombre no puede empezar ni terminar con espacios." };
    }
  }

  return { valid: true };
}

/**
 * Valida un solo nombre (sin rutas con "/"). Para renombrar archivo o carpeta.
 */
export function validateSingleName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, error: "El nombre no puede estar vacío." };
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    return { valid: false, error: "El nombre no puede contener / ni \\." };
  }
  if (INVALID_NAMES.has(trimmed)) {
    return { valid: false, error: `Nombre no permitido: "${trimmed}".` };
  }
  if (INVALID_CHARS.test(trimmed)) {
    return {
      valid: false,
      error: 'No se permiten los caracteres: \\ / : * ? " < > |',
    };
  }
  if (trimmed.endsWith(" ") || trimmed.startsWith(" ")) {
    return { valid: false, error: "El nombre no puede empezar ni terminar con espacios." };
  }
  return { valid: true };
}
