import * as React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import AddCircleOutlineRounded from "@mui/icons-material/AddCircleOutlineRounded";
import { ConfirmDialog } from "@shared/components/dialog/confirm-dialog";

export type RenderItemProps<T> = {
  item: T;
  index: number;
  onChange: (patch: Partial<T>) => void;
  onRemove: () => void;
};

export type GenericItemListProps<T> = {
  value: T[];
  createItem: () => T;
  renderItem: (props: RenderItemProps<T>) => React.ReactNode;

  onChange: (items: T[]) => void;
  onAdd?: (item: T, items: T[]) => void;
  onRemove?: (item: T, items: T[]) => void;

  confirmRemove?: (item: T, index: number, items: T[]) => boolean | Promise<boolean>;

  addLabel?: string;
  emptyLabel?: string;
};

export function GenericItemList<T>({
  value,
  createItem,
  renderItem,
  onChange,
  onAdd,
  onRemove,
  confirmRemove,
  addLabel = "Thêm",
  emptyLabel = "Chưa có dữ liệu.",
}: GenericItemListProps<T>) {
  const items = value;

  const [confirmItem, setConfirmItem] =
    React.useState<{ item: T; index: number } | null>(null);
  const confirmResolverRef = React.useRef<((ok: boolean) => void) | null>(null);

  const propagate = React.useCallback(
    (next: T[]) => {
      onChange(next);
    },
    [onChange]
  );

  const handleAdd = React.useCallback(() => {
    const item = createItem();
    const next = [...items, item];
    propagate(next);
    onAdd?.(item, next);
  }, [items, createItem, propagate, onAdd]);

  const defaultConfirmRemove = React.useCallback(
    (_item: T, index: number) =>
      new Promise<boolean>((resolve) => {
        confirmResolverRef.current = resolve;
        setConfirmItem({ item: items[index], index });
      }),
    [items]
  );

  const handleRemove = React.useCallback(
    (index: number) => async () => {
      const item = items[index];
      if (!item) return;

      const confirmer = confirmRemove ?? defaultConfirmRemove;
      const ok = await confirmer(item, index, items);
      if (ok === false) return;

      const next = items.filter((_, i) => i !== index);
      propagate(next);
      onRemove?.(item, next);
    },
    [items, propagate, onRemove, confirmRemove, defaultConfirmRemove]
  );

  const handleUpdate = React.useCallback(
    (index: number, patch: Partial<T>) => {
      const target = items[index];
      if (!target) return;

      const next = items.map((it, i) =>
        i === index ? { ...it, ...patch } : it
      );

      propagate(next);
    },
    [items, propagate]
  );

  return (
    <>
      <Stack spacing={1.5}>
        {items.length === 0 ? (
          <Box sx={(t) => ({ border: `1px dashed ${t.palette.divider}`, p: 2, borderRadius: 1 })}>
            <Typography variant="body2" color="text.secondary">
              {emptyLabel}
            </Typography>
          </Box>
        ) : (
          items.map((item, index) => (
            <React.Fragment key={(item as any)?.id ?? index}>
              {renderItem({
                item,
                index,
                onChange: (patch) => handleUpdate(index, patch),
                onRemove: handleRemove(index),
              })}
            </React.Fragment>
          ))
        )}

        <Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddCircleOutlineRounded />}
            onClick={handleAdd}
          >
            {addLabel}
          </Button>
        </Box>
      </Stack>

      <ConfirmDialog
        open={Boolean(confirmItem)}
        title="Xóa?"
        content="Bạn có chắc muốn xóa?"
        confirmText="Xóa"
        cancelText="Hủy"
        onClose={() => {
          confirmResolverRef.current?.(false);
          confirmResolverRef.current = null;
          setConfirmItem(null);
        }}
        onConfirm={() => {
          confirmResolverRef.current?.(true);
          confirmResolverRef.current = null;
          setConfirmItem(null);
        }}
      />
    </>
  );
}
