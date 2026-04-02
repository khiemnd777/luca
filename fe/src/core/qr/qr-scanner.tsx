import React from "react";
import { Box } from "@mui/material";

type QrScannerProps = {
  aimSize?: number | string;
  onStream?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
};

export function QrScanner({
  aimSize = "min(70vw, 320px)",
  onStream,
  onError,
}: QrScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
    let active = true;

    const start = async () => {
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error("Camera is not supported");
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

        onStream?.(stream);
      } catch (err) {
        onError?.(err as Error);
      }
    };

    start();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [onStream, onError]);

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "black",
        overflow: "hidden",
      }}
    >
      <Box
        component="video"
        ref={videoRef}
        muted
        playsInline
        autoPlay
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            width: aimSize,
            height: aimSize,
            borderRadius: 2,
            border: "2px solid rgba(255,255,255,0.9)",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        />
      </Box>
    </Box>
  );
}
