
import { Box, Tooltip, Typography } from "@mui/material";
import { SafeButton } from "@root/shared/components/button/safe-button";
import { useCallback, useRef } from "react";
import QRCode from "react-qrcode-logo";
import QrCodeIcon from '@mui/icons-material/QrCode';

export type QRFieldProps = {
  value?: string | number | null;
  size?: number;
  tooltipSize?: number;
  level?: "L" | "M" | "Q" | "H";
  fgColor?: string;
  bgColor?: string;
  logoImage?: string;
  qrStyle?: 'squares' | 'dots' | 'fluid';
  emptyLabel?: string;
};

export function QRField({
  value,
  size = 64,
  tooltipSize = 200,
  level = "M",
  fgColor,
  bgColor,
  logoImage,
  qrStyle,
  emptyLabel = "—",
}: QRFieldProps) {
  if (value === null || value === undefined || value === "") {
    return <Typography>{emptyLabel}</Typography>;
  }

  const textValue = String(value);

  logoImage ?? (logoImage = "/noah.jpeg");
  qrStyle ?? (qrStyle = "fluid");
  const qrRef = useRef<QRCode>(null);
  const handleDownload = useCallback(() => {
    if (!qrRef.current) return;
    const safeName = textValue.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 64) || "qr-code";
    qrRef.current.download("png", `qr-${safeName}`);
  }, [textValue]);

  const small = (
    <Box sx={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
      <Box
        sx={{
          p: 0.5,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          display: "inline-flex",
          bgcolor: bgColor ?? "background.paper",
        }}
      >
        <QRCode
          ref={qrRef}
          value={textValue}
          size={size}
          ecLevel={level}
          fgColor={fgColor}
          bgColor={bgColor}
          logoImage={logoImage}
          qrStyle={qrStyle}
          eyeRadius={{ inner: 30, outer: 30 }}
        />
      </Box>
      <SafeButton
        size="small"
        variant="outlined"
        startIcon={<QrCodeIcon />}
        onClick={handleDownload}>
        Tải về
      </SafeButton>
    </Box>
  );

  return (
    <Tooltip
      title={
        <Box sx={{ p: 1, bgcolor: "background.paper", borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
          <QRCode
            value={textValue}
            size={tooltipSize}
            ecLevel={level}
            fgColor={fgColor}
            bgColor={bgColor}
            logoImage={logoImage}
            qrStyle={qrStyle}
            eyeRadius={{ inner: 30, outer: 30 }}
          />
        </Box>
      }
      arrow
      placement="top"
    >
      {small}
    </Tooltip>
  );
}
