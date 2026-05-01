import React, { forwardRef } from "react";
import { SPRITE_W, SPRITE_H, TOOTH_SPRITES, type ToothCode } from "./tooth-sprite-map";
import type { ToothSelectionKind } from "../../utils/tooth-position.utils";

type Props = {
  code: ToothCode;
  spriteUrl: string;
  scale?: number;
  className?: string;
  selectionKind?: ToothSelectionKind | null;
};

export const ToothSprite = forwardRef<HTMLDivElement, Props>(
  ({ code, spriteUrl, scale = 1, className, selectionKind }, ref) => {
    const r = TOOTH_SPRITES[code];
    const selectionColor = selectionKind === "bridge"
      ? "#1976d2"
      : selectionKind === "single"
        ? "#9c27b0"
        : undefined;

    const style: React.CSSProperties = {
      width: r.w * scale,
      height: r.h * scale,
      backgroundImage: `url(${spriteUrl})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${SPRITE_W * scale}px ${SPRITE_H * scale}px`,
      backgroundPosition: `${-r.x * scale}px ${-r.y * scale}px`,
      boxShadow: selectionColor ? `0 0 0 2px ${selectionColor}` : undefined,
      borderRadius: 4,
    };

    return (
      <div
        ref={ref}
        data-tooth-code={code}
        className={className}
        style={style}
      />
    );
  }
);

export function ToothSprite1({
  code,
  spriteUrl,
  scale = 1,
  className,
  onClick,
}: {
  code: ToothCode;
  spriteUrl: string;
  scale?: number;
  className?: string;
  onClick?: (code: ToothCode) => void;
}) {
  const r = TOOTH_SPRITES[code];

  const style: React.CSSProperties = {
    width: r.w * scale,
    height: r.h * scale,
    backgroundImage: `url(${spriteUrl})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${SPRITE_W * scale}px ${SPRITE_H * scale}px`,
    backgroundPosition: `${-r.x * scale}px ${-r.y * scale}px`,
    cursor: onClick ? "pointer" : "default",
  };

  return <div className={className} style={style} onClick={() => onClick?.(code)} />;
}
