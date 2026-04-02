import type * as React from "react";

export type AuditLog = {
  id: number | string;
  created_at: string;
  user_id?: number | string;
  module: string;
  action: string;
  target_id?: number | string;
  data?: Record<string, unknown>;
};

export type AuditRenderer = {
  match: { module: string; action: string };
  moduleLabel?: string;
  actionLabel?: (action: string, row: AuditLog) => string;
  summary?: (row: AuditLog) => React.ReactNode;
  fields?: { key: string; label?: string; hidden?: boolean; priority?: number }[];
  renderDetail?: (row: AuditLog) => React.ReactNode;
};
