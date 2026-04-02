import React from "react";
import { SectionCard } from "@shared/components/ui/section-card";
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { IfPermission } from "@core/auth/if-permission";
import { useParams } from "react-router-dom";
import { AutoForm } from "@core/form/auto-form";
import type { AutoFormRef } from "@root/core/form/form.types";
import { SafeButton } from "@shared/components/button/safe-button";
import { id as getById } from "../api/order.api";
import { Section } from "@root/shared/components/ui/section";
import { Box, CircularProgress, Tab, Tabs } from "@mui/material";
import { useAsync } from "@root/core/hooks/use-async";

export function OrderDetailBodyWidget() {
  const { orderId } = useParams();
  const frmOrderEditGeneralRef = React.useRef<AutoFormRef>(null);
  const frmOrderEditProductRef = React.useRef<AutoFormRef>(null);
  const [tab, setTab] = React.useState<string>("general");

  const { data: detail, loading } = useAsync<any>(() => {
    if (!orderId) return Promise.resolve(null);
    return getById(Number(orderId ?? 0));
  }, [orderId], {
    key: `order-detail:${orderId ?? "new"}`,
  });

  React.useEffect(() => {
    setTab("general");
  }, [orderId]);

  const handleSubmit = () => {
    if (tab === "product") {
      frmOrderEditProductRef.current?.submit();
    } else {
      frmOrderEditGeneralRef.current?.submit();
    }
  };

  const initialData = detail ?? { id: orderId };

  return (
    <>
      <SectionCard
        extra={
          <>
            <IfPermission permissions={["order.update"]}>
              <SafeButton
                variant="contained"
                startIcon={<SaveOutlinedIcon />}
                onClick={handleSubmit}
              >
                Lưu
              </SafeButton>
            </IfPermission>
          </>
        }
      >
        {loading ? (
          <Section alignItems="center" py={2}>
            <CircularProgress size={22} />
          </Section>
        ) : (
          <>
            <Tabs
              value={tab}
              onChange={(_, v: string) => setTab(v)}
              sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
            >
              <Tab value="general" label="Thông tin chung" />
              <Tab value="product" label="Sản phẩm & Vật tư" />
            </Tabs>

            {/* general */}
            {tab === "general" && (
              <Box>
                <AutoForm
                  name="order-edit-body"
                  ref={frmOrderEditGeneralRef}
                  initial={initialData}
                />
              </Box>
            )}

            {/* products */}
            {tab === "product" && (
              <Box>
                <AutoForm
                  name="order-edit-products"
                  ref={frmOrderEditProductRef}
                  initial={initialData}
                />
              </Box>
            )}
          </>
        )}
      </SectionCard>
    </>
  );
}

// registerSlot({
//   id: "order-detail-body",
//   name: "order-detail:left",
//   render: () => <OrderDetailBodyWidget />,
//   priority: 97,
// });
