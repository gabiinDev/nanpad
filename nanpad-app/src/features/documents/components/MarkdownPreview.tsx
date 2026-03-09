/**
 * Preview de Markdown con soporte Mermaid.
 * Parse asíncrono para no bloquear el hilo principal en documentos grandes.
 * Muestra estado de carga mientras parsea.
 * Los enlaces se manejan dentro del preview para no afectar la navegación de la app.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import mermaid from "mermaid";
import { fileExists, listDir } from "@/infrastructure/FsService.ts";
import { Spinner } from "@ui/components/Spinner.tsx";

marked.use(gfmHeadingId());

interface MarkdownPreviewProps {
  content: string;
  /** Directorio base del archivo (para resolver enlaces relativos a otros .md). */
  basePath?: string;
  /** Callback para abrir un archivo por ruta absoluta (enlaces relativos a otros .md). */
  onOpenFile?: (path: string) => void;
  className?: string;
}

let mermaidInitialized = false;

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function ensureMermaid(isDark: boolean) {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? "dark" : "default",
      securityLevel: "loose",
    });
    mermaidInitialized = true;
  }
}

/**
 * Parsea Markdown a HTML de forma asíncrona.
 * @param content - Texto en Markdown.
 * @returns HTML resultante.
 */
/** Parsea Markdown a HTML sin bloquear el hilo (siempre resuelve con string). */
async function parseMarkdownAsync(content: string): Promise<string> {
  const result = marked.parse(content, { async: true });
  const html = await Promise.resolve(result);
  return typeof html === "string" ? html : "";
}

/**
 * Componente de preview de Markdown.
 * Parse siempre asíncrono; muestra "Cargando…" mientras tanto.
 * Detecta bloques ```mermaid y los renderiza como diagramas SVG.
 */
