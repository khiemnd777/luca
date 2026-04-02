import * as React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";

type FormDialogProps = React.PropsWithChildren<{
  open: boolean;
  title: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  submitting?: boolean;
  actions?: React.ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
}>;

export function FormDialog({
  open,
  title,
  children,
  confirmText = "Save",
  cancelText = "Cancel",
  submitting = false,
  actions,
  onClose,
  onSubmit,
  maxWidth = "lg",
}: FormDialogProps) {
  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth={maxWidth}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        {actions ? (
          <>
            <Button onClick={onClose} disabled={submitting}>{cancelText}</Button>
            {actions}
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={submitting}>{cancelText}</Button>
            <Button variant="contained" onClick={onSubmit} disabled={submitting}>{confirmText}</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
