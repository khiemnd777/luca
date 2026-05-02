import ViewAgendaRoundedIcon from "@mui/icons-material/ViewAgendaRounded";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AddIcon from "@mui/icons-material/Add";
import {
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import * as React from "react";
import { SectionCard } from "@root/shared/components/ui/section-card";
import { openFormDialog } from "@core/form/form-dialog.service";
import { AutoTable } from "@core/table/auto-table";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { useOrderAdvancedSearchStore } from "@features/order/utils/order-advanced-search.store";
import { advancedSearchList, getByOrderIdAndOrderItemId, list } from "@features/order/api/order.api";
import { historical } from "@features/order/api/order-item.api";
import type { OrderItemHistoricalModel } from "@features/order/model/order-item.model";
import type { FetchTableOpts } from "@core/table/table.types";
import { hasAdvancedSearchFilters } from "@features/order/utils/order-advanced-search.store";
import { useDebounce } from "@root/core/hooks/use-debounce";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import {
  createGroupedOrderTableSchema,
  type GroupedOrderHistoricalDetail,
  type GroupedOrderHistoricalState,
} from "@features/order/tables/order-grouped.table";

type OrderTableMode = "normal" | "grouping";

export function OrderListWidget() {
  const appliedFilters = useOrderAdvancedSearchStore((state) => state.appliedFilters);
  const refreshToken = useOrderAdvancedSearchStore((state) => state.refreshToken);
  const [mode, setMode] = React.useState<OrderTableMode>("grouping");
  const [collapsedIds, setCollapsedIds] = React.useState<Set<number>>(new Set());
  const [historicalState, setHistoricalState] = React.useState<Record<number, GroupedOrderHistoricalState>>({});
  const [groupedRefreshToken, setGroupedRefreshToken] = React.useState(0);
  const historicalStateRef = React.useRef(historicalState);
  const historicalRequestsRef = React.useRef(new Map<number, Promise<GroupedOrderHistoricalState>>());
  const { lastMessage } = useWebSocket();
  const reloadGroupedOrders = useDebounce(() => {
    setHistoricalState({});
    historicalRequestsRef.current.clear();
    setGroupedRefreshToken((value) => value + 1);
  }, 1500);

  React.useEffect(() => {
    historicalStateRef.current = historicalState;
  }, [historicalState]);

  React.useEffect(() => {
    setCollapsedIds(new Set());
    setHistoricalState({});
    historicalRequestsRef.current.clear();
  }, [refreshToken, appliedFilters]);

  React.useEffect(() => {
    if (
      lastMessage?.type === "order:changed"
      || lastMessage?.type === "order:newest"
      || lastMessage?.type === "order:inprogress"
      || lastMessage?.type === "dashboard:production_planning"
    ) {
      reloadGroupedOrders();
    }
  }, [lastMessage, reloadGroupedOrders]);

  const fetchOrders = React.useCallback(
    async (opts: FetchTableOpts) => {
      if (hasAdvancedSearchFilters(appliedFilters)) {
        return advancedSearchList(appliedFilters, opts);
      }

      return list(opts);
    },
    [appliedFilters]
  );

  const getHistoricalState = React.useCallback((orderId: number) => {
    return historicalStateRef.current[orderId];
  }, []);

  const ensureHistoricalLoaded = React.useCallback(async (orderId: number): Promise<GroupedOrderHistoricalState> => {
    const cached = historicalStateRef.current[orderId];
    if (cached?.status === "loaded" || cached?.status === "error") {
      return cached;
    }

    const inflight = historicalRequestsRef.current.get(orderId);
    if (inflight) {
      return inflight;
    }

    setHistoricalState((prev) => ({
      ...prev,
      [orderId]: {
        status: "loading",
        items: prev[orderId]?.items ?? [],
        error: null,
      },
    }));

    const request = historical(orderId, 0)
      .then((items: OrderItemHistoricalModel[]) => {
        const filteredItems = items.filter((item) => !item.isCurrent);
        return Promise.all(
          filteredItems.map(async (item): Promise<GroupedOrderHistoricalDetail> => {
            try {
              const detail = await getByOrderIdAndOrderItemId(orderId, item.id);
              return { history: item, detail };
            } catch {
              return { history: item, detail: null };
            }
          })
        ).then((details) => {
          const nextState: GroupedOrderHistoricalState = {
            status: "loaded",
            items: details,
            error: null,
          };
          setHistoricalState((prev) => ({
            ...prev,
            [orderId]: nextState,
          }));
          return nextState;
        });
      })
      .catch((error: unknown) => {
        const nextState: GroupedOrderHistoricalState = {
          status: "error",
          items: [],
          error: error instanceof Error ? error.message : "Không tải được lịch sử đơn hàng",
        };
        setHistoricalState((prev) => ({
          ...prev,
          [orderId]: nextState,
        }));
        return nextState;
      })
      .finally(() => {
        historicalRequestsRef.current.delete(orderId);
      });

    historicalRequestsRef.current.set(orderId, request);
    return request;
  }, []);

  const handleToggleExpand = React.useCallback((orderId: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }, []);

  const groupedSchema = React.useMemo(
    () => createGroupedOrderTableSchema({
      collapsedIds,
      fetchOrders,
      getHistoricalState,
      ensureHistoricalLoaded,
      onToggleExpand: handleToggleExpand,
    }),
    [collapsedIds, ensureHistoricalLoaded, fetchOrders, getHistoricalState, handleToggleExpand]
  );

  const handleModeChange = React.useCallback(
    (_event: React.MouseEvent<HTMLElement>, nextMode: OrderTableMode | null) => {
      if (!nextMode || nextMode === mode) return;
      setMode(nextMode);
    },
    [mode]
  );

  return (
    <SectionCard title="Quản lý đơn hàng" extra={
      <>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={handleModeChange}
          sx={{ mr: 1 }}
        >
          <ToggleButton value="normal">
            <ViewAgendaRoundedIcon fontSize="small" sx={{ mr: 0.75 }} />
            Normal
          </ToggleButton>
          <ToggleButton value="grouping">
            <AccountTreeOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} />
            Grouping
          </ToggleButton>
        </ToggleButtonGroup>
        <IfPermission permissions={["order.create"]}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
            openFormDialog("order-new");
          }} >Tạo đơn hàng mới</Button>
        </IfPermission>
      </>
    }>
      {mode === "normal" ? (
        <AutoTable key={`normal-${refreshToken}`} name="orders" params={{ advancedSearchFilters: appliedFilters }} />
      ) : (
        <AutoTable
          key={`grouping-${refreshToken}-${groupedRefreshToken}`}
          schema={groupedSchema}
        />
      )}
    </SectionCard>
  );
}

registerSlot({
  id: "order",
  name: "order:left",
  priority: 1,
  render: () => <OrderListWidget />,
});

// registerSlot({
//   id: "order-newest",
//   name: "order:top",
//   render: () => (
//     <>
//       <SectionCard title="Đơn mới">
//         <AutoTable name="order-newest" />
//       </SectionCard>
//     </>
//   ),
//   priority: 3,
// });

// registerSlot({
//   id: "order-inprogress",
//   name: "order:top",
//   render: () => (
//     <>
//       <SectionCard title="Đang gia công">
//         <AutoTable name="order-inprogress" />
//       </SectionCard>
//     </>
//   ),
//   priority: 2,
// });

// registerSlot({
//   id: "order-completed",
//   name: "order:top",
//   render: () => (
//     <>
//       <SectionCard title="Hoàn thành">
//         <AutoTable name="order-completed" />
//       </SectionCard>
//     </>
//   ),
//   priority: 1,
// });
