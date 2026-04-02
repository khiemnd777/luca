import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { Box } from "@mui/material";
import { navigate } from "@root/core/navigation/navigate";

export default function SearchIcon() {
  return (
    <Box
      onClick={() => navigate("/search")}
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <SearchOutlinedIcon />
    </Box>
  );
}
