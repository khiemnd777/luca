import * as React from "react";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";
import PhotoOutlinedIcon from "@mui/icons-material/PhotoOutlined";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { usePhotoUrl } from "@core/photo/use-photo-url";

type OrderDeliveryProofPhotoProps = {
  src: string;
  alt: string;
};

export function OrderDeliveryProofPhoto({
  src,
  alt,
}: OrderDeliveryProofPhotoProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const { displayUrl, loading, error } = usePhotoUrl(src);

  if (loading) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          minHeight: 72,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          px: 1.5,
          py: 1,
          bgcolor: "background.default",
        }}
      >
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">
          Đang tải ảnh xác nhận
        </Typography>
      </Stack>
    );
  }

  if (error || !displayUrl) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          minHeight: 72,
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 1,
          px: 1.5,
          py: 1,
          bgcolor: "background.default",
        }}
      >
        <BrokenImageOutlinedIcon fontSize="small" color="disabled" />
        <Typography variant="body2" color="text.secondary">
          {error ?? "Không có ảnh xác nhận."}
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PhotoOutlinedIcon fontSize="small" />
          <Typography variant="body2" fontWeight={600}>
            Ảnh xác nhận giao hàng
          </Typography>
        </Stack>

        <Box
          sx={{
            position: "relative",
            width: 112,
            height: 112,
            borderRadius: 1,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.default",
            cursor: "pointer",
          }}
          onClick={() => setPreviewOpen(true)}
        >
          <Box
            component="img"
            src={displayUrl}
            alt={alt}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
          <Tooltip title="Xem ảnh">
            <IconButton
              size="small"
              sx={{
                position: "absolute",
                right: 6,
                bottom: 6,
                bgcolor: "rgba(0, 0, 0, 0.56)",
                color: "common.white",
                "&:hover": {
                  bgcolor: "rgba(0, 0, 0, 0.72)",
                },
              }}
            >
              <ZoomInRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Stack>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 1.5 }}>
          <Box
            component="img"
            src={displayUrl}
            alt={alt}
            sx={{
              width: "100%",
              maxHeight: "80vh",
              objectFit: "contain",
              display: "block",
              borderRadius: 1,
              bgcolor: "background.default",
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
