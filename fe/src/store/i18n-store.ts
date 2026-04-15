import { create } from "zustand";
import { persist } from "zustand/middleware";
import toast from "react-hot-toast";
import {
  getMyLanguagePreference,
  getResourcesByCode,
  listActiveLanguages,
  updateMyLanguagePreference,
} from "@core/i18n/i18n.api";
import type {
  LanguageOption,
  ResourceDictionary,
} from "@core/i18n/i18n.types";

const FALLBACK_LANGUAGE_CODE = "vi-VN";

type I18nState = {
  languages: LanguageOption[];
  currentLanguageCode: string | null;
  resources: ResourceDictionary;
  isBootstrapping: boolean;
  isReady: boolean;
  bootstrap: () => Promise<void>;
  changeLanguage: (code: string) => Promise<void>;
  clear: () => void;
};

let bootstrapPromise: Promise<void> | null = null;

function resolveInitialCode(
  languages: LanguageOption[],
  preferredCode: string | null,
  currentLanguageCode: string | null
): string {
  const activeCodes = new Set(languages.map((item) => item.code));
  const defaultCode = languages.find((item) => item.isDefault)?.code ?? languages[0]?.code ?? null;

  for (const candidate of [preferredCode, currentLanguageCode, defaultCode, FALLBACK_LANGUAGE_CODE]) {
    if (!candidate) continue;
    if (activeCodes.size === 0 || activeCodes.has(candidate)) return candidate;
  }

  return FALLBACK_LANGUAGE_CODE;
}

async function safeFetchResources(code: string): Promise<ResourceDictionary> {
  try {
    return await getResourcesByCode(code);
  } catch {
    return {};
  }
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      languages: [],
      currentLanguageCode: null,
      resources: {},
      isBootstrapping: false,
      isReady: false,

      async bootstrap() {
        if (bootstrapPromise) return bootstrapPromise;

        bootstrapPromise = (async () => {
          set({ isBootstrapping: true });
          try {
            const [languagesResult, preferenceResult] = await Promise.allSettled([
              listActiveLanguages(),
              getMyLanguagePreference(),
            ]);

            const languages =
              languagesResult.status === "fulfilled" ? languagesResult.value : get().languages;
            const preferredCode =
              preferenceResult.status === "fulfilled" ? preferenceResult.value.code : null;

            const nextCode = resolveInitialCode(languages, preferredCode, get().currentLanguageCode);
            const resources = await safeFetchResources(nextCode);

            set({
              languages,
              currentLanguageCode: nextCode,
              resources,
              isReady: true,
              isBootstrapping: false,
            });
          } catch {
            const fallbackCode = get().currentLanguageCode ?? FALLBACK_LANGUAGE_CODE;
            const resources = await safeFetchResources(fallbackCode);

            set({
              currentLanguageCode: fallbackCode,
              resources,
              isReady: true,
              isBootstrapping: false,
            });
          } finally {
            bootstrapPromise = null;
          }
        })();

        return bootstrapPromise;
      },

      async changeLanguage(code) {
        const normalizedCode = code.trim();
        if (!normalizedCode) return;

        const currentCode = get().currentLanguageCode;
        if (currentCode === normalizedCode) return;
        const previousResources = get().resources;

        const resources = await safeFetchResources(normalizedCode);

        set({
          currentLanguageCode: normalizedCode,
          resources,
          isReady: true,
        });

        try {
          const preference = await updateMyLanguagePreference(normalizedCode);
          if (preference.code && preference.code !== normalizedCode) {
            const syncedResources = await safeFetchResources(preference.code);
            set({
              currentLanguageCode: preference.code,
              resources: syncedResources,
            });
          }
        } catch {
          set({
            currentLanguageCode: currentCode,
            resources: previousResources,
          });
          toast.error("Không thể lưu ngôn ngữ hiện tại lên máy chủ.");
        }
      },

      clear() {
        bootstrapPromise = null;
        set({
          languages: [],
          currentLanguageCode: null,
          resources: {},
          isBootstrapping: false,
          isReady: false,
        });
      },
    }),
    {
      name: "i18n-store",
      partialize: (state) => ({
        currentLanguageCode: state.currentLanguageCode,
      }),
    }
  )
);
