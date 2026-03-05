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
import { useExplorerStore } from "@/store/useExplorerStore.ts";
import { detectLanguage } from "@features/explorer/utils/langDetect.ts";
import { MarkdownPreview } from "@features/documents/components/MarkdownPreview.tsx";
import {
  IconSave,
  IconEditorMode,
  IconSplitMode,
  IconPreviewMode,
  IconNote,
} from "@ui/icons/index.tsx";
import { ExplorerFileIcon } from "@features/explorer/utils/explorerFileIcons.tsx";


type PanelMode = "editor" | "split" | "preview";

/** Lenguajes comunes de Monaco para el selector de resaltado (solo modo editor). */
const MONACO_LANGUAGE_OPTIONS: { id: string; label: string }[] = [
  { id: "plaintext", label: "Texto plano" },
  { id: "markdown", label: "Markdown" },
  { id: "typescript", label: "TypeScript" },
  { id: "javascript", label: "JavaScript" },
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

// ── Toolbar ────────────────────────────────────────────────────────────────────

interface ToolbarProps {
  tab: OpenTab;
  mode: PanelMode;
  setMode: (m: PanelMode) => void;
  onSave: () => void;
  /** Lenguaje efectivo para resaltado (puede ser override del usuario). */
  language: string;
  onLanguageChange: (lang: string) => void;
}

function Toolbar({ tab, mode, setMode, onSave, language, onLanguageChange }: ToolbarProps) {
  const isMarkdown = tab.ext === "md" || tab.ext === "mdx";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 12px",
        height: "36px",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface-2)",
        flexShrink: 0,
      }}
    >
      {/* Izquierda: título → badges → desplegable de lenguaje (orden solicitado) */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
        <span style={{ color: "var(--color-text-muted)", flexShrink: 0 }}>
          {tab.isTemp ? <IconNote size={13} /> : <ExplorerFileIcon ext={tab.ext} size={13} />}
        </span>
        <span style={{ fontSize: "13px", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tab.label}
        </span>
        {tab.isTemp && (
          <span
            style={{
              fontSize: "11px",
              color: "var(--color-priority-high)",
              background: "var(--color-surface-active)",
              borderRadius: "3px",
              padding: "1px 5px",
              flexShrink: 0,
            }}
          >
            temporal
          </span>
        )}
        {tab.isDirty && !tab.isTemp && (
          <span style={{ fontSize: "11px", color: "var(--color-text-muted)", flexShrink: 0 }}>
            (sin guardar)
          </span>
        )}
        {/* Separador entre título/badges y selector de lenguaje (como en el breadcrumb) */}
        {mode === "editor" && (
          <div
            style={{
              width: "1px",
              height: "16px",
              background: "var(--color-border)",
              flexShrink: 0,
            }}
          />
        )}
        {/* Selector de lenguaje — con padding derecho para la flecha */}
        {mode === "editor" && (
          <select
            value={language}
            onChange={(e) => { onLanguageChange(e.target.value); }}
            title="Resaltado de sintaxis"
            style={{
              fontSize: "12px",
              padding: "4px 8px",
              paddingRight: "28px",
              borderRadius: "5px",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text-primary)",
              cursor: "pointer",
              minWidth: "120px",
              flexShrink: 0,
            }}
          >
            {MONACO_LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Controles a la derecha */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        {/* Toggle de vista — solo para markdown */}
        {isMarkdown && (
          <div
            style={{
              display: "flex",
              border: "1px solid var(--color-border)",
              borderRadius: "5px",
              overflow: "hidden",
            }}
          >
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
                  title={labels[m]}
                  onClick={() => { setMode(m); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px 8px",
                    gap: "4px",
                    border: "none",
                    borderRight: m !== "preview" ? "1px solid var(--color-border)" : "none",
                    background: isActive ? "var(--color-surface-hover)" : "transparent",
                    color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    cursor: "pointer",
                    fontSize: "12px",
                    transition: "all 0.1s ease",
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

        {/* Guardar */}
        {!tab.isTemp && (
          <button
            title="Guardar (Ctrl+S)"
            onClick={onSave}
            disabled={!tab.isDirty}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "5px",
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: tab.isDirty ? "var(--color-text-primary)" : "var(--color-text-muted)",
              cursor: tab.isDirty ? "pointer" : "default",
              fontSize: "12px",
              opacity: tab.isDirty ? 1 : 0.45,
              transition: "all 0.1s ease",
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
  const { updateTabContent, saveTab, saveTempWithDialog } = useExplorerStore();
  const isMarkdown = tab.ext === "md" || tab.ext === "mdx";

  // Los archivos .md se abren en preview por defecto
  const [mode, setMode] = useState<PanelMode>(() => isMarkdown ? "preview" : "editor");
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  /** Override de lenguaje por tab (solo modo editor). */
  const [languageOverrides, setLanguageOverrides] = useState<Record<string, string>>({});

  const detectedLanguage = detectLanguage(tab.ext);
  const language = languageOverrides[tab.id] ?? detectedLanguage;

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguageOverrides((prev) => ({ ...prev, [tab.id]: lang }));
  }, [tab.id]);

  // Aplicar configuración sin diagnósticos
  useMonacoNoDiagnostics();

  // Al cambiar de tab: resetear modo y enfocar el editor si corresponde
  useEffect(() => {
    const newMode: PanelMode = isMarkdown ? "preview" : "editor";
    setMode(newMode);
    if (newMode !== "preview") {
      // Pequeño delay para que Monaco haya re-renderizado con el nuevo modelo
      const t = setTimeout(() => editorRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [tab.id, isMarkdown]);

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

  const handleChange = useCallback((value: string | undefined) => {
    updateTabContent(tab.id, value ?? "");
  }, [tab.id, updateTabContent]);

  const handleEditorMount = useCallback((ed: editor.IStandaloneCodeEditor) => {
    editorRef.current = ed;
    // Foco automático al abrir un archivo o nota
    ed.focus();
  }, []);

  const monacoTheme = isDark ? "vs-dark" : "vs";
  /** Monaco no tiene lenguaje "vue" nativo; usamos HTML para resaltado de SFC. */
  const monacoLanguage = language === "vue" ? "html" : language;

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Toolbar
        tab={tab}
        mode={mode}
        setMode={setMode}
        onSave={() => void saveTab(tab.id)}
        language={language}
        onLanguageChange={handleLanguageChange}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Editor Monaco */}
        {(mode === "editor" || mode === "split") && (
          <div style={{ flex: mode === "split" ? "0 0 50%" : "1", overflow: "hidden" }}>
            {monacoEditor}
          </div>
        )}

        {/* Preview Markdown */}
        {isMarkdown && (mode === "preview" || mode === "split") && (
          <div
            style={{
              flex: mode === "split" ? "0 0 50%" : "1",
              overflow: "auto",
              padding: "20px 28px",
              borderLeft: mode === "split" ? "1px solid var(--color-border)" : "none",
              background: "var(--color-surface)",
            }}
          >
            <MarkdownPreview content={tab.content} />
          </div>
        )}
      </div>
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "16px",
        color: "var(--color-text-muted)",
      }}
    >
      <div style={{ fontSize: "15px", opacity: 0.6 }}>
        Abrí un archivo del árbol o creá una nota rápida
      </div>
      <button
        onClick={() => void createTempTab()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 18px",
          borderRadius: "7px",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface-hover)",
          color: "var(--color-text-secondary)",
          fontSize: "14px",
          cursor: "pointer",
          transition: "all 0.12s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent)";
          (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
          (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
        }}
      >
        + Nueva nota temporal
      </button>
    </div>
  );
}
