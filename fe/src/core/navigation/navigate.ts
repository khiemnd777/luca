import type { NavigateFunction, NavigateOptions, To } from "react-router-dom";

let navigatorRef: NavigateFunction | null = null;

export function setNavigator(n: NavigateFunction) {
  navigatorRef = n;
}

export function navigate(to: To, opts?: NavigateOptions) {
  if (!navigatorRef) return;
  navigatorRef(to, opts);
}
