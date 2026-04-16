export const generateTitle = (currentCode: string | undefined, latestCode: string | undefined) => {
  const isOriginal = latestCode === currentCode;
  const originalCodeLabel = !isOriginal && currentCode ? ` ⬅ Mã gốc: ${currentCode}` : "";
  latestCode = latestCode ?? "";
  return latestCode ? `Mã: ${latestCode}${originalCodeLabel}` : "";
};

export const buildProductProcessLabel = (item?: {
  productCode?: string | null;
  productName?: string | null;
  processName?: string | null;
}) => {
  const productLabel = [item?.productCode, item?.productName].filter(Boolean).join(" - ");
  if (productLabel && item?.processName) {
    return `${productLabel} > ${item.processName}`;
  }
  return productLabel || item?.processName || "";
};

export const buildProductNameLabel = (item?: {
  productName?: string | null;
}) => {
  return item?.productName?.trim() ?? "";
};

export const buildProcessNameLabel = (item?: {
  processName?: string | null;
}) => {
  return item?.processName?.trim() ?? "";
};

export const buildProductLabel = (item?: {
  productCode?: string | null;
  productName?: string | null;
}) => {
  return [item?.productCode, item?.productName].filter(Boolean).join(" - ");
};

export const buildInProgressProductTabLabel = (item?: {
  productName?: string | null;
}) => {
  return item?.productName?.trim() || "Sản phẩm";
};
