import * as React from "react";
import { Button, Stack, Typography } from "@mui/material";
import TeethLayout from "../components/teeth";
import { ConfirmDialog } from "@shared/components/dialog/confirm-dialog";
import {
  formatToothPositionSegments,
  formatToothPositionsByJaw,
  parseToothPositionSegments,
  type ToothSelectionSegment,
} from "../utils/tooth-position.utils";

export type OrderTeethProps = {
  value?: string | null;
  title?: string;
  onChange?: (value: string) => void;
};

export default function OrderTeeth({
  value,
  onChange,
}: OrderTeethProps) {
  const [openDialog, setOpenDialog] = React.useState(false);
  const [draftSelection, setDraftSelection] = React.useState<ToothSelectionSegment[]>([]);
  const selected = React.useMemo(
    () => (value == null ? undefined : parseToothPositionSegments(value)),
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
    onChange?.(formatToothPositionSegments(draftSelection));
    setOpenDialog(false);
  }, [draftSelection, onChange]);
  const handleDraftChange = React.useCallback((segments: ToothSelectionSegment[]) => {
    setDraftSelection(segments);
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
                Răng trên: {formattedByJaw.upper}
              </Typography>
            ) : null}
            {formattedByJaw.lower ? (
              <Typography variant="body2" component="div">
                Răng dưới: {formattedByJaw.lower}
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
