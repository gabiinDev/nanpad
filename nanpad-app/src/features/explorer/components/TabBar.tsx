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

// ── Tab individual ─────────────────────────────────────────────────────────────

interface TabProps {
  tab: OpenTab;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  onSaveToDisk: () => void;
  maxWidth: number;
}

/** Ancho máximo del tab según cantidad de tabs abiertos (más tabs → más estrecho). */
function getTabMaxWidth(tabCount: number): number {
  if (tabCount <= 4) return 220;
  if (tabCount <= 8) return 180;
  if (tabCount <= 12) return 140;
  return Math.max(90, 200 - tabCount * 8);
}

function Tab({ tab, isActive, onActivate, onClose, onSaveToDisk, maxWidth }: TabProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "0 4px 0 10px",
        height: "100%",
        flexShrink: 0,
        maxWidth: `${maxWidth}px`,
        minWidth: "60px",
        cursor: "pointer",
        borderRight: "1px solid var(--color-border)",
        background: isActive ? "var(--color-surface)" : "transparent",
        borderBottom: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
        color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)",
        transition: "background 0.1s ease, color 0.1s ease",
      }}
      onClick={onActivate}
      onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
      onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onClose(); } }}
      title={tab.path ?? tab.label}
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
        style={{
          fontSize: "13px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          fontStyle: !tab.isTemp && !tab.isPinned ? "italic" : "normal",
          opacity: !tab.isTemp && !tab.isPinned ? 0.75 : 1,
        }}
      >
        {tab.label}
        {tab.isDirty && !tab.isTemp && (
          <span style={{ color: "var(--color-priority-high)", marginLeft: "3px" }}>•</span>
        )}
      </span>

      {/* Guardar en disco (solo temporales — acceso directo sin cerrar) */}
      {tab.isTemp && (
        <button
          title="Guardar en disco sin cerrar"
          onClick={(e) => { e.stopPropagation(); onSaveToDisk(); }}
          style={actionBtnStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
            (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <IconSave size={11} />
        </button>
      )}

      {/* Cerrar */}
      <button
        title="Cerrar tab"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={actionBtnStyle}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
          (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
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
  const { openTabs, activeTabId, setActiveTab, createTempTab, saveTempAsDisk, saveTab } =
    useExplorerStore();
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  // Tab pendiente de cierre (esperando decisión del usuario en el modal)
  const [pendingClose, setPendingClose] = useState<OpenTab | null>(null);

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

  // ── Render ────────────────────────────────────────────────────────────────

  const emptyBar = (
    <div
      style={{
        height: "36px",
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface-2)",
        padding: "0 8px",
      }}
    >
      <button
        onClick={() => void createTempTab()}
        title="Nueva nota temporal"
        style={newNoteBtn}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent)";
          (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
          (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
        }}
      >
        <IconPlus size={12} />
        <span style={{ fontSize: "12px" }}>Nueva nota</span>
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
          style={{
            height: "36px",
            display: "flex",
            alignItems: "stretch",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface-2)",
            overflowX: "auto",
            overflowY: "hidden",
            flexShrink: 0,
          }}
        >
          {openTabs.map((tab) => (
            <div key={tab.id} data-tab-id={tab.id} style={{ flexShrink: 0, maxWidth: getTabMaxWidth(openTabs.length) }}>
              <Tab
                tab={tab}
                isActive={tab.id === activeTabId}
                onActivate={() => setActiveTab(tab.id)}
                onClose={() => requestClose(tab)}
                onSaveToDisk={() => void handleSaveToDisk(tab)}
                maxWidth={getTabMaxWidth(openTabs.length)}
              />
            </div>
          ))}

          <button
            onClick={() => void createTempTab()}
            title="Nueva nota temporal"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "100%",
              flexShrink: 0,
              border: "none",
              borderRight: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              transition: "background 0.1s ease, color 0.1s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
              (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
            }}
          >
            <IconPlus size={13} />
          </button>
        </div>
      )}
    </>
  );
}

// ── Estilos helpers ────────────────────────────────────────────────────────────

const actionBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "18px",
  height: "18px",
  flexShrink: 0,
  borderRadius: "3px",
  border: "none",
  background: "transparent",
  color: "var(--color-text-muted)",
  cursor: "pointer",
  padding: 0,
  transition: "background 0.1s ease, color 0.1s ease",
};

const newNoteBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  border: "1px solid var(--color-border)",
  borderRadius: "5px",
  background: "transparent",
  color: "var(--color-text-muted)",
  cursor: "pointer",
  padding: "3px 10px",
  transition: "all 0.12s ease",
};
