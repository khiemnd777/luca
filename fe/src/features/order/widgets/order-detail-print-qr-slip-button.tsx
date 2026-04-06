import * as React from "react";
import PrintIcon from "@mui/icons-material/Print";
import { Button } from "@mui/material";
import toast from "react-hot-toast";
import { IfPermission } from "@root/core/auth/if-permission";
import { downloadQRSlipA5 } from "@features/order/api/order_print.service";

type OrderDetailPrintQRSlipButtonProps = {
  orderId?: number;
};

export function OrderDetailPrintQRSlipButton({
  orderId,
}: OrderDetailPrintQRSlipButtonProps) {
  const [downloading, setDownloading] = React.useState(false);

  const handlePrint = React.useCallback(async () => {
    if (!orderId || Number.isNaN(orderId)) {
      toast.error("Khong tim thay ma don hang.");
      return;
    }

    setDownloading(true);
    try {
      await downloadQRSlipA5({ order_id: orderId });
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
        In phiếu
      </Button>
    </IfPermission>
  );
}
