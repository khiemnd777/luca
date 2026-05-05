import React from "react";
import { registerSlot } from "@core/module/registry";
import { SectionCard } from "@shared/components/ui/section-card";
import { IfPermission } from "@core/auth/if-permission";
import { SafeButton } from "@shared/components/button/safe-button";
import { AutoForm } from "@core/form/auto-form";
import type { AutoFormRef } from "@root/core/form/form.types";
import { useAsync } from "@root/core/hooks/use-async";
import {
  Alert,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  getCheckoutLatest,
  prepareCheckInOrOutByCode,
} from "../api/order-item-process.api";
import type { OrderItemProcessInProgressModel } from "../model/order-item-process-inprogress.model";
import type { OrderItemProcessInProgressProcessModel } from "../model/order-item-process-inprogress-process.model";
import { OrderQrScanner } from "../components/order-scanner.component";
import { Spacer } from "@root/shared/components/ui/spacer";
import InputIcon from '@mui/icons-material/Input';
import OutputIcon from '@mui/icons-material/Output';
import { Section } from "@root/shared/components/ui/section";
import { useIsMobile } from "@root/shared/utils/media.utils";
import { AutoFormButtons } from "@root/core/form/auto-form-buttons";
import { off, on } from "@root/core/module/event-bus";
import toast from "react-hot-toast";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import { buildProcessNameLabel, buildProductNameLabel } from "../utils/order.utils";

type CheckCodeStep = "select-product" | "check-in";

export function OrderProcessCheckCodeWidget() {
  const [orderCode, setOrderCode] = React.useState<string | undefined>("");
  const frmProcessCheckInOrOutRef = React.useRef<AutoFormRef>(null);
  const formCheckCodeRef = React.useRef<AutoFormRef>(null);
  const isMobile = useIsMobile();
  const [selectedTargetKey, setSelectedTargetKey] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<CheckCodeStep>("check-in");

  React.useEffect(() => {
    const handler = (nextCode: string) => {
      setOrderCode(nextCode);
    };

    on("order:check-code", handler);
    return () => off("order:check-code", handler);
  }, []);

  const {
    data: preparedData,
    loading: loadingPrepared,
    error: preparedDataError,
  } =
    useAsync<OrderItemProcessInProgressModel | null>(() => {
      if (!orderCode) return Promise.resolve(null);
      return prepareCheckInOrOutByCode(orderCode);
    }, [orderCode], {
      key: `order-process-check-code:${orderCode ?? ""}`,
    });
  React.useEffect(() => {
    if (preparedDataError) {
      toast.error("Mã đơn hàng lỗi hoặc không tồn tại");
    }
  }, [preparedDataError]);

  React.useEffect(() => {
    if (!preparedData) {
      setSelectedTargetKey(null);
      setStep("check-in");
      return;
    }

    const targets = preparedData.availableTargets ?? [];
    const defaultTarget = targets[0];
    const target = defaultTarget ?? preparedData;
    setSelectedTargetKey(buildTargetKey(target));
    setStep(targets.length > 1 ? "select-product" : "check-in");
  }, [preparedData]);

  const currentTarget = React.useMemo(() => {
    if (!preparedData) return null;
    const targets = preparedData.availableTargets ?? [];
    if (targets.length === 0) return preparedData;
    return targets.find((item) => buildTargetKey(item) === selectedTargetKey) ?? targets[0];
  }, [preparedData, selectedTargetKey]);
  const availableTargets = preparedData?.availableTargets ?? [];
  const hasMultipleTargets = (preparedData?.availableTargets?.length ?? 0) > 1;
  const isSelectProductStep = hasMultipleTargets && step === "select-product";

  const { data: checkoutLatestData, loading: loadingCheckoutLatest } =
    useAsync<OrderItemProcessInProgressProcessModel | null>(() => {
      if (!currentTarget?.orderId || !currentTarget?.orderItemId) {
        return Promise.resolve(null);
      }
      return getCheckoutLatest(currentTarget.orderId, currentTarget.orderItemId, currentTarget.productId);
    }, [currentTarget?.orderId, currentTarget?.orderItemId, currentTarget?.productId], {
      key: `order-process-check-code-latest:${currentTarget?.orderId ?? ""}:${currentTarget?.orderItemId ?? ""}:${currentTarget?.productId ?? ""}`,
    });

  const isCheckout = Boolean(currentTarget?.id);
  const isPendingDentistReview = currentTarget?.mode === "dentist_review";
  const header = "Hiện tại";
  const currentFormKey = [
    currentTarget?.orderId ?? 0,
    currentTarget?.orderItemId ?? 0,
    currentTarget?.productId ?? 0,
    currentTarget?.processId ?? 0,
    currentTarget?.id ?? 0,
    isCheckout ? "check-out" : "check-in",
  ].join(":");

  const title = React.useMemo(() => {
    const codeTitle = currentTarget?.orderItemCode;
    return codeTitle ? `Mã: ${codeTitle}` : "Đơn hàng";
  }, [currentTarget?.orderItemCode]);

  return (
    <>
      {preparedData ? (
        <>
          <Section>
            {loadingPrepared ? (
              <Stack alignItems="center" py={2}>
                <CircularProgress size={22} />
              </Stack>
            ) : (
              <Typography variant="subtitle1" fontWeight={700}>
                {title}
              </Typography>
            )}
          </Section>
          <Spacer />
          {isSelectProductStep ? (
            <>
              <SectionCard
                title="Chọn sản phẩm"
                extra={
                  <IfPermission permissions={["order.development"]}>
                    <SafeButton
                      variant="contained"
                      disabled={!currentTarget}
                      onClick={() => setStep("check-in")}
                    >
                      Tiếp tục
                    </SafeButton>
                  </IfPermission>
                }
              >
                <TextField
                  fullWidth
                  select
                  size="small"
                  label="Sản phẩm"
                  value={selectedTargetKey ?? ""}
                  onChange={(event) => setSelectedTargetKey(event.target.value)}
                >
                  {availableTargets.map((target) => (
                    <MenuItem key={buildTargetKey(target)} value={buildTargetKey(target)}>
                      {buildProductNameLabel(target) || "—"}
                    </MenuItem>
                  ))}
                </TextField>
              </SectionCard>
              <Spacer />
            </>
          ) : null}
          {!isSelectProductStep ? (
            <>
              {isPendingDentistReview ? (
                <>
                  <DentistReviewPendingPanel
                    target={currentTarget}
                    previousProcess={checkoutLatestData}
                    loadingPreviousProcess={loadingCheckoutLatest}
                  />
                  <Spacer />
                </>
              ) : (
                <>
                  <Section>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {hasMultipleTargets ? (
                        <SafeButton
                          variant="outlined"
                          icon={<KeyboardBackspaceIcon />}
                          onClick={() => setStep("select-product")}
                        >
                          Đổi sản phẩm
                        </SafeButton>
                      ) : null}
                      <IfPermission permissions={["order.development"]}>
                        <SafeButton
                          variant="contained"
                          icon={isCheckout ? <OutputIcon /> : <InputIcon />}
                          onClick={() => frmProcessCheckInOrOutRef.current?.submit()}
                        >
                          {isCheckout ? "Check out" : "Check in"}
                        </SafeButton>
                      </IfPermission>
                    </Stack>
                  </Section>
                  <Spacer />
                  <SectionCard title={header}>
                    {loadingPrepared ? (
                      <Stack alignItems="center" py={2}>
                        <CircularProgress size={22} />
                      </Stack>
                    ) : (
                      <AutoForm
                        key={currentFormKey}
                        name={isCheckout ? 'order-process-inprogress-check-out' : 'order-process-inprogress-check-in'}
                        ref={frmProcessCheckInOrOutRef}
                        initial={currentTarget ?? {}}
                      />
                    )}
                  </SectionCard>
                  <Spacer />
                </>
              )}
              {!isPendingDentistReview && (loadingCheckoutLatest || checkoutLatestData?.id) ? (
                <SectionCard title="Công đoạn trước">
                  {loadingCheckoutLatest ? (
                    <Stack alignItems="center" py={2}>
                      <CircularProgress size={22} />
                    </Stack>
                  ) : (
                    <AutoForm
                      name="order-process-inprogress-prev"
                      initial={checkoutLatestData ?? {}}
                    />
                  )}
                </SectionCard>
              ) : null}
            </>
          ) : null}
        </>
      ) : isMobile ? (
        <OrderQrScanner onDetected={(nextCode) => setOrderCode(nextCode)} />
      ) : (
        <SectionCard>
          <AutoForm name="order-process-check-code" ref={formCheckCodeRef} />
          <Spacer />
          <AutoFormButtons formRef={formCheckCodeRef} />
        </SectionCard>
      )}
    </>
  );
}

