/**
 * Preview de imagen (png, jpg, gif, webp, etc.).
 * Solo vista previa; no hay modos editor ni dividido.
 * Carga el archivo binario y muestra blob URL en <img>.
 */

import { useEffect, useState, useRef } from "react";
import { readBinaryFile } from "@/infrastructure/FsService.ts";
import { Spinner } from "@ui/components/Spinner.tsx";

/** MIME types comunes por extensión. */
const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  bmp: "image/bmp",
  avif: "image/avif",
  tiff: "image/tiff",
  tif: "image/tiff",
};

interface ImagePreviewProps {
  /** Ruta absoluta del archivo de imagen. */
  path: string;
  /** Extensión del archivo (para MIME type). */
  ext?: string;
  className?: string;
}

/**
 * Muestra la vista previa de una imagen.
 * Lee el archivo binario y lo renderiza en un <img> mediante blob URL.
 */
export function ImagePreview({ path, ext = "", className = "" }: ImagePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const mime = MIME_BY_EXT[ext.replace(/^\./, "").toLowerCase()] ?? "image/png";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    readBinaryFile(path)
      .then((data) => {
        if (cancelled) return;
        const blob = new Blob([data], { type: mime });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar la imagen");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [path, mime]);

  if (loading) {
    return (
      <div
        className={`flex min-h-[12rem] flex-col items-center justify-center gap-3 bg-[var(--color-surface)] px-4 py-8 ${className}`}
      >
        <Spinner />
        <span className="text-sm text-[var(--color-text-muted)]">Cargando imagen…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex min-h-[12rem] flex-col items-center justify-center gap-3 bg-[var(--color-surface)] px-4 py-8 ${className}`}
      >
        <span className="text-sm text-[var(--color-priority-high)]">{error}</span>
      </div>
    );
  }

  if (!blobUrl) return null;

  return (
    <div
      className={`flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[var(--color-surface)] p-4 ${className}`}
    >
      <img
        src={blobUrl}
        alt="Vista previa"
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}
