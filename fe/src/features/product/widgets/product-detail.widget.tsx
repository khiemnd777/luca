import { Box, Button, CircularProgress } from "@mui/material";
import { SectionCard } from "@root/shared/components/ui/section-card";
import AddIcon from '@mui/icons-material/Add';
import { openFormDialog } from "@core/form/form-dialog.service";
import { AutoTable } from "@core/table/auto-table";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import React from "react";
import { AutoForm } from "@root/core/form/auto-form";
import type { AutoFormRef } from "@root/core/form/form.types";
import { useParams } from "react-router-dom";
import { useAsync } from "@root/core/hooks/use-async";
import type { ProductModel } from "../model/product.model";
import { id as getById } from "@features/product/api/product.api";
import { Section } from "@root/shared/components/ui/section";
import { Spacer } from "@root/shared/components/ui/spacer";
import { SafeButton } from "@root/shared/components/button/safe-button";
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { TabContainer } from "@root/shared/components/ui/tab-container";

function ProductDetailWidget() {
  const frmProductRef = React.useRef<AutoFormRef>(null);
  const { id } = useParams();
  const productId = Number(id ?? 0);

  const { data: detail, loading } = useAsync<ProductModel | null>(
    () => {
      if (!productId) return Promise.resolve(null);
      return getById(Number(productId ?? 0));
    },
    [productId],
    { key: "product-detail" }
  );

  return (
    <>
      {loading ? (
        <Section alignItems="center" py={2}>
          <CircularProgress size={22} />
        </Section>
      ) : (
        <>
          <TabContainer
            key={`${productId}-${detail?.isTemplate ? "template" : "single"}`}
            defaultValue="product"
            tabSx={{ mb: 2, borderBottom: 0 }}
            contentSx={{ mt: 0 }}
            tabs={[
              {
                label: "Sản phẩm",
                value: "product",
                content: (
                  <Box>
                    {/* Detail product */}
                    <SectionCard extra={
                      <>
                        <IfPermission permissions={["product.create"]}>
                          <SafeButton variant="contained" startIcon={<SaveOutlinedIcon />} onClick={() => {
                            frmProductRef.current?.submit();
                          }}>
                            Lưu
                          </SafeButton>
                        </IfPermission>
                      </>
                    }>
                      {detail?.isTemplate ? (
                        <AutoForm name="product" ref={frmProductRef} initial={detail} />
                      ) : (
                        <AutoForm name="product-variant" ref={frmProductRef} initial={detail} />
                      )}
                    </SectionCard>
                  </Box>
                ),
              },
              ...(detail?.isTemplate === true ? [{
                label: "Biến thể",
                value: "variants",
                content: (
                  <Box>
                    {/* Attributes */}
                    <SectionCard title="Thuộc tính biến thể" extra={
                      <>
                        <IfPermission permissions={["privilege.metadata"]}>
                          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
                            openFormDialog("metadata-field", {
                              initial: { collectionId: detail?.collectionId },
                            });
                          }} >New Field</Button>
                        </IfPermission>
                      </>
                    }>
                      <AutoTable name="metadata-fields" params={{ collectionId: detail?.collectionId }} />
                    </SectionCard>

                    <Spacer />

                    {/* Variant table */}
                    <SectionCard title="Danh sách biến thể" extra={
                      <IfPermission permissions={["product.create"]}>
                        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
                          openFormDialog("product-variant", {
                            initial: { ...detail, id: undefined, templateId: detail?.id, isTemplate: false },
                          });
                        }} >Thêm biến thể</Button>
                      </IfPermission>
                    }>
                      <AutoTable name="product-variants" params={{ templateId: detail?.id }} />
                    </SectionCard>
                  </Box>
                ),
              }] : []),
            ]}
          />
        </>
      )}
    </>
  );
}

registerSlot({
  id: "product-detail",
  name: "product-detail:left",
  render: () => <ProductDetailWidget />,
})
