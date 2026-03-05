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
    <div
      className="flex h-full overflow-auto"
      style={{ background: "var(--color-surface)" }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
        }}
      >
        {/* Tareas por hacer / en progreso */}
        <section>
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--color-text-muted)",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            <IconTasks size={14} />
            Tareas recientes
          </h2>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px 0" }}>
              <Spinner />
              <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                Cargando…
              </span>
            </div>
          ) : tasks.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", padding: "12px 0" }}>
              No hay tareas por hacer o en progreso.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
              {tasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onTaskClick(task)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 14px",
                      textAlign: "left",
                      border: "none",
                      borderRadius: "8px",
                      background: "transparent",
                      color: "var(--color-text-primary)",
                      cursor: "pointer",
                      transition: "background 0.12s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "var(--color-text-muted)",
                        minWidth: "72px",
                      }}
                    >
                      {statusLabel[task.status] ?? task.status}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "14px",
                      }}
                    >
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
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--color-text-muted)",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            <IconDocument size={14} />
            Documentos abiertos
          </h2>
          {openTabs.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", padding: "12px 0" }}>
              No hay archivos abiertos en el explorador.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
              {openTabs.slice(0, MAX_DOCS).map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    onClick={() => onDocClick(tab)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 14px",
                      textAlign: "left",
                      border: "none",
                      borderRadius: "8px",
                      background: tab.id === activeTabId ? "var(--color-accent-subtle)" : "transparent",
                      color: "var(--color-text-primary)",
                      cursor: "pointer",
                      transition: "background 0.12s ease",
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
                    <span style={{ flexShrink: 0, color: "var(--color-text-muted)" }}>
                      {tab.isTemp ? (
                        <IconNote size={14} />
                      ) : (
                        <ExplorerFileIcon ext={tab.ext} size={14} />
                      )}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "14px",
                      }}
                      title={tab.path ?? tab.label}
                    >
                      {tab.label}
                      {tab.isDirty && !tab.isTemp && (
                        <span style={{ color: "var(--color-priority-high)", marginLeft: "4px" }}>•</span>
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
