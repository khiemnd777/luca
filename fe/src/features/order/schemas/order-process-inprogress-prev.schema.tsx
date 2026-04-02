import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerForm } from "@core/form/form-registry";
import { Box, Stack, Typography } from "@mui/material";
import { formatDateTime } from "@root/shared/utils/datetime.utils";
import { getContrastText } from "@root/shared/utils/color.utils";

export function buildOrderProcessInProgressPrevSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "processName",
      label: "Công đoạn",
      kind: "custom",
      render: ({ value, values, field }) => {
        const sectionName = values.sectionName?.trim();
        const processName = value?.trim();
        const text =
          sectionName && processName
            ? `${sectionName} > ${processName}`
            : sectionName || processName || "";
        const bgColor = values.color ?? undefined;
        const content = text || "—";

        return (
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              {field.label}
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                backgroundColor: bgColor ?? "transparent",
                color: getContrastText(bgColor),
              }}
            >
              <Typography variant="body2">{content}</Typography>
            </Box>
          </Stack>
        );
      },
    },
    {
      name: "assignedName",
      label: "Kỹ thuật viên",
      kind: "text",
      asText: true,
    },
    {
      name: "startedAt",
      label: "Bắt đầu lúc",
      kind: "custom",
      render: ({ value, field }) => {
        const content = formatDateTime(value) || "—";
        return (
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              {field.label}
            </Typography>
            <Typography>{content}</Typography>
          </Stack>
        );
      },
    },
    {
      name: "completedAt",
      label: "Hoàn thành lúc",
      kind: "custom",
      render: ({ value, field }) => {
        const content = formatDateTime(value) || "—";
        return (
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              {field.label}
            </Typography>
            <Typography>{content}</Typography>
          </Stack>
        );
      },
    },
    {
      name: "checkInNote",
      label: "Ghi chú nhận ca",
      kind: "textarea",
      asText: true,
    },
    {
      name: "checkOutNote",
      label: "Ghi chú giao ca",
      kind: "textarea",
      asText: true,
    },
  ];

  return {
    idField: "id",
    fields,
    modeResolver: () => "update",
    submit: {
      create: null,
      update: null,
    },
    async initialResolver(data: any) {
      return data ?? {};
    },
  };
}

registerForm("order-process-inprogress-prev", buildOrderProcessInProgressPrevSchema);
