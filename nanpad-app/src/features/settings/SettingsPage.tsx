/**
 * Página de ajustes de NANPAD.
 * Gestiona tema claro/oscuro, High Performance e import/export/backup.
 */

import { useState, useRef, useEffect } from "react";
import { IconMoon, IconSun, IconZap, IconHelp, IconTerminal, IconChevronDown, IconFolderOpen } from "@ui/icons/index.tsx";
import { CategoriesSection } from "@features/tasks/components/CategoriesSection.tsx";
import type { ThemeState } from "@app/useTheme.ts";
import { useApp } from "@app/AppContext.tsx";
import { Spinner } from "@ui/components/Spinner.tsx";
import { useAppSettingsStore } from "@/store/useAppSettingsStore.ts";
import { useCategoryStore } from "@/store/useCategoryStore.ts";

interface SettingsPageProps {
  theme: ThemeState;
}

export default function SettingsPage({ theme }: SettingsPageProps) {
  const uc = useApp();
  const showHelpIcon = useAppSettingsStore((s) => s.show_help_icon);
  const { categories, loadCategories } = useCategoryStore();
  const defaultTaskView = useAppSettingsStore((s) => s.default_task_view);
  const setShowHelpIcon = useAppSettingsStore((s) => s.setShowHelpIcon);
  const setDefaultTaskView = useAppSettingsStore((s) => s.setDefaultTaskView);
  const mcpEnabled = useAppSettingsStore((s) => s.mcp_enabled);
  const mcpPort = useAppSettingsStore((s) => s.mcp_port);
  const setMcpEnabled = useAppSettingsStore((s) => s.setMcpEnabled);
  const setMcpPort = useAppSettingsStore((s) => s.setMcpPort);
  const [exportLoading, setExportLoading] = useState(false);
  const [mcpPortInput, setMcpPortInput] = useState<string>("");
  const [importLoading, setImportLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [mcpExpanded, setMcpExpanded] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [installPath, setInstallPath] = useState<string | null>(null);
  const [openFolderError, setOpenFolderError] = useState<string | null>(null);
  const [mcpTestLoading, setMcpTestLoading] = useState(false);
  const [mcpTestResult, setMcpTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mcpExpanded) return;
    const load = async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const path = await invoke<string>("get_nanpad_install_path");
        setInstallPath(path);
      } catch {
        setInstallPath(null);
      }
    };
    void load();
  }, [mcpExpanded]);

  const showMsg = (type: "ok" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => { setMessage(null); }, 4000);
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const result = await uc.exportWorkspace.execute({ includeHistory: true });
      downloadJson(result.json, result.filename);
      showMsg("ok", `Exportado: ${result.filename} (${(result.sizeBytes / 1024).toFixed(1)} KB)`);
    } catch (e) {
      showMsg("error", `Error al exportar: ${String(e)}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const result = await uc.backupNow.execute();
      downloadJson(result.json, result.filename);
      showMsg("ok", `Backup creado: ${result.filename}`);
    } catch (e) {
      showMsg("error", `Error al crear backup: ${String(e)}`);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const json = await file.text();
      const result = await uc.importWorkspace.execute({ json, replace: false });
      const total = Object.values(result.imported).reduce((a, b) => a + b, 0);
      showMsg("ok", `Importadas ${total} filas desde ${file.name}`);
    } catch (e) {
      showMsg("error", `Error al importar: ${String(e)}`);
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8 pb-16 lg:px-8">
        <h1 className="mb-6 text-xl font-semibold text-[var(--color-text-primary)]">
          Ajustes
        </h1>

      {/* Mensaje de estado (ancho completo) */}
      {message && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            message.type === "ok"
              ? "bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300"
              : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:grid-rows-[auto_auto] lg:items-start">
      {/* ─── Integración MCP (toda la primera fila, colapsable) ────────────── */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] overflow-hidden lg:col-span-2">
        <button
          type="button"
          onClick={() => setMcpExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-2 p-5 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
          aria-expanded={mcpExpanded}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
            Integración MCP
          </h2>
          <span className={`text-xs font-medium ${mcpEnabled ? "text-[var(--color-status-done)]" : "text-[var(--color-priority-critical)]"}`}>
            {mcpEnabled ? `Activo · ${mcpPort}` : "Desactivado"}
          </span>
          <IconChevronDown
            size={14}
            className={`shrink-0 text-[var(--color-text-muted)] transition-transform ${mcpExpanded ? "" : "-rotate-90"}`}
            aria-hidden
          />
        </button>
        {mcpExpanded && (
        <div className="border-t border-[var(--color-border)] px-5 pb-5 pt-1">
        <p className="mb-4 mt-2 text-xs text-[var(--color-text-muted)]">
          Permite que un agente de IA externo (p. ej. Cursor, Claude) interactúe con tareas, categorías y adjuntos mediante HTTP en localhost. El servicio no bloquea la app.
        </p>
        <div className="mb-3 flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-3">
          <div className="flex items-center gap-3">
            <IconTerminal size={16} className={mcpEnabled ? "text-[var(--color-status-done)]" : "text-[var(--color-text-muted)]"} />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Servidor MCP</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {mcpEnabled ? `Activo en http://127.0.0.1:${mcpPort}` : "Desactivado"}
              </p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={mcpEnabled}
            onClick={() => {
              if (!uc) return;
              void setMcpEnabled(uc, !mcpEnabled).catch((e) => showMsg("error", e instanceof Error ? e.message : String(e)));
            }}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
              mcpEnabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-switch-track-off)]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow transition-transform ${
                mcpEnabled
                  ? "translate-x-5 bg-[var(--color-accent-foreground)]"
                  : "translate-x-0 bg-[var(--color-switch-thumb-off)]"
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Puerto</p>
            <p className="text-xs text-[var(--color-text-muted)]">Solo 127.0.0.1 (localhost). Por defecto 4242.</p>
          </div>
          <input
            type="number"
            min={1}
            max={65535}
            value={mcpPortInput === "" ? mcpPort : mcpPortInput}
            onChange={(e) => setMcpPortInput(e.target.value)}
            onBlur={() => {
              if (!uc) return;
              const n = parseInt(mcpPortInput, 10);
              if (Number.isFinite(n) && n > 0 && n < 65536 && n !== mcpPort) {
                setMcpPortInput("");
                void setMcpPort(uc, n).catch((e) => showMsg("error", e instanceof Error ? e.message : String(e)));
              } else {
                setMcpPortInput("");
              }
            }}
            className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-right text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>

        {/* Probar conexión al servidor MCP */}
        {mcpEnabled && (
          <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-3">
            <p className="mb-2 text-sm font-medium text-[var(--color-text-primary)]">Comprobar servidor MCP</p>
            <p className="mb-3 text-xs text-[var(--color-text-muted)]">
              Prueba si el servidor HTTP de NANPAD responde en este puerto. Si falla, Cursor/VS Code no podrán usar las herramientas.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={mcpTestLoading}
                onClick={async () => {
                  setMcpTestResult(null);
                  setMcpTestLoading(true);
                  try {
                    const { invoke } = await import("@tauri-apps/api/core");
                    const msg = await invoke<string>("test_mcp_connection", { port: mcpPort });
                    setMcpTestResult({ ok: true, message: msg });
                  } catch (e) {
                    setMcpTestResult({
                      ok: false,
                      message: e instanceof Error ? e.message : String(e),
                    });
                  } finally {
                    setMcpTestLoading(false);
                  }
                }}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-active)] disabled:opacity-50"
              >
                {mcpTestLoading ? "Comprobando…" : "Probar conexión"}
              </button>
              {mcpTestResult && (
                <span
                  className={`text-xs ${mcpTestResult.ok ? "text-[var(--color-status-done)]" : "text-[var(--color-priority-critical)]"}`}
                  role="status"
                >
                  {mcpTestResult.ok ? "✓ " : "✗ "}
                  {mcpTestResult.message}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Ayuda: configurar en Cursor y VS Code */}
        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
            Cómo usar con Cursor o VS Code
          </p>
          <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
            Activa el servidor MCP arriba y deja NANPAD abierto. Luego añade el servidor en tu editor con el adaptador stdio:
          </p>
          <p className="mb-2 text-xs font-medium text-[var(--color-text-primary)]">Cursor</p>
          <p className="mb-2 text-xs text-[var(--color-text-muted)]">
            Crea o edita <code className="rounded bg-[var(--color-surface-hover)] px-1 py-0.5">.cursor/mcp.json</code> en tu proyecto (o en tu usuario) con:
          </p>
          <pre className="mb-4 overflow-x-auto rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-3 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
{`{
  "mcpServers": {
    "nanpad": {
      "command": "node",
      "args": ["ruta/NANPAD/mcp-adapter/index.mjs"],
      "env": {
        "NANPAD_MCP_URL": "http://127.0.0.1:${mcpPort}"
      }
    }
  }
}`}
          </pre>
          <p className="mb-2 text-xs text-[var(--color-text-muted)]">
            Cursor usa la clave <code className="rounded bg-[var(--color-surface-hover)] px-1 py-0.5">mcpServers</code>. Sustituye <code className="rounded bg-[var(--color-surface-hover)] px-1 py-0.5">ruta/NANPAD</code> por la ruta absoluta a la carpeta de NANPAD (usa &quot;Abrir carpeta de instalación&quot;). Cierra Cursor por completo y ábrelo de nuevo tras guardar.
          </p>
          {installPath && (
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2">
                <code className="flex-1 break-all text-[11px] text-[var(--color-text-secondary)]" title={installPath}>
                  {installPath}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    setOpenFolderError(null);
                    try {
                      const { openPath } = await import("@tauri-apps/plugin-opener");
                      await openPath(installPath);
                    } catch (e) {
                      const msg = e instanceof Error ? e.message : String(e);
                      setOpenFolderError(msg);
                    }
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-active)]"
                >
                  <IconFolderOpen size={12} aria-hidden />
                  Abrir carpeta de instalación
                </button>
              </div>
              {openFolderError && (
                <p className="mt-2 text-xs text-[var(--color-priority-critical)]" role="alert">
                  {openFolderError}
                </p>
              )}
            </div>
          )}
          <p className="mb-2 mt-4 text-xs font-medium text-[var(--color-text-primary)]">VS Code</p>
          <p className="mb-2 text-xs text-[var(--color-text-muted)]">
            Crea o edita <code className="rounded bg-[var(--color-surface-hover)] px-1 py-0.5">.vscode/mcp.json</code> en tu workspace (o en tu perfil de usuario) con el mismo contenido anterior. Reinicia VS Code si hace falta.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            En ambos editores: Herramientas → MCP (o Comandos: &quot;MCP: Add Server&quot;) para añadir el servidor si prefieres la interfaz gráfica. Asegúrate de que la URL del puerto coincida con el que muestra NANPAD aquí.
          </p>
          <p className="mt-4 text-xs font-medium text-[var(--color-text-primary)]">Si Cursor/VS Code dice que no hay herramientas</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            1) Usa el botón &quot;Probar conexión&quot; arriba: debe mostrar ✓. 2) En <code className="rounded bg-[var(--color-surface-hover)] px-1 py-0.5">mcp.json</code> la ruta en <code className="rounded bg-[var(--color-surface-hover)] px-1 py-0.5">args</code> debe ser <strong>absoluta</strong> al <code className="rounded bg-[var(--color-surface-hover)] px-1 py-0.5">index.mjs</code> del mcp-adapter (usa &quot;Abrir carpeta de instalación&quot; para copiarla). 3) <code className="rounded bg-[var(--color-surface-hover)] px-1 py-0.5">NANPAD_MCP_URL</code> debe usar el mismo puerto que NANPAD. 4) Reinicia Cursor/VS Code tras cambiar <code className="rounded bg-[var(--color-surface-hover)] px-1 py-0.5">mcp.json</code>.
          </p>
        </div>
        </div>
        )}
      </section>

      {/* ─── Apariencia ──────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
          Apariencia
        </h2>

        {/* Selector de tema */}
        <div className="mb-3 flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-3">
          <div className="flex items-center gap-3">
            {theme.theme === "dark" ? (
              <IconMoon size={16} className="text-[var(--color-accent)]" />
            ) : (
              <IconSun size={16} className="text-[var(--color-accent)]" />
            )}
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Tema</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {theme.theme === "dark" ? "Modo oscuro activo" : "Modo claro activo"}
              </p>
            </div>
          </div>
          <div className="flex gap-1 rounded-md border border-[var(--color-border)] p-1">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { theme.setTheme(t); }}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  theme.theme === t
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-active)]"
                }`}
              >
                {t === "light" ? <IconSun size={12} /> : <IconMoon size={12} />}
                {t === "light" ? "Claro" : "Oscuro"}
              </button>
            ))}
          </div>
        </div>

        {/* High Performance */}
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-3">
          <div className="flex items-center gap-3">
            <IconZap
              size={16}
              className={theme.highPerf ? "text-[var(--color-priority-high)]" : "text-[var(--color-text-muted)]"}
            />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Modo rendimiento</p>
              <p className="text-xs text-[var(--color-text-muted)]">Desactiva animaciones y transiciones</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={theme.highPerf}
            onClick={theme.toggleHighPerf}
            className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
              theme.highPerf ? "bg-[var(--color-accent)]" : "bg-[var(--color-switch-track-off)]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow transition-transform ${
                theme.highPerf
                  ? "translate-x-5 bg-[var(--color-accent-foreground)]"
                  : "translate-x-0 bg-[var(--color-switch-thumb-off)]"
              }`}
            />
          </button>
        </div>
      </section>

      {/* ─── Ayuda y preferencias (columna derecha, ocupa ambas filas) ─────── */}
      <section className="flex min-h-0 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-5 lg:row-span-2 lg:overflow-y-auto">
        <h2 className="mb-4 shrink-0 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
          Ayuda y preferencias
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto">

        {/* Icono de ayuda flotante */}
        <div className="mb-3 flex items-center justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <IconHelp size={16} className="shrink-0 text-[var(--color-text-muted)]" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Mostrar icono de ayuda</p>
              <p className="text-xs text-[var(--color-text-muted)]">Icono flotante (arriba a la derecha) con atajos e interacciones por pantalla</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={showHelpIcon}
            onClick={() => { void setShowHelpIcon(uc, !showHelpIcon); }}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
              showHelpIcon ? "bg-[var(--color-accent)]" : "bg-[var(--color-switch-track-off)]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow transition-transform ${
                showHelpIcon
                  ? "translate-x-5 bg-[var(--color-accent-foreground)]"
                  : "translate-x-0 bg-[var(--color-switch-thumb-off)]"
              }`}
            />
          </button>
        </div>

        {/* ABM de categorías de tareas (colapsable) */}
        <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] overflow-hidden">
          <button
            type="button"
            onClick={() => setCategoriesExpanded((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-active)] transition-colors"
            aria-expanded={categoriesExpanded}
          >
            <span>Categorías de tareas</span>
            <IconChevronDown
              size={14}
              className={`shrink-0 text-[var(--color-text-muted)] transition-transform ${categoriesExpanded ? "" : "-rotate-90"}`}
              aria-hidden
            />
          </button>
          {categoriesExpanded && uc && (
            <div className="max-h-[min(40vh,320px)] overflow-y-auto border-t border-[var(--color-border)] px-4 py-4">
              <CategoriesSection uc={uc} categories={categories} loadCategories={loadCategories} />
            </div>
          )}
        </div>

        {/* Vista por defecto Tareas */}
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Vista por defecto (Tareas)</p>
            <p className="text-xs text-[var(--color-text-muted)]">Al abrir Tareas se mostrará esta vista</p>
          </div>
          <div className="flex gap-0.5 rounded-md border border-[var(--color-border)] p-0.5">
            {(["list", "kanban"] as const).map((v) => (
              <button
                key={v}
                onClick={() => { void setDefaultTaskView(uc, v); }}
                className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  defaultTaskView === v
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-active)]"
                }`}
              >
                {v === "list" ? "Lista" : "Kanban"}
              </button>
            ))}
          </div>
        </div>
        </div>
      </section>

      {/* ─── Datos del workspace (columna izquierda, debajo de Apariencia) ─── */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
          Datos del workspace
        </h2>

        <div className="space-y-3">
          {/* Export */}
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Exportar workspace</p>
              <p className="text-xs text-[var(--color-text-muted)]">Descarga un JSON con todas las tareas y documentos</p>
            </div>
            <button
              onClick={() => { void handleExport(); }}
              disabled={exportLoading}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-active)] disabled:opacity-60 transition-colors"
            >
              {exportLoading ? <Spinner className="h-3 w-3" /> : null}
              Exportar
            </button>
          </div>

          {/* Backup */}
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Crear backup</p>
              <p className="text-xs text-[var(--color-text-muted)]">Incluye historial de cambios completo</p>
            </div>
            <button
              onClick={() => { void handleBackup(); }}
              disabled={backupLoading}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-active)] disabled:opacity-60 transition-colors"
            >
              {backupLoading ? <Spinner className="h-3 w-3" /> : null}
              Backup
            </button>
          </div>

          {/* Import */}
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Importar datos</p>
              <p className="text-xs text-[var(--color-text-muted)]">Merge con los datos actuales (INSERT OR IGNORE)</p>
            </div>
            <div className="flex items-center gap-2">
              {importLoading && <Spinner className="h-3 w-3" />}
              <button
                onClick={() => { fileInputRef.current?.click(); }}
                disabled={importLoading}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-active)] disabled:opacity-60 transition-colors"
              >
                Seleccionar JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => { void handleImportFile(e); }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Acerca de (ancho completo en 2 columnas) ─────────────────────── */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-5 lg:col-span-2">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
          Acerca de
        </h2>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">NANPAD</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">v0.1.0 · Workspace local · 100% offline</p>
        </div>
      </section>
      </div>
      </div>
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
