export const generateTitle = (currentCode: string | undefined, latestCode: string | undefined) => {
  const isOriginal = latestCode === currentCode;
  const originalCodeLabel = !isOriginal && currentCode ? ` ⬅ Mã gốc: ${currentCode}` : "";
  latestCode = latestCode ?? "";
  return latestCode ? `Mã: ${latestCode}${originalCodeLabel}` : "";
};