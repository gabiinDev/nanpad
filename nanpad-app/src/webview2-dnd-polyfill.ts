/**
 * Polyfill de Drag & Drop para WebView2 (Tauri en Windows).
 *
 * WebView2 no implementa la API nativa de drag & drop del DOM correctamente.
 * Este polyfill simula los eventos `dragstart`, `dragover`, `dragenter`,
 * `dragleave` y `drop` usando eventos de ratón/táctil, e incluye un elemento
 * "ghost" visual durante el arrastre.
 *
 * Basado en el polyfill de Iain Fraser con las mejoras de HarlanHugh (2025).
 * @see https://gist.github.com/iain-fraser/01d35885477f4e29a5a638364040d4f2
 *
 * Solo se activa en entornos Windows (Tauri/WebView2).
 */

/** Distancia mínima en px antes de iniciar el arrastre (evita clicks accidentales). */
const MIN_DRAG_DISTANCE = 5;

let isDragging = false;
let draggedElement: HTMLElement | null = null;
let startPosition = { x: 0, y: 0 };
let currentOverElement: Element | null = null;
let maxDistanceDragged = 0;
let ghostElement: HTMLElement | null = null;
let dataTransfer: MockDataTransfer | null = null;
let lastTouchX = 0;
let lastTouchY = 0;

/** Encuentra el ancestro más cercano con draggable="true". */
function findDraggableAncestor(element: Element | null): HTMLElement | null {
  while (element && element !== document.body) {
    if ((element as HTMLElement).getAttribute("draggable") === "true") {
      return element as HTMLElement;
    }
    element = element.parentElement;
  }
  return null;
}

/** Mock de DataTransfer que persiste a través de todos los eventos del ciclo de arrastre. */
class MockDataTransfer {
  dropEffect = "move";
  effectAllowed = "all";
  files: File[] = [];
  items: { format: string; data: string }[] = [];
  types: string[] = [];

  setData(format: string, data: string) {
    // Reemplazar si ya existe el mismo formato
    const existing = this.items.findIndex((i) => i.format === format);
    if (existing >= 0) {
      this.items[existing].data = data;
    } else {
      this.items.push({ format, data });
      this.types.push(format);
    }
  }

  getData(format: string): string {
    return this.items.find((i) => i.format === format)?.data ?? "";
  }

  clearData(format?: string) {
    if (format) {
      this.items = this.items.filter((i) => i.format !== format);
      this.types = this.types.filter((t) => t !== format);
    } else {
      this.items = [];
      this.types = [];
    }
  }
}

function createMockDragEvent(
  type: string,
  options: { bubbles?: boolean; cancelable?: boolean; clientX?: number; clientY?: number }
): Event & { dataTransfer: MockDataTransfer } {
  if (!dataTransfer) {
    dataTransfer = new MockDataTransfer();
  }
  const event = new Event(type, { bubbles: options.bubbles, cancelable: options.cancelable }) as Event & {
    dataTransfer: MockDataTransfer;
    clientX: number;
    clientY: number;
  };
  event.dataTransfer = dataTransfer;
  if (options.clientX !== undefined) event.clientX = options.clientX;
  if (options.clientY !== undefined) event.clientY = options.clientY;
  return event;
}

function applyStylesToGhost(original: HTMLElement, ghost: HTMLElement) {
  const computed = window.getComputedStyle(original);
  for (const prop of Array.from(computed)) {
    try {
      (ghost.style as unknown as Record<string, string>)[prop] = computed.getPropertyValue(prop);
    } catch {
      // Ignorar propiedades de solo lectura
    }
  }
  const rect = original.getBoundingClientRect();
  ghost.style.position = "fixed";
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.zIndex = "9998";
  ghost.style.opacity = "0.75";
  ghost.style.pointerEvents = "none"; // crítico: permite que elementFromPoint ignore el ghost
  ghost.style.transform = "";
  document.body.appendChild(ghost);
}

