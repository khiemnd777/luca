import * as React from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import CloseIcon from "@mui/icons-material/Close";

export type FileUploaderPanelProps = {
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  onUpload: (files: File[]) => Promise<void> | void;
  onCancel?: () => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  clearOnCancel?: boolean;
  clearOnUpload?: boolean;
  disabled?: boolean;
  title?: string;
  emptyText?: string;
  addLabel?: string;
  uploadLabel?: string;
  uploadingLabel?: string;
  cancelLabel?: string;
};

function fileKey(file: File) {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

export function FileUploaderPanel({
  files,
  onFilesChange,
  onUpload,
  onCancel,
  accept = "*",
  multiple = true,
  maxFiles,
  clearOnCancel = true,
  clearOnUpload = false,
  disabled = false,
  title = "Tệp cần tải lên",
  emptyText = "Chưa có tệp nào",
  addLabel = "Thêm file",
  uploadLabel = "Tải lên",
  uploadingLabel = "Đang tải...",
  cancelLabel = "Hủy",
}: FileUploaderPanelProps) {
  const isControlled = files !== undefined;
  const [internalFiles, setInternalFiles] = React.useState<File[]>([]);
  const [uploading, setUploading] = React.useState(false);

  const value = isControlled ? files ?? [] : internalFiles;

  const setFiles = React.useCallback(
    (next: File[]) => {
      if (!isControlled) setInternalFiles(next);
      onFilesChange?.(next);
    },
    [isControlled, onFilesChange]
  );

  const handleAddFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files ? Array.from(event.target.files) : [];
    if (list.length === 0) return;

    if (!multiple) {
      const last = list[list.length - 1];
      setFiles(last ? [last] : []);
      event.target.value = "";
      return;
    }

    const map = new Map(value.map((f) => [fileKey(f), f]));
    list.forEach((f) => map.set(fileKey(f), f));

    let merged = Array.from(map.values());
    if (typeof maxFiles === "number") {
      merged = merged.slice(0, Math.max(0, maxFiles));
    }

    setFiles(merged);
    event.target.value = "";
  };

  const handleRemove = (index: number) => {
    setFiles(value.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (disabled || uploading || value.length === 0) return;

    setUploading(true);
    try {
      await onUpload(value);
      if (clearOnUpload) setFiles([]);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (disabled || uploading) return;
    if (clearOnCancel) setFiles([]);
    onCancel?.();
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        {/* Header */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>

          <Button
            component="label"
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={disabled || uploading}
          >
            {addLabel}
            <input
              type="file"
              hidden
              accept={accept}
              multiple={multiple}
              onChange={handleAddFiles}
              aria-label={addLabel}
            />
          </Button>
        </Stack>

        <Divider />

        {/* File list */}
        <Box>
          {value.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {emptyText}
            </Typography>
          ) : (
            <List dense disablePadding>
              {value.map((file, index) => (
                <ListItem
                  key={fileKey(file)}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="Remove file"
                      onClick={() => handleRemove(index)}
                      disabled={disabled || uploading}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={file.name}
                    secondary={formatSize(file.size)}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* Actions */}
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            variant="outlined"
            startIcon={<CloseIcon />}
            onClick={handleCancel}
            disabled={disabled || uploading}
          >
            {cancelLabel}
          </Button>

          <Button
            variant="contained"
            startIcon={<CloudUploadOutlinedIcon />}
            onClick={handleUpload}
            disabled={disabled || uploading || value.length === 0}
            aria-busy={uploading}
          >
            {uploading ? uploadingLabel : uploadLabel}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
