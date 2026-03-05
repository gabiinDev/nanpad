/**
 * Editor de documentos con layout split: Monaco (izquierda) + Preview (derecha).
 * Guarda automáticamente con debounce de 1.5 s.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import MonacoEditor from "@monaco-editor/react";
import type { DocumentWithContentDTO } from "@nanpad/core";
import { MarkdownPreview } from "./MarkdownPreview.tsx";

type PanelMode = "split" | "editor" | "preview";

interface DocumentEditorProps {
  document: DocumentWithContentDTO;
  isDark: boolean;
  saving: boolean;
  onSave: (content: string, title?: string) => void;
  onTitleChange: (title: string) => void;
}

const DEBOUNCE_MS = 1500;

/**
 * Editor split: Monaco + preview Markdown/Mermaid.
 * El guardado se dispara automáticamente tras 1.5 s de inactividad.
 */
export function DocumentEditor({
  document,
  isDark,
  saving,
  onSave,
  onTitleChange,
}: DocumentEditorProps) {
  const [content, setContent] = useState(document.content);
  const [title, setTitle] = useState(document.title);
  const [panelMode, setPanelMode] = useState<PanelMode>("split");
  const [editingTitle, setEditingTitle] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resetear contenido al cambiar de documento
  useEffect(() => {
    setContent(document.content);
    setTitle(document.title);
  }, [document.id, document.content, document.title]);

  const scheduleSave = useCallback(
    (newContent: string, newTitle?: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onSave(newContent, newTitle);
      }, DEBOUNCE_MS);
    },
    [onSave]
  );

  const handleContentChange = useCallback(
    (value: string | undefined) => {
      const v = value ?? "";
      setContent(v);
      scheduleSave(v);
    },
    [scheduleSave]
  );

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (title.trim() && title !== document.title) {
      onTitleChange(title.trim());
      scheduleSave(content, title.trim());
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* ─── Barra superior ─────────────────────────────────────────────── */}
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-[var(--color-border)] px-4">
        {/* Título editable */}
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => { setTitle(e.target.value); }}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => { if (e.key === "Enter") handleTitleBlur(); if (e.key === "Escape") { setTitle(document.title); setEditingTitle(false); } }}
            className="flex-1 bg-transparent text-sm font-semibold text-[var(--color-text-primary)] outline-none border-b border-[var(--color-accent)]"
          />
        ) : (
          <button
            onClick={() => { setEditingTitle(true); }}
            className="flex-1 truncate text-left text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors"
            title="Clic para editar título"
          >
            {title}
          </button>
        )}

        {/* Indicador de guardado */}
        <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
          {saving ? "Guardando…" : "Guardado"}
        </span>

        {/* Toggle modo panel */}
        <div className="flex shrink-0 gap-1 rounded-md border border-[var(--color-border)] p-0.5">
          {(["editor", "split", "preview"] as PanelMode[]).map((mode) => {
            const labels: Record<PanelMode, string> = { editor: "Editor", split: "Dividido", preview: "Vista previa" };
            return (
              <button
                key={mode}
                onClick={() => { setPanelMode(mode); }}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  panelMode === mode
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Área de edición ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Monaco Editor */}
        {(panelMode === "editor" || panelMode === "split") && (
          <div
            className={`flex flex-col ${
              panelMode === "split"
                ? "w-1/2 border-r border-[var(--color-border)]"
                : "w-full"
            }`}
          >
            <MonacoEditor
              height="100%"
              language="markdown"
              value={content}
              theme={isDark ? "vs-dark" : "light"}
              onChange={handleContentChange}
              options={{
                fontSize: 13,
                lineHeight: 22,
                wordWrap: "on",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                renderLineHighlight: "none",
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
                lineNumbers: "off",
                folding: false,
                padding: { top: 12, bottom: 12 },
                fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
              }}
            />
          </div>
        )}

        {/* Preview */}
        {(panelMode === "preview" || panelMode === "split") && (
          <div
            className={`overflow-y-auto p-6 ${
              panelMode === "split" ? "w-1/2" : "w-full"
            }`}
          >
            <MarkdownPreview content={content} />
          </div>
        )}
      </div>
    </div>
  );
}
