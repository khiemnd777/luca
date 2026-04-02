import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import type { AutoFormRef } from "@core/form/form.types";
import { AutoForm } from "@core/form/auto-form";
import type { FormContext } from "@root/core/form/types";

export type ListItemRenderProps<T> = {
  item: T;
  index: number;
  onChange: (patch: Partial<T>) => void;
  onRemove: () => void;

  normalize: (item: T) => Record<string, any>;
  extractPatch: (vals: Record<string, any>) => Partial<T>;
  buildSignature: (vals: Record<string, any>) => string;

  onBlurCommit?: () => void;
  formName: string;
  labelName: string;
  listKey: string;
  ctx?: FormContext | null;

  isEditable?: boolean;
  isRemovable?: boolean;
  renderActions?: (item: T, index: number) => React.ReactNode;
  allowEditToggle?: boolean;
  onEditToggle?: (editing: boolean) => void;
};

export function ListItemRender<T>({
  item,
  index,
  onChange,
  onRemove,
  normalize,
  extractPatch,
  buildSignature,
  onBlurCommit,
  formName,
  labelName,
  listKey,
  ctx,
  isEditable,
  isRemovable,
  renderActions,
  allowEditToggle,
  onEditToggle,
}: ListItemRenderProps<T>) {
  const formRef = React.useRef<AutoFormRef | null>(null);
  const lastItemIdRef = React.useRef<any>(null);
  const mountInitialRef = React.useRef<Record<string, any>>({});

  if (lastItemIdRef.current !== (item as any)?.id) {
    lastItemIdRef.current = (item as any)?.id;
    mountInitialRef.current = { ...(item as any) };
  }

  const latestItemRef = React.useRef(item);
  const lastCommitSigRef = React.useRef<string>("");

  React.useEffect(() => {
    const prev = normalize(latestItemRef.current);
    const next = normalize(item);

    if (JSON.stringify(prev) === JSON.stringify(next)) return;

    latestItemRef.current = item;
    lastCommitSigRef.current = buildSignature(item as any);

    const frm = formRef.current;
    if (!frm) return;

    const prevVals = frm.values ?? {};
    frm.setAllValues({
      ...prevVals,
      ...(item as any),
    });
  }, [item, normalize, buildSignature]);

  React.useEffect(() => {
    if (!ctx) return;

    const handler = (payload: any) => {
      const meta = payload?.__meta;
      const patch = payload?.patch;

      if (!meta || !patch) return;

      if (meta.listKey !== listKey) return;

      if (meta.itemId !== (item as any)?.id) return;

      onChange(patch);
    };

    ctx.on("item:patch", handler);

    return () => {
      ctx.off("item:patch", handler);
    };
  }, [ctx, listKey, item, onChange]);


  const canEdit = isEditable ?? true;
  const canRemove = isRemovable ?? true;
  const [isEditing, setIsEditing] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!canEdit) {
      setIsEditing(false);
      return;
    }
    if (!allowEditToggle) {
      setIsEditing(true);
    }
  }, [allowEditToggle, canEdit]);

  const handleToggleEdit = React.useCallback(() => {
    if (!allowEditToggle || !canEdit) return;
    setIsEditing((prev) => {
      const next = !prev;
      onEditToggle?.(next);
      return next;
    });
  }, [allowEditToggle, canEdit, onEditToggle]);

  const handleBlur = React.useCallback(() => {
    const frm = formRef.current;
    if (!frm) return;

    const vals = frm.values ?? {};
    const sig = buildSignature(vals);

    if (sig === lastCommitSigRef.current) return;

    lastCommitSigRef.current = sig;

    onChange(extractPatch(vals));
    onBlurCommit?.();
  }, [extractPatch, buildSignature, onChange, onBlurCommit]);

  const isReadOnly = !canEdit || (allowEditToggle && !isEditing);

  return (
    <Card variant="outlined" sx={{ mb: 1 }} onBlurCapture={handleBlur}>
      <CardHeader
        title={
          <Typography variant="subtitle2" fontWeight={600}>
            {labelName} #{index + 1}
          </Typography>
        }
        action={
          renderActions ? (
            renderActions(item, index)
          ) : (
            <Stack direction="row" spacing={0.5} alignItems="center">
              {allowEditToggle && canEdit && (
                <IconButton
                  size="small"
                  onClick={handleToggleEdit}
                  aria-label={isEditing ? "View" : "Edit"}
                  title={isEditing ? "View" : "Edit"}
                >
                  {isEditing ? (
                    <VisibilityRoundedIcon fontSize="small" />
                  ) : (
                    <EditRoundedIcon fontSize="small" />
                  )}
                </IconButton>
              )}
              {canRemove && (
                <IconButton color="error" size="small" onClick={onRemove} aria-label="Remove" title="Remove">
                  <DeleteOutlineRounded fontSize="small" />
                </IconButton>
              )}
            </Stack>
          )
        }
      />
      <CardContent sx={{ pt: 0, pointerEvents: isReadOnly ? "none" : "auto", opacity: isReadOnly ? 0.8 : 1 }}>
        <AutoForm
          ref={formRef}
          name={formName}
          initial={mountInitialRef.current}
        />
      </CardContent>
    </Card>
  );
}
