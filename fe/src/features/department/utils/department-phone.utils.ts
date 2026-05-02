type DepartmentPhoneShape = {
  phoneNumber?: string | null;
  phoneNumber2?: string | null;
  phoneNumber3?: string | null;
};

export function collectDepartmentPhoneNumbers(value?: DepartmentPhoneShape | null): string[] {
  if (!value) return [];

  return [value.phoneNumber, value.phoneNumber2, value.phoneNumber3]
    .map((item) => item?.trim() ?? "")
    .filter(Boolean);
}

export function formatDepartmentPhoneNumbers(value?: DepartmentPhoneShape | null): string {
  return collectDepartmentPhoneNumbers(value).join(" - ");
}

export function getPrimaryDepartmentPhoneNumber(value?: DepartmentPhoneShape | null): string {
  return collectDepartmentPhoneNumbers(value)[0] ?? "";
}

export function validateDepartmentPhoneNumber(val: string | null | undefined): string | null {
  if (!val) return null;
  const normalized = val.replace(/\s+/g, "").trim();
  const ok = /^\+?\d{8,15}$/.test(normalized);
  return ok ? null : "Invalid phone number";
}

export function toDepartmentPhoneDto<T extends DepartmentPhoneShape & Record<string, unknown>>(value: T): T & {
  phone_number_2?: string | null;
  phone_number_3?: string | null;
} {
  return {
    ...value,
    phone_number_2: value.phoneNumber2 ?? null,
    phone_number_3: value.phoneNumber3 ?? null,
  };
}

export function normalizeDepartmentSubmitDto(input: unknown): Record<string, unknown> {
  const source =
    input && typeof input === "object" && "dto" in (input as Record<string, unknown>)
      ? ((input as Record<string, unknown>).dto as Record<string, unknown> | undefined) ?? {}
      : ((input as Record<string, unknown> | null) ?? {});

  return {
    ...source,
    phone_number_2:
      (source.phone_number_2 as string | null | undefined) ??
      (source.phone_number2 as string | null | undefined) ??
      (source.phoneNumber2 as string | null | undefined) ??
      null,
    phone_number_3:
      (source.phone_number_3 as string | null | undefined) ??
      (source.phone_number3 as string | null | undefined) ??
      (source.phoneNumber3 as string | null | undefined) ??
      null,
    email:
      (source.email as string | null | undefined) ??
      null,
    tax:
      (source.tax as string | null | undefined) ??
      null,
  };
}

function pickValue<T>(...values: T[]): T | undefined {
  for (const value of values) {
    if (value !== undefined) return value;
  }
  return undefined;
}

export function buildDepartmentWirePayload(input: Record<string, unknown>): Record<string, unknown> {
  return {
    id: pickValue(input.id as number | undefined),
    active: pickValue(input.active as boolean | undefined),
    name: pickValue(input.name as string | undefined),
    logo: pickValue(input.logo as string | null | undefined),
    logo_rect: pickValue(
      input.logo_rect as string | null | undefined,
      input.logoRect as string | null | undefined,
    ),
    address: pickValue(input.address as string | null | undefined),
    phone_number: pickValue(
      input.phone_number as string | null | undefined,
      input.phoneNumber as string | null | undefined,
    ),
    phone_number_2: pickValue(
      input.phone_number_2 as string | null | undefined,
      input.phone_number2 as string | null | undefined,
      input.phoneNumber2 as string | null | undefined,
    ),
    phone_number_3: pickValue(
      input.phone_number_3 as string | null | undefined,
      input.phone_number3 as string | null | undefined,
      input.phoneNumber3 as string | null | undefined,
    ),
    email: pickValue(input.email as string | null | undefined),
    tax: pickValue(input.tax as string | null | undefined),
    parent_id: pickValue(
      input.parent_id as number | null | undefined,
      input.parentId as number | null | undefined,
    ),
    corporate_administrator_id: pickValue(
      input.corporate_administrator_id as number | null | undefined,
      input.corporateAdministratorId as number | null | undefined,
    ),
  };
}

export function buildDepartmentMutationWirePayload(input: Record<string, unknown>): Record<string, unknown> {
  const payload = buildDepartmentWirePayload(input);
  delete payload.corporate_administrator_id;
  return payload;
}
