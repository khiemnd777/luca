import * as React from "react";

export type SlotPredicateCtx = {
  roles?: string[];
  permissions?: string[];
  extras?: Record<string, unknown>;
};

export type SlotConfig = {
  id: string;
  name: string; // ví dụ: "me:header:left", "me:body:center"
  priority?: number;
  render: () => React.ReactNode;
  visibleIf?: (ctx: SlotPredicateCtx) => boolean;
};

type Registry = Map<string, SlotConfig[]>;

const Ctx = React.createContext<{
  register: (cfg: SlotConfig) => void;
  unregister: (id: string) => void;
  listByName: (name: string, ctx?: SlotPredicateCtx) => SlotConfig[];
}>({
  register: () => {},
  unregister: () => {},
  listByName: () => [],
});

export function ModuleSlotProvider({ children }: { children: React.ReactNode }) {
  const regRef = React.useRef<Registry>(new Map());

  const register = React.useCallback((cfg: SlotConfig) => {
    const arr = regRef.current.get(cfg.name) ?? [];
    const i = arr.findIndex((x) => x.id === cfg.id);
    if (i >= 0) arr[i] = cfg;
    else arr.push(cfg);
    arr.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    regRef.current.set(cfg.name, arr);
  }, []);

  const unregister = React.useCallback((id: string) => {
    for (const [k, arr] of regRef.current.entries()) {
      const next = arr.filter((x) => x.id !== id);
      regRef.current.set(k, next);
    }
  }, []);

  const listByName = React.useCallback((name: string, ctx?: SlotPredicateCtx) => {
    const items = regRef.current.get(name) ?? [];
    return items.filter((x) => (x.visibleIf ? x.visibleIf(ctx ?? {}) : true));
  }, []);

  const value = React.useMemo(() => ({ register, unregister, listByName }), [register, unregister, listByName]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useModuleSlotRegistry() {
  return React.useContext(Ctx);
}

export function useRegisterSlot(cfg: SlotConfig) {
  const { register, unregister } = useModuleSlotRegistry();
  React.useEffect(() => {
    register(cfg);
    return () => unregister(cfg.id);
  }, [cfg.id, cfg.name, cfg.priority, cfg.render, cfg.visibleIf, register, unregister]);
}

/** Host: render toàn bộ widget đã đăng ký cho slot `name` */
export function SlotHost({ name, ctx }: { name: string; ctx?: SlotPredicateCtx }) {
  const { listByName } = useModuleSlotRegistry();
  const items = listByName(name, ctx);
  if (items.length === 0) return null;
  return <>{items.map((x) => <React.Fragment key={x.id}>{x.render()}</React.Fragment>)}</>;
}
