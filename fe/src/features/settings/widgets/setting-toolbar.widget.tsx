import { registerSlot } from "@root/core/module/registry";
import SettingIcon from "../components/setting-icon.component";


function SettingToolbarWidget() {
  return (
    <>
      <SettingIcon />
    </>
  );
}

registerSlot({
  id: "setting",
  name: "toolbar",
  render: () => <SettingToolbarWidget />,
  priority: 97,
});
