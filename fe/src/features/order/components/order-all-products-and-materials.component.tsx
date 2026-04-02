import { useParams } from "react-router-dom";
import { CircularProgress, Stack } from "@mui/material";
import { useAsync } from "@root/core/hooks/use-async";
import { getAllOrderMaterials, getAllOrderProducts } from "../api/order.api";
import type { OrderItemMaterialModel } from "../model/order-item-material.model";
import type { OrderItemProductModel } from "../model/order-item-product.model";
import OrderProductsAndMaterials from "./order-products-and-materials.component";
import { normalizeList } from "@root/shared/utils/array.utils";

export default function OrderAllProductsAndMaterials() {
  const { orderId } = useParams();
  const parsedOrderId = orderId ? Number(orderId) : null;

  const { data: products, loading: loadingProducts } = useAsync<OrderItemProductModel[] | null>(
    async () => {
      if (!parsedOrderId) return null;
      const data = await getAllOrderProducts(parsedOrderId);
      return normalizeList(data);
    },
    [parsedOrderId],
    {
      key: `order-all-products:${parsedOrderId ?? ""}`,
    }
  );

  const { data: materials, loading: loadingMaterials } = useAsync<OrderItemMaterialModel[] | null>(
    async () => {
      if (!parsedOrderId) return null;
      const data = await getAllOrderMaterials(parsedOrderId);
      return normalizeList(data);
    },
    [parsedOrderId],
    {
      key: `order-all-materials:${parsedOrderId ?? ""}`,
    }
  );

  if (loadingProducts || loadingMaterials) {
    return (
      <Stack alignItems="center" py={2}>
        <CircularProgress size={22} />
      </Stack>
    );
  }

  return (
    <OrderProductsAndMaterials products={products} materials={materials} />
  );
}
