import * as React from "react";
import { useShallow } from "zustand/react/shallow";
import { useI18nStore } from "@store/i18n-store";

export function useI18n() {
  const state = useI18nStore(
    useShallow((store) => ({
      languages: store.languages,
      currentLanguageCode: store.currentLanguageCode,
      resources: store.resources,
      isBootstrapping: store.isBootstrapping,
      isReady: store.isReady,
      bootstrap: store.bootstrap,
      changeLanguage: store.changeLanguage,
      clear: store.clear,
    }))
  );

  const t = React.useCallback(
    (key: string, fallback?: string) => {
      return state.resources[key] ?? fallback ?? key;
    },
    [state.resources]
  );

  const currentLanguage = React.useMemo(
    () => state.languages.find((item) => item.code === state.currentLanguageCode) ?? null,
    [state.currentLanguageCode, state.languages]
  );

  return {
    ...state,
    currentLanguage,
    t,
  };
}
