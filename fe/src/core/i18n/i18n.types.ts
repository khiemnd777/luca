export interface LanguageOption {
  code: string;
  name: string;
  nativeName?: string | null;
  isDefault?: boolean;
  active?: boolean;
}

export interface LanguagePreference {
  code: string | null;
}

export type ResourceDictionary = Record<string, string>;
