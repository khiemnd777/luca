import { SectionCard } from "@root/shared/components/ui/section-card";
import { registerSlot } from "@root/core/module/registry";
import { RBACMatrix } from "@features/rbac/components/rbac-matrix";

function RBACMatrixWidget() {
  return (
    <>
      <SectionCard title={"Phân quyền"}>
        <RBACMatrix />
      </SectionCard>
    </>
  );
}

registerSlot({
  id: "rbac-matrix",
  name: "rbac:left",
  priority: 1,
  render: () => RBACMatrixWidget(),
});