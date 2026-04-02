import { SectionCard } from "@root/shared/components/ui/section-card";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import React from "react";
import type { AutoFormRef } from "@root/core/form/form.types";
import { useParams } from "react-router-dom";
import { SafeButton } from "@root/shared/components/button/safe-button";
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { AutoForm } from "@root/core/form/auto-form";

function CategoryDetailWidget() {
  const frmCategoryRef = React.useRef<AutoFormRef>(null);
  const { id } = useParams();
  const categoryId = Number(id ?? 0);

  return (
    <>
      <SectionCard extra={
        <IfPermission permissions={["privilege.metadata"]}>
          <SafeButton variant="contained" startIcon={<SaveOutlinedIcon />} onClick={() => frmCategoryRef.current?.submit()}>
            Lưu
          </SafeButton>
        </IfPermission>
      }>
        <AutoForm name="category-with-fields" ref={frmCategoryRef} initial={{ id: categoryId }} />
      </SectionCard>
    </>
  );
}

registerSlot({
  id: "category-detail",
  name: "category-detail:left",
  render: () => <CategoryDetailWidget />,
})
