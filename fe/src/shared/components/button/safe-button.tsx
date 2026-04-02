import * as React from "react";
import { Button, Tooltip, CircularProgress, type ButtonProps } from "@mui/material";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import { styled } from "@mui/material/styles";

type MaybePromise<T = unknown> = T | Promise<T>;

const IconPlaceholder = styled("span")({
  display: "inline-block",
  width: 16,
  height: 16,
});

export type SafeButtonProps = Omit<ButtonProps, "onClick" | "children" | "startIcon"> & {
  onClick?: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) =>
    ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) |
    React.MouseEventHandler<HTMLButtonElement> |
    MaybePromise<unknown> |
    undefined;

  formRef?: React.RefObject<any>;
  debounceMs?: number;
  cooldownMs?: number;
  requireDirty?: boolean;
  requireValid?: boolean;
  label?: string;
  icon?: React.ReactNode;
  loadingIcon?: React.ReactNode;
  preserveIconSpace?: boolean;
  startIcon?: React.ReactNode;
  children?: React.ReactNode;
};

export const SafeButton = React.forwardRef<HTMLButtonElement, SafeButtonProps>(function SafeButton(
  {
    onClick,
    formRef,
    debounceMs = 300,
    cooldownMs = 1200,
    requireDirty = true,
    requireValid = true,
    label = "Lưu",
    icon,
    loadingIcon,
    preserveIconSpace = true,

    children,
    variant = "contained",
    startIcon,
    ...rest
  },
  ref
) {
  const [inFlight, setInFlight] = React.useState(false);
  const [coolingDown, setCoolingDown] = React.useState(false);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // signals từ form (nếu có)
  const isDirty = formRef?.current?.dirty ?? true;
  const isValid = formRef?.current?.isValid?.() ?? true;
  const validating = formRef?.current?.validating ?? false;

  const disabled =
    inFlight ||
    coolingDown ||
    (requireValid && (validating || !isValid)) ||
    (requireDirty && !isDirty) ||
    rest.disabled === true;

  const reason = (() => {
    if (inFlight) return "Đang xử lý…";
    if (coolingDown) return "Vui lòng chờ một chút";
    if (requireValid && validating) return "Đang kiểm tra dữ liệu";
    if (requireValid && !isValid) return "Form chưa hợp lệ";
    if (requireDirty && !isDirty) return "Chưa có thay đổi";
    return undefined;
  })();

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          setInFlight(true);
          // truyền event vào onClick nếu bạn cần dùng
          await onClick?.(event);
          setCoolingDown(true);
          cooldownRef.current = setTimeout(() => setCoolingDown(false), cooldownMs);
        } finally {
          setInFlight(false);
        }
      }, debounceMs);
    },
    [disabled, onClick, debounceMs, cooldownMs]
  );

  // spinner mặc định
  const defaultLoadingIcon = (
    <CircularProgress size={16} thickness={5} color="inherit" />
  );

  const computedStartIcon = inFlight
    ? (loadingIcon ?? defaultLoadingIcon)
    : (startIcon ?? icon ?? <SaveOutlined />);

  const startAdornment = React.useMemo(() => {
    if (inFlight) return computedStartIcon;
    if (computedStartIcon) return computedStartIcon;
    if (!preserveIconSpace) return undefined;
    return <IconPlaceholder />;
  }, [inFlight, computedStartIcon, preserveIconSpace]);

  const btn = (
    <Button
      ref={ref}
      variant={variant}
      startIcon={startAdornment}
      onClick={handleClick}
      disabled={disabled}
      {...rest}
    >
      {inFlight ? (children ?? label) : (children ?? label)}
    </Button>
  );

  return reason ? <Tooltip title={reason}>{btn}</Tooltip> : btn;
});
