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

  /**
   * Nếu cung cấp → component:
   *  - Hiện preview ngay (optimistic)
   *  - Upload nền
   *  - Tự thay/append URL thật vào value
   *  Hỗ trợ callback onProgress cho từng file.
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

type OptimisticItem = {
  id: string;        // định danh file (name|size|lastModified)
  url: string;       // objectURL để preview
  file: File;
  progress: number;  // 0..100
  canceled?: boolean;
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
    uploader,
    value,
    onChange,
  } = props;

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const latestValueRef = React.useRef<typeof value>(value);
  React.useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  // Normalize value → array
  const list = React.useMemo<ImageUploadList>(() => {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  const urls = React.useMemo(() => list.filter((x): x is string => typeof x === "string"), [list]);
  const files = React.useMemo(() => list.filter((x): x is File => x instanceof File), [list]);

  // Optimistic previews khi có uploader
  const [optimistic, setOptimistic] = React.useState<OptimisticItem[]>([]);

  // Cleanup objectURL cho optimistic previews
  React.useEffect(() => {
    return () => {
      optimistic.forEach((it) => URL.revokeObjectURL(it.url));
    };
  }, [optimistic]);

  const fileId = (f: File) => `${f.name}|${f.size}|${f.lastModified}`;

  const openPicker = () => inputRef.current?.click();

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    if (picked.length === 0) return;

    const limited = (multiple ? picked : [picked[0]]).slice(0, maxFiles);

    if (!uploader) {
      // Không có uploader → giữ File trong value
      const next = multiple ? [...urls, ...files, ...limited] : (urls[0] ?? files[0] ?? limited[0] ?? null);
      onChange(next as any);
    } else {
      // Có uploader → preview ngay + upload nền + tự thay URL
      const newOptimistics: OptimisticItem[] = limited.map((f) => ({
        id: fileId(f),
        url: URL.createObjectURL(f),
        file: f,
        progress: 0,
      }));

      setOptimistic((prev) => {
        if (multiple) return [...prev, ...newOptimistics];
        // single: replace ngay để ẩn ảnh cũ tức thì (tránh "2 ảnh" gây cảm giác lag)
        // => chỉ hiển thị optimistic mới, không render urls cũ trong lúc upload
        prev.forEach((it) => URL.revokeObjectURL(it.url));
        return [...newOptimistics];
      });

      // Upload nền
      void (async () => {
        try {
          const onProg = (p: UploadProgress) => {
            setOptimistic((prev) => {
              // cập nhật progress theo index của batch này
              const copy = [...prev];
              const base = multiple ? prev.length - newOptimistics.length : 0;
              const idx = base + p.index;
              if (copy[idx]) copy[idx] = { ...copy[idx], progress: p.progress };
              return copy;
            });
          };

          // Lọc item chưa bị cancel
          const batchItems = () => {
            // map theo id (đảm bảo uniqueness)
            const map = new Map<string, OptimisticItem>();
            [...newOptimistics].forEach((n) => map.set(n.id, n));
            return Array.from(map.values()).filter((it) => !it.canceled);
          };
          const batch = batchItems().map((it) => it.file);
          if (batch.length === 0) return;

          const uploadedUrls = await uploader(batch, onProg);

          // Khi xong, thay/append vào value
          const cur = latestValueRef.current;
          const curList = cur == null ? [] : Array.isArray(cur) ? cur : [cur];
          const curUrls = curList.filter((x): x is string => typeof x === "string");

          const nextValue = multiple ? [...curUrls, ...uploadedUrls] : (uploadedUrls[0] ?? null);
          onChange(nextValue as any);
        } catch (err) {
          // Có thể thêm onUploadError nếu cần
          // console.error(err);
        } finally {
          // Gỡ optimistic của batch
          setOptimistic((prev) => {
            const ids = new Set(newOptimistics.map((n) => n.id));
            prev.forEach((it) => {
              if (ids.has(it.id)) URL.revokeObjectURL(it.url);
            });
            return prev.filter((it) => !ids.has(it.id));
          });
        }
      })();
    }

    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (idx: number, isUrl: boolean) => {
    if (isUrl) {
      const newUrls = urls.filter((_, i) => i !== idx);
      const next = props.multiple ? newUrls : (newUrls[0] ?? null);
      onChange(next as any);
      return;
    }

    if (!uploader) {
      const newFiles = files.filter((_, i) => i !== idx);
      const next = multiple ? [...urls, ...newFiles] : (urls[0] ?? newFiles[0] ?? null);
      onChange(next as any);
      return;
    }

    const opt = optimistic[idx];
    if (opt) {
      URL.revokeObjectURL(opt.url);
      setOptimistic((prev) => prev.filter((_, i) => i !== idx));
      opt.canceled = true;
    }
  };

  const filePreviewsNoUploader = React.useMemo(
    () => (!uploader ? files.map((f) => URL.createObjectURL(f)) : []),
    [files, uploader]
  );
  React.useEffect(() => {
    if (uploader) return;
    return () => filePreviewsNoUploader.forEach((u) => URL.revokeObjectURL(u));
  }, [filePreviewsNoUploader, uploader]);

  // ===== Render =====
  // Với single + uploader: nếu có optimistic → ẩn urls cũ (tránh hiệu ứng 2 ảnh)
  const showUrls = !(uploader && !multiple && optimistic.length > 0);

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
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
          gap: 1,
          mt: 1,
        }}
      >
        {/* 1) URL thật */}
        {showUrls &&
          urls.map((u, i) => (
            <Thumb key={`url-${i}-${u}`} src={u} alt={`image-${i}`} onRemove={() => removeAt(i, true)} />
          ))}

        {/* 2) Không có uploader → preview từ File trong value */}
        {!uploader &&
          filePreviewsNoUploader.map((u, i) => (
            <Thumb key={`file-${i}`} src={u} alt={`file-${i}`} onRemove={() => removeAt(i, false)} />
          ))}

        {/* 3) Có uploader → preview optimistic kèm progress */}
        {uploader &&
          optimistic.map((it, i) => (
            <Thumb
              key={`optim-${it.id}-${i}`}
              src={it.url}
              alt={it.file.name}
              onRemove={() => removeAt(i, false)}
              progress={it.progress}
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
      const parts = src.split(/[\/\\]/);
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
}: {
  src: string;
  alt?: string;
  onRemove: () => void;
  progress?: number;
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
        width: "100%",
        aspectRatio: "1 / 1",
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: "background.default",
        border: "1px dashed",
        borderColor: "divider",
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