export function MarkdownPreview({ content, basePath, onOpenFile, className = "" }: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  /** Intercepta clics en enlaces para que no naveguen la app (capture para ejecutar antes). */
  const handleLinkClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      const clicked = e.target as Node;
      const anchor = clicked instanceof Element
        ? clicked.closest("a[href]")
        : clicked?.parentElement?.closest?.("a[href]");
      if (!anchor) return;
      const rawHref = anchor.getAttribute("href") ?? "";
      if (!rawHref) return;
      e.preventDefault();
      e.stopPropagation();

      // Ancla interna (#sección): scroll dentro del preview
      if (rawHref.startsWith("#")) {
        const id = rawHref.slice(1);
        if (!id) return;
        let el = containerRef.current?.querySelector(`#${CSS.escape(id)}`);
        // marked-gfm-heading-id añade -1, -2... para unicidad; el enlace puede ser #instalación pero el id real es instalación-1
        if (!el) {
          const headings = containerRef.current?.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]");
          const slugNorm = (s: string) =>
            s.toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const idNorm = slugNorm(id);
          headings?.forEach((h) => {
            const hid = h.getAttribute("id");
            if (!hid) return;
            const hidNorm = slugNorm(hid.replace(/-\d+$/, ""));
            if (hidNorm === idNorm) el = h;
          });
        }
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      // mailto / tel: abrir con el manejador del sistema
      if (rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
        window.location.href = rawHref;
        return;
      }

      // Enlace relativo (./ o ../ o path sin protocolo): abrir en otro tab
      // IMPORTANTE: hacer esto ANTES de http/https, porque el browser resuelve ./docs/tech/ 
      // a http://localhost:.../docs/tech/ y lo trataríamos como externo por error
      const isRelative = rawHref.startsWith("./") || rawHref.startsWith("../") || (rawHref.length > 0 && !rawHref.includes(":"));
      if (isRelative && basePath && onOpenFile) {
      try {
        const sep = basePath.includes("\\") ? "\\" : "/";
        const dirParts = basePath.replace(/[/\\]+$/, "").split(/[/\\]/);
        const hrefParts = rawHref.split(/[/\\]/).filter(Boolean);
        for (const part of hrefParts) {
          if (part === ".") continue;
          if (part === "..") dirParts.pop();
          else dirParts.push(part);
        }
        const resolved = dirParts.join(sep);
        if (!resolved) return;
        // Archivo .md explícito
        if (rawHref.endsWith(".md") || rawHref.endsWith(".mdx") || rawHref.endsWith(".mdc")) {
          onOpenFile(resolved);
          return;
        }
        // Directorio (p. ej. ./docs/tech/seedium/): buscar README, index, {carpeta}.md o cualquier .md
        const isDirOrNoExt = rawHref.endsWith("/") || !/\.(md|mdx|mdc)$/i.test(rawHref);
        if (isDirOrNoExt) {
          const lastPart = dirParts[dirParts.length - 1];
          const indexFiles = [
            "README.md",
            "readme.md",
            "index.md",
            "INDEX.md",
            ...(lastPart ? [`${lastPart}.md`, `${lastPart}.mdx`] : []),
          ];
          for (const f of indexFiles) {
            const candidate = `${resolved}${sep}${f}`;
            if (await fileExists(candidate)) {
              onOpenFile(candidate);
              return;
            }
          }
          const nodes = await listDir(resolved);
          const mdFile = nodes.find(
            (n) => !n.isDir && (n.ext === "md" || n.ext === "mdx" || n.ext === "mdc")
          );
          if (mdFile) onOpenFile(mdFile.path);
        }
      } catch (err) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[MarkdownPreview] error enlace relativo:", err);
        }
      }
        return;
      }

      // URL externa (http/https): abrir en nueva pestaña
      const href = (anchor as HTMLAnchorElement).href;
      if (href.startsWith("http://") || href.startsWith("https://")) {
        window.open(href, "_blank", "noopener,noreferrer");
      }
    },
    [basePath, onOpenFile]
  );
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  /** HTML final con diagramas Mermaid ya renderizados; React aplica este, así no se pierden en re-renders. */
  const [finalHtml, setFinalHtml] = useState<string | null>(null);

  // Parse markdown y guardar HTML.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHtmlContent(null);
    setFinalHtml(null);

    parseMarkdownAsync(content)
      .then((html) => {
        if (cancelled) return;
        setHtmlContent(html);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al renderizar");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [content]);

  // Renderizar Mermaid y construir HTML final; al usar finalHtml en dangerouslySetInnerHTML,
  // los re-renders de React no sobrescriben los diagramas con el código fuente.
  useLayoutEffect(() => {
    if (htmlContent === null) return;

    const temp = document.createElement("div");
    temp.innerHTML = htmlContent;
    const mermaidBlocks = temp.querySelectorAll("code.language-mermaid");
    const isDark = document.documentElement.classList.contains("dark");
    ensureMermaid(isDark);

    const replaceNext = async (index: number): Promise<void> => {
      if (index >= mermaidBlocks.length) {
        setFinalHtml(temp.innerHTML);
        return;
      }
      const block = mermaidBlocks[index];
      const code = block.textContent ?? "";
      const pre = block.closest("pre");
      if (!pre) {
        replaceNext(index + 1);
        return;
      }
      const id = `mermaid-${Date.now()}-${index}`;
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid-diagram my-4";
      try {
        const { svg } = await mermaid.render(id, code);
        wrapper.innerHTML = svg;
      } catch {
        wrapper.innerHTML = `<pre class="rounded-lg bg-[var(--color-surface-active)] p-4 text-sm text-[var(--color-text-muted)]"><code>${escapeHtml(code)}</code></pre>`;
      }
      pre.replaceWith(wrapper);
      replaceNext(index + 1);
    };

    if (mermaidBlocks.length === 0) {
      setFinalHtml(htmlContent);
      return;
    }
    replaceNext(0);
  }, [htmlContent]);

  if (loading) {
    return (
      <div className={`flex min-h-[120px] items-center justify-center ${className}`} aria-busy="true">
        <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
          <Spinner />
          <span className="text-sm">Cargando vista previa…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-[var(--color-priority-high)] bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-priority-high)] ${className}`}>
        Error al renderizar: {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClickCapture={handleLinkClick}
      role="document"
      className={`prose prose-sm max-w-none text-[var(--color-text-primary)] 
        [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6
        [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5
        [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4
        [&_p]:mb-3 [&_p]:leading-relaxed
        [&_ul]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc
        [&_ol]:mb-3 [&_ol]:pl-5 [&_ol]:list-decimal
        [&_li]:mb-1
        [&_code]:rounded [&_code]:bg-[var(--color-surface-active)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono
        [&_pre]:rounded-lg [&_pre]:bg-[var(--color-surface-active)] [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:mb-3
        [&_pre_code]:bg-transparent [&_pre_code]:p-0
        [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--color-accent)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[var(--color-text-secondary)]
        [&_a]:text-[var(--color-accent)] [&_a]:underline
        [&_hr]:border-[var(--color-border)] [&_hr]:my-4
        [&_table]:w-full [&_table]:border-collapse [&_table]:mb-3
        [&_th]:border [&_th]:border-[var(--color-border)] [&_th]:px-3 [&_th]:py-2 [&_th]:bg-[var(--color-surface-hover)] [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold
        [&_td]:border [&_td]:border-[var(--color-border)] [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm
        ${className}`}
      dangerouslySetInnerHTML={{ __html: finalHtml ?? htmlContent ?? "" }}
    />
  );
}
