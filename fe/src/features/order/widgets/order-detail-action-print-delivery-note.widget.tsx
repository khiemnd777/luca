import * as React from "react";
import { Button } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { downloadDeliveryNote } from "@features/order/api/order_print.service";

export function OrderDetailActionPrintDeliveryNoteWidget() {
  const { orderId } = useParams();
  const [downloading, setDownloading] = React.useState(false);

  const handlePrint = React.useCallback(async () => {
    if (!orderId) {
      toast.error("Khong tim thay ma don hang.");
      return;
    }

    setDownloading(true);
    try {
      await downloadDeliveryNote({
        order_id: Number(orderId),
      });
    } finally {
      setDownloading(false);
    }
  }, [orderId]);

  return (
    <IfPermission permissions={["order.view"]}>
      <Button
        variant="outlined"
        startIcon={<PrintIcon />}
        onClick={handlePrint}
        disabled={downloading}
      >
        In phiếu giao hàng
      </Button>
    </IfPermission>
  );
}

registerSlot({
  id: "order-detail-action-print-delivery-note",
  name: "order-detail:actions",
  render: () => <OrderDetailActionPrintDeliveryNoteWidget />,
});

registerSlot({
  id: "order-detail-action-print-delivery-note",
  name: "order-detail-historical:actions",
  render: () => <OrderDetailActionPrintDeliveryNoteWidget />,
});
