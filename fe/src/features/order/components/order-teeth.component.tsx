import * as React from "react";
import { Button, Stack, Typography } from "@mui/material";
import TeethLayout from "../components/teeth";
import { ConfirmDialog } from "@shared/components/dialog/confirm-dialog";
import { TOOTH_SPRITES } from "../components/teeth/tooth-sprite-map";
import type { ToothCode } from "../components/teeth/tooth-sprite-map";
import { lowerToothCodes, upperToothCodes } from "../components/teeth/teeth-chart";

export type OrderTeethProps = {
  value?: string | null;
  title?: string;
  onChange?: (value: string) => void;
};

const validToothCodes = new Set<number>(
  Object.keys(TOOTH_SPRITES).map((code) => Number(code))
);

function parseToothPositions(value?: string | null): ToothCode[] {
  if (!value) return [];
  const result = new Set<ToothCode>();

  value.split(",").forEach((rawToken) => {
    const token = rawToken.trim();
    if (!token) return;

    const [startStr, endStr, extra] = token.split("-").map((part) => part.trim());
    if (extra) return;

    const start = Number(startStr);
    const end = endStr ? Number(endStr) : start;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;

    const rangeStart = Math.min(start, end);
    const rangeEnd = Math.max(start, end);

    for (let code = rangeStart; code <= rangeEnd; code += 1) {
      if (validToothCodes.has(code)) {
        result.add(code as ToothCode);
      }
    }
  });

  return Array.from(result).sort((a, b) => a - b);
}

function formatToothPositions(nums: number[]) {
  if (!nums || nums.length === 0) return "";
  const sorted = Array.from(new Set(nums))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (sorted.length === 0) return "";

  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = cur;
    prev = cur;
  }

  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
  return ranges.join(",");
}

function formatToothPositionsByJaw(value?: string | null) {
  const positions = parseToothPositions(value);
  const upperSet = new Set<number>(upperToothCodes);
  const lowerSet = new Set<number>(lowerToothCodes);

  return {
    upper: formatToothPositions(positions.filter((code) => upperSet.has(code))),
    lower: formatToothPositions(positions.filter((code) => lowerSet.has(code))),
  };
}

export default function OrderTeeth({
  value,
  onChange,
}: OrderTeethProps) {
  const [openDialog, setOpenDialog] = React.useState(false);
  const [draftSelection, setDraftSelection] = React.useState<ToothCode[]>([]);
  const selected = React.useMemo(
    () => (value == null ? undefined : parseToothPositions(value)),
    [value]
  );
  const formattedByJaw = React.useMemo(
    () => formatToothPositionsByJaw(value),
    [value]
  );
  const hasSelection = Boolean(formattedByJaw.upper || formattedByJaw.lower);

  const handleOpen = React.useCallback(() => {
    setDraftSelection(selected ?? []);
    setOpenDialog(true);
  }, [selected]);

  const handleConfirm = React.useCallback(() => {
    onChange?.(formatToothPositions(draftSelection));
    setOpenDialog(false);
  }, [draftSelection, onChange]);
  const handleDraftChange = React.useCallback((nums: ToothCode[]) => {
    setDraftSelection(nums);
  }, []);

  return (
    <>
      <Button
        variant="text"
        onClick={handleOpen}
        sx={{ justifyContent: "flex-start", textAlign: "left" }}
      >
        {hasSelection ? (
          <Stack spacing={0.25}>
            <Typography variant="body2" component="div" fontWeight={600}>
              Vị trí răng:
            </Typography>
            {formattedByJaw.upper ? (
              <Typography variant="body2" component="div">
                Hàm trên: {formattedByJaw.upper}
              </Typography>
            ) : null}
            {formattedByJaw.lower ? (
              <Typography variant="body2" component="div">
                Hàm dưới: {formattedByJaw.lower}
              </Typography>
            ) : null}
          </Stack>
        ) : (
          <Typography variant="body2" component="div" fontWeight={600}>
            Vị trí răng: Chọn
          </Typography>
        )}
      </Button>
      <ConfirmDialog
        open={openDialog}
        title="Chọn vị trí răng"
        width="md"
        content={
          <TeethLayout onChange={handleDraftChange} value={draftSelection} />
        }
        confirmText="Chọn"
        cancelText="Hủy"
        onClose={() => setOpenDialog(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
