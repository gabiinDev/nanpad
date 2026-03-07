/**
 * Preview de Markdown con soporte Mermaid.
 * Parse asíncrono para no bloquear el hilo principal en documentos grandes.
 * Muestra estado de carga mientras parsea.
 */

import { useEffect, useState, useRef } from "react";
import { marked } from "marked";
import mermaid from "mermaid";
import { Spinner } from "@ui/components/Spinner.tsx";

interface MarkdownPreviewProps {
  content: string;
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
export function MarkdownPreview({ content, className = "" }: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

  // Parse markdown y guardar HTML en estado para que se renderice en el div que ya está montado.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHtmlContent(null);

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

  // Sustituir bloques Mermaid por diagramas una vez el HTML está en el DOM.
  useEffect(() => {
    if (htmlContent === null || !containerRef.current) return;

    const container = containerRef.current;
    const isDark = document.documentElement.classList.contains("dark");
    ensureMermaid(isDark);

    const mermaidBlocks = container.querySelectorAll("code.language-mermaid");
    let cancelled = false;
    mermaidBlocks.forEach(async (block, i) => {
      if (cancelled) return;
      const code = block.textContent ?? "";
      const pre = block.closest("pre");
      if (!pre) return;

      const id = `mermaid-${Date.now()}-${i}`;
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid-diagram mermaid-diagram--loading my-4";
      wrapper.setAttribute("aria-busy", "true");
      pre.replaceWith(wrapper);

      try {
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) {
          wrapper.innerHTML = svg;
          wrapper.classList.remove("mermaid-diagram--loading");
          wrapper.setAttribute("aria-busy", "false");
        }
      } catch {
        if (!cancelled) {
          wrapper.innerHTML = `<pre class="rounded-lg bg-[var(--color-surface-active)] p-4 text-sm text-[var(--color-text-muted)]"><code>${escapeHtml(code)}</code></pre>`;
          wrapper.classList.remove("mermaid-diagram--loading");
          wrapper.setAttribute("aria-busy", "false");
        }
      }
    });

    return () => { cancelled = true; };
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
      dangerouslySetInnerHTML={{ __html: htmlContent ?? "" }}
    />
  );
}
