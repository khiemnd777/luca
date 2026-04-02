import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import {
  FileUploaderPanel,
  type FileUploaderPanelProps,
} from "@shared/components/button/upload/file-uploader-panel";

export type UploadDialogProps = Omit<FileUploaderPanelProps, "onCancel"> & {
  open: boolean;
  title?: string;
  width?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  onClose: () => void;
  disableBackdropClose?: boolean;
};

export function UploadDialog({
  open,
  title = "Upload",
  width = "sm",
  onClose,
  disableBackdropClose = false,
  ...panelProps
}: UploadDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={disableBackdropClose ? undefined : onClose}
      maxWidth={width}
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <FileUploaderPanel
          {...panelProps}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
