// src/core/ui/AutoGrid.tsx
import * as React from "react";
import Grid from "@mui/material/Grid";

type Scheme = "lead" | "equal";

/**
 * AutoGrid: Tự chia cột theo số lượng children.
 * - scheme="lead": 1->[12], 2->[8,4], 3->[6,3,3], 4+->[3,...]
 * - scheme="equal": chia đều (2->[6,6], 3->[4,4,4], 4->[3,3,3,3]…)
 * - xs luôn 12 để mobile xếp dọc; md/lg phân bổ theo scheme.
 */
export type AutoGridProps = {
  children: React.ReactNode;
  spacing?: number;
  columns?: number;       // tổng số cột, mặc định 12
  scheme?: Scheme;        // "lead" hoặc "equal"
  equalAt?: "md" | "lg";  // nếu muốn chỉ equal ở breakpoint lớn
  sx?: any;
  mb?: number | string,
  alignItems?: React.ComponentProps<typeof Grid>["alignItems"];
};

export function AutoGrid({
  children,
  spacing = 2,
  columns = 12,
  scheme = "lead",
  equalAt,
  sx,
  mb = 2,
  alignItems = "stretch",
}: AutoGridProps) {
  // Lọc bỏ null/undefined/boolean
  const items = React.Children.toArray(children).filter(Boolean);
  const n = items.length;

  const toMdSizes = (): number[] => {
    if (scheme === "equal") {
      // chia đều, làm tròn xuống, phần dư cộng dồn từ đầu
      const base = Math.floor(columns / n);
      let remain = columns - base * n;
      return Array.from({ length: n }, () => base).map((v, i) =>
        i < remain ? v + 1 : v
      );
    }
    // scheme "lead"
    if (n <= 1) return [12];
    if (n === 2) return [8, 4];
    if (n === 3) return [6, 3, 3];
    // 4+ : 3-3-3-3 (các phần tử dư sẽ nhận 3)
    return Array.from({ length: n }, () => 3);
  };

  const md = toMdSizes();

  // Nếu columns != 12, scale lại cho khớp
  const normalize = (arr: number[]) => {
    const sum = arr.reduce((a, b) => a + b, 0) || 1;
    return arr.map((v) => Math.max(1, Math.round((v / sum) * columns)));
  };
  const mdNorm = normalize(md);

  return (
    <Grid container columns={columns} spacing={spacing} sx={{ mb, ...sx, }} alignItems={alignItems}>
      {items.map((child, i) => {
        // xs=12; md theo scheme; nếu equalAt="lg" thì md giữ lead, lg chuyển equal
        const lgEqual =
          equalAt === "lg" && scheme !== "equal"
            ? normalize(Array.from({ length: n }, () => 1)) // equal trên lg
            : undefined;

        return (
          <Grid
            key={i}
            size={{
              xs: 12,
              md: mdNorm[i] ?? 12,
              ...(lgEqual && { lg: lgEqual[i] ?? mdNorm[i] }),
            }}
          >
            {child}
          </Grid>
        );
      })}
    </Grid>
  );
}
