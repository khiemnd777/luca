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

function MetadataCollectionFieldsWidget() {
  const formMetadataCollectionRef = React.useRef<AutoFormRef>(null);
  const { id } = useParams();
  const collectionId = Number(id ?? 0);

  return (
    <>
      <SectionCard title="Edit collection" extra={
        <IfPermission permissions={["privilege.metadata"]}>
          <SafeButton variant="contained" startIcon={<SaveOutlinedIcon />} onClick={() => formMetadataCollectionRef.current?.submit()}>
            Lưu
          </SafeButton>
        </IfPermission>
      }>
        <AutoForm name="metadata-collection" ref={formMetadataCollectionRef} initial={{ id: collectionId }} />
      </SectionCard>
      <Spacer />
      <SectionCard title="Manage fields" extra={
        <>
          <IfPermission permissions={["privilege.metadata"]}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
              openFormDialog("metadata-field", {
                initial: { collectionId }
              });
            }} >New Field</Button>
          </IfPermission>
        </>
      }>
        <AutoTable name="metadata-fields" params={{ collectionId }} />
      </SectionCard>
    </>
  );
}

registerSlot({
  id: "metadata-fields",
  name: "metadata-fields:left",
  render: () => <MetadataCollectionFieldsWidget />,
})
