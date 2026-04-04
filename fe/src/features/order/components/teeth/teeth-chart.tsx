import { Button } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { ToothSprite } from "./tooth-sprite";
import type { ToothCode } from "./tooth-sprite-map";

export const upperToothCodes: ToothCode[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const lowerToothCodes: ToothCode[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

function rectsIntersect(a: DOMRect, b: DOMRect) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

export function TeethChart({
  spriteUrl,
  scale = 1,
  showLabels = true,
  onChange,
  value,
}: {
  spriteUrl: string;
  scale?: number;
  showLabels?: boolean;
  onChange?: (selected: ToothCode[]) => void;
  value?: ToothCode[];
}) {
  const toothRefs = useRef<Map<ToothCode, HTMLDivElement>>(new Map());

  const [selected, setSelected] = useState<Set<ToothCode>>(new Set());
  const [dragRect, setDragRect] = useState<DOMRect | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const dragSelectedRef = useRef<Set<ToothCode>>(new Set());
  const valueKeyRef = useRef<string | null>(null);
  const hasMouseDown = useRef(false);

  const isDragging = useRef(false);
  const mouseDownTarget = useRef<EventTarget | null>(null);

  const scaleFn = (v: number) => v * scale;

  const handleSelectAll = (codes: ToothCode[]) => {
    const next = new Set<ToothCode>(selected);
    codes.forEach((code) => next.add(code));
    setSelected(next);
    onChange?.([...next]);
  };

  const handleClearSelection = (codes: ToothCode[]) => {
    const next = new Set<ToothCode>(selected);
    codes.forEach((code) => next.delete(code));
    setSelected(next);
    onChange?.([...next]);
  };

  const isAllSelected = (codes: ToothCode[]) =>
    codes.every((code) => selected.has(code));

  const stopChartMouseEvent = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(new Set());
        onChange?.([]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onChange]);

  useEffect(() => {
    if (!value) return;
    const next = new Set<ToothCode>(value);
    const key = [...next].sort((a, b) => a - b).join(",");
    if (key === valueKeyRef.current) return;
    valueKeyRef.current = key;
    setSelected(next);
  }, [value]);

  const beginDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    hasMouseDown.current = true;
    mouseDownTarget.current = e.target;
    isDragging.current = false;

    startPoint.current = { x: e.clientX, y: e.clientY };
    setDragRect(null);
    dragSelectedRef.current = new Set();
  };

  const onDrag = (e: React.MouseEvent) => {
    if (!startPoint.current) return;

    const dx = Math.abs(e.clientX - startPoint.current.x);
    const dy = Math.abs(e.clientY - startPoint.current.y);

    if (dx > 3 || dy > 3) {
      isDragging.current = true;
    }

    if (!isDragging.current) return;

    const rect = new DOMRect(
      Math.min(startPoint.current.x, e.clientX),
      Math.min(startPoint.current.y, e.clientY),
      Math.abs(e.clientX - startPoint.current.x),
      Math.abs(e.clientY - startPoint.current.y)
    );

    setDragRect(rect);

    const next = new Set<ToothCode>();
    toothRefs.current.forEach((el, code) => {
      if (rectsIntersect(rect, el.getBoundingClientRect())) {
        next.add(code);
      }
    });

    setSelected(next);
    dragSelectedRef.current = next;
  };

  const cleanupDrag = () => {
    startPoint.current = null;
    setDragRect(null);
    isDragging.current = false;
    hasMouseDown.current = false;
  };

  const endDrag = (e: React.MouseEvent) => {
    if (!hasMouseDown.current) {
      cleanupDrag();
      return;
    }

    // ---- CASE 1: drag multi-select ----
    if (isDragging.current) {
      const final = dragSelectedRef.current;

      setSelected(new Set(final));
      onChange?.([...final]);

      cleanupDrag();
      return;
    }

    // ---- detect clicked tooth ----
    let clickedCode: ToothCode | null = null;

    toothRefs.current.forEach((el, code) => {
      if (el.contains(e.target as Node)) {
        clickedCode = code;
      }
    });

    // ---- CASE 2: click outside ----
    if (!clickedCode) {
      setSelected(new Set());
      onChange?.([]);
      cleanupDrag();
      return;
    }

    const isShift = e.shiftKey;
    const isToggle = e.metaKey || e.ctrlKey;

    // ---- CASE 3: Shift + click (additive) ----
    if (isShift) {
      const next = new Set(selected);
      next.add(clickedCode);
      setSelected(next);
      onChange?.([...next]);
      cleanupDrag();
      return;
    }

    // ---- CASE 4: Ctrl / Cmd + click (toggle) ----
    if (isToggle) {
      const next = new Set(selected);
      if (next.has(clickedCode)) next.delete(clickedCode);
      else next.add(clickedCode);

      setSelected(next);
      onChange?.([...next]);
      cleanupDrag();
      return;
    }

    // ---- CASE 5: plain click (single select) ----
    const next = new Set<ToothCode>([clickedCode]);
    setSelected(next);
    onChange?.([clickedCode]);
    cleanupDrag();
  };


  const ToothColumn = ({
    code,
    labelPosition,
  }: {
    code: ToothCode;
    labelPosition: "top" | "bottom";
  }) => (
    <div
      style={{
        width: scaleFn(115),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: scaleFn(6),
      }}
    >
      {showLabels && labelPosition === "top" && (
        <Label code={code} selected={selected.has(code)} scale={scale} />
      )}

      <ToothSprite
        ref={(el) => {
          if (el) toothRefs.current.set(code, el);
          else toothRefs.current.delete(code);
        }}
        code={code}
        spriteUrl={spriteUrl}
        scale={scale}
        selected={selected.has(code)}
      />

      {showLabels && labelPosition === "bottom" && (
        <Label code={code} selected={selected.has(code)} scale={scale} />
      )}
    </div>
  );

  return (
    <div
      onMouseDown={beginDrag}
      onMouseMove={onDrag}
      onMouseUp={endDrag}
      onMouseLeave={() => {
        if (isDragging.current) {
          cleanupDrag();
        }
      }}
      style={{
        userSelect: "none",
        padding: scaleFn(24),
        position: "relative",
      }}
    >
      {/* UPPER */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: scaleFn(14),
        }}
      >
        {upperToothCodes.map((code) => (
          <ToothColumn key={code} code={code} labelPosition="bottom" />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: scaleFn(8),
        }}
      >
        <Button
          size="small"
          variant="outlined"
          onMouseDown={stopChartMouseEvent}
          onMouseUp={stopChartMouseEvent}
          onClick={() =>
            isAllSelected(upperToothCodes)
              ? handleClearSelection(upperToothCodes)
              : handleSelectAll(upperToothCodes)
          }
        >
          {isAllSelected(upperToothCodes) ? "Xóa" : "Toàn bộ"}
        </Button>
      </div>

      {/* spacer */}
      <div style={{ height: scaleFn(32) }} />

      {/* LOWER */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: scaleFn(14),
        }}
      >
        {lowerToothCodes.map((code) => (
          <ToothColumn key={code} code={code} labelPosition="top" />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: scaleFn(8),
        }}
      >
        <Button
          size="small"
          variant="outlined"
          onMouseDown={stopChartMouseEvent}
          onMouseUp={stopChartMouseEvent}
          onClick={() =>
            isAllSelected(lowerToothCodes)
              ? handleClearSelection(lowerToothCodes)
              : handleSelectAll(lowerToothCodes)
          }
        >
          {isAllSelected(lowerToothCodes) ? "Xóa" : "Toàn bộ"}
        </Button>
      </div>

      {/* Selection box */}
      {dragRect && (
        <div
          style={{
            position: "fixed",
            left: dragRect.x,
            top: dragRect.y,
            width: dragRect.width,
            height: dragRect.height,
            border: "1px dashed #1976d2",
            background: "rgba(25,118,210,0.1)",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        />
      )}
    </div>
  );
}

function Label({
  code,
  selected,
  scale,
}: {
  code: ToothCode;
  selected: boolean;
  scale: number;
}) {
  return (
    <div
      style={{
        fontSize: 12 * scale / .325,
        fontWeight: 600,
        lineHeight: 2,
        color: selected ? "#1976d2" : "inherit",
      }}
    >
      {code}
    </div>
  );
}
