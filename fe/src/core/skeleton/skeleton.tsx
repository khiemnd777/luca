import { Container, Stack, Box } from "@mui/material";
import type { SkeletonProps } from "@core/skeleton/types";

/**
 * Skeleton (React) ≈ Flutter Skeleton
 * Gắn header / body[] / footer + điều chỉnh opacity ẩn/hiện cho header/footer.
 */
export function Skeleton({
  prefix,
  header,
  body = [],
  footer,
  gap = 3,
  maxWidth = "lg",
}: SkeletonProps) {
  return (
    <Container maxWidth={maxWidth} sx={{ py: 3 }} data-skeleton-prefix={prefix}>
      <Stack spacing={gap}>
        {header && (
          <Box sx={{ opacity: header ? 1 : 0.0 }}>
            {header}
          </Box>
        )}

        {body.map((section, idx) => (
          <Box key={idx}>{section}</Box>
        ))}

        {footer && (
          <Box sx={{ opacity: footer ? 1 : 0.0 }}>
            {footer}
          </Box>
        )}
      </Stack>
    </Container>
  );
}
