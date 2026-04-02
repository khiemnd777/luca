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
import { getByOrderIdAndOrderItemId, id as getById } from "../api/order.api";
import { getInProgressesByOrderItemId } from "../api/order-item-process.api";
import type { OrderItemProcessInProgressProcessModel } from "../model/order-item-process-inprogress-process.model";
import type { OrderModel } from "../model/order.model";
import { Spacer } from "@root/shared/components/ui/spacer";

export function OrderInProgress() {
  const { orderId, orderItemId } = useParams();
  const parsedOrderId = orderId ? Number(orderId) : null;
  const parsedOrderItemId = orderItemId ? Number(orderItemId) : null;
  const frmCurrentRef = React.useRef<AutoFormRef>(null);

  const { data: detail, loading: _loadingDetail } = useAsync<OrderModel | null>(
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

  const latestData = inprogressesData?.[0];
  const previousData = (inprogressesData ?? []).slice(1);
  const isLatestCompleted = Boolean(latestData?.completedAt);
  const currentSectionTitle = isLatestCompleted
    ? "Công đoạn gần nhất"
    : "Công đoạn hiện tại";
  const currentFormName = isLatestCompleted
    ? "order-process-inprogress-prev"
    : "order-process-inprogress-current";

  return (
    <>
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
        {loadingInprogresses ? (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={22} />
          </Stack>
        ) : (
          <AutoForm
            name={currentFormName}
            ref={isLatestCompleted ? undefined : frmCurrentRef}
            initial={latestData ?? {}}
          />
        )}
      </SectionCard>

      <Spacer />

      <SectionCard title="Các công đoạn trước">
        {loadingInprogresses ? (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={22} />
          </Stack>
        ) : (
          <Stack>
            {previousData.map((item, idx) => {
              const isLast = idx === previousData.length - 1

              return (
                <Box
                  key={item.id ?? idx}
                  pb={4}
                  mb={2}
                  sx={{
                    borderBottom: isLast
                      ? "none"
                      : "1px dashed",
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
              )
            })}

            {previousData.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Không có dữ liệu
              </Typography>
            )}
          </Stack>
        )}
      </SectionCard>

    </>
  );
}
