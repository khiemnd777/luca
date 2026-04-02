import { BasePage } from "@core/pages/base-page";
import { PageContainer } from "@root/shared/components/ui/page-container";
import UnderConstruction from "@core/pages/under-construction";
import { ActionToolbar } from "@root/shared/components/ui/action-toolbar";

export default function UnderConstructionPage() {
  return (
    <>
      <BasePage>
        <PageContainer>
          <ActionToolbar />
          <UnderConstruction />
        </PageContainer>
      </BasePage>
    </>
  );
}
