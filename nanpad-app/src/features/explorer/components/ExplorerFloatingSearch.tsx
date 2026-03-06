/**
 * ExplorerFloatingSearch — panel flotante Ctrl+B en el explorador.
 * - Buscar texto en el contenido de los tabs abiertos.
 * - Comparar dos archivos abiertos (diff lado a lado).
 */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useExplorerStore, type OpenTab } from "@/store/useExplorerStore.ts";
import { useExplorerFloatingSearchStore } from "@/store/useExplorerFloatingSearchStore.ts";
import { IconClose, IconSearch, IconSplitMode } from "@ui/icons/index.tsx";

type Mode = "search" | "compare";

export interface SearchMatch {
  tabId: string;
  label: string;
  lineNumber: number;
  lineText: string;
  indexInLine: number;
}

function searchInTabs(tabs: OpenTab[], query: string): SearchMatch[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: SearchMatch[] = [];
  for (const tab of tabs) {
    const lines = tab.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const idx = lines[i].toLowerCase().indexOf(q);
      if (idx !== -1) results.push({
        tabId: tab.id,
        label: tab.label,
        lineNumber: i + 1,
        lineText: lines[i],
        indexInLine: idx,
      });
    }
  }
  return results;
}

/** Diff línea a línea: mismo / distinto. */
function simpleLineDiff(contentA: string, contentB: string): { lineA: string; lineB: string; same: boolean }[] {
  const linesA = contentA.split(/\r?\n/);
  const linesB = contentB.split(/\r?\n/);
  const max = Math.max(linesA.length, linesB.length);
  const out: { lineA: string; lineB: string; same: boolean }[] = [];
  for (let i = 0; i < max; i++) {
    const lineA = linesA[i] ?? "";
    const lineB = linesB[i] ?? "";
    out.push({ lineA, lineB, same: lineA === lineB });
  }
  return out;
}

const REVEAL_LINE_EVENT = "nanpad:editor-reveal-line";

function revealLineInEditor(tabId: string, lineNumber: number): void {
  window.dispatchEvent(new CustomEvent(REVEAL_LINE_EVENT, { detail: { tabId, lineNumber } }));
}

