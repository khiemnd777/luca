import { CircularProgress, Stack, Typography } from "@mui/material";

export function Loading({ text = "Loading..." }: { text?: string }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 6 }}>
      <CircularProgress size={24} />
      <Typography variant="body2" color="text.secondary">{text}</Typography>
    </Stack>
  );
}
