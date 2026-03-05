/**
 * Página de inicio: resumen del workspace con tareas activas, documentos abiertos,
 * estadísticas rápidas y acciones de acceso directo.
 */

import { useEffect, useState, useCallback } from "react";
import { useApp } from "@app/AppContext.tsx";
import { useRouteStore } from "@/store/useRouteStore.ts";
import { useNavFocusStore } from "@/store/useNavFocusStore.ts";
import { useExplorerStore } from "@/store/useExplorerStore.ts";
import type { TaskDTO } from "@nanpad/core";
import type { OpenTab } from "@/store/useExplorerStore.ts";
import {
  IconTasks,
  IconDocument,
  IconNote,
  IconPlus,
  IconChevron,
} from "@ui/icons/index.tsx";
import { ExplorerFileIcon } from "@features/explorer/utils/explorerFileIcons.tsx";
import { Spinner } from "@ui/components/Spinner.tsx";

const MAX_TASKS = 10;
const MAX_DOCS = 12;

const PRIORITY_DOT: Record<number, string> = {
  0: "var(--color-priority-low)",
  1: "var(--color-priority-medium)",
  2: "var(--color-priority-high)",
  3: "var(--color-priority-critical)",
};

const statusLabel: Record<string, string> = {
  todo: "Por hacer",
  in_progress: "En progreso",
};

