import React from "react";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IconButton, InputAdornment, TextField } from "@mui/material";

export default function PasswordField({
  label,
  value,
  onChange,
  size = "small",
  fullWidth = true,
  error,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  size?: "small" | "medium";
  fullWidth?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <TextField
      label={label}
      fullWidth={fullWidth}
      size={size}
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={!!error}
      helperText={helperText}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setShow((s) => !s)}>
              {show ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}
