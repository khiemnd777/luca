import * as React from "react";
import { Stack, Button, FormHelperText, IconButton, Tooltip, Box, LinearProgress, Typography } from "@mui/material";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import AddPhotoAlternateRounded from "@mui/icons-material/AddPhotoAlternateRounded";
import { useDisplayUrl } from "../photo/use-display-url";

export type ImageUploadValue = string | File;
export type ImageUploadList = ImageUploadValue[];

export type UploadProgress = {
  /** index trong batch (0..files.length-1) */
  index: number;
  /** phần trăm 0..100 */
  progress: number;
};

export type ImageUploadFieldProps = {
  name: string;
  label?: string;
  size?: "small" | "medium";
  helperText?: string | null;
  error?: string | null;

  multiple?: boolean;            // default: true
  maxFiles?: number;
  accept?: string;               // default: "image/*"
  imagePreviewAspectRatio?: string;
  imagePreviewHeight?: number;

  /**
   * Nếu cung cấp, AutoForm sẽ gọi uploader trong submit phase.
   * Component này chỉ giữ File để preview local, không upload khi chọn file.
   */
  uploader?: (files: File[], onProgress?: (p: UploadProgress) => void) => Promise<string[]>;

  /** Giá trị hiện tại: URL[]/File[] hoặc single (string|File) */
  value: ImageUploadList | ImageUploadValue | null | undefined;

  /** onChange:
   *  - Không có uploader: giữ File/URL như bạn chọn
   *  - Có uploader: cuối cùng chỉ còn URL thật
   */
  onChange: (val: ImageUploadList | ImageUploadValue | null) => void;
};

export function ImageUploadField(props: ImageUploadFieldProps) {
  const {
    name,
    label = "Upload images",
    size = "small",
    helperText,
    error,
    multiple = true,
    maxFiles = Infinity,
    accept = "image/*",
    imagePreviewAspectRatio = "1 / 1",
    imagePreviewHeight = 96,
    value,
    onChange,
  } = props;

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Normalize value → array
  const list = React.useMemo<ImageUploadList>(() => {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  const urls = React.useMemo(() => list.filter((x): x is string => typeof x === "string"), [list]);
  const files = React.useMemo(() => list.filter((x): x is File => x instanceof File), [list]);

  const openPicker = () => inputRef.current?.click();

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    if (picked.length === 0) return;

    const limited = (multiple ? picked : [picked[0]]).slice(0, maxFiles);

    const next = multiple ? [...urls, ...files, ...limited] : (limited[0] ?? urls[0] ?? files[0] ?? null);
    onChange(next);

    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (idx: number, isUrl: boolean) => {
    if (isUrl) {
      const newUrls = urls.filter((_, i) => i !== idx);
      const next = multiple ? newUrls : (newUrls[0] ?? null);
      onChange(next);
      return;
    }

    const newFiles = files.filter((_, i) => i !== idx);
    const next = multiple ? [...urls, ...newFiles] : (urls[0] ?? newFiles[0] ?? null);
    onChange(next);
  };

  const filePreviews = React.useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files]
  );
  React.useEffect(() => {
    return () => filePreviews.forEach((u) => URL.revokeObjectURL(u));
  }, [filePreviews]);

  // ===== Render =====
  return (
    <React.Fragment key={name}>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={multiple}
        accept={accept}
        onChange={handleFiles}
      />

      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          variant="outlined"
          size={size}
          startIcon={<AddPhotoAlternateRounded />}
          onClick={openPicker}
        >
          {label}
        </Button>
        {error ? (
          <FormHelperText error>{error}</FormHelperText>
        ) : helperText ? (
          <FormHelperText>{helperText}</FormHelperText>
        ) : null}
      </Stack>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 1,
          mt: 1,
        }}
      >
        {/* 1) URL thật */}
        {urls.map((u, i) => (
          <Thumb
            key={`url-${i}-${u}`}
            src={u}
            alt={`image-${i}`}
            onRemove={() => removeAt(i, true)}
            aspectRatio={imagePreviewAspectRatio}
            height={imagePreviewHeight}
          />
        ))}

        {/* 2) Preview từ File trong value */}
        {filePreviews.map((u, i) => (
          <Thumb
            key={`file-${i}`}
            src={u}
            alt={`file-${i}`}
            onRemove={() => removeAt(i, false)}
            aspectRatio={imagePreviewAspectRatio}
            height={imagePreviewHeight}
          />
        ))}
      </Box>
    </React.Fragment>
  );
}

function makeFallbackUrl(src?: string | null, defaultSeed = "user"): string {
  let initialsSeed = defaultSeed;
  if (src) {
    try {
      const parts = src.split(/[/\\]/);
      const last = parts[parts.length - 1];
      initialsSeed = last?.split(".")[0] || defaultSeed;
    } catch {
      initialsSeed = defaultSeed;
    }
  }
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(initialsSeed)}`;
}

function Thumb({
  src,
  alt,
  onRemove,
  progress,
  aspectRatio = "1 / 1",
  height = 96,
}: {
  src: string;
  alt?: string;
  onRemove: () => void;
  progress?: number;
  aspectRatio?: string;
  height?: number;
}) {
  const uploading = typeof progress === "number" && progress >= 0 && progress < 100;
  const resolved = useDisplayUrl(src);

  const [imgSrc, setImgSrc] = React.useState<string>(() => {
    return resolved && resolved.trim().length > 0 ? resolved : makeFallbackUrl(src);
  });

  React.useEffect(() => {
    setImgSrc(resolved && resolved.trim().length > 0 ? resolved : makeFallbackUrl(src));
  }, [resolved, src]);

  const handleError = React.useCallback(() => {
    const fallback = makeFallbackUrl(src);
    if (imgSrc !== fallback) setImgSrc(fallback);
  }, [imgSrc, src]);

  return (
    <Box
      sx={{
        position: "relative",
        flex: "0 0 auto",
        width: "auto",
        height,
        aspectRatio,
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: "background.default",
        border: "1px dashed",
        borderColor: "divider",
        maxWidth: "100%",
      }}
    >
      <img
        src={imgSrc}
        alt={alt ?? ""}
        onError={handleError}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          filter: uploading ? "grayscale(0.2)" : undefined,
        }}
      />

      {/* Nút remove */}
      <Tooltip title="Remove">
        <IconButton
          size="small"
          onClick={onRemove}
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            bgcolor: "rgba(0,0,0,0.5)",
            color: "white",
            "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
          }}
        >
          <DeleteOutlineRounded fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Overlay progress (nếu đang upload) */}
      {uploading && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            bgcolor: "rgba(0,0,0,0.25)",
            p: 1,
          }}
        >
          <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, progress ?? 0))} />
          <Typography variant="caption" sx={{ mt: 0.5, color: "white" }}>
            {Math.round(progress ?? 0)}%
          </Typography>
        </Box>
      )}
    </Box>
  );
}
