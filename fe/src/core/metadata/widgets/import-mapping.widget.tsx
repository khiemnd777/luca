import { SectionCard } from "@root/shared/components/ui/section-card";
import { registerSlot } from "@core/module/registry";
import { AutoTable } from "@core/table/auto-table";
import { IfPermission } from "@core/auth/if-permission";
import { Button } from "@mui/material";
import { openFormDialog } from "@core/form/form-dialog.service";
import AddIcon from '@mui/icons-material/Add';
import { AutoForm } from "@root/core/form/auto-form";
import { Spacer } from "@shared/components/ui/spacer";
import { SafeButton } from "@shared/components/button/safe-button";
import React from "react";
import type { AutoFormRef } from "@core/form/form.types";
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useParams } from "react-router-dom";

function ImportMappingWidget() {
  const frmImportProfileRef = React.useRef<AutoFormRef>(null);
  const { id } = useParams();
  const profileId = Number(id ?? 0);

  return (
    <>
      <SectionCard title="Edit profile" extra={
        <IfPermission permissions={["privilege.metadata"]}>
          <SafeButton variant="contained" startIcon={<SaveOutlinedIcon />} onClick={() => frmImportProfileRef.current?.submit()}>
            Lưu
          </SafeButton>
        </IfPermission>
      }>
        <AutoForm name="import-profile" ref={frmImportProfileRef} initial={{ id: profileId }} />
      </SectionCard>
      <Spacer />
      <SectionCard title="Manage fields" extra={
        <>
          <IfPermission permissions={["privilege.metadata"]}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
              openFormDialog("import-mapping", {
                initial: { profileId }
              });
            }} >New mapping</Button>
          </IfPermission>
        </>
      }>
        <AutoTable name="import-mappings" params={{ profileId }} />
      </SectionCard>
    </>
  );
}

registerSlot({
  id: "import-mapping",
  name: "import-mapping:left",
  render: () => <ImportMappingWidget />,
})
