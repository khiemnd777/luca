import { registerSlot } from "@root/core/module/registry";
import { useParams } from "react-router-dom";
import { SectionCard } from "@shared/components/ui/section-card";
import type { OrderItemHistoricalModel } from "../model/order-item.model";
import { historical } from "../api/order-item.api";

import {
  List,
  ListItemButton,
  ListItemText,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { Section } from "@shared/components/ui/section";
import { formatDateTime } from "@root/shared/utils/datetime.utils";
import { navigate } from "@root/core/navigation/navigate";
import { useAsync } from "@root/core/hooks/use-async";

export function OrderDetailHistoricalListWidget() {
  const { orderId, orderItemId } = useParams();
  const { data: historicalList, loading } = useAsync<OrderItemHistoricalModel[]>(
    () => {
      if (!orderId) return Promise.resolve([]);
      return historical(Number(orderId), Number(orderItemId ?? 0));
    },
    [orderId, orderItemId],
    { key: "order-detail-historical-list" }
  );

  return (
    <SectionCard title="Các đơn liên quan">
      <Section>
        {loading && (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={22} />
          </Stack>
        )}

        {!loading && (!historicalList || historicalList.length === 0) && (
          <Section sx={{ py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Không có dữ liệu
            </Typography>
          </Section>
        )}

        {!loading && historicalList && (
          <List dense>
            {historicalList.map((it) => {
              const isCurrent = it.isCurrent;     // latest
              const isHighlight = it.isHighlight; // selected

              return (
                <ListItemButton
                  key={it.id}
                  selected={isHighlight}
                  onClick={() => {
                    if (orderId) {
                      if(isCurrent){
                        navigate(`/order/${orderId}`);
                        return;
                      }
                      navigate(`/order/${orderId}/historical/${it.id}`);
                    };
                  }}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    border: isHighlight
                      ? "1px solid var(--mui-palette-primary-main)"
                      : "1px solid transparent",
                    backgroundColor: isHighlight
                      ? "var(--mui-palette-primary-light)"
                      : undefined,
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography
                          component="span"
                          fontWeight={isHighlight ? 700 : isCurrent ? 600 : 400}
                          color={
                            isHighlight
                              ? "primary.main"
                              : isCurrent
                                ? "text.primary"
                                : "text.primary"
                          }
                        >
                          {it.code}
                        </Typography>

                        {isCurrent && (
                          <Chip
                            size="small"
                            color="primary"
                            label="Hiện tại"
                            sx={{ height: 20 }}
                          />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Typography component="span" variant="caption">
                        {formatDateTime(it.createdAt)}
                      </Typography>
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Section>
    </SectionCard>
  );
}

registerSlot({
  id: "order-detail-historical-list",
  name: "order-detail:right",
  render: () => <OrderDetailHistoricalListWidget />,
});

registerSlot({
  id: "order-detail-historical-list",
  name: "order-detail-historical:right",
  render: () => <OrderDetailHistoricalListWidget />,
});
