import * as React from "react";
import { Box, Tooltip, type SxProps, type Theme } from "@mui/material";

type CopyStatus = "idle" | "copied" | "failed";

type CopyableTextProps = {
  value?: string | number | null;
  children?: React.ReactNode;
  tooltip?: string;
  copiedTooltip?: string;
  failedTooltip?: string;
  stopPropagation?: boolean;
  sx?: SxProps<Theme>;
};

function copyWithFallback(value: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const copied = document.execCommand("copy");
    return copied ? Promise.resolve() : Promise.reject(new Error("Copy command failed"));
  } finally {
    document.body.removeChild(textarea);
  }
}

export function CopyableText({
  value,
  children,
  tooltip = "Click để copy",
  copiedTooltip = "Đã copy vào clipboard",
  failedTooltip = "Không copy được",
  stopPropagation = true,
  sx,
}: CopyableTextProps) {
  const [status, setStatus] = React.useState<CopyStatus>("idle");
  const resetTimerRef = React.useRef<number | null>(null);
  const copyValue = value == null ? "" : String(value).trim();
  const disabled = copyValue.length === 0;

  React.useEffect(() => {
    return () => {
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const resetStatusSoon = React.useCallback(() => {
    if (resetTimerRef.current != null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => setStatus("idle"), 1600);
  }, []);

  const handleCopy = React.useCallback(
    async (event: React.MouseEvent | React.KeyboardEvent) => {
      if (stopPropagation) event.stopPropagation();
      if (disabled) return;

      try {
        await copyWithFallback(copyValue);
        setStatus("copied");
      } catch {
        setStatus("failed");
      } finally {
        resetStatusSoon();
      }
    },
    [copyValue, disabled, resetStatusSoon, stopPropagation]
  );

  const title = status === "copied" ? copiedTooltip : status === "failed" ? failedTooltip : tooltip;

  const content = (
    <Box
      component="span"
      role={disabled ? undefined : "button"}
      tabIndex={disabled ? undefined : 0}
      onClick={handleCopy}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void handleCopy(event);
        }
      }}
      sx={[
        {
          display: "inline-flex",
          alignItems: "center",
          minWidth: 0,
          maxWidth: "100%",
          cursor: disabled ? "inherit" : "pointer",
          borderRadius: 0.5,
          outline: "none",
          "&:hover": disabled ? undefined : {
            color: "primary.main",
            textDecoration: "underline",
            textUnderlineOffset: "2px",
          },
          "&:focus-visible": disabled ? undefined : {
            boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}`,
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children ?? copyValue}
    </Box>
  );

  if (disabled) return content;

  return (
    <Tooltip title={title} arrow>
      {content}
    </Tooltip>
  );
}
