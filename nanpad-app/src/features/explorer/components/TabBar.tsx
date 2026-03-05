/**
 * TabBar — barra de tabs de archivos abiertos.
 *
 * Flujo de cierre unificado para cualquier archivo con cambios sin guardar:
 *   - Se muestra el mismo modal con 3 opciones: Guardar / No guardar / Cancelar.
 *
 * Diferencias según tipo de archivo:
 *   - Temporal: "Guardar" abre el file picker del OS para elegir destino.
 *     "No guardar" elimina el físico de AppLocalData y cierra el tab.
 *   - Real con cambios: "Guardar" guarda en la ruta existente sin dialog.
 *     "No guardar" cierra el tab descartando los cambios.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { OpenTab } from "@/store/useExplorerStore.ts";
import { useExplorerStore } from "@/store/useExplorerStore.ts";
import { saveFileDialog } from "@/infrastructure/FsService.ts";
import {
  IconClose,
  IconNote,
  IconSave,
  IconPlus,
} from "@ui/icons/index.tsx";
import { ExplorerFileIcon } from "@features/explorer/utils/explorerFileIcons.tsx";

// ── Diálogo modal personalizado ───────────────────────────────────────────────

interface SaveDialogProps {
  /** Nombre del archivo a mostrar en el modal. */
  fileName: string;
  /** Subtítulo descriptivo según el tipo de archivo. */
  subtitle: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/**
 * Modal de confirmación unificado con 3 opciones: Guardar / No guardar / Cancelar.
 * Se renderiza sobre la app con un overlay oscuro.
 */
