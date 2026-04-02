import type { FieldDef } from "@core/form/types";
import type { FormSchema } from "@core/form/form.types";
import { registerForm } from "@core/form/form-registry";
import { emit } from "@root/core/module/event-bus";
import EventRepeatIcon from '@mui/icons-material/EventRepeat';


export function buildOrderInProgressCheckCodeSchema(): FormSchema {
  const fields: FieldDef[] = [
    {
      name: "code",
      label: "Mã đơn hàng",
      kind: "text",
      rules: {
        required: "Vui lòng nhập mã đơn hàng",
      },
      fullWidth: true,
    },
  ];

  return {
    fields,
    submitButtons: [
      {
        name: "check",
        label: "Check",
        icon: <EventRepeatIcon />,
        submit: (ctx) => {
          emit("order:check-code", ctx.values.dto.code);
        },
        toasts: {
          saved: "",
        }
      }
    ],
  };
}

registerForm("order-inprogress-check-code", buildOrderInProgressCheckCodeSchema);
