import { BasePage } from "@core/pages/base-page";
import { PageContainer } from "@shared/components/ui/page-container";
import { AutoGrid } from "@shared/components/ui/auto-grid";
import { Section } from "@shared/components/ui/section";
import { SlotHost } from "@core/module/slot-host"; // giả định sẵn có
import { useRouteMeta } from "@core/module/route-meta";
import { ActionToolbar } from "@root/shared/components/ui/action-toolbar";

export default function GeneralPage() {
  const { key } = useRouteMeta();

  return (
    <BasePage>
      <PageContainer>
        <ActionToolbar actions={
          <SlotHost name={`${key}:actions`} />
        } />
        <AutoGrid>
          {/* Left */}
          <Section>
            <SlotHost name={`${key}:left`} />
          </Section>
          {/* Right */}
          <Section>
            <SlotHost name={`${key}:right`} />
          </Section>
        </AutoGrid>
      </PageContainer>
    </BasePage>
  );
}