function SaveConfirmDialog({ fileName, subtitle, onSave, onDiscard, onCancel }: SaveDialogProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0 0 0 / 55%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border-strong)",
          borderRadius: "10px",
          padding: "24px 28px",
          minWidth: "340px",
          maxWidth: "420px",
          boxShadow: "var(--shadow-xl)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Título y subtítulo */}
        <div>
          <p
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              marginBottom: "8px",
            }}
          >
            ¿Deseas guardar el archivo?
          </p>
          <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                background: "var(--color-surface-hover)",
                padding: "1px 6px",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            >
              {fileName}
            </span>{" "}
            {subtitle}
          </p>
        </div>

        {/* Botones */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          {/* Cancelar */}
          <button
            onClick={onCancel}
            style={{
              padding: "7px 16px",
              borderRadius: "6px",
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-secondary)",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.1s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
              (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
            }}
          >
            Cancelar
          </button>

          {/* No guardar */}
          <button
            onClick={onDiscard}
            style={{
              padding: "7px 16px",
              borderRadius: "6px",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-hover)",
              color: "var(--color-text-primary)",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.1s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "oklch(0.704 0.191 22.216 / 15%)";
              (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.704 0.191 22.216 / 40%)";
              (e.currentTarget as HTMLElement).style.color = "var(--color-priority-critical)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
              (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
            }}
          >
            No guardar
          </button>

          {/* Guardar */}
          <button
            onClick={onSave}
            style={{
              padding: "7px 16px",
              borderRadius: "6px",
              border: "1px solid var(--color-border-strong)",
              background: "var(--color-accent)",
              color: "var(--color-surface)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "opacity 0.1s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            <IconSave size={12} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Icono de tab por extensión ─────────────────────────────────────────────────

function TabIcon({ tab }: { tab: OpenTab }) {
  if (tab.isTemp) return <IconNote size={12} />;
  return <ExplorerFileIcon ext={tab.ext} size={12} />;
}

// ── Tab individual (draggable para reordenar) ──────────────────────────────────

interface TabProps {
  tab: OpenTab;
  index: number;
  isActive: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onActivate: () => void;
  onClose: () => void;
  onSaveToDisk: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragLeave: () => void;
  onDrop: (toIndex: number) => void;
  onDragEnd: () => void;
  maxWidth: number;
}

/** Ancho máximo del tab según cantidad de tabs abiertos (más tabs → más estrecho). */
function getTabMaxWidth(tabCount: number): number {
  if (tabCount <= 4) return 220;
  if (tabCount <= 8) return 180;
  if (tabCount <= 12) return 140;
  return Math.max(90, 200 - tabCount * 8);
}

function Tab({
  tab,
  index,
  isActive,
  isDragging,
  isDropTarget,
  onActivate,
  onClose,
  onSaveToDisk,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  maxWidth,
}: TabProps) {
  return (
    <div
      role="tab"
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(index)); e.dataTransfer.effectAllowed = "move"; onDragStart(index); }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; onDragOver(index); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(index); }}
      onDragEnd={onDragEnd}
      className={`flex h-full min-w-[3.75rem] shrink-0 items-center gap-1.5 border-r border-[var(--color-border)] pl-2.5 pr-1 transition-all duration-150 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{
        maxWidth: `${maxWidth}px`,
        background: isActive ? "var(--color-surface)" : "transparent",
        borderBottom: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
        color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)",
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isDropTarget ? "inset 0 0 0 2px var(--color-accent)" : undefined,
      }}
      onClick={onActivate}
      onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
      onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onClose(); } }}
      title={`${tab.path ?? tab.label} — arrastrá para reordenar`}
    >
      <span
        style={{
          flexShrink: 0,
          color: tab.isTemp ? "var(--color-priority-high)" : "var(--color-text-muted)",
        }}
      >
        <TabIcon tab={tab} />
      </span>

      <span
        className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem]"
        style={{
          fontStyle: !tab.isTemp && !tab.isPinned ? "italic" : "normal",
          opacity: !tab.isTemp && !tab.isPinned ? 0.75 : 1,
        }}
      >
        {tab.label}
        {tab.isDirty && !tab.isTemp && (
          <span className="ml-0.5 text-[var(--color-priority-high)]">•</span>
        )}
      </span>

      {/* Guardar en disco (solo temporales — acceso directo sin cerrar) */}
      {tab.isTemp && (
        <button
          type="button"
          title="Guardar en disco sin cerrar"
          onClick={(e) => { e.stopPropagation(); onSaveToDisk(); }}
          className={actionBtnClass}
        >
          <IconSave size={11} />
        </button>
      )}

      <button
        type="button"
        title="Cerrar tab"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className={actionBtnClass}
      >
        <IconClose size={11} />
      </button>
    </div>
  );
}

// ── TabBar ────────────────────────────────────────────────────────────────────

interface TabBarProps {
  onCloseTab: (id: string) => void;
}

/**
 * Barra de tabs. Maneja el flujo completo de cierre con confirmación.
 */
export function TabBar({ onCloseTab }: TabBarProps) {
  const { openTabs, activeTabId, setActiveTab, reorderTabs, createTempTab, saveTempAsDisk, saveTab } =
    useExplorerStore();
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const [pendingClose, setPendingClose] = useState<OpenTab | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const justReorderedRef = useRef(false);

  // Al cambiar el tab activo (p. ej. abrir un archivo nuevo), hacer scroll para que el tab sea visible
  useEffect(() => {
    if (!activeTabId || !tabsScrollRef.current) return;
    const el = tabsScrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
    if (el) {
      el.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
    }
  }, [activeTabId]);

  // ── Solicitud de cierre ──────────────────────────────────────────────────

  const requestClose = useCallback((tab: OpenTab) => {
    if (tab.isTemp && tab.content.trim() === "") {
      // Temporal vacío: eliminar físico y cerrar sin confirmación
      onCloseTab(tab.id);
    } else if (tab.isTemp || tab.isDirty) {
      // Temporal con contenido o archivo real con cambios: mostrar modal
      setPendingClose(tab);
    } else {
      // Sin cambios pendientes: cerrar directamente
      onCloseTab(tab.id);
    }
  }, [onCloseTab]);

  // ── Acciones del modal ───────────────────────────────────────────────────

  const handleModalSave = useCallback(async () => {
    if (!pendingClose) return;

    if (pendingClose.isTemp) {
      // Temporal: abrir file picker para elegir destino
      setPendingClose(null);
      const defaultName = pendingClose.label.replace(/^#Temp\s+/, "nota") + ".txt";
      const diskPath = await saveFileDialog(defaultName);
      if (!diskPath) {
        // Usuario canceló el file picker: re-abrir el modal para que pueda reintentar
        setPendingClose(pendingClose);
        return;
      }
      await saveTempAsDisk(pendingClose.id, diskPath);
      // saveTempAsDisk convierte el tab en real, no hace falta closeTab
    } else {
      // Archivo real: guardar en la ruta existente y luego cerrar
      const tabId = pendingClose.id;
      setPendingClose(null);
      await saveTab(tabId);
      onCloseTab(tabId);
    }
  }, [pendingClose, saveTempAsDisk, saveTab, onCloseTab]);

  const handleModalDiscard = useCallback(() => {
    if (!pendingClose) return;
    const id = pendingClose.id;
    setPendingClose(null);
    // closeTab se encarga de eliminar el físico si es temporal
    onCloseTab(id);
  }, [pendingClose, onCloseTab]);

  const handleModalCancel = useCallback(() => {
    setPendingClose(null);
  }, []);

  // ── Guardar temporal sin cerrar (botón de disco en el tab) ───────────────

  const handleSaveToDisk = useCallback(async (tab: OpenTab) => {
    const defaultName = tab.label.replace(/^#Temp\s+/, "nota") + ".txt";
    const diskPath = await saveFileDialog(defaultName);
    if (!diskPath) return;
    await saveTempAsDisk(tab.id, diskPath);
  }, [saveTempAsDisk]);

  const handleDrop = useCallback((toIndex: number) => {
    if (draggingIndex === null) return;
    reorderTabs(draggingIndex, toIndex);
    setDraggingIndex(null);
    setDropTargetIndex(null);
    justReorderedRef.current = true;
    setTimeout(() => { justReorderedRef.current = false; }, 150);
  }, [draggingIndex, reorderTabs]);

  // ── Render ────────────────────────────────────────────────────────────────

  const emptyBar = (
    <div className="flex h-9 items-center border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-2">
      <button
        type="button"
        onClick={() => void createTempTab()}
        title="Nueva nota temporal"
        className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-transparent px-2.5 py-1.5 leading-none text-xs text-[var(--color-text-muted)] transition-all duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
      >
        <span className="flex items-center justify-center leading-none">
          <IconPlus size={12} />
        </span>
        <span>Nueva nota</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Modal de confirmación unificado */}
      {pendingClose && (
        <SaveConfirmDialog
          fileName={pendingClose.label}
          subtitle={
            pendingClose.isTemp
              ? "es una nota temporal. Si no la guardas, se eliminará permanentemente."
              : "tiene cambios sin guardar. Si no la guardas, los cambios se perderán."
          }
          onSave={() => void handleModalSave()}
          onDiscard={handleModalDiscard}
          onCancel={handleModalCancel}
        />
      )}

      {openTabs.length === 0 ? emptyBar : (
        <div
          ref={tabsScrollRef}
          className="flex h-9 shrink-0 items-stretch overflow-x-auto overflow-y-hidden border-b border-[var(--color-border)] bg-[var(--color-surface-2)]"
        >
          {openTabs.map((tab, index) => (
            <div key={tab.id} data-tab-id={tab.id} className="shrink-0" style={{ maxWidth: getTabMaxWidth(openTabs.length) }}>
              <Tab
                tab={tab}
                index={index}
                isActive={tab.id === activeTabId}
                isDragging={draggingIndex === index}
                isDropTarget={dropTargetIndex === index}
                onActivate={() => {
                  if (justReorderedRef.current) return;
                  setActiveTab(tab.id);
                }}
                onClose={() => requestClose(tab)}
                onSaveToDisk={() => void handleSaveToDisk(tab)}
                onDragStart={(i) => setDraggingIndex(i)}
                onDragOver={(i) => setDropTargetIndex(i)}
                onDragLeave={() => setDropTargetIndex(null)}
                onDrop={handleDrop}
                onDragEnd={() => { setDraggingIndex(null); setDropTargetIndex(null); }}
                maxWidth={getTabMaxWidth(openTabs.length)}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={() => void createTempTab()}
            title="Nueva nota temporal"
            className="inline-flex min-h-[2.75rem] min-w-[2.75rem] shrink-0 items-center justify-center border-r border-[var(--color-border)] bg-transparent leading-none text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            <span className="flex items-center justify-center leading-none">
              <IconPlus size={13} />
            </span>
          </button>
        </div>
      )}
    </>
  );
}

// ── Botones de acción en cada tab (compactos, sin ocupar tanto espacio) ────────

const actionBtnClass =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded border-none bg-transparent text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]";