export function ExplorerFloatingSearch() {
  const { open, setOpen } = useExplorerFloatingSearchStore();
  const { openTabs, setActiveTab } = useExplorerStore();
  const [mode, setMode] = useState<Mode>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [compareTabA, setCompareTabA] = useState<string>("");
  const [compareTabB, setCompareTabB] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setSearchQuery("");
    inputRef.current?.focus();
    if (openTabs.length >= 1) setCompareTabA((prev) => (openTabs.some((t) => t.id === prev) ? prev : openTabs[0].id));
    if (openTabs.length >= 2) setCompareTabB((prev) => (openTabs.some((t) => t.id === prev) ? prev : openTabs[1].id));
  }, [open, openTabs]);

  const searchResults = useMemo(
    () => searchInTabs(openTabs, searchQuery),
    [openTabs, searchQuery]
  );

  const tabA = useMemo(() => openTabs.find((t) => t.id === compareTabA), [openTabs, compareTabA]);
  const tabB = useMemo(() => openTabs.find((t) => t.id === compareTabB), [openTabs, compareTabB]);
  const diffLines = useMemo(() => {
    if (!tabA || !tabB) return [];
    return simpleLineDiff(tabA.content, tabB.content);
  }, [tabA, tabB]);

  const handleSelectMatch = useCallback(
    (m: SearchMatch) => {
      setActiveTab(m.tabId);
      revealLineInEditor(m.tabId, m.lineNumber);
      setOpen(false);
    },
    [setActiveTab, setOpen]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label="Buscar en tabs / Comparar archivos"
    >
      <div
        className="flex w-full max-w-4xl flex-col rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] shadow-[var(--shadow-xl)]"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: modo + cerrar */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
          <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-0.5">
            <button
              type="button"
              onClick={() => setMode("search")}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: mode === "search" ? "var(--color-accent-subtle)" : "transparent",
                color: mode === "search" ? "var(--color-accent)" : "var(--color-text-muted)",
              }}
            >
              <IconSearch size={12} className="mr-1.5 inline" />
              Buscar en contenido
            </button>
            <button
              type="button"
              onClick={() => setMode("compare")}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: mode === "compare" ? "var(--color-accent-subtle)" : "transparent",
                color: mode === "compare" ? "var(--color-accent)" : "var(--color-text-muted)",
              }}
            >
              <IconSplitMode size={12} className="mr-1.5 inline" />
              Comparar archivos
            </button>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-active)] hover:text-[var(--color-text-primary)]"
          >
            <IconClose size={14} />
          </button>
        </div>

        {mode === "search" && (
          <>
            <div className="shrink-0 border-b border-[var(--color-border)] px-4 py-2">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en el contenido de los tabs abiertos…"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
                autoComplete="off"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {searchQuery.trim() === "" ? (
                <p className="px-2 py-4 text-sm text-[var(--color-text-muted)]">Escribe para buscar en los {openTabs.length} tab(s) abiertos.</p>
              ) : searchResults.length === 0 ? (
                <p className="px-2 py-4 text-sm text-[var(--color-text-muted)]">Sin coincidencias.</p>
              ) : (
                <ul className="space-y-0.5">
                  {searchResults.slice(0, 200).map((m, i) => (
                    <li key={`${m.tabId}-${m.lineNumber}-${i}`}>
                      <button
                        type="button"
                        className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-active)]"
                        onClick={() => handleSelectMatch(m)}
                      >
                        <span className="shrink-0 w-20 text-right text-[10px] text-[var(--color-text-muted)]">{m.lineNumber}</span>
                        <span className="min-w-0 truncate text-[var(--color-text-secondary)]" title={m.label}>{m.label}</span>
                        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-[var(--color-text-primary)]" title={m.lineText}>
                          {m.lineText.slice(0, 80)}{m.lineText.length > 80 ? "…" : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {searchResults.length > 200 && (
                <p className="px-2 py-1 text-xs text-[var(--color-text-muted)]">Mostrando 200 de {searchResults.length} resultados.</p>
              )}
            </div>
          </>
        )}

        {mode === "compare" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
            <div className="mb-3 flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Archivo A</label>
                <select
                  value={compareTabA}
                  onChange={(e) => setCompareTabA(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                >
                  {openTabs.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Archivo B</label>
                <select
                  value={compareTabB}
                  onChange={(e) => setCompareTabB(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                >
                  {openTabs.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="w-full border-collapse text-left font-mono text-xs">
                <thead className="sticky top-0 z-10 bg-[var(--color-surface-2)]">
                  <tr>
                    <th className="w-10 border-b border-r border-[var(--color-border)] px-2 py-1.5 text-[var(--color-text-muted)]">#</th>
                    <th className="border-b border-r border-[var(--color-border)] px-2 py-1.5 text-[var(--color-text-muted)]">A</th>
                    <th className="border-b border-[var(--color-border)] px-2 py-1.5 text-[var(--color-text-muted)]">B</th>
                  </tr>
                </thead>
                <tbody>
                  {diffLines.map((row, i) => (
                    <tr
                      key={i}
                      className={row.same ? "" : "bg-[var(--color-priority-high)]/10"}
                    >
                      <td className="border-r border-[var(--color-border)] px-2 py-0.5 text-right text-[var(--color-text-muted)]">{i + 1}</td>
                      <td className="max-w-[50%] border-r border-[var(--color-border)] whitespace-pre break-all px-2 py-0.5 text-[var(--color-text-primary)]">{row.lineA || " "}</td>
                      <td className="max-w-[50%] whitespace-pre break-all px-2 py-0.5 text-[var(--color-text-primary)]">{row.lineB || " "}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
