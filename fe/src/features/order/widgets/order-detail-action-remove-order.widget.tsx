import * as React from "react";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { useParams } from "react-router-dom";
import { SafeButton } from "@shared/components/button/safe-button";
import DeleteIcon from '@mui/icons-material/Delete';
import { getLatestOrderItemIdByOrderId, unlink } from "../api/order-item.api";
import { ConfirmDialog } from "@shared/components/dialog/confirm-dialog";
import toast from "react-hot-toast";
import { navigate } from "@root/core/navigation/navigate";

function OrderDetailActionRemoveOrderWidget() {
  const { orderId, orderItemId } = useParams();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  const handleUnlink = async () => {
    if (!orderId) return;
    const resolvedOrderId = Number(orderId);
    let resolvedOrderItemId = orderItemId ? Number(orderItemId) : undefined;
    if (!resolvedOrderItemId) {
      resolvedOrderItemId = await getLatestOrderItemIdByOrderId(resolvedOrderId);
    }
    try {
      await unlink(resolvedOrderId, resolvedOrderItemId);
      navigate("/order");
    } catch (err) {
      console.error(err);
      toast.error("Không thể xoá đơn hàng này!");
    }
  };

  const handleConfirmUnlink = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      await handleUnlink();
      setConfirmOpen(false);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <IfPermission permissions={["order.delete"]}>
        <SafeButton
          variant="contained"
          icon=<DeleteIcon />
          color="error"
          onClick={() => setConfirmOpen(true)}
        >
          Xoá đơn hàng
        </SafeButton>
      </IfPermission>

      <ConfirmDialog
        open={confirmOpen}
        confirming={confirming}
        title="Xoá đơn hàng?"
        content="Bạn có chắc muốn xoá đơn hàng này? Hành động này không thể hoàn tác."
        confirmText="Xoá"
        cancelText="Hủy"
        onClose={() => {
          if (!confirming) setConfirmOpen(false);
        }}
        onConfirm={handleConfirmUnlink}
      />
    </>
  );
}

registerSlot({
  id: "order-detail-action-remove-order",
  name: "order-detail:actions",
  render: () => <OrderDetailActionRemoveOrderWidget />,
});


registerSlot({
  id: "order-detail-action-remove-order",
  name: "order-detail-historical:actions",
  render: () => <OrderDetailActionRemoveOrderWidget />,
});
