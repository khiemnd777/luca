import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerForm } from "@core/form/form-registry";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { Box, Stack, Typography } from "@mui/material";
import { formatDateTime } from "@root/shared/utils/datetime.utils";
import { getContrastText } from "@root/shared/utils/color.utils";

export function buildOrderProcessInProgressPrevSchema(): FormSchema {
  const hasDentistReview = (values: Record<string, any>) =>
    Boolean(values.requiresDentistReview || values.dentistReviewRequestNote);

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
    {
      name: "requiresDentistReview",
      label: "Yêu cầu nha sĩ kiểm tra",
      kind: "custom",
      showIf: hasDentistReview,
      render: ({ field }) => (
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            {field.label}
          </Typography>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "success.main",
              color: "success.contrastText",
            }}
          >
            <CheckRoundedIcon sx={{ fontSize: 18 }} />
          </Box>
        </Stack>
      ),
    },
    {
      name: "dentistReviewRequestNote",
      label: "Ghi chú cho nha sĩ",
      kind: "textarea",
      asText: true,
      showIf: hasDentistReview,
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
