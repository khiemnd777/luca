import { Button } from "@mui/material";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ToothSprite } from "./tooth-sprite";
import { TOOTH_SPRITES, type ToothCode } from "./tooth-sprite-map";
import {
  addBridgeToothSegments,
  addSingleToothSegment,
  createBridgeSegments,
  expandToothSelectionSegment,
  expandToothSelectionSegments,
  formatToothPositionSegments,
  getToothSelectionKind,
  lowerToothCodes,
  removeToothCodesFromSegments,
  replaceToothSelectionInAffectedJaws,
  type ToothSelectionKind,
  type ToothSelectionSegment,
  upperToothCodes,
} from "../../utils/tooth-position.utils";

function rectsIntersect(a: DOMRect, b: DOMRect) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

function isModifierDrag(e: React.MouseEvent) {
  return e.shiftKey || e.metaKey || e.ctrlKey;
}

type IndicatorPosition = "top" | "bottom";

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
  onChange?: (selected: ToothSelectionSegment[]) => void;
  value?: ToothSelectionSegment[];
}) {
  const toothRefs = useRef<Map<ToothCode, HTMLDivElement>>(new Map());

  const [segments, setSegments] = useState<ToothSelectionSegment[]>([]);
  const [dragRect, setDragRect] = useState<DOMRect | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const dragSelectedRef = useRef<Set<ToothCode>>(new Set());
  const dragBaseSegmentsRef = useRef<ToothSelectionSegment[]>([]);
  const isModifierDragRef = useRef(false);
  const valueKeyRef = useRef<string | null>(null);
  const hasMouseDown = useRef(false);

  const isDragging = useRef(false);
  const mouseDownTarget = useRef<EventTarget | null>(null);

  const scaleFn = (v: number) => v * scale;
  const columnGap = scaleFn(14);
  const indicatorSlotHeight = 24 * scale / .35;
  const labelSlotHeight = showLabels ? 26 * scale / .35 : 0;
  const upperSpriteSlotHeight = getMaxSpriteHeight(upperToothCodes) * scale;
  const lowerSpriteSlotHeight = getMaxSpriteHeight(lowerToothCodes) * scale;
  const selected = new Set(expandToothSelectionSegments(segments));

  const handleSelectAll = (codes: ToothCode[]) => {
    const next = addBridgeToothSegments(segments, codes);
    setSegments(next);
    onChange?.(next);
  };

  const handleClearSelection = (codes: ToothCode[]) => {
    const next = removeToothCodesFromSegments(segments, codes);
    setSegments(next);
    onChange?.(next);
  };

  const hasAnySelected = (codes: ToothCode[]) =>
    codes.some((code) => selected.has(code));

  const stopChartMouseEvent = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSegments([]);
        onChange?.([]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onChange]);

  useEffect(() => {
    const next = value ?? [];
    const key = formatToothPositionSegments(next);
    if (key === valueKeyRef.current) return;
    valueKeyRef.current = key;
    setSegments(next);
  }, [value]);

  const beginDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    hasMouseDown.current = true;
    mouseDownTarget.current = e.target;
    isDragging.current = false;

    startPoint.current = { x: e.clientX, y: e.clientY };
    setDragRect(null);
    dragSelectedRef.current = new Set();
    dragBaseSegmentsRef.current = segments;
    isModifierDragRef.current = isModifierDrag(e);
  };

  const onDrag = (e: React.MouseEvent) => {
    if (!startPoint.current) return;

    const dx = Math.abs(e.clientX - startPoint.current.x);
    const dy = Math.abs(e.clientY - startPoint.current.y);

    if (dx > 3 || dy > 3) {
      isDragging.current = true;
    }

    if (!isDragging.current) return;
    if (isModifierDrag(e)) {
      isModifierDragRef.current = true;
    }

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

    const dragCodes = [...next];
    const preview = isModifierDragRef.current
      ? addBridgeToothSegments(dragBaseSegmentsRef.current, dragCodes)
      : replaceToothSelectionInAffectedJaws(dragBaseSegmentsRef.current, createBridgeSegments(dragCodes));
    setSegments(preview);
    dragSelectedRef.current = next;
  };

  const cleanupDrag = () => {
    startPoint.current = null;
    setDragRect(null);
    isDragging.current = false;
    hasMouseDown.current = false;
    dragBaseSegmentsRef.current = [];
    isModifierDragRef.current = false;
  };

  const endDrag = (e: React.MouseEvent) => {
    if (!hasMouseDown.current) {
      cleanupDrag();
      return;
    }

    // ---- CASE 1: drag multi-select ----
    if (isDragging.current) {
      const dragCodes = [...dragSelectedRef.current];
      const final = isModifierDragRef.current || isModifierDrag(e)
        ? addBridgeToothSegments(dragBaseSegmentsRef.current, dragCodes)
        : replaceToothSelectionInAffectedJaws(dragBaseSegmentsRef.current, createBridgeSegments(dragCodes));

      setSegments(final);
      onChange?.(final);

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
      cleanupDrag();
      return;
    }

    const isShift = e.shiftKey;
    const isToggle = e.metaKey || e.ctrlKey;

    // ---- CASE 3: Shift + click (additive) ----
    if (isShift) {
      const next = addSingleToothSegment(segments, clickedCode);
      setSegments(next);
      onChange?.(next);
      cleanupDrag();
      return;
    }

    // ---- CASE 4: Ctrl / Cmd + click (toggle) ----
    if (isToggle) {
      const next = selected.has(clickedCode)
        ? removeToothCodesFromSegments(segments, [clickedCode])
        : addSingleToothSegment(segments, clickedCode);

      setSegments(next);
      onChange?.(next);
      cleanupDrag();
      return;
    }

    // ---- CASE 5: plain click (single select) ----
    const next = replaceToothSelectionInAffectedJaws(segments, [{ kind: "single", code: clickedCode }]);
    setSegments(next);
    onChange?.(next);
    cleanupDrag();
  };


  const ToothColumn = ({
    code,
    labelPosition,
    indicatorPosition,
    rowCodes,
    spriteSlotHeight,
  }: {
    code: ToothCode;
    labelPosition: "top" | "bottom";
    indicatorPosition: IndicatorPosition;
    rowCodes: ToothCode[];
    spriteSlotHeight: number;
  }) => (
    <div
      style={{
        width: scaleFn(115),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: scaleFn(6),
        position: "relative",
      }}
    >
      {indicatorPosition === "top" && (
        <IndicatorSlot height={indicatorSlotHeight}>
          <SelectionIndicator
            code={code}
            rowCodes={rowCodes}
            segments={segments}
            position="top"
            columnGap={columnGap}
            height={indicatorSlotHeight}
            scale={scale}
          />
        </IndicatorSlot>
      )}

      {showLabels && labelPosition === "top" && (
        <LabelSlot height={labelSlotHeight}>
          <Label code={code} selectionKind={getToothSelectionKind(segments, code)} scale={scale} />
        </LabelSlot>
      )}

      <div
        style={{
          height: spriteSlotHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ToothSprite
          ref={(el) => {
            if (el) toothRefs.current.set(code, el);
            else toothRefs.current.delete(code);
          }}
          code={code}
          spriteUrl={spriteUrl}
          scale={scale}
          selectionKind={getToothSelectionKind(segments, code)}
        />
      </div>

      {showLabels && labelPosition === "bottom" && (
        <LabelSlot height={labelSlotHeight}>
          <Label code={code} selectionKind={getToothSelectionKind(segments, code)} scale={scale} />
        </LabelSlot>
      )}

      {indicatorPosition === "bottom" && (
        <IndicatorSlot height={indicatorSlotHeight}>
          <SelectionIndicator
            code={code}
            rowCodes={rowCodes}
            segments={segments}
            position="bottom"
            columnGap={columnGap}
            height={indicatorSlotHeight}
            scale={scale}
          />
        </IndicatorSlot>
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
          <ToothColumn
            key={code}
            code={code}
            labelPosition="bottom"
            indicatorPosition="top"
            rowCodes={upperToothCodes}
            spriteSlotHeight={upperSpriteSlotHeight}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: scaleFn(8),
          marginTop: scaleFn(8),
        }}
      >
        <Button
          size="small"
          variant="outlined"
          onMouseDown={stopChartMouseEvent}
          onMouseUp={stopChartMouseEvent}
          onClick={() => handleSelectAll(upperToothCodes)}
        >
          Toàn bộ
        </Button>
        {hasAnySelected(upperToothCodes) && (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onMouseDown={stopChartMouseEvent}
            onMouseUp={stopChartMouseEvent}
            onClick={() => handleClearSelection(upperToothCodes)}
          >
            Xóa hết
          </Button>
        )}
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
          <ToothColumn
            key={code}
            code={code}
            labelPosition="top"
            indicatorPosition="bottom"
            rowCodes={lowerToothCodes}
            spriteSlotHeight={lowerSpriteSlotHeight}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: scaleFn(8),
          marginTop: scaleFn(8),
        }}
      >
        <Button
          size="small"
          variant="outlined"
          onMouseDown={stopChartMouseEvent}
          onMouseUp={stopChartMouseEvent}
          onClick={() => handleSelectAll(lowerToothCodes)}
        >
          Toàn bộ
        </Button>
        {hasAnySelected(lowerToothCodes) && (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onMouseDown={stopChartMouseEvent}
            onMouseUp={stopChartMouseEvent}
            onClick={() => handleClearSelection(lowerToothCodes)}
          >
            Xóa hết
          </Button>
        )}
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

function SelectionIndicator({
  code,
  rowCodes,
  segments,
  position,
  columnGap,
  height,
  scale,
}: {
  code: ToothCode;
  rowCodes: ToothCode[];
  segments: ToothSelectionSegment[];
  position: IndicatorPosition;
  columnGap: number;
  height: number;
  scale: number;
}) {
  const indicator = getSelectionIndicator(segments, rowCodes, code);
  const bridgeColor = "#1976d2";
  const singleColor = "#9c27b0";

  if (!indicator) {
    return null;
  }

  if (indicator.kind === "single") {
    const triangleSize = 10 * scale / .35;
    return (
      <div
        style={{
          height,
          width: "100%",
          display: "flex",
          alignItems: position === "top" ? "flex-end" : "flex-start",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `${triangleSize / 2}px solid transparent`,
            borderRight: `${triangleSize / 2}px solid transparent`,
            borderTop: position === "top" ? `${triangleSize}px solid ${singleColor}` : undefined,
            borderBottom: position === "bottom" ? `${triangleSize}px solid ${singleColor}` : undefined,
          }}
        />
      </div>
    );
  }

  const lineHeight = 3;
  const capHeight = 16 * scale / .35;
  const extendsLeft = !indicator.starts;
  const extendsRight = !indicator.ends;

  return (
    <div
      style={{
        height,
        width: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: extendsLeft ? -columnGap / 2 : 0,
          right: extendsRight ? -columnGap / 2 : 0,
          [position === "top" ? "bottom" : "top"]: capHeight / 2,
          height: lineHeight,
          background: bridgeColor,
          borderRadius: lineHeight,
        }}
      />
      {indicator.starts && (
        <BridgeCap color={bridgeColor} height={capHeight} side="left" position={position} />
      )}
      {indicator.ends && (
        <BridgeCap color={bridgeColor} height={capHeight} side="right" position={position} />
      )}
    </div>
  );
}

function IndicatorSlot({
  height,
  children,
}: {
  height: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        height,
        width: "100%",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

function LabelSlot({
  height,
  children,
}: {
  height: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function BridgeCap({
  color,
  height,
  side,
  position,
}: {
  color: string;
  height: number;
  side: "left" | "right";
  position: IndicatorPosition;
}) {
  return (
    <div
      style={{
        position: "absolute",
        [side]: 0,
        [position === "top" ? "bottom" : "top"]: 0,
        width: 3,
        height,
        background: color,
        borderRadius: 3,
      }}
    />
  );
}

function getSelectionIndicator(
  segments: ToothSelectionSegment[],
  rowCodes: ToothCode[],
  code: ToothCode
):
  | { kind: "bridge"; starts: boolean; ends: boolean }
  | { kind: "single" }
  | null {
  for (const segment of segments) {
    if (segment.kind !== "bridge") continue;

    const bridgeCodes = new Set(expandToothSelectionSegment(segment));
    if (!bridgeCodes.has(code)) continue;

    const rowIndex = rowCodes.indexOf(code);
    const previousCode = rowCodes[rowIndex - 1];
    const nextCode = rowCodes[rowIndex + 1];
    return {
      kind: "bridge",
      starts: !previousCode || !bridgeCodes.has(previousCode),
      ends: !nextCode || !bridgeCodes.has(nextCode),
    };
  }

  return getToothSelectionKind(segments, code) === "single" ? { kind: "single" } : null;
}

function Label({
  code,
  selectionKind,
  scale,
}: {
  code: ToothCode;
  selectionKind: ToothSelectionKind | null;
  scale: number;
}) {
  return (
    <div
      style={{
        fontSize: 12 * scale / .325,
        fontWeight: 600,
        lineHeight: 2,
        color: selectionKind === "bridge" ? "#1976d2" : selectionKind === "single" ? "#9c27b0" : "inherit",
      }}
    >
      {code}
    </div>
  );
}

function getMaxSpriteHeight(codes: ToothCode[]) {
  return Math.max(...codes.map((code) => TOOTH_SPRITES[code].h));
}
