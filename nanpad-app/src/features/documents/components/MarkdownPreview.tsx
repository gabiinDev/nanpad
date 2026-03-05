/**
 * Preview de Markdown con soporte Mermaid.
 * Usa marked para el render HTML y mermaid para diagramas.
 */

import { useEffect, useRef } from "react";
import { marked } from "marked";
import mermaid from "mermaid";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

let mermaidInitialized = false;

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
 * Componente de preview de Markdown.
 * Detecta bloques ```mermaid y los renderiza como diagramas SVG.
 */
export function MarkdownPreview({ content, className = "" }: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = document.documentElement.classList.contains("dark");
    ensureMermaid(isDark);

    // Renderizar Markdown → HTML
    const html = marked.parse(content, { async: false }) as string;
    containerRef.current.innerHTML = html;

    // Encontrar y renderizar bloques Mermaid
    const mermaidBlocks = containerRef.current.querySelectorAll("code.language-mermaid");
    mermaidBlocks.forEach(async (block, i) => {
      const code = block.textContent ?? "";
      const id = `mermaid-${Date.now()}-${i}`;
      try {
        const { svg } = await mermaid.render(id, code);
        const wrapper = document.createElement("div");
        wrapper.className = "mermaid-diagram my-4";
        wrapper.innerHTML = svg;
        block.parentElement?.replaceWith(wrapper);
      } catch {
        // Si falla el render, dejar el bloque de código original
      }
    });
  }, [content]);

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
    />
  );
}
