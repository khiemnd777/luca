import type { FormMode, FormSchema, SubmitButton, SubmitDef } from "./form.types";

/* Example:
  submitButtons: [
    {
      name: "saveAndPrint",
      label: "Lưu & In",
      color: "secondary",

      submit: async ({ values }) => {
        const saved = await api.order.save(values);
        await api.order.print(saved.id);
        return saved;
      },

      toasts: {
        saved: "Đã lưu & in xong!"
      }
    }
  ]
*/
export function resolveSubmitButtons(schema: FormSchema, mode: FormMode): SubmitButton[] {
  // PRIORITY 1: submitButtons override hoàn toàn
  if (schema.submitButtons && schema.submitButtons.length > 0 && !schema.mergeSubmitButtons) {
    return schema.submitButtons;
  }

  // PRIORITY 2: merge mode
  if (schema.mergeSubmitButtons) {
    const main = convertSubmitToButton(schema.submit, mode);
    return [main, ...(schema.submitButtons ?? [])];
  }

  // PRIORITY 3: fallback legacy submit
  return [convertSubmitToButton(schema.submit, mode)];
}

function convertSubmitToButton(
  submit: FormSchema["submit"],
  mode: FormMode
): SubmitButton {
  const submitDef =
    submit && "create" in submit
      ? (mode === "create" ? submit.create : submit.update)
      : (submit as SubmitDef);

  return {
    name: "submit",
    label: "Lưu",
    color: "primary",
    submit: async ({ values, meta }) => {
      if (submitDef?.type === "fn") {
        return submitDef.run(values, meta);
      }
      if (submitDef?.type === "http") {
        const body = submitDef.transform ? submitDef.transform(values) : values;
        const fetcher = submitDef.fetcher ?? fetch;
        const res = await fetcher(submitDef.url, {
          method: submitDef.method ?? "POST",
          headers: {
            "Content-Type": "application/json",
            ...(submitDef.headers ?? {})
          },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        return submitDef.parseResponse ? submitDef.parseResponse(data) : data;
      }
    }
  };
}
