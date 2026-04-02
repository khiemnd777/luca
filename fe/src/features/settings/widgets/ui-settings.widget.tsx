import { SectionCard } from "@shared/components/ui/section-card";
import { registerSlot } from "@root/core/module/registry";
import SettingsForm from "@features/settings/components/common-settings-form";

function UISettingsWidget() {
  return (
    <>
      <SectionCard title="Giao diện">
        <SettingsForm />
      </SectionCard>
    </>
  );
}

registerSlot({
  id: "ui-settings",
  name: "settings:right",
  render: () => <UISettingsWidget />,
});