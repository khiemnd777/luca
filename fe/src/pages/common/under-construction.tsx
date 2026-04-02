import {
  Box,
  Stack,
  Paper,
  Typography,
  Button,
} from "@mui/material";
import ConstructionRoundedIcon from "@mui/icons-material/ConstructionRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";

export type UnderConstructionProps = {
  title?: string;
  description?: string;
  onBackHome?: () => void;
  onRefresh?: () => void;
  onContact?: () => void;
  /** Ẩn các nút mặc định nếu bạn muốn tự render actions bên ngoài */
  hideActions?: boolean;
};

export default function UnderConstruction({
  title = "Đang xây dựng",
  description = "Tính năng này hiện đang được hoàn thiện. Vui lòng quay lại sau nhé!",
  onBackHome,
  onRefresh,
  onContact,
  hideActions,
}: UnderConstructionProps) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 8 },
        display: "grid",
        placeItems: "center",
        bgcolor: "background.default",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 760,
          p: { xs: 3, md: 5 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 96,
              height: 96,
              borderRadius: "24px",
              display: "grid",
              placeItems: "center",
              border: "1px dashed",
              borderColor: "divider",
              bgcolor: "action.hover",
            }}
          >
            <ConstructionRoundedIcon sx={{ fontSize: 48 }} />
          </Box>

          <Stack spacing={1}>
            <Typography variant="h4" fontWeight={800}>
              {title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {description}
            </Typography>
          </Stack>

          {!hideActions && (
            <>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                useFlexGap
                sx={{ width: "100%", justifyContent: "center" }}
              >
                <Button
                  variant="contained"
                  startIcon={<HomeRoundedIcon />}
                  onClick={onBackHome}
                >
                  Về trang chủ
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={onRefresh}
                >
                  Thử lại
                </Button>
                <Button
                  variant="text"
                  startIcon={<MailOutlineRoundedIcon />}
                  onClick={onContact}
                >
                  Liên hệ hỗ trợ
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
