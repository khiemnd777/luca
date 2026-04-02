import { Button } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { openFormDialog } from "@core/form/form-dialog.service";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { useParams } from "react-router-dom";

function OrderDetailActionAddRemakeOrderWidget() {
  const { orderId } = useParams();

  return (
    <>
      <IfPermission permissions={["order.create"]}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
          openFormDialog("order-remake", {
            initial: { id: orderId },
          });
        }} >Thêm đơn làm lại</Button>
      </IfPermission>
    </>
  );
}

registerSlot({
  id: "order-detail-action-add-remake-order",
  name: "order-detail:actions",
  render: () => <OrderDetailActionAddRemakeOrderWidget />,
});


registerSlot({
  id: "order-detail-action-add-remake-order",
  name: "order-detail-historical:actions",
  render: () => <OrderDetailActionAddRemakeOrderWidget />,
});
