/**
 * EditorPanel — editor Monaco con detección de lenguaje por extensión.
 * - Los archivos .md se abren en modo "preview" por defecto.
 * - La validación de TypeScript/lint de Monaco está deshabilitada (visor de código, no IDE).
 * - Autosave con debounce para archivos reales; guardado inmediato en AppLocalData para temporales.
 */

import { useRef, useCallback, useEffect, useState } from "react";
import MonacoEditor, { useMonaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { OpenTab } from "@/store/useExplorerStore.ts";
import { useExplorerStore, type MdPanelMode } from "@/store/useExplorerStore.ts";
import { detectLanguage } from "@features/explorer/utils/langDetect.ts";
import { MarkdownPreview } from "@features/documents/components/MarkdownPreview.tsx";
import {
  IconSave,
  IconEditorMode,
  IconSplitMode,
  IconPreviewMode,
  IconNote,
  IconCopy,
  IconCut,
  IconPaste,
  IconTasks,
  IconFileCode,
} from "@ui/icons/index.tsx";
import { AttachToTaskModal, type AttachToTaskPayload } from "./AttachToTaskModal.tsx";
import { ExplorerFileIcon } from "@features/explorer/utils/explorerFileIcons.tsx";


type PanelMode = MdPanelMode;

/** Lenguajes comunes de Monaco para el selector de resaltado (solo modo editor). */
const MONACO_LANGUAGE_OPTIONS: { id: string; label: string }[] = [
  { id: "plaintext", label: "Texto plano" },
  { id: "markdown", label: "Markdown" },
  { id: "typescript", label: "TypeScript" },
  { id: "typescriptreact", label: "TSX (React)" },
  { id: "javascript", label: "JavaScript" },
  { id: "javascriptreact", label: "JSX (React)" },
  { id: "vue", label: "Vue" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "scss", label: "SCSS" },
  { id: "json", label: "JSON" },
  { id: "yaml", label: "YAML" },
  { id: "xml", label: "XML" },
  { id: "python", label: "Python" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
  { id: "java", label: "Java" },
  { id: "csharp", label: "C#" },
  { id: "cpp", label: "C++" },
  { id: "c", label: "C" },
  { id: "shell", label: "Shell" },
  { id: "powershell", label: "PowerShell" },
  { id: "sql", label: "SQL" },
  { id: "dockerfile", label: "Dockerfile" },
];

// ── Deshabilitar validación de Monaco (TypeScript, JSON, etc.) ─────────────────

/**
 * Hook que configura Monaco para funcionar como visor/editor de código,
 * sin análisis de errores ni diagnósticos de compilación.
 * Usa la API de monaco-editor directamente (no el hook useMonaco) para evitar
 * el tipo deprecated que expone @monaco-editor/react.
 */
function useMonacoNoDiagnostics() {
  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco) return;
    try {
      // Acceso mediante indexación para evitar el error de tipo "deprecated"
      const ts = (monaco.languages as unknown as Record<string, unknown>)["typescript"] as {
        typescriptDefaults?: { setDiagnosticsOptions: (o: Record<string, unknown>) => void };
        javascriptDefaults?: { setDiagnosticsOptions: (o: Record<string, unknown>) => void };
      } | undefined;

      ts?.typescriptDefaults?.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
        noSuggestionDiagnostics: true,
      });
      ts?.javascriptDefaults?.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
        noSuggestionDiagnostics: true,
      });

      const json = (monaco.languages as unknown as Record<string, unknown>)["json"] as {
        jsonDefaults?: { setDiagnosticsOptions: (o: Record<string, unknown>) => void };
      } | undefined;
      json?.jsonDefaults?.setDiagnosticsOptions({ validate: false });
    } catch {
      // Si la API cambia, ignorar silenciosamente
    }
  }, [monaco]);
}

// ── Selector de lenguaje (mismo estilo que barra de búsqueda: 30px, 7px radius) ─

