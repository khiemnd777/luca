import { create } from "zustand";
import type { OrderAdvancedSearchFilters } from "@features/order/model/order-advanced-search.model";

const defaultFilters = (): OrderAdvancedSearchFilters => ({
  department: null,
  categories: [],
  products: [],
  dentistName: "",
  patientName: "",
  createdYear: "",
  createdMonth: "",
  deliveryYear: "",
  deliveryMonth: "",
});

type OrderAdvancedSearchState = {
  draftFilters: OrderAdvancedSearchFilters;
  appliedFilters: OrderAdvancedSearchFilters;
  refreshToken: number;
  setDraftFilters: (patch: Partial<OrderAdvancedSearchFilters>) => void;
  setDraftFilter: <K extends keyof OrderAdvancedSearchFilters>(key: K, value: OrderAdvancedSearchFilters[K]) => void;
  applyFilters: () => void;
  resetFilters: () => void;
};

export const useOrderAdvancedSearchStore = create<OrderAdvancedSearchState>((set) => ({
  draftFilters: defaultFilters(),
  appliedFilters: defaultFilters(),
  refreshToken: 0,
  setDraftFilters: (patch) =>
    set((state) => ({
      draftFilters: {
        ...state.draftFilters,
        ...patch,
      },
    })),
  setDraftFilter: (key, value) =>
    set((state) => ({
      draftFilters: {
        ...state.draftFilters,
        [key]: value,
      },
    })),
  applyFilters: () =>
    set((state) => ({
      appliedFilters: cloneFilters(state.draftFilters),
      refreshToken: state.refreshToken + 1,
    })),
  resetFilters: () =>
    set((state) => ({
      draftFilters: defaultFilters(),
      appliedFilters: defaultFilters(),
      refreshToken: state.refreshToken + 1,
    })),
}));

export function cloneFilters(filters: OrderAdvancedSearchFilters): OrderAdvancedSearchFilters {
  return {
    department: filters.department ? { ...filters.department } : null,
    categories: [...filters.categories],
    products: [...filters.products],
    dentistName: filters.dentistName,
    patientName: filters.patientName,
    createdYear: filters.createdYear,
    createdMonth: filters.createdMonth,
    deliveryYear: filters.deliveryYear,
    deliveryMonth: filters.deliveryMonth,
  };
}

export function hasAdvancedSearchFilters(filters: OrderAdvancedSearchFilters): boolean {
  return Boolean(
    filters.department?.id ||
    filters.categories.length ||
    filters.products.length ||
    filters.dentistName.trim() ||
    filters.patientName.trim() ||
    filters.createdYear.trim() ||
    filters.createdMonth.trim() ||
    filters.deliveryYear.trim() ||
    filters.deliveryMonth.trim()
  );
}

export function serializeAdvancedSearchFilters(filters: OrderAdvancedSearchFilters): string {
  return [
    `department=${filters.department?.id ?? 0}`,
    `categories=${filters.categories.map((item) => item.id).filter(Boolean).join(",")}`,
    `products=${filters.products.map((item) => item.id).filter(Boolean).join(",")}`,
    `dentist=${filters.dentistName.trim()}`,
    `patient=${filters.patientName.trim()}`,
    `createdYear=${filters.createdYear.trim()}`,
    `createdMonth=${filters.createdMonth.trim()}`,
    `deliveryYear=${filters.deliveryYear.trim()}`,
    `deliveryMonth=${filters.deliveryMonth.trim()}`,
  ].join("|");
}
