import React from "react";
import { SectionCard } from "@shared/components/ui/section-card";
import { registerSlot } from "@core/module/registry";
import { IfPermission } from "@core/auth/if-permission";
import { useParams } from "react-router-dom";
import { AutoForm } from "@core/form/auto-form";
import type { AutoFormRef } from "@root/core/form/form.types";
import { SafeButton } from "@shared/components/button/safe-button";
import { id as getById } from "../api/order.api";
import { Section } from "@root/shared/components/ui/section";
import { Box, CircularProgress } from "@mui/material";
import { useAsync } from "@root/core/hooks/use-async";
import { OrderProcessesStatusBoard } from "../components/order-process-status-board.component";
import { generateTitle } from "../utils/order.utils";
import { OrderInProgress } from "../components/order-inprogress.component";
import { TabContainer, type TabItem } from "@shared/components/ui/tab-container";
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { OrderDetailDeliveryStatusBoard } from "../components/order-delivery-status-board.component";
import { AuditLogListInfinite } from "@core/auditlog";
import { apiClient } from "@core/network/api-client";
import type { OrderModel } from "../model/order.model";
import { OrderDetailPrintQRSlipButton } from "./order-detail-print-qr-slip-button";

export function OrderDetailBodyWidget() {
  const { orderId } = useParams();
  const frmOrderEditRef = React.useRef<AutoFormRef>(null);

  const { data: detail, loading } = useAsync<OrderModel | null>(() => {
    if (!orderId) return Promise.resolve(null);
    return getById(Number(orderId ?? 0));
  }, [orderId], {
    key: `order-detail:${orderId ?? "new"}`,
  });

  const title = React.useMemo(
    () => generateTitle(detail?.code, detail?.codeLatest),
    [detail?.code, detail?.codeLatest]
  );
  const orderTargetId = React.useMemo(() => {
    const value = detail?.id ?? (orderId ? Number(orderId) : undefined);
    return typeof value === "number" && !Number.isNaN(value) ? value : undefined;
  }, [detail?.id, orderId]);

  return (
    <>
      <Section>
        <TabContainer
          key={orderId ?? "order-detail"}
          defaultValue="info"
          tabSx={{ mb: 2 }}
          tabs={[
            {
              label: "Thông tin đơn hàng",
              value: "info",
              content: (
                <Box>
                  {loading ? (
                    <Section alignItems="center" py={2}>
                      <CircularProgress size={22} />
                    </Section>
                  ) : (
                    <SectionCard title={title ?? ""} extra={
                      <>
                        <IfPermission permissions={["order.update"]}>
                          <SafeButton
                            variant="contained"
                            startIcon={<SaveOutlinedIcon />}
                            onClick={() => frmOrderEditRef.current?.submit()}
                          >
                            Lưu
                          </SafeButton>
                        </IfPermission>
                      </>
                    }>
                      <AutoForm
                        name="order-edit"
                        ref={frmOrderEditRef}
                        initial={detail ?? { id: orderId }}
                      />
                    </SectionCard>
                  )}
                </Box>
              ),
            },
            {
              label: "Mã QR",
              value: "qr",
              content: (
                <Box>
                  <SectionCard
                    title={title ?? ""}
                    extra={orderTargetId ? <OrderDetailPrintQRSlipButton orderId={orderTargetId} /> : null}
                  >
                    <AutoForm name="order-qr" initial={detail} />
                  </SectionCard>
                </Box>
              ),
            },
            {
              label: "Trạng thái",
              value: "process",
              content: (
                <Box>
                  <SectionCard title={title ?? ""}>
                    <OrderProcessesStatusBoard />
                  </SectionCard>
                </Box>
              ),
            },
            {
              label: "Tiến trình",
              value: "inprogress",
              content: (
                <Box>
                  <OrderInProgress />
                </Box>
              ),
            },
            {
              label: "Giao/Nhận hàng",
              value: "delivery",
              content: (
                <Box>
                  <SectionCard title={title ?? ""}>
                    <OrderDetailDeliveryStatusBoard
                      orderId={orderId ? Number(orderId) : undefined}
                    />
                  </SectionCard>
                </Box>
              ),
            },
            {
              label: "Nhật ký",
              value: "auditlog",
              content: (
                <Box>
                  <SectionCard title="Nhật ký">
                    <AuditLogListInfinite
                      http={apiClient}
                      module="order"
                      targetId={orderTargetId}
                    />
                  </SectionCard>
                </Box>
              ),
            },
            // {
            //   label: "Tất cả Sản phẩm & Vật tư",
            //   value: "all-products",
            //   content: (
            //     <Box>
            //       <OrderTotalPrice />
            //       <Spacer />
            //       <OrderAllProductsAndMaterials />
            //     </Box>
            //   ),
            // },
          ] satisfies TabItem[]}
        />
      </Section>
    </>
  );
}

registerSlot({
  id: "order-detail",
  name: "order-detail:left",
  render: () => <OrderDetailBodyWidget />,
  priority: 97,
});
