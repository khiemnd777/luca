import * as React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from "@mui/material";

type OrderFileCameraDialogProps = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

export function OrderFileCameraDialog({
  open,
  onClose,
  onCapture,
}: OrderFileCameraDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
    if (!open) return;

    let active = true;
    const startCamera = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error("Thiết bị hoặc trình duyệt không hỗ trợ camera.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (cameraError) {
        setError(cameraError instanceof Error ? cameraError.message : "Không thể mở camera.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [open]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Không thể chụp ảnh từ camera.");
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) {
      setError("Không thể tạo file ảnh.");
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    onCapture(new File([blob], `prescription-slip-${stamp}.jpg`, { type: "image/jpeg" }));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Chụp hình</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error ? <Alert severity="warning">{error}</Alert> : null}
          <Box
            sx={{
              minHeight: 280,
              borderRadius: 1,
              overflow: "hidden",
              bgcolor: "common.black",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {loading ? (
              <CircularProgress />
            ) : (
              <Box
                ref={videoRef}
                component="video"
                autoPlay
                playsInline
                muted
                sx={{ width: "100%", maxHeight: "70vh", objectFit: "contain" }}
              />
            )}
          </Box>
          <canvas ref={canvasRef} hidden />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
        <Button variant="contained" onClick={handleCapture} disabled={loading}>
          Chụp
        </Button>
      </DialogActions>
    </Dialog>
  );
}
