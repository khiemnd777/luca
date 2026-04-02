import * as React from "react";
import { Button, type ButtonProps } from "@mui/material";
import styles from "./file-upload-button.module.css";

export type FileUploadButtonProps = Omit<ButtonProps, "onClick" | "startIcon"> & {
  onUpload: (file: File) => Promise<void> | void;
  accept?: string;
  label?: string;
  loadingLabel?: string;
  startIcon?: React.ReactNode;
};

export function FileUploadButton({
  onUpload,
  accept = "*",
  label = "Upload",
  loadingLabel = "Đang tải...",
  startIcon,
  disabled,
  ...rest
}: FileUploadButtonProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleClick = () => {
    if (isUploading || disabled) return;
    inputRef.current?.click();
  };

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <>
      <Button
        component="label"
        variant="outlined"
        startIcon={startIcon}
        disabled={disabled || isUploading}
        onClick={handleClick}
        aria-busy={isUploading}
        {...rest}
      >
        {isUploading ? loadingLabel : label}
        <input
          type="file"
          hidden
          accept={accept}
          onChange={handleChange}
          aria-label={label}
          className={styles.hiddenInput}
        />
      </Button>

    </>
  );
}
