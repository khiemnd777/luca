import React from "react";
import { registerSlot } from "@core/module/registry";
import { AutoForm } from "@core/form/auto-form";
import type { AutoFormRef } from "@root/core/form/form.types";
import { AutoFormButtons } from "@root/core/form/auto-form-buttons";
import { useIsMobile } from "@root/shared/utils/media.utils";
import { OrderQrScanner } from "../components/order-scanner.component";
import { getOrderIdAndOrderItemIdByCode } from "../api/order-item.api";
import { navigate } from "@root/core/navigation/navigate";
import { useAsync } from "@root/core/hooks/use-async";
import { off, on } from "@root/core/module/event-bus";
import { SectionCard } from "@shared/components/ui/section-card";
import { Spacer } from "@root/shared/components/ui/spacer";
import toast from "react-hot-toast";

export function OrderInProgressCheckCodeWidget() {
  const [orderCode, setOrderCode] = React.useState<string | null>(null);
  const isMobile = useIsMobile();
  const formCheckCodeRef = React.useRef<AutoFormRef>(null);

  React.useEffect(() => {
    const handler = (nextCode: string) => {
      setOrderCode(nextCode);
    };
    on("order:check-code", handler);
    return () => off("order:check-code", handler);
  }, []);

  const { data, error } = useAsync<[number, number] | null>(() => {
    if (!orderCode) return Promise.resolve(null);
    return getOrderIdAndOrderItemIdByCode(orderCode);
  }, [orderCode], {
    key: `order-inprogress-check-code:${orderCode ?? ""}`,
  });

  React.useEffect(() => {
    if (!data) return;
    const [orderId, orderItemId] = data;
    navigate(`/in-progresses/${orderId}/${orderItemId}`);
  }, [data]);

  React.useEffect(() => {
    if (error) {
      toast.error("Mã đơn hàng lỗi hoặc không tồn tại");
    }
  }, [error]);

  if (isMobile) {
    return <OrderQrScanner onDetected={(nextCode) => setOrderCode(nextCode)} />;
  }

  return (
    <SectionCard>
      <AutoForm name="order-inprogress-check-code" ref={formCheckCodeRef} />
      <Spacer />
      <AutoFormButtons formRef={formCheckCodeRef} />
    </SectionCard>
  );
}

registerSlot({
  id: "order-inprogress-check-code",
  name: "order-inprogress:left",
  priority: 99,
  render: () => <OrderInProgressCheckCodeWidget />,
});
