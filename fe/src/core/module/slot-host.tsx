import * as React from "react";
import { Box } from "@mui/material";
import { listSlots } from "@core/module/registry";
import type { SlotName } from "@core/module/types";
import { Spacer } from "@root/shared/components/ui/spacer";

/*
// topbar phải: hàng ngang, giữa, cách 2 (theme spacing)
<SlotHost name="app:topbar:right" direction="row" gap={2} align="center" />

// sidebar: cột, gap 12px cố định
<SlotHost name="me:sidebar" direction="column" gap="12px" />

// widget area: wrap khi chật
<SlotHost name="dashboard:widgets" direction="row" wrap gap={2} justify="space-between" />
*/

type SlotHostProps = {
  name: SlotName;
  direction?: "row" | "column";
  gap?: number | string; // 1 | 2 | 3 ... (theme spacing) hoặc "12px" | "1rem"
  wrap?: boolean;
  align?: React.CSSProperties["alignItems"];         // center | flex-start | flex-end | baseline | stretch
  justify?: React.CSSProperties["justifyContent"];   // space-between | center | ...
  className?: string;
  style?: React.CSSProperties;
  itemClassName?: string;
};

export function SlotHost({
  direction,
  name,
  itemClassName,
}: SlotHostProps) {
  const slots = React.useMemo(() => listSlots(name), [name]);

  return (
    <>
      {slots.map((s, idx) => (
        <Box key={s.id} className={itemClassName}>
          {s.render()}
          {direction === "column" && idx < slots.length - 1 && <Spacer />}
        </Box>
      ))}
      {slots.length && direction === "column" ? <Spacer /> : null}
    </>
  );
}
