export type CodeNameLike = {
  code?: string | null;
  name?: string | null;
};

export function formatCodeNameLabel(input?: CodeNameLike | null): string {
  if (!input) return "";

  const name = input.name?.trim() ?? "";
  return name;
}
