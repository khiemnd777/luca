import React from "react";
import { navigate } from "@root/core/navigation/navigate";
import { QrScanner } from "@core/qr/qr-scanner";

type OrderQrScannerProps = {
  aimSize?: number | string;
  onDetected?: (orderCode: string, rawValue: string) => void;
  onError?: (error: Error) => void;
};

const ORDER_PREFIX = "order/";
type BarcodeDetectorResult = { rawValue?: string };
type BarcodeDetectorLike = {
  detect: (image: ImageBitmapSource) => Promise<BarcodeDetectorResult[]>;
};
type BarcodeDetectorConstructor = new (options: {
  formats?: string[];
}) => BarcodeDetectorLike;

function decodeOrderCode(rawValue: string) {
  if (!rawValue.startsWith(ORDER_PREFIX)) return null;
  const encoded = rawValue.slice(ORDER_PREFIX.length);
  if (!encoded) return null;
  try {
    const decoded = atob(encoded);
    return decoded || null;
  } catch {
    return null;
  }
}

export function OrderQrScanner({
  aimSize,
  onDetected,
  onError,
}: OrderQrScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const detectorRef = React.useRef<BarcodeDetectorLike | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const inFlightRef = React.useRef(false);
  const lastRawRef = React.useRef<string | null>(null);
  const foundRef = React.useRef(false);

  React.useEffect(() => {
    const ctor = (
      window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }
    ).BarcodeDetector;
    if (!ctor) {
      onError?.(new Error("BarcodeDetector is not supported"));
      return;
    }
    detectorRef.current = new ctor({ formats: ["qr_code"] });
    return () => {
      detectorRef.current = null;
    };
  }, [onError]);

  const handleDetected = React.useCallback(
    (orderCode: string, rawValue: string) => {
      if (foundRef.current) return;
      foundRef.current = true;
      if (onDetected) {
        onDetected(orderCode, rawValue);
        return;
      }
      navigate(`/order/check/${orderCode}`);
    },
    [onDetected]
  );

  const scanFrame = React.useCallback(async () => {
    if (foundRef.current) return;
    const detector = detectorRef.current;
    const video = videoRef.current;
    if (!detector || !video) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    if (inFlightRef.current) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    inFlightRef.current = true;
    try {
      const barcodes = await detector.detect(video);
      const rawValue = barcodes[0]?.rawValue ?? "";
      if (rawValue && rawValue !== lastRawRef.current) {
        lastRawRef.current = rawValue;
        const orderCode = decodeOrderCode(rawValue);
        if (orderCode) {
          handleDetected(orderCode, rawValue);
          return;
        }
      }
    } catch (err) {
      onError?.(err as Error);
    } finally {
      inFlightRef.current = false;
      if (!foundRef.current) {
        rafRef.current = requestAnimationFrame(scanFrame);
      }
    }
  }, [handleDetected, onError]);

  const handleStream = React.useCallback(
    (stream: MediaStream) => {
      if (!videoRef.current) {
        videoRef.current = document.createElement("video");
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
      }
      const video = videoRef.current;
      video.srcObject = stream;
      video.play().catch(() => {});
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(scanFrame);
      }
    },
    [scanFrame]
  );

  React.useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  return <QrScanner aimSize={aimSize} onStream={handleStream} onError={onError} />;
}
