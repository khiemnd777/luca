import React from "react";
import { useParams } from "react-router-dom";
import { SectionCard } from "@shared/components/ui/section-card";
import { IfPermission } from "@core/auth/if-permission";
import { SafeButton } from "@shared/components/button/safe-button";
import { AutoForm } from "@core/form/auto-form";
import type { AutoFormRef } from "@root/core/form/form.types";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useAsync } from "@root/core/hooks/use-async";
import { Section } from "@root/shared/components/ui/section";
import { TabContainer, type TabItem } from "@root/shared/components/ui/tab-container";
import { getByOrderIdAndOrderItemId, id as getById } from "../api/order.api";
import { getInProgressesByOrderItemId } from "../api/order-item-process.api";
import type { OrderItemProcessInProgressProcessModel } from "../model/order-item-process-inprogress-process.model";
import type { OrderModel } from "../model/order.model";
import { Spacer } from "@root/shared/components/ui/spacer";
import { buildInProgressProductTabLabel } from "../utils/order.utils";

type ProductInProgressGroup = {
  key: string;
  label: string;
  items: OrderItemProcessInProgressProcessModel[];
};

export function OrderInProgress() {
  const { orderId, orderItemId } = useParams();
  const parsedOrderId = orderId ? Number(orderId) : null;
  const parsedOrderItemId = orderItemId ? Number(orderItemId) : null;

  const { data: detail } = useAsync<OrderModel | null>(
    () => {
      if (!parsedOrderId) return Promise.resolve(null);
      if (parsedOrderItemId) {
        return getByOrderIdAndOrderItemId(parsedOrderId, parsedOrderItemId);
      }
      return getById(parsedOrderId);
    },
    [parsedOrderId, parsedOrderItemId],
    {
      key: `order-process-inprogress-detail:${parsedOrderId ?? ""}:${parsedOrderItemId ?? ""}`,
    }
  );

  const resolvedOrderItemId = React.useMemo(() => {
    if (parsedOrderItemId) return parsedOrderItemId;
    return detail?.latestOrderItem?.id ?? null;
  }, [detail?.latestOrderItem?.id, parsedOrderItemId]);

  const { data: inprogressesData, loading: loadingInprogresses } =
    useAsync<OrderItemProcessInProgressProcessModel[]>(
      () => {
        if (!parsedOrderId || !resolvedOrderItemId) return Promise.resolve([]);
        return getInProgressesByOrderItemId(parsedOrderId, resolvedOrderItemId);
      },
      [parsedOrderId, resolvedOrderItemId],
      {
        key: `order-process-inprogress:${parsedOrderId ?? ""}:${resolvedOrderItemId ?? ""}`,
      }
    );

  const groupedInProgresses = React.useMemo<ProductInProgressGroup[]>(() => {
    const groups = new Map<string, ProductInProgressGroup>();

    for (const item of inprogressesData ?? []) {
      const key =
        item.productId != null
          ? `product:${item.productId}`
          : `name:${buildInProgressProductTabLabel(item)}`;

      const existing = groups.get(key);
      if (existing) {
        existing.items.push(item);
        continue;
      }

      groups.set(key, {
        key,
        label: buildInProgressProductTabLabel(item),
        items: [item],
      });
    }

    return Array.from(groups.values());
  }, [inprogressesData]);

  const tabs = React.useMemo<TabItem[]>(
    () =>
      groupedInProgresses.map((group) => ({
        label: group.label,
        value: group.key,
        content: <ProductInProgressPanel group={group} />,
      })),
    [groupedInProgresses]
  );

  return (
    <>
      {loadingInprogresses ? (
        <SectionCard title="Công đoạn theo sản phẩm">
          <Stack alignItems="center" py={2}>
            <CircularProgress size={22} />
          </Stack>
        </SectionCard>
      ) : tabs.length > 0 ? (
        <TabContainer tabs={tabs} />
      ) : (
        <SectionCard title="Công đoạn theo sản phẩm">
          <Typography variant="body2" color="text.secondary">
            Không có dữ liệu
          </Typography>
        </SectionCard>
      )}
    </>
  );
}

function ProductInProgressPanel({ group }: { group: ProductInProgressGroup }) {
  const frmCurrentRef = React.useRef<AutoFormRef>(null);
  const latestData = group.items[0];
  const previousData = group.items.slice(1);
  const isLatestCompleted = Boolean(latestData?.completedAt);
  const currentSectionTitle = isLatestCompleted
    ? "Công đoạn gần nhất"
    : "Công đoạn hiện tại";
  const currentFormName = isLatestCompleted
    ? "order-process-inprogress-prev"
    : "order-process-inprogress-current";

  return (
    <>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Công đoạn theo sản phẩm
      </Typography>

      <SectionCard
        title={currentSectionTitle}
        extra={
          isLatestCompleted ? null : (
            <IfPermission permissions={["order.update"]}>
              <SafeButton
                variant="contained"
                onClick={() => frmCurrentRef.current?.submit()}
              >
                Lưu
              </SafeButton>
            </IfPermission>
          )
        }
      >
        <AutoForm
          name={currentFormName}
          ref={isLatestCompleted ? undefined : frmCurrentRef}
          initial={latestData ?? {}}
        />
      </SectionCard>

      <Spacer />

      <SectionCard title="Các công đoạn trước">
        <Stack>
          {previousData.map((item, idx) => {
            const isLast = idx === previousData.length - 1;

            return (
              <Box
                key={item.id ?? idx}
                pb={4}
                mb={2}
                sx={{
                  borderBottom: isLast ? "none" : "1px dashed",
                  borderColor: "divider",
                }}
              >
                <Section>
                  <AutoForm
                    name="order-process-inprogress-prev"
                    initial={item ?? {}}
                  />
                </Section>
              </Box>
            );
          })}

          {previousData.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Không có dữ liệu
            </Typography>
          )}
        </Stack>
      </SectionCard>
    </>
  );
}
