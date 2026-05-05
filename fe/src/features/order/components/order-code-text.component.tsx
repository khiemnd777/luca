import * as React from "react";
import { Box } from "@mui/material";
import { CopyableText } from "@shared/components/ui/copyable-text";

type OrderCodeTextProps = {
  code?: string | number | null;
  fallback?: React.ReactNode;
};

type OrderCodeTitleProps = {
  prefix?: React.ReactNode;
  code?: string | null;
  originalCode?: string | null;
  fallback?: React.ReactNode;
};

function normalizeCode(code?: string | number | null) {
  if (code == null) return "";
  return String(code).trim();
}

export function OrderCodeText({ code, fallback = "—" }: OrderCodeTextProps) {
  const value = normalizeCode(code);
  if (!value) return <>{fallback}</>;
  return <CopyableText value={value}>{value}</CopyableText>;
}

export function OrderCodeTitle({
  prefix,
  code,
  originalCode,
  fallback = "Đơn hàng",
}: OrderCodeTitleProps) {
  const displayCode = normalizeCode(code);
  const displayOriginalCode = normalizeCode(originalCode);
  const showOriginal = Boolean(displayCode && displayOriginalCode && displayCode !== displayOriginalCode);

  if (!displayCode) return <>{fallback}</>;

  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.5, flexWrap: "wrap" }}>
      {prefix ? <Box component="span">{prefix}</Box> : null}
      <Box component="span">Mã:</Box>
      <OrderCodeText code={displayCode} />
      {showOriginal ? (
        <>
          <Box component="span">- Mã gốc:</Box>
          <OrderCodeText code={displayOriginalCode} />
        </>
      ) : null}
    </Box>
  );
}
