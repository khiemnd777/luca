import SpriteUrl from "./teeth-layout.png";
import { TeethChart } from "./teeth-chart";
import type { ToothCode } from "./tooth-sprite-map";

export default function TeethLayout({
  spriteUrl,
  scale,
  onChange,
  value,
}: {
  spriteUrl?: string;
  scale?: number;
  onChange?: (selected: ToothCode[]) => void;
  value?: ToothCode[];
}) {
  spriteUrl = spriteUrl || SpriteUrl;
  scale = scale || 0.35;

  return (
    <TeethChart
      spriteUrl={spriteUrl}
      scale={scale}
      onChange={onChange}
      value={value}
    />
  );
}
