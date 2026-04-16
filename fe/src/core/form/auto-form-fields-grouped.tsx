import { memo } from "react";
import { alpha, Box, Divider, Stack, Typography } from "@mui/material";

import type { FieldDef, FormContext } from "@core/form/types";
import type { GroupPlacement } from "./form.types";
import { AutoFormFieldSingle } from "./auto-form-field-single";

function resolveVisibleFields(
  fields: FieldDef[],
  values: Record<string, any>,
  ctx?: FormContext,
) {
  return fields.filter((field) => {
    if (typeof field.showIf !== "function") return true;
    return field.showIf(values, ctx);
  });
}

function renderFieldsGrid({
  fields,
  col,
  gap,
  values,
  setValue,
  errors,
  ctx,
}: {
  fields: FieldDef[];
  col: number;
  gap: number;
  values: Record<string, any>;
  setValue: (name: string, v: any) => void;
  errors?: Record<string, string | null>;
  ctx?: FormContext;
}) {
  if (fields.length === 0) return null;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          md: `repeat(${Math.max(col, 1)}, minmax(0, 1fr))`,
        },
        gap: (theme) => theme.spacing(gap),
      }}
    >
      {fields.map((f) => {
        const span =
          typeof f.col === "number"
            ? Math.max(1, Math.min(f.col, col))
            : null;

        return (
          <Box
            key={f.name}
            sx={
              span
                ? {
                    gridColumn: {
                      xs: "1 / -1",
                      md: `span ${span}`,
                    },
                  }
                : undefined
            }
          >
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
  );
}

function AutoFormFieldsGroupedComponent({
  groups,
  values,
  setValue,
  errors,
  gap = 2,
  ctx,
}: {
  groups: GroupPlacement[];
  values: Record<string, any>;
  setValue: (name: string, v: any) => void;
  errors?: Record<string, string | null>;
  gap?: number;
  ctx?: FormContext;
}) {
  return (
    <Stack spacing={gap * 2.5}>
      {groups.map((group) => {
        const visibleRootFields = resolveVisibleFields(group.rootFields, values, ctx);
        const visibleSections = group.sections
          .map((section) => ({
            ...section,
            fields: resolveVisibleFields(section.fields, values, ctx),
          }))
          .filter((section) => section.fields.length > 0);
        const hasContent = visibleRootFields.length > 0 || visibleSections.length > 0;
        if (!hasContent) return null;

        const col = group.col ?? 1;
        const label = group.label ?? "";
        const renderInsideCard = Boolean(label) || visibleSections.length > 0;

        return (
          <Stack key={group.name} spacing={gap * 0.9}>
            {label && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 0.25,
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{
                    whiteSpace: "nowrap",
                    color: "text.primary",
                    opacity: 0.96,
                    letterSpacing: 0.1,
                  }}
                >
                  {label.replace(/:\s*$/, "")}
                </Typography>
                <Box
                  sx={(theme) => ({
                    flex: 1,
                    height: 1,
                    minWidth: 24,
                    backgroundColor: alpha(
                      theme.palette.mode === "dark" ? theme.palette.common.white : theme.palette.text.primary,
                      theme.palette.mode === "dark" ? 0.12 : 0.12,
                    ),
                  })}
                />
              </Box>
            )}

            <Box
              sx={(theme) => ({
                borderRadius: renderInsideCard ? 4 : undefined,
                backgroundColor: renderInsideCard
                  ? alpha(
                    theme.palette.common.white,
                    theme.palette.mode === "dark" ? 0.04 : 0.12
                  )
                  : "transparent",
                border: renderInsideCard
                  ? `1px solid ${alpha(
                    theme.palette.mode === "dark" ? theme.palette.common.white : theme.palette.text.primary,
                    theme.palette.mode === "dark" ? 0.06 : 0.08,
                  )}`
                  : undefined,
                boxShadow: "none",
                px: renderInsideCard ? gap + 1.25 : 0,
                py: renderInsideCard ? gap + 1.1 : 0,
              })}
            >
              <Stack spacing={gap * 1.15}>
                {renderFieldsGrid({
                  fields: visibleRootFields,
                  col,
                  gap,
                  values,
                  setValue,
                  errors,
                  ctx,
                })}

                {visibleSections.map((section) => {
                  const sectionCol = section.col ?? col;
                  const sectionLabel = section.label?.trim();

                  return (
                    <Stack key={`${group.name}:${section.name}`} spacing={gap * 0.75}>
                      {sectionLabel && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.25,
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            color="text.secondary"
                            sx={{ whiteSpace: "nowrap", opacity: 0.88 }}
                          >
                            {sectionLabel}
                          </Typography>
                          <Divider
                            flexItem
                            sx={(theme) => ({
                              borderColor: alpha(
                                theme.palette.mode === "dark" ? theme.palette.common.white : theme.palette.text.primary,
                                theme.palette.mode === "dark" ? 0.05 : 0.08,
                              ),
                            })}
                          />
                        </Box>
                      )}

                      {renderFieldsGrid({
                        fields: section.fields,
                        col: sectionCol,
                        gap,
                        values,
                        setValue,
                        errors,
                        ctx,
                      })}
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

export const AutoFormFieldsGrouped = memo(
  AutoFormFieldsGroupedComponent,
  (prev, next) =>
    prev.groups === next.groups &&
    prev.values === next.values &&
    prev.setValue === next.setValue &&
    prev.errors === next.errors &&
    prev.gap === next.gap &&
    prev.ctx === next.ctx,
);
