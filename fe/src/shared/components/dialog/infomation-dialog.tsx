import * as React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";

type InformationDialogProps = {
  open: boolean;
  title?: string;
  content?: React.ReactNode;
  closeText?: string;
  closing?: boolean;
  onClose: () => void;
};

export function InformationDialog({
  open,
  title = "Information",
  content = "",
  closeText = "OK",
  closing = false,
  onClose,
}: InformationDialogProps) {
  return (
    <Dialog open={open} onClose={closing ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {typeof content === "string" ? (
          <Typography variant="body2" color="text.secondary">{content}</Typography>
        ) : content}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose} disabled={closing}>
          {closeText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
