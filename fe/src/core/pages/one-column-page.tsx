import { BasePage } from "@core/pages/base-page";
import { PageContainer } from "@shared/components/ui/page-container";
import { AutoGrid } from "@shared/components/ui/auto-grid";
import { Section } from "@shared/components/ui/section";
import { SlotHost } from "@core/module/slot-host"; // giả định sẵn có
import { useRouteMeta } from "@core/module/route-meta";
import { ResponsiveGrid } from "@root/shared/components/ui/responsive-grid";
import { ActionToolbar } from "@root/shared/components/ui/action-toolbar";
import { Spacer } from "@root/shared/components/ui/spacer";

export default function OneColumnPage() {
  const { key } = useRouteMeta();

  return (
    <BasePage>
      <PageContainer>
        <ActionToolbar actions={
          <SlotHost name={`${key}:actions`} />
        } />
        <Section>
          <SlotHost direction="column" name={`${key}:header`} />
        </Section>
        <ResponsiveGrid xs={1} sm={2} md={2} lg={2} xl={2}>
          <SlotHost name={`${key}:top`} />
        </ResponsiveGrid>
        <Spacer />
        <AutoGrid>
          <Section>
            <SlotHost direction="column" name={`${key}:left`} />
          </Section>
        </AutoGrid>
      </PageContainer>
    </BasePage>
  );
}
