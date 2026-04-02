import * as React from "react";
import { TextField, type TextFieldProps } from "@mui/material";

export type EmailOrPhoneFieldProps = Omit<TextFieldProps, "type"> & {
  label?: string;
};

export const EmailOrPhoneField = React.forwardRef<HTMLInputElement, EmailOrPhoneFieldProps>(
  function EmailOrPhoneField({ label = "Email or phone", ...rest }, ref) {
    return <TextField {...rest} type="text" label={label} inputRef={ref} />;
  }
);
