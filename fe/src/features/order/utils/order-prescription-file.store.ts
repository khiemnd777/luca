import { create } from "zustand";
import type {
  LocalPrescriptionQueueItem,
  OrderPrescriptionFileModel,
  PrescriptionUploadState,
} from "../model/order-prescription-file.model";

type PrescriptionScopeState = {
  persistedFiles: OrderPrescriptionFileModel[];
  queuedFiles: LocalPrescriptionQueueItem[];
  pendingDeleteIds: number[];
  loading: boolean;
};

type PrescriptionScopeController = {
  setOrderValues: (patch: Record<string, unknown>) => void;
};

type PrescriptionStoreState = {
  scopes: Record<string, PrescriptionScopeState>;
  ensureScope: (scopeKey: string) => void;
  setLoading: (scopeKey: string, loading: boolean) => void;
  setPersistedFiles: (scopeKey: string, files: OrderPrescriptionFileModel[]) => void;
  appendQueuedFiles: (scopeKey: string, files: LocalPrescriptionQueueItem[]) => void;
  removeQueuedFile: (scopeKey: string, localId: string) => void;
  setQueuedFileStatus: (
    scopeKey: string,
    localId: string,
    uploadState: PrescriptionUploadState,
    errorMessage?: string | null
  ) => void;
  appendPersistedFile: (scopeKey: string, file: OrderPrescriptionFileModel) => void;
  markPersistedFileDeleted: (scopeKey: string, fileId: number) => void;
  restorePersistedFile: (scopeKey: string, fileId: number) => void;
  commitDeletedFile: (scopeKey: string, fileId: number) => void;
  clearQueuedFiles: (scopeKey: string) => void;
  destroyScope: (scopeKey: string) => void;
};

const defaultScopeState = (): PrescriptionScopeState => ({
  persistedFiles: [],
  queuedFiles: [],
  pendingDeleteIds: [],
  loading: false,
});

export const useOrderPrescriptionFileStore = create<PrescriptionStoreState>((set, get) => ({
  scopes: {},
  ensureScope: (scopeKey) => {
    if (!scopeKey || get().scopes[scopeKey]) return;
    set((state) => ({
      scopes: {
        ...state.scopes,
        [scopeKey]: defaultScopeState(),
      },
    }));
  },
  setLoading: (scopeKey, loading) => {
    get().ensureScope(scopeKey);
    set((state) => ({
      scopes: {
        ...state.scopes,
        [scopeKey]: {
          ...state.scopes[scopeKey],
          loading,
        },
      },
    }));
  },
  setPersistedFiles: (scopeKey, files) => {
    get().ensureScope(scopeKey);
    set((state) => ({
      scopes: {
        ...state.scopes,
        [scopeKey]: {
          ...state.scopes[scopeKey],
          persistedFiles: files,
        },
      },
    }));
  },
  appendQueuedFiles: (scopeKey, files) => {
    get().ensureScope(scopeKey);
    set((state) => ({
      scopes: {
        ...state.scopes,
        [scopeKey]: {
          ...state.scopes[scopeKey],
          queuedFiles: [...state.scopes[scopeKey].queuedFiles, ...files],
        },
      },
    }));
  },
  removeQueuedFile: (scopeKey, localId) => {
    get().ensureScope(scopeKey);
    set((state) => ({
      scopes: {
        ...state.scopes,
        [scopeKey]: {
          ...state.scopes[scopeKey],
          queuedFiles: state.scopes[scopeKey].queuedFiles.filter((item) => item.localId !== localId),
        },
      },
    }));
  },
  setQueuedFileStatus: (scopeKey, localId, uploadState, errorMessage = null) => {
    get().ensureScope(scopeKey);
    set((state) => ({
      scopes: {
        ...state.scopes,
        [scopeKey]: {
          ...state.scopes[scopeKey],
          queuedFiles: state.scopes[scopeKey].queuedFiles.map((item) =>
            item.localId === localId ? { ...item, uploadState, errorMessage } : item
          ),
        },
      },
    }));
  },
  appendPersistedFile: (scopeKey, file) => {
    get().ensureScope(scopeKey);
    set((state) => ({
      scopes: {
        ...state.scopes,
        [scopeKey]: {
          ...state.scopes[scopeKey],
          persistedFiles: [...state.scopes[scopeKey].persistedFiles, file],
        },
      },
    }));
  },
  markPersistedFileDeleted: (scopeKey, fileId) => {
    get().ensureScope(scopeKey);
    set((state) => ({
      scopes: {
        ...state.scopes,
        [scopeKey]: {
          ...state.scopes[scopeKey],
          pendingDeleteIds: Array.from(new Set([...state.scopes[scopeKey].pendingDeleteIds, fileId])),
        },
      },
    }));
  },
  restorePersistedFile: (scopeKey, fileId) => {
    get().ensureScope(scopeKey);
    set((state) => ({
      scopes: {
        ...state.scopes,
        [scopeKey]: {
          ...state.scopes[scopeKey],
          pendingDeleteIds: state.scopes[scopeKey].pendingDeleteIds.filter((id) => id !== fileId),
        },
      },
    }));
  },
  commitDeletedFile: (scopeKey, fileId) => {
    get().ensureScope(scopeKey);
    set((state) => ({
      scopes: {
        ...state.scopes,
        [scopeKey]: {
          ...state.scopes[scopeKey],
          persistedFiles: state.scopes[scopeKey].persistedFiles.filter((item) => item.id !== fileId),
          pendingDeleteIds: state.scopes[scopeKey].pendingDeleteIds.filter((id) => id !== fileId),
        },
      },
    }));
  },
  clearQueuedFiles: (scopeKey) => {
    get().ensureScope(scopeKey);
    set((state) => ({
      scopes: {
        ...state.scopes,
        [scopeKey]: {
          ...state.scopes[scopeKey],
          queuedFiles: [],
          pendingDeleteIds: [],
        },
      },
    }));
  },
  destroyScope: (scopeKey) => {
    if (!scopeKey) return;
    set((state) => {
      const nextScopes = { ...state.scopes };
      delete nextScopes[scopeKey];
      return { scopes: nextScopes };
    });
  },
}));

const scopeControllers = new Map<string, PrescriptionScopeController>();

export function registerPrescriptionScopeController(scopeKey: string, controller: PrescriptionScopeController) {
  if (!scopeKey) return;
  scopeControllers.set(scopeKey, controller);
}

export function unregisterPrescriptionScopeController(scopeKey: string) {
  if (!scopeKey) return;
  scopeControllers.delete(scopeKey);
}

export function getPrescriptionScopeController(scopeKey: string): PrescriptionScopeController | null {
  return scopeControllers.get(scopeKey) ?? null;
}
