import * as React from "react";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import {
  Button,
  CircularProgress,
  Link,
  Paper,
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ConfirmDialog } from "@shared/components/dialog/confirm-dialog";
import { usePhotoUrl } from "@core/photo/use-photo-url";
import {
  deletePrescriptionFile,
  getPrescriptionFileContentUrl,
  listPrescriptionFiles,
  uploadPrescriptionFile,
} from "../api/order-prescription-file.api";
import type {
  LocalPrescriptionQueueItem,
  OrderPrescriptionFileModel,
} from "../model/order-prescription-file.model";
import {
  getPrescriptionScopeController,
  registerPrescriptionScopeController,
  unregisterPrescriptionScopeController,
  useOrderPrescriptionFileStore,
} from "../utils/order-prescription-file.store";
import { hydratePrescriptionFiles } from "../utils/order-prescription-file.sync";
import { OrderFileCameraDialog } from "./order-file-camera-dialog.component";
import { OrderPrescriptionFileViewer } from "./order-prescription-file-viewer.component";

const fileAccept = ".jpg,.jpeg,.png,.webp,.pdf,.docx,image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type DeferredSectionProps = {
  mode: "deferred";
  scopeKey: string;
  orderId?: number | null;
  sourceOrderId?: number | null;
  canMutate?: boolean;
  setOrderValues: (patch: Record<string, unknown>) => void;
};

type ImmediateSectionProps = {
  mode: "immediate";
  scopeKey: string;
  orderId?: number | null;
  sourceOrderId?: number | null;
  canMutate?: boolean;
};

type OrderPrescriptionFilesSectionProps = DeferredSectionProps | ImmediateSectionProps;

type ViewerState =
  | { kind: "persisted"; orderId: number; file: OrderPrescriptionFileModel }
  | { kind: "local"; file: LocalPrescriptionQueueItem }
  | null;

