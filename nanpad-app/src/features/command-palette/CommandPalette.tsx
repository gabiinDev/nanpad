/**
 * CommandPalette — modal de búsqueda rápida (Ctrl+K).
 * Permite navegar a secciones, crear tarea, ir a una tarea o a un documento abierto.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useApp } from "@app/AppContext.tsx";
import type { AppRoute } from "@app/router.ts";
import { useRouteStore } from "@/store/useRouteStore.ts";
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore.ts";
import { useExplorerStore } from "@/store/useExplorerStore.ts";
import { useNavFocusStore } from "@/store/useNavFocusStore.ts";
import type { TaskDTO } from "@nanpad/core";
import { IconClose, IconHome, IconTasks, IconDocument, IconSettings, IconPlus, IconSearch } from "@ui/icons/index.tsx";
import { getStatusLabel } from "@ui/components/Badge.tsx";

type CommandItemType = "navigate" | "action" | "task" | "document";

interface CommandItem {
  id: string;
  type: CommandItemType;
  label: string;
  subtitle?: string;
  keywords?: string[];
  run: () => void;
}

const ROUTE_ITEMS: { route: AppRoute; label: string; IconComponent: React.ComponentType<{ size?: number }> }[] = [
  { route: "home", label: "Inicio", IconComponent: IconHome },
  { route: "tasks", label: "Tareas", IconComponent: IconTasks },
  { route: "documents", label: "Explorador", IconComponent: IconDocument },
  { route: "settings", label: "Ajustes", IconComponent: IconSettings },
];

function normalizeQuery(q: string): string {
  return q.toLowerCase().trim().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function matchesQuery(text: string, query: string): boolean {
  if (!query) return true;
  const nq = normalizeQuery(query);
  const nt = normalizeQuery(text);
  return nt.includes(nq);
}

export function CommandPalette() {
  const uc = useApp();
  const { setRoute } = useRouteStore();
  const { open, setOpen, onOpenNewTask } = useCommandPaletteStore();
  const { openTabs, setActiveTab } = useExplorerStore();
  const setFocusTaskId = useNavFocusStore((s) => s.setFocusTaskId);
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Cargar tareas al abrir
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
    inputRef.current?.focus();
    setLoading(true);
    uc.listTasks
      .execute({})
      .then((result) => setTasks(result.tasks.slice(0, 50)))
      .finally(() => setLoading(false));
  }, [open, uc.listTasks]);

  const items = useMemo((): CommandItem[] => {
    const nav: CommandItem[] = ROUTE_ITEMS.map(({ route: r, label }) => ({
      id: `nav-${r}`,
      type: "navigate" as const,
      label,
      run: () => {
        setRoute(r);
        setOpen(false);
      },
    }));
    const actions: CommandItem[] = [
      {
        id: "action-new-task",
        type: "action",
        label: "Nueva tarea",
        keywords: ["crear", "tarea", "new", "task"],
        run: () => {
          setRoute("tasks");
          setOpen(false);
          onOpenNewTask?.();
        },
      },
    ];
    const taskItems: CommandItem[] = tasks.map((t) => ({
      id: `task-${t.id}`,
      type: "task",
      label: t.title,
      subtitle: getStatusLabel(t.status),
      keywords: [t.description ?? ""].filter(Boolean),
      run: () => {
        setRoute("tasks");
        setOpen(false);
        setFocusTaskId(t.id);
      },
    }));
    const docItems: CommandItem[] = openTabs.map((tab) => ({
      id: `doc-${tab.id}`,
      type: "document",
      label: tab.label,
      subtitle: tab.path ?? "Temporal",
      run: () => {
        setRoute("documents");
        setActiveTab(tab.id);
        setOpen(false);
      },
    }));
    return [...nav, ...actions, ...taskItems, ...docItems];
  }, [tasks, openTabs, setRoute, setOpen, setActiveTab, setFocusTaskId, onOpenNewTask]);

  const filteredItems = useMemo(() => {
    if (!query) return items;
    const q = normalizeQuery(query);
    return items.filter((it) => {
      if (it.type === "navigate" || it.type === "action") {
        return matchesQuery(it.label, q) || (it.keywords?.some((k) => matchesQuery(k, q)) ?? false);
      }
      return matchesQuery(it.label, q) || matchesQuery(it.subtitle ?? "", q) || (it.keywords?.some((k) => matchesQuery(k, q)) ?? false);
    });
  }, [items, query]);

  const clampedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, filteredItems.length - 1));

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${clampedIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [clampedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && filteredItems[clampedIndex]) {
        e.preventDefault();
        filteredItems[clampedIndex].run();
      }
    },
    [filteredItems, clampedIndex, setOpen]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label="Buscar o ir a"
    >
      <div
        className="w-full max-w-xl rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] shadow-[var(--shadow-xl)]"
        style={{ maxHeight: "70vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
          <span className="text-[var(--color-text-muted)]">
            <IconSearch size={14} />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar sección, tarea o documento…"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
            autoComplete="off"
          />
          <kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">Esc</kbd>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-active)] hover:text-[var(--color-text-primary)]"
          >
            <IconClose size={12} />
          </button>
        </div>
        <div ref={listRef} className="overflow-y-auto py-1" style={{ maxHeight: "60vh" }}>
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">Cargando…</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">Sin resultados</div>
          ) : (
            filteredItems.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                data-index={idx}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
                style={{
                  background: idx === clampedIndex ? "var(--color-surface-active)" : "transparent",
                  color: "var(--color-text-primary)",
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => item.run()}
              >
                {item.type === "navigate" && (() => {
                  const routeItem = ROUTE_ITEMS.find((r) => `nav-${r.route}` === item.id);
                  const IconC = routeItem?.IconComponent;
                  return IconC ? <span className="text-[var(--color-text-muted)]"><IconC size={14} /></span> : null;
                })()}
                {item.type === "action" && (
                  <span className="text-[var(--color-accent)]">
                    <IconPlus size={14} />
                  </span>
                )}
                {item.type === "task" && (
                  <span className="text-[var(--color-status-todo)]">
                    <IconTasks size={14} />
                  </span>
                )}
                {item.type === "document" && (
                  <span className="text-[var(--color-text-muted)]">
                    <IconDocument size={14} />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                {item.subtitle && (
                  <span className="truncate text-xs text-[var(--color-text-muted)] max-w-[140px]">{item.subtitle}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