export default function HomePage() {
  const uc = useApp();
  const setRoute = useRouteStore((s) => s.setRoute);
  const setFocusTaskId = useNavFocusStore((s) => s.setFocusTaskId);
  const { openTabs, activeTabId, setActiveTab } = useExplorerStore();

  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [doneCount, setDoneCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      uc.listTasks.execute({ status: ["todo", "in_progress"] }),
      uc.listTasks.execute({ status: "done" }),
    ])
      .then(([activeList, doneList]) => {
        if (!cancelled) {
          setTasks(activeList.slice(0, MAX_TASKS));
          setDoneCount(doneList.length);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [uc.listTasks]);

  const onTaskClick = useCallback(
    (task: TaskDTO) => {
      setFocusTaskId(task.id);
      setRoute("tasks");
    },
    [setFocusTaskId, setRoute]
  );

  const onDocClick = useCallback(
    (tab: OpenTab) => {
      setActiveTab(tab.id);
      setRoute("documents");
    },
    [setActiveTab, setRoute]
  );

  const goToTasks = useCallback(() => setRoute("tasks"), [setRoute]);
  const goToExplorer = useCallback(() => setRoute("documents"), [setRoute]);

  const hasTasks = tasks.length > 0;
  const hasDocs = openTabs.length > 0;
  const isEmpty = !loading && !hasTasks && !hasDocs;

  return (
    <div className="flex h-full min-h-0 overflow-auto bg-[var(--color-surface)]">
      <div className="mx-auto flex w-full max-w-[64rem] flex-col gap-8 px-4 py-6 sm:px-6 md:gap-10 md:px-8 md:py-8">
        {/* ─── Hero ───────────────────────────────────────────────────────── */}
        <header className="border-b border-[var(--color-border)] pb-6">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)] md:text-2xl">
            Inicio
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Resumen de tu workspace: tareas activas y documentos abiertos
          </p>
        </header>

        {/* ─── Empty state ────────────────────────────────────────────────── */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-6 py-12 text-center">
            <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
              Aún no hay tareas activas ni documentos abiertos. Crea una tarea o abre el explorador para empezar.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={goToTasks}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-4 py-2.5 text-sm font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
              >
                <IconPlus size={14} />
                Nueva tarea
              </button>
              <button
                type="button"
                onClick={goToExplorer}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] hover:text-[var(--color-accent)]"
              >
                <IconDocument size={14} />
                Abrir explorador
              </button>
            </div>
          </div>
        )}

        {!isEmpty && (
          <>
            {/* ─── Stats + quick actions ───────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {loading ? "—" : tasks.length}
                  </span>
                  <span className="text-sm text-[var(--color-text-muted)]">tareas activas</span>
                </div>
                {doneCount !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-semibold tabular-nums text-[var(--color-status-done)]">
                      {doneCount}
                    </span>
                    <span className="text-sm text-[var(--color-text-muted)]">hechas</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {openTabs.length}
                  </span>
                  <span className="text-sm text-[var(--color-text-muted)]">docs abiertos</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={goToTasks}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] hover:text-[var(--color-accent)]"
                >
                  <IconPlus size={12} />
                  Tarea
                </button>
                <button
                  type="button"
                  onClick={goToExplorer}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] hover:text-[var(--color-accent)]"
                >
                  <IconDocument size={12} />
                  Explorador
                </button>
              </div>
            </div>

            {/* ─── Dos columnas en md+ ─────────────────────────────────────── */}
            <div className="grid gap-6 md:grid-cols-2 md:gap-8">
              {/* Tareas recientes */}
              <section className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    <IconTasks size={14} />
                    Tareas recientes
                  </h2>
                  {hasTasks && (
                    <button
                      type="button"
                      onClick={goToTasks}
                      className="flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] transition-colors hover:underline"
                    >
                      Ver todas
                      <IconChevron size={10} />
                    </button>
                  )}
                </div>
                <div className="min-h-[8rem] px-1 py-2">
                  {loading ? (
                    <div className="flex items-center gap-2 px-4 py-6">
                      <Spinner />
                      <span className="text-[0.8125rem] text-[var(--color-text-muted)]">Cargando…</span>
                    </div>
                  ) : !hasTasks ? (
                    <p className="px-4 py-6 text-[0.8125rem] text-[var(--color-text-muted)]">
                      No hay tareas por hacer o en progreso.
                    </p>
                  ) : (
                    <ul className="list-none p-0 m-0">
                      {tasks.map((task) => (
                        <li key={task.id}>
                          <button
                            type="button"
                            onClick={() => onTaskClick(task)}
                            className="flex w-full min-h-[2.75rem] items-center gap-2.5 rounded-lg border-none bg-transparent px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--color-surface-hover)]"
                          >
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{
                                background: PRIORITY_DOT[task.priority as number] ?? PRIORITY_DOT[1],
                              }}
                              title={`Prioridad ${task.priority}`}
                            />
                            <span className="min-w-[4.25rem] text-[0.6875rem] font-medium text-[var(--color-text-muted)]">
                              {statusLabel[task.status] ?? task.status}
                            </span>
                            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                              {task.title}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {/* Documentos abiertos */}
              <section className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    <IconDocument size={14} />
                    Documentos abiertos
                  </h2>
                  {hasDocs && (
                    <button
                      type="button"
                      onClick={goToExplorer}
                      className="flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] transition-colors hover:underline"
                    >
                      Abrir
                      <IconChevron size={10} />
                    </button>
                  )}
                </div>
                <div className="min-h-[8rem] px-1 py-2">
                  {openTabs.length === 0 ? (
                    <p className="px-4 py-6 text-[0.8125rem] text-[var(--color-text-muted)]">
                      No hay archivos abiertos en el explorador.
                    </p>
                  ) : (
                    <ul className="list-none p-0 m-0">
                      {openTabs.slice(0, MAX_DOCS).map((tab) => (
                        <li key={tab.id}>
                          <button
                            type="button"
                            onClick={() => onDocClick(tab)}
                            className="flex w-full min-h-[2.75rem] items-center gap-2.5 rounded-lg border-none px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--color-surface-hover)]"
                            style={{
                              background: tab.id === activeTabId ? "var(--color-accent-subtle)" : "transparent",
                            }}
                            onMouseEnter={(e) => {
                              if (tab.id !== activeTabId)
                                (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
                            }}
                            onMouseLeave={(e) => {
                              if (tab.id !== activeTabId)
                                (e.currentTarget as HTMLElement).style.background = "transparent";
                            }}
                          >
                            <span className="shrink-0 text-[var(--color-text-muted)]">
                              {tab.isTemp ? (
                                <IconNote size={14} />
                              ) : (
                                <ExplorerFileIcon ext={tab.ext} size={14} />
                              )}
                            </span>
                            <span
                              className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[var(--color-text-primary)]"
                              title={tab.path ?? tab.label}
                            >
                              {tab.label}
                              {tab.isDirty && !tab.isTemp && (
                                <span className="ml-1 text-[var(--color-priority-high)]">•</span>
                              )}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
