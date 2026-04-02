import React from "react";
import { SectionCard } from "@root/shared/components/ui/section-card";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import type { AutoFormRef } from "@root/core/form/form.types";
import { useParams } from "react-router-dom";
import { SafeButton } from "@shared/components/button/safe-button";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { AutoForm } from "@root/core/form/auto-form";
import { TabContainer, type TabItem } from "@shared/components/ui/tab-container";
import { AutoTable } from "@core/table/auto-table";

function PromotionDetailWidget() {
  const frmPromotionRef = React.useRef<AutoFormRef>(null);
  const { id } = useParams();
  const promotionId = Number(id ?? 0);

  return (
    <TabContainer
      key={promotionId || "promotion-detail"}
      tabs={[
        {
          label: "Thông tin chung",
          value: "info",
          content: (
            <SectionCard title="Chi tiết khuyến mãi" extra={
              <IfPermission permissions={["promotion.update"]}>
                <SafeButton
                  variant="contained"
                  startIcon={<SaveOutlinedIcon />}
                  onClick={() => frmPromotionRef.current?.submit()}
                >
                  Lưu
                </SafeButton>
              </IfPermission>
            }>
              <AutoForm name="promotion" ref={frmPromotionRef} initial={{ id: promotionId }} />
            </SectionCard>
          ),
        },
        {
          label: "Đơn hàng đã áp dụng",
          value: "orders",
          content: <AutoTable name="promotion-orders" params={{ promotionCodeId: promotionId }} />,
        },
      ] satisfies TabItem[]}
    />
  );
}

registerSlot({
  id: "promotion-detail",
  name: "promotion-detail:left",
  render: () => <PromotionDetailWidget />,
});
