import * as React from "react";
import { Box, Stack, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import type { OrderItemProductModel } from "@features/order/model/order-item-product.model";
import type { OrderItemMaterialModel } from "@features/order/model/order-item-material.model";
import { SectionCard } from "@root/shared/components/ui/section-card";
import { prefixCurrency } from "@root/shared/utils/currency.utils";
import { OrderCodeText } from "@features/order/components/order-code-text.component";

type OrderProductsAndMaterialsProps = {
  products?: OrderItemProductModel[] | null;
  materials?: OrderItemMaterialModel[] | null;
  emptyLabel?: string;
};

type GroupedOrder = {
  orderItemId: number | null;
  orderItemCode: string | null;
  products: OrderItemProductModel[];
  loanerMaterials: OrderItemMaterialModel[];
  consumableMaterials: OrderItemMaterialModel[];
};

function normalizeType(type?: string | null) {
  return (type ?? "").trim().toLowerCase();
}

function getProductLabel(item: OrderItemProductModel) {
  const code = item.productCode?.trim();
  const name = item.productName?.trim();
  if (code && name) return `${code} → ${name}`;
  if (code) return code;
  if (name) return name;
  return `Sản phẩm #${item.productId ?? item.id}`;
}

function getMaterialLabel(item: OrderItemMaterialModel) {
  const code = item.materialCode?.trim();
  const name = item.materialName?.trim();
  if (code && name) return `${code} → ${name}`;
  if (code) return code;
  if (name) return name;
  return item.materialId != null ? `Vật tư #${item.materialId}` : `Vật tư #${item.id}`;
}

const numberFormatter = new Intl.NumberFormat("vi-VN");

function toNumber(value?: number | null) {
  return value == null ? 0 : Number(value) || 0;
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export default function OrderProductsAndMaterials({
  products,
  materials,
  emptyLabel = "Không có sản phẩm hoặc vật tư.",
}: OrderProductsAndMaterialsProps) {
  const groups = React.useMemo(() => {
    const map = new Map<number | string, GroupedOrder>();

    const ensureGroup = (orderItemId: number | null, orderItemCode: string | null) => {
      const key = orderItemId ?? "unknown";
      const existing = map.get(key);
      if (existing) return existing;
      const group: GroupedOrder = {
        orderItemId,
        orderItemCode,
        products: [],
        loanerMaterials: [],
        consumableMaterials: [],
      };
      map.set(key, group);
      return group;
    };

    for (const product of products ?? []) {
      const group = ensureGroup(product.orderItemId ?? null, product.orderItemCode ?? null);
      group.products.push(product);
    }

    for (const material of materials ?? []) {
      const group = ensureGroup(material.orderItemId ?? null, material.orderItemCode ?? null);
      const type = normalizeType(material.type);
      if (type === "loaner") {
        group.loanerMaterials.push(material);
      } else {
        group.consumableMaterials.push(material);
      }
    }

    return Array.from(map.values());
  }, [products, materials]);

  if (groups.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  const renderTable = <T,>({
    title,
    items,
    emptyText,
    nameHeader,
    getLabel,
    getQuantity,
    getPrice,
  }: {
    title: string;
    items: T[];
    emptyText: string;
    nameHeader: string;
    getLabel: (item: T) => string;
    getQuantity: (item: T) => number;
    getPrice: (item: T) => number;
  }) => (
    <SectionCard>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
        <Table size="small" sx={{ tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>{nameHeader}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: 110 }}>
                Số lượng
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: 140 }}>
                Giá
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: 160 }}>
                Thành tiền
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">
                    {emptyText}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => {
                const quantity = getQuantity(item);
                const price = getPrice(item);
                const total = quantity * price;
                return (
                  <TableRow key={(item as { id?: number | string }).id ?? index}>
                    <TableCell>{getLabel(item)}</TableCell>
                    <TableCell align="right">{formatNumber(quantity)}</TableCell>
                    <TableCell align="right">{prefixCurrency} {formatNumber(price)}</TableCell>
                    <TableCell align="right">{prefixCurrency} {formatNumber(total)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </SectionCard>
  );

  return (
    <Stack spacing={2}>
      {groups.map((group) => (
        <Box
          key={group.orderItemId ?? "unknown"}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            p: 1.5,
          }}
        >
          <Stack spacing={1}>
            <Typography fontWeight={700}>
              Mã đơn: <OrderCodeText code={group.orderItemCode} fallback="Đơn hàng không xác định" />
            </Typography>

            {renderTable({
              title: "Sản phẩm",
              items: group.products,
              emptyText: "Không có sản phẩm.",
              nameHeader: "Tên sản phẩm",
              getLabel: getProductLabel,
              getQuantity: (item) => toNumber((item as OrderItemProductModel).quantity),
              getPrice: (item) => toNumber((item as OrderItemProductModel).retailPrice),
            })}

            {renderTable({
              title: "Vật tư cho mượn",
              items: group.loanerMaterials,
              emptyText: "Không có vật tư cho mượn.",
              nameHeader: "Tên vật tư",
              getLabel: getMaterialLabel,
              getQuantity: (item) => toNumber((item as OrderItemMaterialModel).quantity),
              getPrice: (item) => toNumber((item as OrderItemMaterialModel).retailPrice),
            })}

            {renderTable({
              title: "Vật tư tiêu hao",
              items: group.consumableMaterials,
              emptyText: "Không có vật tư tiêu hao.",
              nameHeader: "Tên vật tư",
              getLabel: getMaterialLabel,
              getQuantity: (item) => toNumber((item as OrderItemMaterialModel).quantity),
              getPrice: (item) => toNumber((item as OrderItemMaterialModel).retailPrice),
            })}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
