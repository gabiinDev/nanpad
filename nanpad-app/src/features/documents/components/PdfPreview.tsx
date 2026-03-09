/**
 * Preview de PDF en iframe.
 * Solo vista previa; no hay modos editor ni dividido.
 * Carga el archivo binario y muestra blob URL en iframe.
 */

import { useEffect, useState, useRef } from "react";
import { readBinaryFile } from "@/infrastructure/FsService.ts";
import { Spinner } from "@ui/components/Spinner.tsx";

interface PdfPreviewProps {
  /** Ruta absoluta del archivo PDF. */
  path: string;
  className?: string;
}

/**
 * Muestra la vista previa de un PDF.
 * Lee el archivo binario y lo renderiza en un iframe mediante blob URL.
 */
export function PdfPreview({ path, className = "" }: PdfPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    readBinaryFile(path)
      .then((data) => {
        if (cancelled) return;
        const blob = new Blob([data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar el PDF");
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
  }, [path]);

  if (loading) {
    return (
      <div
        className={`flex min-h-[12rem] flex-col items-center justify-center gap-3 bg-[var(--color-surface)] px-4 py-8 ${className}`}
      >
        <Spinner />
        <span className="text-sm text-[var(--color-text-muted)]">Cargando PDF…</span>
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
    <iframe
      title="Vista previa PDF"
      src={blobUrl}
      className={`h-full w-full min-h-[400px] border-0 bg-[var(--color-surface)] ${className}`}
    />
  );
}
