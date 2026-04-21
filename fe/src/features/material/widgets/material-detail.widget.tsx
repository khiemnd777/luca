import * as React from "react";
import { Box, CircularProgress } from "@mui/material";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { useParams } from "react-router-dom";
import { registerSlot } from "@root/core/module/registry";
import { SectionCard } from "@root/shared/components/ui/section-card";
import { AutoForm } from "@root/core/form/auto-form";
import type { AutoFormRef } from "@root/core/form/form.types";
import { useAsync } from "@root/core/hooks/use-async";
import { Section } from "@root/shared/components/ui/section";
import { TabContainer, type TabItem } from "@root/shared/components/ui/tab-container";
import { SafeButton } from "@root/shared/components/button/safe-button";
import { IfPermission } from "@root/core/auth/if-permission";
import { useAuthStore } from "@store/auth-store";
import { id as getById } from "@features/material/api/material.api";
import type { MaterialModel } from "@features/material/model/material.model";
import { MaterialDetailOverview } from "@features/material/components/material-detail-overview.component";
import { materialDisplayLabel } from "@features/material/utils/material.utils";

function MaterialDetailWidget() {
  const formRef = React.useRef<AutoFormRef>(null);
  const { id } = useParams();
  const materialId = Number(id ?? 0);
  const canViewOrders = useAuthStore((state) => state.hasPermission("order.view"));

  const { data: detail, loading } = useAsync<MaterialModel | null>(
    () => {
      if (!materialId) return Promise.resolve(null);
      return getById(materialId);
    },
    [materialId],
    {
      key: `material-detail:${materialId ?? "new"}`,
    }
  );

  const title = detail ? materialDisplayLabel(detail) || "Vật tư" : "Vật tư";
  const tabs: TabItem[] = [
    ...(canViewOrders ? [{
      label: "Tổng quan",
      icon: <InsightsOutlinedIcon />,
      value: "overview",
      content: (
        <Box>
          <MaterialDetailOverview materialId={materialId} />
        </Box>
      ),
    }] : []),
    {
      label: "Vật tư",
      icon: <CategoryOutlinedIcon />,
      value: "material",
      content: (
        <Box>
          {loading ? (
            <Section alignItems="center" py={2}>
              <CircularProgress size={22} />
            </Section>
          ) : (
            <SectionCard
              title={title}
              extra={(
                <IfPermission permissions={["material.update"]}>
                  <SafeButton
                    variant="contained"
                    startIcon={<SaveOutlinedIcon />}
                    onClick={() => formRef.current?.submit()}
                  >
                    Lưu
                  </SafeButton>
                </IfPermission>
              )}
            >
              <AutoForm
                name="material"
                ref={formRef}
                initial={detail ?? { id: materialId }}
              />
            </SectionCard>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Section>
      <TabContainer
        key={materialId || "material-detail"}
        defaultValue={canViewOrders ? "overview" : "material"}
        tabSx={{ mb: 2, borderBottom: 0 }}
        contentSx={{ mt: 0 }}
        tabs={tabs}
      />
    </Section>
  );
}

registerSlot({
  id: "material-detail",
  name: "material-detail:left",
  render: () => <MaterialDetailWidget />,
  priority: 97,
});
