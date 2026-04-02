import * as React from "react";

export type RouteMeta = {
  key: string;
  label?: string;
  title?: string;
  subtitle?: string;
  path: string;
};

const Ctx = React.createContext<RouteMeta | null>(null);

export function RouteMetaProvider({ meta, children }: { meta: RouteMeta; children: React.ReactNode }) {
  return <Ctx.Provider value={meta}>{children}</Ctx.Provider>;
}

export function useRouteMeta() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useRouteMeta must be used within <RouteMetaProvider>");
  return ctx;
}
