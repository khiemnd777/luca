import * as React from "react";
import { AutoForm } from "@core/form/auto-form";
import type { AutoFormRef, FormMode, FormSchema } from "@core/form/form.types";
import { subscribe, closeFormDialog, type Payload } from "@core/form/form-dialog.service";
import { getFormDialogBuilder, getFormDialogDefaults } from "@core/form/form-dialog.registry";
import { getFormSchema } from "@core/form/form-registry";
import { FormDialog } from "@root/core/form/form-dialog";
import { pickModeText, resolveMode, resolveTitle } from "@core/form/form-dialog-mode.helper";
import { Stack } from "@mui/material";
import { SafeButton } from "@root/shared/components/button/safe-button";

// ---------- Host nhiều dialog ----------
export function FormDialogHost() {
  const [list, setList] = React.useState<Payload[]>([]);

  React.useEffect(() => {
    // lắng nghe danh sách dialogs từ service (multi)
    const unsub = subscribe((dialogs) => setList(dialogs));
    return unsub;
  }, []);

  if (list.length === 0) return null;

  // Render tất cả dialogs (theo thứ tự push). Dialog cuối cùng sẽ nằm trên cùng (z-index do MUI quản lý).
  return (
    <>
      {list.map((p) => (
        <DialogInstance key={p.id} payload={p} />
      ))}
    </>
  );
}

// ---------- Một instance dialog độc lập ----------
function DialogInstance({ payload }: { payload: Payload }) {
  // ---- states/refs cho từng dialog ----
  const [open, setOpen] = React.useState(true); // được mở khi instance mount
  const [submitting, setSubmitting] = React.useState(false);
  const [resolvedInitial, setResolvedInitial] = React.useState<Record<string, any> | null>(null);
  const [resolvingInitial, setResolvingInitial] = React.useState(false);
  const [autoReady, setAutoReady] = React.useState(false);
  const autoRef = React.useRef<AutoFormRef | null>(null);
  const submitButtons = autoRef.current?.getSubmitButtons?.() ?? [];

  // ---- resolve initial (theo name + options.initial) ----
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const schema = getSchema(payload.name);
      if (!schema) return;
      setResolvingInitial(true);
      try {
        const base = payload.options?.initial; // đọc 1 lần
        // const resolved = schema?.initialResolver
        //   ? await Promise.resolve(schema.initialResolver(base))
        //   : base;

        // const finalInitial =
        //   base && resolved && typeof base === "object" && typeof resolved === "object"
        //     ? { ...base, ...resolved }
        //     : (resolved ?? base ?? {});

        // if (!cancelled) setResolvedInitial(finalInitial);
        if (!cancelled) setResolvedInitial(base ?? {});
      } finally {
        if (!cancelled) setResolvingInitial(false);
      }
    })();
    return () => { cancelled = true; };
    // chỉ id + name để cố định vòng đời per-dialog
  }, [payload.id, payload.name]);

  React.useEffect(() => {
    console.log("[DialogInstance] mount:", payload.id);
    return () => console.log("[DialogInstance] unmount:", payload.id);
  }, [payload.id]);


  // ---- schema/defaults/derived ----
  const name = payload.name;
  const defaults = name ? getDefaults(name) : {};
  const schema = name ? getSchema(name) : null;

  const mode: FormMode = schema && resolvedInitial ? resolveMode(schema as FormSchema, resolvedInitial) : "create";
  const modeCtx = { mode, values: resolvedInitial ?? {}, initial: resolvedInitial };

  const titleNode =
    resolveTitle(
      (payload.options?.title !== undefined ? payload.options.title : defaults.title) as any,
      modeCtx
    ) ?? "Form";

  const confirmText =
    pickModeText(
      (payload.options?.confirmText ?? defaults.confirmText) as any,
      modeCtx
    ) ?? (mode === "create" ? "Create" : "Save");

  const cancelText = payload.options?.cancelText ?? defaults.cancelText ?? "Cancel";
  const maxWidth = payload.options?.maxWidth ?? defaults.maxWidth ?? "md";

  // ---- handlers ----
  const handleClose = () => {
    payload?.reject?.(new Error("cancelled"));
    setOpen(false);
    closeFormDialog(payload.id);
  };

  const handleSubmit = async () => {
    if (!autoRef.current) return;
    setSubmitting(true);
    try {
      const okOrResult = await autoRef.current.submit();
      if (!okOrResult) return;
      // onSaved (nếu có)
      await payload?.options?.onSaved?.(autoRef.current.values);
      // resolve promise của openFormDialog
      payload?.resolve?.(autoRef.current.values);
      setOpen(false);
      closeFormDialog(payload.id);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- render ----
  if (!schema) {
    return (
      <FormDialog
        open={open}
        title={`Schema "${name}" chưa được đăng ký`}
        confirmText="OK"
        cancelText="Close"
        submitting={false}
        onClose={handleClose}
        onSubmit={handleClose}
        maxWidth={maxWidth}
      >
        <div>Vui lòng import file register của schema trước khi mở dialog.</div>
      </FormDialog>
    );
  }

  return (
    <FormDialog
      open={open}
      title={titleNode as any}
      confirmText={confirmText}
      cancelText={cancelText}
      submitting={submitting || resolvingInitial}
      onClose={handleClose}
      onSubmit={handleSubmit}
      maxWidth={maxWidth}
      actions={
        autoReady && submitButtons?.length > 0 ? (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {submitButtons.map((btn) => {
              const mode = resolveMode(schema, resolvedInitial ?? {});
              const shouldShow = btn.visible ? btn.visible({
                values: autoRef.current?.values ?? {},
                mode,
              }) : true;

              if (!shouldShow) return null;

              return (
                <SafeButton
                  key={btn.name}
                  variant="contained"
                  color={btn.color ?? "primary"}
                  onClick={async () => {
                    if (!autoRef.current) return;
                    const mode = resolveMode(schema, resolvedInitial ?? {});
                    const submitFlag = await autoRef.current.runSubmitButton(btn, mode);
                    if (submitFlag) {
                      handleClose();
                    }
                  }}
                >
                  {btn.label ?? btn.name}
                </SafeButton>
              );
            })}
          </Stack>
        ) : undefined
      }
    >
      {resolvingInitial ? (
        <div>Loading…</div>
      ) : (
        <AutoForm
          key={payload.id}
          ref={(ref) => {
            autoRef.current = ref;
            if (ref) setAutoReady(true);
          }}
          schema={schema}
          name={name}
          initial={resolvedInitial ?? undefined}
        />
      )}
    </FormDialog>
  );
}

// ---------- small helpers ----------
function getSchema(name: string) {
  return getFormSchema(name) ?? getFormDialogBuilder(name);
}
function getDefaults(name: string) {
  return getFormDialogDefaults(name) ?? {};
}
