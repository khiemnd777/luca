import * as React from "react";

export type Direction = "row" | "column";

export interface SkeletonProps {
  prefix: string;
  header?: React.ReactNode;
  body?: React.ReactNode[];
  footer?: React.ReactNode;
  gap?: number;                 // spacing giữa các vùng
  maxWidth?: "sm" | "md" | "lg" | "xl" | false;
}

export type SkeletonScopeValue = {
  loading: boolean;
  error?: string;
  onRetry?: () => void;
  dense?: boolean;          // giảm spacing khi true
  animate?: boolean;        // bật tắt animation của MUI Skeleton
};

export interface OneColumnProps {
  name?: string;
  direction?: Direction;
  justifyContent?: React.CSSProperties["justifyContent"];
  alignItems?: React.CSSProperties["alignItems"];
  gap?: number;
  grid?: boolean;           // bật Grid 12 cột thay vì Stack
  expandChildren?: boolean; // children tự co giãn
  children?: React.ReactNode;
}

export interface TwoColumnsProps {
  name?: string; // ví dụ: `${prefix}:header` → tạo 2 slot left/right
  left?: React.ReactNode;
  right?: React.ReactNode;
  gap?: number;
  leftWidth?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  rightWidth?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  children?: never;
}
