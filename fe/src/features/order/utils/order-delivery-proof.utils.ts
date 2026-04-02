import type { OrderItemModel } from "../model/order-item.model";
import type { OrderModel } from "../model/order.model";

const PROOF_RELATION_KEYS = [
  "deliveryProofs",
  "delivery_proofs",
  "orderDeliveryProofs",
  "order_delivery_proofs",
] as const;

function isDirectProofUrl(value?: string | null): value is string {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  return normalized.startsWith("/api/") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("data:");
}

function normalizeProofCandidate(value?: string | null) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  return isDirectProofUrl(normalized) ? normalized : undefined;
}

function collectProofCandidates(source: unknown): string[] {
  if (!source || typeof source !== "object") return [];

  const record = source as Record<string, unknown>;
  const candidates: Array<string | undefined> = [
    normalizeProofCandidate(record.proofImageUrl as string | undefined),
    normalizeProofCandidate(record.proof_image_url as string | undefined),
    normalizeProofCandidate(record.imageUrl as string | undefined),
    normalizeProofCandidate(record.image_url as string | undefined),
  ];

  for (const key of PROOF_RELATION_KEYS) {
    const relation = record[key];
    if (Array.isArray(relation)) {
      for (const item of relation) {
        candidates.push(...collectProofCandidates(item));
      }
      continue;
    }
    if (relation && typeof relation === "object") {
      candidates.push(...collectProofCandidates(relation));
    }
  }

  return candidates.filter((value): value is string => Boolean(value));
}

export type ResolveDeliveryProofUrlInput = {
  order: unknown;
  orderItem: unknown;
  orderItemId?: number | null;
  fallbackUrlFactory: (orderItemId: number) => string;
};

export function resolveDeliveryProofUrl(input: ResolveDeliveryProofUrlInput): string | undefined {
  const { order, orderItem, orderItemId, fallbackUrlFactory } = input;
  if (!orderItemId) return undefined;

  const candidates = [
    ...collectProofCandidates(order),
    ...collectProofCandidates(orderItem),
  ];
  const proofImageUrl = candidates.find((value, index) => candidates.indexOf(value) === index);
  if (proofImageUrl) return proofImageUrl;

  return fallbackUrlFactory(orderItemId);
}

export function resolveLatestOrderItem(detail: OrderModel): Partial<OrderItemModel> | null {
  const source = detail?.latestOrderItem ?? detail?.latestOrderItemUpsert ?? null;
  if (!source || typeof source !== "object") return null;
  if ("dto" in source && source.dto && typeof source.dto === "object") {
    return source.dto as Partial<OrderItemModel>;
  }
  return source as Partial<OrderItemModel>;
}
