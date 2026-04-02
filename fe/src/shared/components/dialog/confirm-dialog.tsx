import * as React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  content?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirming?: boolean;
  width?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title = "Confirm",
  content = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirming = false,
  width = "xs",
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={confirming ? undefined : onClose} maxWidth={width} fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {typeof content === "string" ? (
          <Typography variant="body2" color="text.secondary">{content}</Typography>
        ) : content}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={confirming}>{cancelText}</Button>
        <Button variant="contained" onClick={onConfirm} disabled={confirming}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
