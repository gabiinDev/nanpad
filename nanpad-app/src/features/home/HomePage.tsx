/**
 * Página de inicio: tareas por hacer / en progreso y documentos abiertos.
 * Click en tarea → navega a Tareas y hace foco en esa tarea.
 * Click en documento → navega a Explorador con ese tab activo.
 */

import { useEffect, useState, useCallback } from "react";
import { useApp } from "@app/AppContext.tsx";
import { useRouteStore } from "@/store/useRouteStore.ts";
import { useNavFocusStore } from "@/store/useNavFocusStore.ts";
import { useExplorerStore } from "@/store/useExplorerStore.ts";
import type { TaskDTO } from "@nanpad/core";
import type { OpenTab } from "@/store/useExplorerStore.ts";
import { IconTasks, IconDocument, IconNote } from "@ui/icons/index.tsx";
import { ExplorerFileIcon } from "@features/explorer/utils/explorerFileIcons.tsx";
import { Spinner } from "@ui/components/Spinner.tsx";

const MAX_TASKS = 10;
const MAX_DOCS = 12;

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    uc.listTasks
      .execute({ status: ["todo", "in_progress"] })
      .then((list) => {
        if (!cancelled) setTasks(list.slice(0, MAX_TASKS));
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

  return (
    <div className="flex h-full overflow-auto bg-[var(--color-surface)]">
      <div className="mx-auto flex w-full max-w-[56.25rem] flex-col gap-6 px-4 py-6 sm:px-6 md:gap-8 md:px-8 md:py-8">
        {/* Tareas por hacer / en progreso */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            <IconTasks size={14} />
            Tareas recientes
          </h2>
          {loading ? (
            <div className="flex items-center gap-2 py-4">
              <Spinner />
              <span className="text-[0.8125rem] text-[var(--color-text-muted)]">Cargando…</span>
            </div>
          ) : tasks.length === 0 ? (
            <p className="py-3 text-[0.8125rem] text-[var(--color-text-muted)]">
              No hay tareas por hacer o en progreso.
            </p>
          ) : (
            <ul className="flex list-none flex-col gap-0.5 p-0 m-0">
              {tasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onTaskClick(task)}
                    className="flex w-full min-h-[2.75rem] items-center gap-2.5 rounded-lg border-none bg-transparent px-3.5 py-2.5 text-left text-[var(--color-text-primary)] transition-colors duration-150 hover:bg-[var(--color-surface-hover)]"
                  >
                    <span className="min-w-[4.5rem] text-[0.6875rem] font-medium text-[var(--color-text-muted)]">
                      {statusLabel[task.status] ?? task.status}
                    </span>
                    <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm">
                      {task.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Documentos abiertos */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            <IconDocument size={14} />
            Documentos abiertos
          </h2>
          {openTabs.length === 0 ? (
            <p className="py-3 text-[0.8125rem] text-[var(--color-text-muted)]">
              No hay archivos abiertos en el explorador.
            </p>
          ) : (
            <ul className="flex list-none flex-col gap-0.5 p-0 m-0">
              {openTabs.slice(0, MAX_DOCS).map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    onClick={() => onDocClick(tab)}
                    className="flex w-full min-h-[2.75rem] items-center gap-2.5 rounded-lg border-none px-3.5 py-2.5 text-left text-[var(--color-text-primary)] transition-colors duration-150 hover:bg-[var(--color-surface-hover)]"
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
                      className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm"
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
        </section>
      </div>
    </div>
  );
}
