import * as React from "react";
import { Chip, Stack, Typography } from "@mui/material";
import type { AuditLog, AuditRenderer } from "./types";

function looksLikeIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return false;
  return !Number.isNaN(new Date(value).getTime());
}

export function defaultValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return "—";

  if (typeof value === "boolean") {
    return React.createElement(Chip, {
      size: "small",
      color: value ? "success" : "default",
      label: value ? "True" : "False",
    });
  }

  if (typeof value === "string" && looksLikeIsoDate(value)) {
    return new Date(value).toLocaleString();
  }

  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    return React.createElement(
      "pre",
      {
        style: {
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "monospace",
        },
      },
      JSON.stringify(value, null, 2)
    );
  }

  return String(value);
}

export function defaultSummary(row: AuditLog): React.ReactNode {
  if (!row.data || typeof row.data !== "object") return "No additional data";

  const keys = Object.keys(row.data);
  if (keys.length === 0) return "No additional data";

  return React.createElement(
    Stack,
    { direction: "row", spacing: 0.75, useFlexGap: true, flexWrap: "wrap" },
    ...keys
      .slice(0, 3)
      .map((key) =>
        React.createElement(Chip, { key, size: "small", variant: "outlined", label: key })
      ),
    keys.length > 3
      ? React.createElement(
          Typography,
          { variant: "caption", key: "__extra__" },
          `+${keys.length - 3} more`
        )
      : null
  );
}

function moduleMatch(pattern: string, moduleName: string): boolean {
  return pattern === "*" || pattern === moduleName;
}

function actionMatch(pattern: string, action: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return action.startsWith(prefix);
  }
  return pattern === action;
}

function moduleRank(pattern: string, moduleName: string): number {
  if (pattern === moduleName) return 3;
  if (pattern === "*") return 1;
  return 0;
}

function actionRank(pattern: string, action: string): number {
  if (pattern === action) return 3;
  if (pattern.endsWith("*") && action.startsWith(pattern.slice(0, -1))) return 2;
  if (pattern === "*") return 1;
  return 0;
}

const fallbackRenderer: AuditRenderer = {
  match: { module: "*", action: "*" },
  moduleLabel: "Audit Log",
  summary: defaultSummary,
};

export function pickRenderer(renderers: AuditRenderer[], row: AuditLog): AuditRenderer {
  let best: AuditRenderer | null = null;
  let bestScore = -1;

  for (const renderer of renderers) {
    if (!moduleMatch(renderer.match.module, row.module)) continue;
    if (!actionMatch(renderer.match.action, row.action)) continue;

    const score = moduleRank(renderer.match.module, row.module) * 10 +
      actionRank(renderer.match.action, row.action);

    if (score > bestScore) {
      best = renderer;
      bestScore = score;
    }
  }

  return best ?? fallbackRenderer;
}
