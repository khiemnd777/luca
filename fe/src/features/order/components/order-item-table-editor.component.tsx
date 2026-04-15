import * as React from "react";
import AddCircleOutlineRounded from "@mui/icons-material/AddCircleOutlineRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { AutoForm } from "@core/form/auto-form";
import type { AutoFormRef } from "@core/form/form.types";
import type { FormContext } from "@core/form/types";
import {
  alpha,
  Box,
  Button,
  Dialog,
  lighten,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import { SafeButton } from "@root/shared/components/button/safe-button";
import { ConfirmDialog } from "@shared/components/dialog/confirm-dialog";

type RowColumn<T> = {
  key: string;
  header: string;
  width?: number | string;
  align?: "left" | "right" | "center";
  render: (item: T) => React.ReactNode;
};

export type OrderItemTableEditorProps<T> = {
  value?: T[] | null;
  name?: string;
  ctx?: FormContext | null;
  values?: Record<string, any>;
  onChange?: (items: T[]) => void;
  onAdd?: (item: T, items: T[], ctx?: FormContext | null) => void;
  onRemove?: (item: T, items: T[], ctx?: FormContext | null) => void;
  createItem: (values: Record<string, any>) => T;
  formName: string;
  addLabel: string;
  emptyLabel: string;
  dialogTitle: string;
  columns: RowColumn<T>[];
  buildItem: (draft: T, values: Record<string, any>) => T;
  canEditItem?: (item: T) => boolean;
  canRemoveItem?: (item: T) => boolean;
  getDeleteMessage?: (item: T) => React.ReactNode;
  footerCells?: Partial<Record<string, React.ReactNode>>;
};

export function OrderItemTableEditor<T extends { id?: number | string }>({
  value,
  name,
  ctx,
  values,
  onChange,
  onAdd,
  onRemove,
  createItem,
  formName,
  addLabel,
  emptyLabel,
  dialogTitle,
  columns,
  buildItem,
  canEditItem,
  canRemoveItem,
  getDeleteMessage,
  footerCells,
}: OrderItemTableEditorProps<T>) {
  const theme = useTheme();
  const resolvedValues = values ?? ctx?.values ?? {};
  const ctxRef = React.useRef<FormContext | null>(ctx ?? null);
  const formRef = React.useRef<AutoFormRef | null>(null);
  const dialogSequenceRef = React.useRef(0);
  const isDarkMode = theme.palette.mode === "dark";
  const headerBackground = isDarkMode
    ? "#0f2a43"
    : lighten(theme.palette.primary.light, 0.82);
  const headerTextColor = isDarkMode
    ? "#dceefb"
    : theme.palette.text.primary;
  const headerBorderColor = isDarkMode
    ? alpha(theme.palette.common.white, 0.12)
    : alpha(theme.palette.primary.main, 0.12);

  const [items, setItems] = React.useState<T[]>(() => {
    if (Array.isArray(value)) return value;
    if (name && ctx && Array.isArray((ctx.values as any)?.[name])) {
      return (ctx.values as any)[name];
    }
    return [];
  });
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    mode: "create" | "edit";
    index: number | null;
    item: T | null;
    key: string;
  }>({
    open: false,
    mode: "create",
    index: null,
    item: null,
    key: "closed",
  });
  const [removeState, setRemoveState] = React.useState<{
    item: T;
    index: number;
  } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    ctxRef.current = ctx ?? null;
  }, [ctx]);

  React.useEffect(() => {
    if (Array.isArray(value)) {
      setItems(value);
      return;
    }
    if (name && ctx && Array.isArray((ctx.values as any)?.[name])) {
      setItems((ctx.values as any)[name]);
    }
  }, [value, name, ctx, ctx?.values]);

  const propagate = React.useCallback(
    (next: T[]) => {
      setItems(next);
      if (onChange) {
        onChange(next);
      } else if (name && ctxRef.current) {
        ctxRef.current.setValue(name, next);
      }
    },
    [onChange, name]
  );

  const openCreateDialog = React.useCallback(() => {
    dialogSequenceRef.current += 1;
    setDialogState({
      open: true,
      mode: "create",
      index: null,
      item: createItem(resolvedValues),
      key: `create-${dialogSequenceRef.current}`,
    });
  }, [createItem, resolvedValues]);

  const openEditDialog = React.useCallback((item: T, index: number) => {
    dialogSequenceRef.current += 1;
    setDialogState({
      open: true,
      mode: "edit",
      index,
      item,
      key: `edit-${index}-${dialogSequenceRef.current}`,
    });
  }, []);

  const closeDialog = React.useCallback(() => {
    setDialogState({
      open: false,
      mode: "create",
      index: null,
      item: null,
      key: "closed",
    });
    setSubmitting(false);
  }, []);

  const handleSave = React.useCallback(async () => {
    if (!formRef.current || !dialogState.item) return;

    setSubmitting(true);
    try {
      const ok = await formRef.current.submit();
      if (!ok) return;

      const nextItem = buildItem(dialogState.item, formRef.current.values);
      const nextItems =
        dialogState.mode === "edit" && dialogState.index != null
          ? items.map((item, index) => (index === dialogState.index ? nextItem : item))
          : [...items, nextItem];

      propagate(nextItems);

      if (dialogState.mode === "create") {
        onAdd?.(nextItem, nextItems, ctxRef.current);
      }

      closeDialog();
    } finally {
      setSubmitting(false);
    }
  }, [buildItem, closeDialog, dialogState, items, onAdd, propagate]);

  const handleConfirmRemove = React.useCallback(() => {
    if (!removeState) return;
    const nextItems = items.filter((_, index) => index !== removeState.index);
    propagate(nextItems);
    onRemove?.(removeState.item, nextItems, ctxRef.current);
    setRemoveState(null);
  }, [items, onRemove, propagate, removeState]);

  return (
    <>
      <Stack spacing={1.5}>
        <TableContainer
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          <Table size="small" sx={{ tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    align={column.align}
                    sx={{
                      fontWeight: 600,
                      width: column.width,
                      backgroundColor: headerBackground,
                      color: headerTextColor,
                      borderBottomColor: headerBorderColor,
                    }}
                  >
                    {column.header}
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 600,
                    width: 120,
                    backgroundColor: headerBackground,
                    color: headerTextColor,
                    borderBottomColor: headerBorderColor,
                  }}
                >
                  Thao tác
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1}>
                    <Box sx={(theme) => ({
                      border: `1px dashed ${theme.palette.divider}`,
                      borderRadius: 1,
                      p: 2,
                    })}>
                      <Typography variant="body2" color="text.secondary">
                        {emptyLabel}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => {
                  const editable = canEditItem ? canEditItem(item) : true;
                  const removable = canRemoveItem ? canRemoveItem(item) : true;

                  return (
                    <TableRow key={item.id ?? index} hover>
                      {columns.map((column) => (
                        <TableCell
                          key={column.key}
                          align={column.align}
                          sx={{ verticalAlign: "top" }}
                        >
                          {column.render(item)}
                        </TableCell>
                      ))}
                      <TableCell align="center" sx={{ verticalAlign: "top" }}>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          {editable && (
                            <IconButton
                              size="small"
                              onClick={() => openEditDialog(item, index)}
                              aria-label="Edit"
                              title="Edit"
                            >
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          )}
                          {removable && (
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => setRemoveState({ item, index })}
                              aria-label="Remove"
                              title="Remove"
                            >
                              <DeleteOutlineRounded fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {footerCells && Object.keys(footerCells).length > 0 && (
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      align={column.align}
                      sx={{ fontWeight: 600, verticalAlign: "top" }}
                    >
                      {footerCells[column.key] ?? null}
                    </TableCell>
                  ))}
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddCircleOutlineRounded />}
            onClick={openCreateDialog}
          >
            {addLabel}
          </Button>
        </Box>
      </Stack>

      <Dialog
        open={dialogState.open}
        onClose={submitting ? undefined : closeDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogState.mode === "create" ? `Thêm ${dialogTitle}` : `Sửa ${dialogTitle}`}
        </DialogTitle>
        <DialogContent dividers>
          {dialogState.item && (
            <AutoForm
              key={dialogState.key}
              ref={formRef}
              name={formName}
              initial={dialogState.item as Record<string, any>}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={submitting}>
            Hủy
          </Button>
          <SafeButton variant="contained" onClick={handleSave} disabled={submitting}>
            Lưu
          </SafeButton>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removeState)}
        title="Xóa?"
        content={
          removeState
            ? (getDeleteMessage?.(removeState.item) ?? "Bạn có chắc muốn xóa?")
            : "Bạn có chắc muốn xóa?"
        }
        confirmText="Xóa"
        cancelText="Hủy"
        onClose={() => setRemoveState(null)}
        onConfirm={handleConfirmRemove}
      />
    </>
  );
}
