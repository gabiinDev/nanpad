/**
 * Página de ajustes de NANPAD.
 * Gestiona tema claro/oscuro, High Performance e import/export/backup.
 */

import { useState, useRef } from "react";
import { IconMoon, IconSun, IconZap, IconHelp } from "@ui/icons/index.tsx";
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
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <div className="mx-auto max-w-lg p-8 pb-16">
        <h1 className="mb-8 text-xl font-semibold text-[var(--color-text-primary)]">
          Ajustes
        </h1>

      {/* Mensaje de estado */}
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

      {/* ─── Apariencia ──────────────────────────────────────────────────── */}
      <section className="mb-8">
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

      {/* ─── Ayuda y preferencias ─────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
          Ayuda y preferencias
        </h2>

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

        {/* ABM de categorías de tareas */}
        <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-4">
          {uc && <CategoriesSection uc={uc} categories={categories} loadCategories={loadCategories} />}
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
      </section>

      {/* ─── Datos ───────────────────────────────────────────────────────── */}
      <section className="mb-8">
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

      {/* ─── Acerca de ───────────────────────────────────────────────────── */}
      <section>
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
