import * as React from "react";
import { Stack } from "@mui/material";
import { SafeButton } from "@root/shared/components/button/safe-button";
import type { AutoFormRef } from "@core/form/form.types";
import { resolveMode } from "@core/form/form-dialog-mode.helper";

/* Usage:
  import { AutoFormButtons } from "@core/form/auto-form-buttons";
  import type { AutoFormRef } from "@core/form/form.types";
  
  const formRef = React.useRef<AutoFormRef>(null);
  return (
    <>
      <AutoForm ref={formRef} name="order-edit" initial={init}/>
      <AutoFormButtons formRef={formRef} />
    </>
  );
*/

type Props = {
  formRef: React.RefObject<AutoFormRef | null>;
  spacing?: number;
  justify?: "flex-start" | "center" | "flex-end";
  fallback?: React.ReactNode;
};

export function AutoFormButtons({
  formRef,
  spacing = 1,
  justify = "flex-end",
  fallback,
}: Props) {
  const [, forceRender] = React.useReducer(x => x + 1, 0);

  React.useEffect(() => {
    const t = setInterval(() => {
      forceRender();
    }, 150);
    return () => clearInterval(t);
  }, []);

  const form = formRef.current;
  if (!form) return null;

  const mode = resolveMode(form.schema!, form.values);
  const buttons = form.getSubmitButtons?.() ?? [];

  if (!buttons || buttons.length === 0) {
    return (
      <>
        {fallback ?? null}
      </>
    );
  }

  return (
    <Stack direction="row" spacing={spacing} justifyContent={justify}>
      {buttons.map((btn) => {
        const visible = btn.visible
          ? btn.visible({
            values: form.values,
            mode,
          })
          : true;

        if (!visible) return null;

        return (
          <SafeButton
            key={btn.name}
            color={btn.color ?? "primary"}
            variant="contained"
            startIcon={btn.icon}
            onClick={() => form.runSubmitButton?.(btn, mode)}
          >
            {btn.label ?? btn.name}
          </SafeButton>
        );
      })}
    </Stack>
  );
}
