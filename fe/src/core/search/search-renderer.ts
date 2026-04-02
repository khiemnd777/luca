import * as React from "react";
import type { SearchModel } from "./search.model";

export type SearchRenderCtx = {
  q: string;
  highlight: (text: string) => React.ReactNode;
};

export type SearchRenderer = (option: SearchModel, ctx: SearchRenderCtx) => React.ReactNode;

export type SearchRendererEntry = {
  label: string;
  renderer: SearchRenderer;
  icon: React.ReactNode;
  getHref: (item: SearchModel) => string | void;
};

const registry = new Map<string, SearchRendererEntry>();

export function registerSearchRenderer(
  entityType: string,
  label: string,
  renderer: SearchRenderer,
  icon: React.ReactNode,
  getHref: (item: SearchModel) => string | void
) {
  registry.set(entityType, { label, renderer, icon, getHref });
}

export function getSearchRenderer(
  entityType: string
): SearchRendererEntry | undefined {
  return registry.get(entityType);
}
