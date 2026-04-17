import React from "react";
import { SectionCard } from "@shared/components/ui/section-card";
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { registerSlot } from "@core/module/registry";
import { IfPermission } from "@core/auth/if-permission";
import { useParams } from "react-router-dom";
import { AutoForm } from "@core/form/auto-form";
import type { AutoFormRef } from "@root/core/form/form.types";
import { SafeButton } from "@shared/components/button/safe-button";
import { getByOrderIdAndOrderItemId } from "../api/order.api";
import { Section } from "@root/shared/components/ui/section";
import { Box, CircularProgress } from "@mui/material";
import type { OrderModel } from "../model/order.model";
import { useAsync } from "@root/core/hooks/use-async";
import { OrderProcessesStatusBoard } from "../components/order-process-status-board.component";
import { generateTitle } from "../utils/order.utils";
import { OrderInProgress } from "../components/order-inprogress.component";
import { TabContainer, type TabItem } from "@shared/components/ui/tab-container";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import { OrderDetailPrintQRSlipButton } from "./order-detail-print-qr-slip-button";
import { OrderDetailInsight } from "../components/order-detail-insight.component";

export function OrderDetailHistoricalGeneralWidget() {
  const { orderId, orderItemId } = useParams();
  const frmOrderEditRef = React.useRef<AutoFormRef>(null);

  const { data: detail, loading } = useAsync<OrderModel | null>(
    () => {
      if (!orderId) return Promise.resolve(null);
      return getByOrderIdAndOrderItemId(Number(orderId ?? 0), Number(orderItemId ?? 0));
    },
    [orderId, orderItemId],
    { key: "order-detail-historical-body" }
  );

  const title = React.useMemo(
    () => generateTitle(detail?.code, detail?.latestOrderItem?.code),
    [detail?.code, detail?.latestOrderItem?.code]
  );
  const orderTargetId = React.useMemo(() => {
    const value = detail?.id ?? (orderId ? Number(orderId) : undefined);
    return typeof value === "number" && !Number.isNaN(value) ? value : undefined;
  }, [detail?.id, orderId]);

  return (
    <>
      <Section>
        <TabContainer
          key={`${orderId ?? "order"}-${orderItemId ?? "item"}`}
          defaultValue="overview"
          tabSx={{ mb: 2 }}
          tabs={[
            {
              label: "Tổng quan",
              icon: <InsightsOutlinedIcon />,
              value: "overview",
              content: (
                <Box>
                  <OrderDetailInsight detail={detail} loading={loading} />
                </Box>
              ),
            },
            {
              label: "Thông tin đơn hàng",
              icon: <InfoOutlinedIcon />,
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
                        name="order-historical"
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
              icon: <QrCode2OutlinedIcon />,
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
              icon: <TaskAltOutlinedIcon />,
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
              icon: <TimelineOutlinedIcon />,
              value: "inprogress",
              content: (
                <Box>
                  <OrderInProgress />
                </Box>
              ),
            },
            // {
            //   label: "Tất cả Sản phẩm & Vật tư",
            //   value: "all-products",
            //   content: (
            //     <Box>
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
  id: "order-detail-historical",
  name: "order-detail-historical:left",
  render: () => <OrderDetailHistoricalGeneralWidget />,
  priority: 97,
});