type DentistReviewPendingPanelProps = {
  target: OrderItemProcessInProgressModel;
  previousProcess?: OrderItemProcessInProgressProcessModel | null;
  loadingPreviousProcess: boolean;
};

function DentistReviewPendingPanel({
  target,
  previousProcess,
  loadingPreviousProcess,
}: DentistReviewPendingPanelProps) {
  const requestNote =
    target.dentistReviewRequestNote ??
    target.dentistReview?.requestNote ??
    "";

  return (
    <SectionCard title="Chờ nha sĩ check">
      <Stack spacing={2}>
        <Alert severity="info" variant="outlined">
          Công đoạn này đang chờ Admin ghi nhận kết quả nha sĩ check trong màn Chi tiết đơn hàng.
        </Alert>

        <Stack spacing={1}>
          <ReviewInfoRow label="Sản phẩm" value={buildProductNameLabel(target) || "—"} />
          <ReviewInfoRow
            label="Công đoạn đã hoàn thành"
            value={
              loadingPreviousProcess
                ? "Đang tải..."
                : buildProcessNameLabel(previousProcess ?? {}) || "—"
            }
          />
          <ReviewInfoRow label="Công đoạn hiện tại" value={buildProcessNameLabel(target) || "—"} />
          <ReviewInfoRow label="Nội dung cần nha sĩ check" value={requestNote || "—"} preserveLineBreaks />
        </Stack>
      </Stack>
    </SectionCard>
  );
}

function ReviewInfoRow({
  label,
  value,
  preserveLineBreaks,
}: {
  label: string;
  value: string;
  preserveLineBreaks?: boolean;
}) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: preserveLineBreaks ? "pre-wrap" : undefined }}>
        {value}
      </Typography>
    </Stack>
  );
}

function buildTargetKey(target?: {
  id?: number | null;
  processId?: number | null;
  productId?: number | null;
}) {
  return `${target?.id ?? 0}:${target?.processId ?? 0}:${target?.productId ?? 0}`;
}

registerSlot({
  id: "order-process-check-code",
  name: "order-process-check-code:left",
  priority: 99,
  render: () => <OrderProcessCheckCodeWidget />,
});
