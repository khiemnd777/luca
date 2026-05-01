import SpriteUrl from "./teeth-layout.png";
import { TeethChart } from "./teeth-chart";
import type { ToothSelectionSegment } from "../../utils/tooth-position.utils";

export default function TeethLayout({
  spriteUrl,
  scale,
  onChange,
  value,
}: {
  spriteUrl?: string;
  scale?: number;
  onChange?: (selected: ToothSelectionSegment[]) => void;
  value?: ToothSelectionSegment[];
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
