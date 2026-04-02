import React, { createContext, useContext, useMemo } from "react";
import type { SkeletonScopeValue } from "@core/skeleton/types";

const SkeletonContext = createContext<SkeletonScopeValue>({
  loading: false,
  error: undefined,
  onRetry: undefined,
  dense: false,
  animate: true,
});

export type SkeletonProviderProps = Partial<SkeletonScopeValue> & {
  children: React.ReactNode;
};

export function SkeletonProvider({
  children,
  loading = false,
  error,
  onRetry,
  dense = false,
  animate = true,
}: SkeletonProviderProps) {
  const value = useMemo(
    () => ({ loading, error, onRetry, dense, animate }),
    [loading, error, onRetry, dense, animate]
  );
  return (
    <SkeletonContext.Provider value={value}>
      {children}
    </SkeletonContext.Provider>
  );
}

export function useSkeleton() {
  return useContext(SkeletonContext);
}
