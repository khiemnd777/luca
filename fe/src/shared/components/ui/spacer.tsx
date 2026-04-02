// src/core/ui/Spacer.tsx
import { Box, type SxProps, type Theme } from "@mui/material";

export type SpacerProps = {
  /** Chiều cao (theo theme.spacing hoặc px). Mặc định = 2. */
  height?: number | string;
  /** Chiều rộng (theo theme.spacing hoặc px). */
  width?: number | string;
  /** Nếu truyền direction="horizontal" thì đổi width/height tương ứng. */
  direction?: "vertical" | "horizontal";
  /** Nếu true, sẽ render margin thay vì Box rỗng */
  asMargin?: boolean;
  /** Custom sx (ghi đè style nếu cần) */
  sx?: SxProps<Theme>;
};

/**
 * Spacer: tạo khoảng trống như SizedBox bên Flutter.
 * - Mặc định height=theme.spacing(2)
 * - Có thể truyền width/height thủ công
 * - Hỗ trợ direction="horizontal" hoặc "vertical"
 * - Có thể dùng asMargin để chỉ áp dụng margin-bottom thay vì Box
 */
export function Spacer({
  height,
  width,
  direction = "vertical",
  asMargin = true,
  sx,
}: SpacerProps) {
  // Nếu không truyền gì: mặc định mb:2 (vertical)
  if (!height && !width && direction === "vertical" && asMargin) {
    return <Box sx={{ mb: 2, ...sx }} />;
  }

  // Nếu direction = vertical, ưu tiên height; nếu horizontal thì width
  const finalHeight =
    direction === "vertical"
      ? height ?? 8 // 8px nếu không dùng theme spacing
      : 0;
  const finalWidth =
    direction === "horizontal"
      ? width ?? 8
      : 0;

  if (asMargin) {
    // Render margin thay vì khối rỗng
    return (
      <Box
        sx={{
          ...(direction === "vertical"
            ? { mb: height ?? 2 }
            : { ml: width ?? 2 }),
          ...sx,
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        display: "block",
        height: finalHeight,
        width: finalWidth,
        flexShrink: 0,
        ...sx,
      }}
    />
  );
}
