import { ApiServiceError } from "@core/network/api-error";
import {
  deletePrescriptionFile,
  listPrescriptionFiles,
  uploadPrescriptionFile,
} from "../api/order-prescription-file.api";
import { useOrderPrescriptionFileStore } from "./order-prescription-file.store";

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiServiceError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Thao tác file thất bại.";
}

export async function hydratePrescriptionFiles(scopeKey: string, orderId?: number | null) {
  const store = useOrderPrescriptionFileStore.getState();
  store.ensureScope(scopeKey);

  if (!orderId || orderId <= 0) {
    store.setPersistedFiles(scopeKey, []);
    return;
  }

  store.setLoading(scopeKey, true);
  try {
    const files = await listPrescriptionFiles(orderId);
    store.setPersistedFiles(scopeKey, files);
  } finally {
    store.setLoading(scopeKey, false);
  }
}

export async function syncDeferredPrescriptionFiles(scopeKey: string, orderId: number) {
  const store = useOrderPrescriptionFileStore.getState();
  const scope = store.scopes[scopeKey];
  if (!scope || !orderId) return;

  const errors: string[] = [];

  for (const fileId of [...scope.pendingDeleteIds]) {
    try {
      await deletePrescriptionFile(orderId, fileId);
      store.commitDeletedFile(scopeKey, fileId);
    } catch (error) {
      store.restorePersistedFile(scopeKey, fileId);
      errors.push(getErrorMessage(error));
    }
  }

  const currentScope = useOrderPrescriptionFileStore.getState().scopes[scopeKey];
  for (const item of [...(currentScope?.queuedFiles ?? [])]) {
    store.setQueuedFileStatus(scopeKey, item.localId, "pending", null);
    try {
      const uploaded = await uploadPrescriptionFile(orderId, item.file);
      store.removeQueuedFile(scopeKey, item.localId);
      store.appendPersistedFile(scopeKey, uploaded);
    } catch (error) {
      store.setQueuedFileStatus(scopeKey, item.localId, "error", getErrorMessage(error));
      errors.push(getErrorMessage(error));
    }
  }

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }
}