function handlePointerDown(clientX: number, clientY: number, target: EventTarget | null) {
  const found = findDraggableAncestor(target as Element | null);
  if (!found) return;

  // Desactivar draggable nativo para que WebView2 no lo intercepte
  found.setAttribute("draggable", "false");

  isDragging = true;
  draggedElement = found;
  startPosition = { x: clientX, y: clientY };
  maxDistanceDragged = 0;
}

function handlePointerMove(clientX: number, clientY: number) {
  if (!isDragging || !draggedElement) return;

  const deltaX = clientX - startPosition.x;
  const deltaY = clientY - startPosition.y;
  maxDistanceDragged = Math.max(
    maxDistanceDragged,
    Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  );

  if (maxDistanceDragged < MIN_DRAG_DISTANCE) return;

  // Primera vez que superamos el umbral: crear ghost + disparar dragstart
  if (!ghostElement) {
    ghostElement = draggedElement.cloneNode(true) as HTMLElement;
    applyStylesToGhost(draggedElement, ghostElement);

    draggedElement.dispatchEvent(
      createMockDragEvent("dragstart", { bubbles: true, cancelable: true, clientX, clientY })
    );
  }

  // Mover el ghost
  ghostElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

  // Detectar el elemento debajo ocultando el ghost momentáneamente
  ghostElement.style.visibility = "hidden";
  const elementBelow = document.elementFromPoint(clientX, clientY);
  ghostElement.style.visibility = "";

  if (elementBelow) {
    elementBelow.dispatchEvent(
      createMockDragEvent("dragover", { bubbles: true, cancelable: true, clientX, clientY })
    );

    if (elementBelow !== currentOverElement) {
      if (currentOverElement) {
        currentOverElement.dispatchEvent(
          createMockDragEvent("dragleave", { bubbles: true, cancelable: true, clientX, clientY })
        );
      }
      elementBelow.dispatchEvent(
        createMockDragEvent("dragenter", { bubbles: true, cancelable: true, clientX, clientY })
      );
      currentOverElement = elementBelow;
    }
  }
}

function handlePointerUp(clientX: number, clientY: number) {
  if (!isDragging || !draggedElement) return;

  if (maxDistanceDragged >= MIN_DRAG_DISTANCE) {
    if (currentOverElement) {
      currentOverElement.dispatchEvent(
        createMockDragEvent("drop", { bubbles: true, cancelable: true, clientX, clientY })
      );
    }
    draggedElement.dispatchEvent(
      createMockDragEvent("dragend", { bubbles: true, cancelable: true, clientX, clientY })
    );
  }

  // Cleanup
  isDragging = false;
  draggedElement.setAttribute("draggable", "true");
  if (ghostElement) {
    document.body.removeChild(ghostElement);
    ghostElement = null;
  }
  draggedElement = null;
  currentOverElement = null;
  dataTransfer = null;
}

/** Instala el polyfill en el documento. Llamar una sola vez al inicio. */
export function installWebView2DndPolyfill() {
  // Cursor grab para elementos arrastrables
  const style = document.createElement("style");
  style.textContent = '[draggable="true"] { cursor: grab; } [draggable="true"]:active { cursor: grabbing; }';
  document.head.prepend(style);

  document.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    handlePointerDown(e.clientX, e.clientY, e.target);
  });

  document.addEventListener("mousemove", (e) => {
    handlePointerMove(e.clientX, e.clientY);
  });

  document.addEventListener("pointerup", (e) => {
    if (e.button !== 0) return;
    handlePointerUp(e.clientX, e.clientY);
  });

  document.addEventListener("touchstart", (e) => {
    if (e.touches.length > 1) return;
    handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, e.target);
  }, { passive: true });

  document.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) {
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
      handlePointerMove(lastTouchX, lastTouchY);
    }
  }, { passive: true });

  document.addEventListener("touchend", () => {
    handlePointerUp(lastTouchX, lastTouchY);
  });
}
