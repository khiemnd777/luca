import { packageData, type MetaBlock } from "./auto-form-package";

type SubmitRecord = Record<string, any>;

export type AutoFormSubmitContainer<TDto extends SubmitRecord = SubmitRecord> = {
  dto: TDto;
  collections: string[];
};

export function isSubmitDtoContainer<TDto extends SubmitRecord = SubmitRecord>(
  value: unknown,
): value is AutoFormSubmitContainer<TDto> {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AutoFormSubmitContainer<TDto>>;
  return "dto" in candidate && Array.isArray(candidate.collections);
}

export function expectSubmitDtoContainer<TDto extends SubmitRecord = SubmitRecord>(
  value: unknown,
): AutoFormSubmitContainer<TDto> {
  if (isSubmitDtoContainer<TDto>(value)) {
    return value;
  }

  throw new Error(
    "AutoForm submit values do not include { dto, collections }. Preserve that container in hooks.mapToDto or consume the flat submit payload directly.",
  );
}

export function mapPackagedDto<TDto extends SubmitRecord = SubmitRecord, TResult = TDto>(
  map: (dto: TDto, packaged: AutoFormSubmitContainer<TDto>) => TResult,
) {
  return (packaged: AutoFormSubmitContainer<TDto>) => map(packaged.dto, packaged);
}

export function resolveSubmitValues(
  metadataBlocks: MetaBlock[],
  values: SubmitRecord,
  mapToDto?: ((values: AutoFormSubmitContainer) => any) | undefined,
) {
  const packaged = packageData(metadataBlocks, values);
  return mapToDto ? mapToDto(packaged) : packaged;
}
