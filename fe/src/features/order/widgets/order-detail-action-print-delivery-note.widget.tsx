import * as React from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  downloadDeliveryNote,
  type DeliveryNotePaperSize,
} from "@features/order/api/order_print.service";

export function OrderDetailActionPrintDeliveryNoteWidget() {
  const { orderId } = useParams();
  const [downloading, setDownloading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [paperSize, setPaperSize] = React.useState<DeliveryNotePaperSize>("A5");
  const [showAmounts, setShowAmounts] = React.useState(true);

  const handleOpen = React.useCallback(() => {
    if (!orderId) {
      toast.error("Không tìm thấy mã đơn hàng.");
      return;
    }

    setOpen(true);
  }, [orderId]);

  const handleClose = React.useCallback(() => {
    if (downloading) {
      return;
    }

    setOpen(false);
  }, [downloading]);

  const handlePrint = React.useCallback(async () => {
    if (!orderId) {
      toast.error("Không tìm thấy mã đơn hàng.");
      return;
    }

    setDownloading(true);
    try {
      await downloadDeliveryNote({
        order_id: Number(orderId),
        paper_size: paperSize,
        show_amounts: showAmounts,
      });
      setOpen(false);
    } finally {
      setDownloading(false);
    }
  }, [orderId, paperSize, showAmounts]);

  return (
    <IfPermission permissions={["order.view"]}>
      <>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handleOpen}
          disabled={downloading}
        >
          In phiếu giao hàng
        </Button>
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
          <DialogTitle>Chọn khổ giấy in</DialogTitle>
          <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Chọn khổ giấy trước khi xuất phiếu giao hàng PDF.
            </Typography>
            <FormControl>
              <RadioGroup
                row
                value={paperSize}
                sx={{ columnGap: 3 }}
                onChange={(event) => setPaperSize(event.target.value as DeliveryNotePaperSize)}
              >
                <FormControlLabel
                  value="A5"
                  control={<Radio />}
                  label="A5"
                />
                <FormControlLabel
                  value="A4"
                  control={<Radio />}
                  label="A4"
                />
              </RadioGroup>
            </FormControl>
            <Box>
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={showAmounts}
                    onChange={(event) => setShowAmounts(event.target.checked)}
                  />
                )}
                label="Hiển thị số tiền trên phiếu giao hàng"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={downloading}>
              Hủy
            </Button>
            <Button onClick={handlePrint} variant="contained" disabled={downloading}>
              Xuất PDF
            </Button>
          </DialogActions>
        </Dialog>
      </>
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
