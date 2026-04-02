export function normalizeOrderPaymentFlags<T extends Record<string, any>>(values: T): T {
  const isCredit = !!values?.latestOrderItem?.isCredit;

  return {
    ...values,
    latestOrderItem: {
      ...(values?.latestOrderItem ?? {}),
      isCredit,
      isCash: !isCredit,
    },
  };
}