interface LanguageDropdownProps {
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}

function LanguageDropdown({ value, options, onChange }: LanguageDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const current = options.find((o) => o.id === value) ?? options[0];

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); }}
        title="Resaltado de sintaxis"
        className="flex h-[30px] min-w-[7rem] items-center justify-between gap-2 rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 pr-7 text-[13px] text-[var(--color-text-primary)] transition-colors duration-150 hover:border-[var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 focus:ring-offset-[var(--color-surface-2)]"
      >
        <span className="truncate text-left">{current.label}</span>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4.5 L6 7.5 L9 4.5" />
          </svg>
        </span>
      </button>
      {open && (
        <div
          className="dropdown-enter absolute left-0 right-0 top-[calc(100%+2px)] z-50 max-h-64 overflow-y-auto rounded-[7px] border border-[var(--color-accent)] border-t-0 bg-[var(--color-surface-2)] shadow-[var(--shadow-xl)]"
          style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
          role="listbox"
        >
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={opt.id === value}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              className="w-full px-2.5 py-1.5 text-left text-[13px] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
              style={{ background: opt.id === value ? "var(--color-accent-subtle)" : undefined }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Toolbar ────────────────────────────────────────────────────────────────────

interface ToolbarProps {
  tab: OpenTab;
  mode: PanelMode;
  setMode: (m: PanelMode) => void;
  onSave: () => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  /** Si true, muestra los botones editor/split/preview (p. ej. temp con markdown seleccionado). */
  isMarkdown?: boolean;
  onCopyAll: () => void;
  onCutAll: () => void;
  onPaste: () => void;
  onAttachToTask?: () => void;
  /** Adjuntar archivo completo a una tarea (solo si el tab tiene path). */
  onAttachFileToTask?: () => void;
}

function Toolbar({ tab, mode, setMode, onSave, language, onLanguageChange, onCopyAll, onCutAll, onPaste, onAttachToTask, onAttachFileToTask, isMarkdown: isMarkdownProp }: ToolbarProps) {
  const isMarkdown = isMarkdownProp ?? (tab.ext === "md" || tab.ext === "mdx");

  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 text-[var(--color-text-muted)]">
          {tab.isTemp ? <IconNote size={13} /> : <ExplorerFileIcon ext={tab.ext} size={13} />}
        </span>
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] text-[var(--color-text-secondary)]">
          {tab.label}
        </span>
        {tab.isTemp && (
          <span className="shrink-0 rounded bg-[var(--color-surface-active)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--color-priority-high)]">
            temporal
          </span>
        )}
        {tab.isDirty && !tab.isTemp && (
          <span className="shrink-0 text-[0.6875rem] text-[var(--color-text-muted)]">(sin guardar)</span>
        )}
        {(mode === "editor" || mode === "split") && (
          <>
            <div className="h-4 w-px shrink-0 bg-[var(--color-border)]" />
            <LanguageDropdown
              value={language}
              options={MONACO_LANGUAGE_OPTIONS}
              onChange={onLanguageChange}
            />
            <div className="h-4 w-px shrink-0 bg-[var(--color-border)]" />
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                title="Copiar todo"
                onClick={onCopyAll}
                className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
              >
                <IconCopy size={12} />
              </button>
              <button
                type="button"
                title="Cortar todo"
                onClick={onCutAll}
                className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
              >
                <IconCut size={12} />
              </button>
              <button
                type="button"
                title="Pegar"
                onClick={onPaste}
                className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
              >
                <IconPaste size={12} />
              </button>
              {onAttachToTask && (
                <button
                  type="button"
                  title="Añadir selección a tarea"
                  onClick={onAttachToTask}
                  className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-accent)]"
                >
                  <IconTasks size={12} />
                </button>
              )}
              {onAttachFileToTask && (
                <button
                  type="button"
                  title="Añadir archivo completo a tarea"
                  onClick={onAttachFileToTask}
                  className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-accent)]"
                >
                  <IconFileCode size={12} />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {isMarkdown && (
          <div className="flex overflow-hidden rounded-md border border-[var(--color-border)]">
            {(["editor", "split", "preview"] as PanelMode[]).map((m) => {
              const icons = {
                editor: <IconEditorMode size={12} />,
                split: <IconSplitMode size={12} />,
                preview: <IconPreviewMode size={12} />,
              };
              const labels = { editor: "Editor", split: "Dividido", preview: "Vista previa" };
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  title={labels[m]}
                  onClick={() => { setMode(m); }}
                  className={`flex min-h-[2.75rem] items-center justify-center gap-1 px-2 py-1 text-xs transition-colors duration-150 ${m !== "preview" ? "border-r border-[var(--color-border)]" : ""}`}
                  style={{
                    background: isActive ? "var(--color-surface-hover)" : "transparent",
                    color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {icons[m]}
                  <span>{labels[m]}</span>
                </button>
              );
            })}
          </div>
        )}

        {!tab.isTemp && (
          <button
            type="button"
            title="Guardar (Ctrl+S)"
            onClick={onSave}
            disabled={!tab.isDirty}
            className="flex min-h-[2.75rem] items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-transparent px-2.5 py-1 text-xs transition-colors duration-150 disabled:cursor-default"
            style={{
              color: tab.isDirty ? "var(--color-text-primary)" : "var(--color-text-muted)",
              opacity: tab.isDirty ? 1 : 0.45,
            }}
          >
            <IconSave size={12} />
            <span>Guardar</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── EditorPanel ────────────────────────────────────────────────────────────────

interface EditorPanelProps {
  tab: OpenTab;
  isDark: boolean;
}

/**
 * Panel de edición con Monaco + preview opcional para Markdown.
 */
export function EditorPanel({ tab, isDark }: EditorPanelProps) {
  const {
    updateTabContent,
    saveTab,
    saveTempWithDialog,
    mdViewModes,
    setMdViewMode,
    pushUndo,
  } = useExplorerStore();
  const monaco = useMonaco();
  /** Evita registrar el contenido en undo cuando el cambio viene de undo/redo. */
  const isUndoRedoRef = useRef(false);
  const languageOverrides = useExplorerStore((s) => s.languageOverrides);
  const setLanguageOverride = useExplorerStore((s) => s.setLanguageOverride);
  const detectedLanguage = detectLanguage(tab.ext);
  const language = languageOverrides[tab.id] ?? detectedLanguage;
  const isMarkdown = tab.ext === "md" || tab.ext === "mdx" || language === "markdown";
  const isMdReal = isMarkdown && !!tab.path;

  // Tabs .md reales: modo y ratio desde el store (persistidos). Temporales: estado local.
  const stored = mdViewModes[tab.id];
  const [localMode, setLocalMode] = useState<PanelMode>("preview");
  const [localSplitRatio, setLocalSplitRatio] = useState(0.5);
  const mode: PanelMode = isMdReal
    ? (stored?.mode ?? "preview")
    : isMarkdown
      ? localMode
      : "editor";
  const splitRatio = isMdReal ? (stored?.splitRatio ?? 0.5) : localSplitRatio;

  const setMode = useCallback(
    (m: PanelMode) => {
      if (isMdReal) setMdViewMode(tab.id, m);
      else if (isMarkdown) setLocalMode(m);
    },
    [isMdReal, isMarkdown, tab.id, setMdViewMode]
  );

  const setSplitRatioValue = useCallback(
    (ratio: number) => {
      if (isMdReal) setMdViewMode(tab.id, mode, ratio);
      else setLocalSplitRatio(ratio);
    },
    [isMdReal, tab.id, mode, setMdViewMode]
  );

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  /** Payload para el modal "Añadir a tarea" (selección actual). */
  const [attachModalPayload, setAttachModalPayload] = useState<AttachToTaskPayload | null>(null);

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguageOverride(tab.id, lang);
    if (lang === "markdown" && tab.isTemp && !tab.path) {
      setLocalMode("split");
    }
  }, [tab.id, tab.isTemp, tab.path, setLanguageOverride]);

  const handleAttachToTask = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const model = ed.getModel();
    if (!model) return;
    const selection = ed.getSelection();
    const range = selection ?? model.getFullModelRange();
    const content = model.getValueInRange(range);
    if (!content.trim()) return;
    setAttachModalPayload({
      content,
      language: tab.ext ?? null,
      filePath: tab.path ?? null,
      lineStart: range.startLineNumber,
      lineEnd: range.endLineNumber,
    });
  }, [tab.id, tab.ext, tab.path]);

  /** Adjuntar el archivo completo (sin rango de líneas). Solo para tabs con path. */
  const handleAttachFileToTask = useCallback(() => {
    if (!tab.path) return;
    setAttachModalPayload({
      content: "",
      language: tab.ext ?? null,
      filePath: tab.path,
      lineStart: null,
      lineEnd: null,
    });
  }, [tab.path, tab.ext]);

  // Aplicar configuración sin diagnósticos
  useMonacoNoDiagnostics();

  // Al cambiar de tab (solo no-reales): resetear modo local y enfocar editor si aplica.
  // Solo resetea cuando cambia tab.id; no cuando isMarkdown cambia por selección de lenguaje.
  useEffect(() => {
    if (!isMdReal && isMarkdown) setLocalMode("preview");
    if (mode !== "preview") {
      const t = setTimeout(() => editorRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [tab.id, isMdReal]);

  // Foco automático al cambiar a un modo que muestra el editor
  useEffect(() => {
    if (mode !== "preview") {
      const t = setTimeout(() => editorRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [mode]);

  // Escuchar evento de cambio de modo desde FileTree (apertura con modo específico)
  useEffect(() => {
    const handler = (e: Event) => {
      const { tabId, mode: newMode } = (e as CustomEvent<{ tabId: string; mode: PanelMode }>).detail;
      if (tabId === tab.id) setMode(newMode);
    };
    window.addEventListener("nanpad:set-editor-mode", handler as EventListener);
    return () => window.removeEventListener("nanpad:set-editor-mode", handler as EventListener);
  }, [tab.id]);

  // Escuchar evento para posicionar en línea (desde adjuntos de tareas)
  useEffect(() => {
    const handler = (e: Event) => {
      const { path, lineStart } = (e as CustomEvent<{ path: string; lineStart: number; lineEnd?: number }>).detail;
      if (tab.path !== path) return;
      const ed = editorRef.current;
      if (ed) ed.revealLineInCenter(lineStart);
    };
    window.addEventListener("nanpad:open-file-at-line", handler as EventListener);
    return () => window.removeEventListener("nanpad:open-file-at-line", handler as EventListener);
  }, [tab.path]);

  // Ctrl+S: guardar (archivo real) o abrir diálogo "Guardar como" (nota temporal)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (tab.isTemp) {
          void saveTempWithDialog(tab.id);
        } else if (tab.isDirty) {
          void saveTab(tab.id);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tab.id, tab.isTemp, tab.isDirty, saveTab, saveTempWithDialog]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (isUndoRedoRef.current) {
        isUndoRedoRef.current = false;
        return;
      }
      pushUndo(tab.id, tab.content);
      updateTabContent(tab.id, value ?? "");
    },
    [tab.id, tab.content, updateTabContent, pushUndo]
  );

  const handleEditorMount = useCallback(
    (ed: editor.IStandaloneCodeEditor) => {
      editorRef.current = ed;
      ed.focus();

      const m = monaco as unknown as { KeyMod: { CtrlCmd: number }; KeyCode: { KEY_Z: number; KEY_Y: number } };
      if (m?.KeyMod && m?.KeyCode) {
        const runUndo = () => {
          const activeId = useExplorerStore.getState().activeTabId;
          if (!activeId) return;
          isUndoRedoRef.current = true;
          useExplorerStore.getState().undo(activeId);
        };
        const runRedo = () => {
          const activeId = useExplorerStore.getState().activeTabId;
          if (!activeId) return;
          isUndoRedoRef.current = true;
          useExplorerStore.getState().redo(activeId);
        };
        ed.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.KEY_Z, runUndo);
        ed.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.KEY_Y, runRedo);
      }
    },
    [monaco]
  );

  // Escuchar evento del buscador flotante (Ctrl+B) para ir a una línea
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ tabId: string; lineNumber: number }>;
      if (ev.detail?.tabId !== tab.id) return;
      const line = ev.detail.lineNumber;
      const ed = editorRef.current;
      if (!ed) return;
      ed.revealLine(line, 1);
      ed.setPosition({ lineNumber: line, column: 1 });
      ed.focus();
    };
    window.addEventListener("nanpad:editor-reveal-line", handler);
    return () => window.removeEventListener("nanpad:editor-reveal-line", handler);
  }, [tab.id]);

  const monacoTheme = isDark ? "vs-dark" : "vs";
  /** Monaco: vue→html; typescriptreact/jsxreact no tienen tokenizer propio, usamos typescript/javascript. */
  const monacoLanguage =
    language === "vue" ? "html"
    : language === "typescriptreact" ? "typescript"
    : language === "javascriptreact" ? "javascript"
    : language;

  const handleCopyAll = useCallback(() => {
    void navigator.clipboard.writeText(tab.content);
  }, [tab.content]);

  const handleCutAll = useCallback(() => {
    void navigator.clipboard.writeText(tab.content);
    updateTabContent(tab.id, "");
  }, [tab.id, tab.content, updateTabContent]);

  const handlePaste = useCallback(async () => {
    const text = await navigator.clipboard.readText();
    const ed = editorRef.current;
    if (!ed) return;
    const model = ed.getModel();
    if (!model) return;
    const selection = ed.getSelection();
    const range = selection
      ? { startLineNumber: selection.startLineNumber, startColumn: selection.startColumn, endLineNumber: selection.endLineNumber, endColumn: selection.endColumn }
      : model.getFullModelRange();
    ed.executeEdits("paste", [{ range, text }]);
    updateTabContent(tab.id, model.getValue());
  }, [tab.id, updateTabContent]);

  const monacoEditor = (
    <MonacoEditor
      height="100%"
      language={monacoLanguage}
      value={tab.content}
      theme={monacoTheme}
      onChange={handleChange}
      onMount={handleEditorMount}
      options={{
        fontSize: 14,
        lineHeight: 22,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: isMarkdown ? "on" : "off",
        renderWhitespace: "selection",
        tabSize: 2,
        insertSpaces: true,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
        lineNumbers: isMarkdown ? "off" : "on",
        glyphMargin: false,
        folding: true,
        bracketPairColorization: { enabled: true },
        suggest: {
          preview: true,
          showWords: true,
          showSnippets: true,
          showMethods: true,
          showFunctions: true,
          showConstructors: true,
          showDeprecated: true,
          showFields: true,
          showVariables: true,
          showClasses: true,
          showStructs: true,
          showInterfaces: true,
          showModules: true,
          showProperties: true,
          showEvents: true,
          showOperators: true,
          showUnits: true,
          showValues: true,
          showConstants: true,
          showEnums: true,
          showEnumMembers: true,
          showKeywords: true,
          showColors: true,
          showFiles: true,
          showReferences: true,
          showFolders: true,
          showTypeParameters: true,
          showIssues: true,
        },
        quickSuggestions: { other: true, comments: false, strings: true },
        acceptSuggestionOnEnter: "on",
        tabCompletion: "on",
        cursorBlinking: "smooth",
        smoothScrolling: true,
        // Deshabilitar errores inline (squiggles)
        renderValidationDecorations: "off",
        // Sin hover semántico de tipos
        hover: { enabled: false },
        scrollbar: {
          vertical: "auto",
          horizontal: "auto",
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
      }}
    />
  );

  /** Ratio temporal mientras se arrastra el divisor; al soltar se persiste. */
  const [draggingRatio, setDraggingRatio] = useState<number | null>(null);
  const [draggingSplit, setDraggingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const effectiveSplitRatio = draggingRatio ?? splitRatio;

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingSplit(true);
  }, []);

  useEffect(() => {
    if (!draggingSplit) return;
    const onMove = (e: MouseEvent) => {
      const el = splitContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const ratio = Math.max(0.2, Math.min(0.8, x));
      setDraggingRatio(ratio);
    };
    const onUp = () => {
      if (draggingRatio !== null) {
        if (isMdReal) setSplitRatioValue(draggingRatio);
        else if (isMarkdown) setLocalSplitRatio(draggingRatio);
      }
      setDraggingRatio(null);
      setDraggingSplit(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingSplit, draggingRatio, isMdReal, isMarkdown, setSplitRatioValue]);

  const editorFlex = mode === "split" ? effectiveSplitRatio : 1;
  const previewFlex = mode === "split" ? 1 - effectiveSplitRatio : 1;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Toolbar
        tab={tab}
        mode={mode}
        setMode={setMode}
        onSave={() => void saveTab(tab.id)}
        language={language}
        onLanguageChange={handleLanguageChange}
        onCopyAll={handleCopyAll}
        onCutAll={handleCutAll}
        onPaste={handlePaste}
        onAttachToTask={handleAttachToTask}
        onAttachFileToTask={tab.path ? handleAttachFileToTask : undefined}
        isMarkdown={isMarkdown}
      />

      <div ref={splitContainerRef} className="flex min-h-0 flex-1 overflow-hidden">
        <div
          key={mode}
          className="flex min-h-0 min-w-0 flex-1 flex-row animate-fade-up overflow-hidden"
        >
          {(mode === "editor" || mode === "split") && (
            <div
              className="min-h-0 min-w-0 overflow-hidden"
              style={{ flex: editorFlex }}
            >
              {monacoEditor}
            </div>
          )}

          {mode === "split" && isMarkdown && (
            <div
              role="separator"
              aria-orientation="vertical"
              onMouseDown={handleSplitMouseDown}
              className={`z-10 w-1 shrink-0 cursor-col-resize transition-colors duration-150 hover:bg-[var(--color-border-strong)] ${draggingSplit ? "bg-[var(--color-accent)]" : "bg-transparent"}`}
            />
          )}

          {isMarkdown && (mode === "preview" || mode === "split") && (
            <div
              key={tab.id}
              className={`min-h-0 min-w-0 overflow-auto bg-[var(--color-surface)] px-5 py-5 md:px-7 ${mode === "split" ? "border-l border-[var(--color-border)]" : ""}`}
              style={{ flex: previewFlex }}
            >
              <MarkdownPreview content={tab.content} />
            </div>
          )}
        </div>
      </div>
      {attachModalPayload && (
        <AttachToTaskModal
          payload={attachModalPayload}
          onClose={() => setAttachModalPayload(null)}
        />
      )}
    </div>
  );
}

// ── Placeholder ───────────────────────────────────────────────────────────────

/**
 * Pantalla vacía cuando no hay ningún archivo abierto.
 */
export function EditorEmpty() {
  const { createTempTab } = useExplorerStore();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-[var(--color-text-muted)]">
      <p className="text-base opacity-60">
        Abrí un archivo del árbol o creá una nota rápida
      </p>
      <button
        type="button"
        onClick={() => void createTempTab()}
        className="flex min-h-[2.75rem] items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
      >
        + Nueva nota temporal
      </button>
    </div>
  );
}
