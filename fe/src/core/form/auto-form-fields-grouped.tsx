import { memo } from "react";
import { Box, Stack, Typography } from "@mui/material";

import type { FieldDef, FormContext } from "@core/form/types";
import type { GroupConfig } from "./form.types";
import { AutoFormFieldSingle } from "./auto-form-field-single";
import { Spacer } from "@root/shared/components/ui/spacer";

function AutoFormFieldsGroupedComponent({
  groupsConfig,
  groupMap,
  values,
  setValue,
  errors,
  gap = 2,
  ctx,
}: {
  groupsConfig: GroupConfig[];
  groupMap: Map<string, FieldDef[]>;
  values: Record<string, any>;
  setValue: (name: string, v: any) => void;
  errors?: Record<string, string | null>;
  gap?: number;
  ctx?: FormContext;
}) {
  return (
    <Stack spacing={gap}>
      {groupsConfig.map((g) => {
        const fields = groupMap.get(g.name) ?? [];
        if (fields.length === 0) return null;

        const col = g.col ?? 1;
        const label = g.label ?? "";

        return (
          <Box
          key={g.name}
          sx={{
            border: label && "1px solid",
            borderColor: label && "divider",
            borderRadius: label && 2,
            p: label && gap,
          }}
          >
            {/* Group Title */}
            {label && (
              <Box
                sx={{
                  backgroundColor: "action.hover",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  px: gap,
                  py: gap / 2,
                  mx: -gap,
                  mt: -gap,
                  borderTopLeftRadius: (theme) => theme.shape.borderRadius,
                  borderTopRightRadius: (theme) => theme.shape.borderRadius,
                }}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  {label}
                </Typography>
              </Box>
            )}
            <Stack spacing={gap}>
              {label && <Spacer />}
              {/* Grid Layout using Box SX */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${col}, 1fr)`,
                  gap: (theme) => theme.spacing(gap),
                }}
              >
                {fields.map((f) => {
                  if (typeof f.showIf === "function") {
                    const visible = f.showIf(values, ctx);
                    if (!visible) return null;
                  }
                  return (
                    <Box key={f.name}>
                      <AutoFormFieldSingle
                        field={f}
                        values={values}
                        setValue={setValue}
                        error={errors?.[f.name] ?? null}
                        ctx={ctx}
                      />
                    </Box>
                  );
                })}
              </Box>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

export const AutoFormFieldsGrouped = memo(
  AutoFormFieldsGroupedComponent,
  (prev, next) =>
    prev.groupsConfig === next.groupsConfig &&
    prev.groupMap === next.groupMap &&
    prev.values === next.values &&
    prev.setValue === next.setValue &&
    prev.errors === next.errors &&
    prev.gap === next.gap &&
    prev.ctx === next.ctx,
);