function isPreviewableImage(mimeType?: string | null) {
  return typeof mimeType === "string" && mimeType.startsWith("image/");
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function toFormatLabel(name: string) {
  const ext = name.split(".").pop()?.trim().toUpperCase();
  return ext || "";
}

function toLocalQueueItems(files: File[]): LocalPrescriptionQueueItem[] {
  return files.map((file) => ({
    localId: `${file.name}:${file.lastModified}:${file.size}:${crypto.randomUUID()}`,
    file,
    fileName: file.name,
    format: toFormatLabel(file.name),
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    uploadState: "pending",
    errorMessage: null,
  }));
}

function uploadStateLabel(uploadState: "success" | "pending" | "error") {
  switch (uploadState) {
    case "success":
      return "✅";
    case "error":
      return "⚠️";
    default:
      return "Chờ upload";
  }
}

function openExternalFile(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

type FilePreviewCellProps =
  | { kind: "persisted"; orderId: number; file: OrderPrescriptionFileModel; onOpen?: () => void }
  | { kind: "local"; file: LocalPrescriptionQueueItem; onOpen?: () => void };

function FilePreviewCell(props: FilePreviewCellProps) {
  const [localUrl, setLocalUrl] = React.useState<string | null>(null);
  const remoteSrc =
    props.kind === "persisted"
      ? getPrescriptionFileContentUrl(props.orderId, props.file.id)
      : null;
  const { displayUrl } = usePhotoUrl(remoteSrc);

  React.useEffect(() => {
    if (props.kind !== "local" || !isPreviewableImage(props.file.mimeType)) {
      setLocalUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(props.file.file);
    setLocalUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [props]);

  const src = props.kind === "persisted" ? displayUrl : localUrl;

  if (!src) {
    return null;
  }

  return (
    <Box
      component="button"
      type="button"
      onClick={props.onOpen}
      sx={{
        p: 0,
        m: 0,
        border: 0,
        background: "transparent",
        display: "block",
        lineHeight: 0,
        cursor: props.onOpen ? "pointer" : "default",
      }}
    >
      <Box
        component="img"
        src={src}
        alt={props.file.fileName}
        sx={{
          width: 72,
          height: 72,
          borderRadius: 1,
          objectFit: "cover",
          border: (theme) => `1px solid ${theme.palette.divider}`,
          display: "block",
        }}
      />
    </Box>
  );
}

export function OrderPrescriptionFilesSection(props: OrderPrescriptionFilesSectionProps) {
  const { scopeKey, orderId, canMutate = true } = props;
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState<{
    kind: "persisted" | "local";
    fileId?: number;
    localId?: string;
  } | null>(null);
  const [viewer, setViewer] = React.useState<ViewerState>(null);
  const [uploading, setUploading] = React.useState(false);
  const [sourceFiles, setSourceFiles] = React.useState<OrderPrescriptionFileModel[]>([]);
  const [sourceLoading, setSourceLoading] = React.useState(false);

  const scope = useOrderPrescriptionFileStore((state) => state.scopes[scopeKey]);
  const ensureScope = useOrderPrescriptionFileStore((state) => state.ensureScope);
  const appendQueuedFiles = useOrderPrescriptionFileStore((state) => state.appendQueuedFiles);
  const removeQueuedFile = useOrderPrescriptionFileStore((state) => state.removeQueuedFile);
  const setQueuedFileStatus = useOrderPrescriptionFileStore((state) => state.setQueuedFileStatus);
  const appendPersistedFile = useOrderPrescriptionFileStore((state) => state.appendPersistedFile);
  const markPersistedFileDeleted = useOrderPrescriptionFileStore((state) => state.markPersistedFileDeleted);
  const commitDeletedFile = useOrderPrescriptionFileStore((state) => state.commitDeletedFile);
  const destroyScope = useOrderPrescriptionFileStore((state) => state.destroyScope);

  React.useEffect(() => {
    ensureScope(scopeKey);
    return () => {
      unregisterPrescriptionScopeController(scopeKey);
      destroyScope(scopeKey);
    };
  }, [destroyScope, ensureScope, scopeKey]);

  React.useEffect(() => {
    if (props.mode !== "deferred") return;
    registerPrescriptionScopeController(scopeKey, {
      setOrderValues: props.setOrderValues,
    });
    return () => {
      unregisterPrescriptionScopeController(scopeKey);
    };
  }, [props, scopeKey]);

  React.useEffect(() => {
    void hydratePrescriptionFiles(scopeKey, orderId);
  }, [orderId, scopeKey]);

  React.useEffect(() => {
    let active = true;

    if (!props.sourceOrderId || props.sourceOrderId <= 0) {
      setSourceFiles([]);
      setSourceLoading(false);
      return () => {
        active = false;
      };
    }

    setSourceLoading(true);
    void listPrescriptionFiles(props.sourceOrderId)
      .then((files) => {
        if (!active) return;
        setSourceFiles(files);
      })
      .finally(() => {
        if (!active) return;
        setSourceLoading(false);
      });

    return () => {
      active = false;
    };
  }, [props.sourceOrderId]);

  const queuedFiles = scope?.queuedFiles ?? [];
  const loading = (scope?.loading ?? false) || sourceLoading;

  const visiblePersisted = React.useMemo(() => {
    const persistedFiles = scope?.persistedFiles ?? [];
    const pendingDeleteIds = scope?.pendingDeleteIds ?? [];
    return persistedFiles.filter((item) => !pendingDeleteIds.includes(item.id));
  }, [scope?.pendingDeleteIds, scope?.persistedFiles]);

  const handleAppendFiles = (files: File[]) => {
    if (files.length === 0) return;
    appendQueuedFiles(scopeKey, toLocalQueueItems(files));
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    handleAppendFiles(files);
  };

  const handleConfirmDelete = async () => {
    if (!confirmingDelete) return;

    if (confirmingDelete.kind === "local" && confirmingDelete.localId) {
      removeQueuedFile(scopeKey, confirmingDelete.localId);
      setConfirmingDelete(null);
      return;
    }

    if (!confirmingDelete.fileId) {
      setConfirmingDelete(null);
      return;
    }

    if (props.mode === "deferred") {
      markPersistedFileDeleted(scopeKey, confirmingDelete.fileId);
      setConfirmingDelete(null);
      return;
    }

    if (!orderId) {
      setConfirmingDelete(null);
      return;
    }

    try {
      await deletePrescriptionFile(orderId, confirmingDelete.fileId);
      commitDeletedFile(scopeKey, confirmingDelete.fileId);
    } finally {
      setConfirmingDelete(null);
    }
  };

  const handleImmediateUpload = async () => {
    if (!orderId || uploading || queuedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const item of [...queuedFiles]) {
        setQueuedFileStatus(scopeKey, item.localId, "pending", null);
        try {
          const uploaded = await uploadPrescriptionFile(orderId, item.file);
          removeQueuedFile(scopeKey, item.localId);
          appendPersistedFile(scopeKey, uploaded);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload thất bại.";
          setQueuedFileStatus(scopeKey, item.localId, "error", message);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCapturedFile = (file: File) => {
    handleAppendFiles([file]);
  };

  const openPersistedViewer = (file: OrderPrescriptionFileModel) => {
    if (!orderId) return;
    if (!isPreviewableImage(file.mimeType)) {
      openExternalFile(getPrescriptionFileContentUrl(orderId, file.id));
      return;
    }
    setViewer({ kind: "persisted", orderId, file });
  };

  const openSourceViewer = (file: OrderPrescriptionFileModel) => {
    if (!props.sourceOrderId) return;
    if (!isPreviewableImage(file.mimeType)) {
      openExternalFile(getPrescriptionFileContentUrl(props.sourceOrderId, file.id));
      return;
    }
    setViewer({ kind: "persisted", orderId: props.sourceOrderId, file });
  };

  const openLocalViewer = (file: LocalPrescriptionQueueItem) => {
    if (!isPreviewableImage(file.mimeType)) {
      const objectUrl = URL.createObjectURL(file.file);
      openExternalFile(objectUrl);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      return;
    }
    setViewer({ kind: "local", file });
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Phiếu chỉ định
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            {canMutate ? (
              <>
                <Button variant="outlined" onClick={() => setCameraOpen(true)}>
                  <PhotoCameraOutlinedIcon sx={{ mr: 1 }} />
                  Chụp hình
                </Button>
                <Button variant="outlined" onClick={() => inputRef.current?.click()}>
                  <UploadFileOutlinedIcon sx={{ mr: 1 }} />
                  Chọn files
                </Button>
                {props.mode === "immediate" ? (
                  <Button
                    variant="contained"
                    onClick={handleImmediateUpload}
                    disabled={!orderId || queuedFiles.length === 0 || uploading}
                  >
                    {uploading ? "Đang upload..." : "Upload"}
                  </Button>
                ) : null}
              </>
            ) : null}
          </Stack>
        </Stack>

        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept={fileAccept}
          onChange={handleFileSelection}
        />

        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Đang tải danh sách file
            </Typography>
          </Stack>
        ) : null}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={56}>Xóa</TableCell>
              <TableCell width={104}>Hình ảnh</TableCell>
              <TableCell>Tên file</TableCell>
              <TableCell width={120}>Định dạng</TableCell>
              <TableCell width={140}>Dung lượng</TableCell>
              <TableCell width={140}>Trạng thái</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visiblePersisted.map((file) => (
              <TableRow key={`persisted:${file.id}`}>
                <TableCell>
                  {canMutate ? (
                    <Button
                      variant="text"
                      color="error"
                      onClick={() => setConfirmingDelete({ kind: "persisted", fileId: file.id })}
                    >
                      ❌
                    </Button>
                  ) : null}
                </TableCell>
                <TableCell>
                  {isPreviewableImage(file.mimeType) ? (
                    <FilePreviewCell
                      kind="persisted"
                      orderId={orderId ?? 0}
                      file={file}
                      onOpen={() => openPersistedViewer(file)}
                    />
                  ) : null}
                </TableCell>
                <TableCell>
                  <Link
                    component="button"
                    type="button"
                    underline="hover"
                    onClick={() => openPersistedViewer(file)}
                  >
                    {file.fileName}
                  </Link>
                </TableCell>
                <TableCell>{file.format || toFormatLabel(file.fileName)}</TableCell>
                <TableCell>{formatSize(file.sizeBytes)}</TableCell>
                <TableCell>{uploadStateLabel("success")}</TableCell>
              </TableRow>
            ))}

            {sourceFiles.map((file) => (
              <TableRow key={`source:${file.id}`}>
                <TableCell />
                <TableCell>
                  {isPreviewableImage(file.mimeType) && props.sourceOrderId ? (
                    <FilePreviewCell
                      kind="persisted"
                      orderId={props.sourceOrderId}
                      file={file}
                      onOpen={() => openSourceViewer(file)}
                    />
                  ) : null}
                </TableCell>
                <TableCell>
                  <Link
                    component="button"
                    type="button"
                    underline="hover"
                    onClick={() => openSourceViewer(file)}
                  >
                    {file.fileName}
                  </Link>
                </TableCell>
                <TableCell>{file.format || toFormatLabel(file.fileName)}</TableCell>
                <TableCell>{formatSize(file.sizeBytes)}</TableCell>
                <TableCell>{uploadStateLabel("success")}</TableCell>
              </TableRow>
            ))}

            {queuedFiles.map((file) => (
              <TableRow key={`queued:${file.localId}`}>
                <TableCell>
                  {canMutate ? (
                    <Button
                      variant="text"
                      color="error"
                      onClick={() => setConfirmingDelete({ kind: "local", localId: file.localId })}
                    >
                      ❌
                    </Button>
                  ) : null}
                </TableCell>
                <TableCell>
                  {isPreviewableImage(file.mimeType) ? (
                    <FilePreviewCell kind="local" file={file} onOpen={() => openLocalViewer(file)} />
                  ) : null}
                </TableCell>
                <TableCell>
                  <Link
                    component="button"
                    type="button"
                    underline="hover"
                    onClick={() => openLocalViewer(file)}
                  >
                    {file.fileName}
                  </Link>
                </TableCell>
                <TableCell>{file.format}</TableCell>
                <TableCell>{formatSize(file.sizeBytes)}</TableCell>
                <TableCell>{uploadStateLabel(file.uploadState)}</TableCell>
              </TableRow>
            ))}

            {!loading && visiblePersisted.length === 0 && sourceFiles.length === 0 && queuedFiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary">
                    Chưa có file phiếu chỉ định.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Stack>

      <OrderFileCameraDialog
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCapturedFile}
      />

      <ConfirmDialog
        open={Boolean(confirmingDelete)}
        title="Xóa file"
        content="Bạn có chắc muốn xóa file này không?"
        confirmText="Xóa"
        cancelText="Hủy"
        onClose={() => setConfirmingDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <OrderPrescriptionFileViewer
        open={Boolean(viewer)}
        value={viewer}
        onClose={() => setViewer(null)}
      />
    </Paper>
  );
}

export function applyCreatedOrderToPrescriptionScope(scopeKey: string, order: Record<string, unknown>) {
  const controller = getPrescriptionScopeController(scopeKey);
  controller?.setOrderValues(order);
}
