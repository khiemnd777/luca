import * as React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import type {
  LocalPrescriptionQueueItem,
  OrderPrescriptionFileModel,
} from "../model/order-prescription-file.model";
import { getPrescriptionFileContentUrl } from "../api/order-prescription-file.api";

type ViewerFile =
  | { kind: "persisted"; orderId: number; file: OrderPrescriptionFileModel }
  | { kind: "local"; file: LocalPrescriptionQueueItem };

type OrderPrescriptionFileViewerProps = {
  open: boolean;
  value: ViewerFile | null;
  onClose: () => void;
};

export function OrderPrescriptionFileViewer({
  open,
  value,
  onClose,
}: OrderPrescriptionFileViewerProps) {
  const [localUrl, setLocalUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!value || value.kind !== "local") {
      setLocalUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(value.file.file);
    setLocalUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [value]);

  const mimeType = value?.kind === "persisted" ? value.file.mimeType : value?.file.mimeType;
  const fileName = value?.kind === "persisted" ? value.file.fileName : value?.file.fileName;
  const src = value?.kind === "persisted"
    ? getPrescriptionFileContentUrl(value.orderId, value.file.id)
    : localUrl;

  const body = React.useMemo(() => {
    if (!src || !mimeType) return null;

    if (mimeType.startsWith("image/")) {
      return (
        <Box
          component="img"
          src={src}
          alt={fileName ?? "prescription-file"}
          sx={{ width: "100%", maxHeight: "78vh", objectFit: "contain", display: "block" }}
        />
      );
    }

    return (
      <Typography variant="body2" color="text.secondary">
        Chỉ hỗ trợ xem trước file hình ảnh. Các định dạng khác sẽ được mở hoặc tải xuống ngoài trình xem này.
      </Typography>
    );
  }, [mimeType, src]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{fileName ?? "Xem file"}</DialogTitle>
      <DialogContent dividers>{body}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}
