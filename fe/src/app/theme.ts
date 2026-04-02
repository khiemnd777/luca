import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#1976d2" },
        secondary: { main: "#9c27b0" },
        background: { default: "#f9f9fb", paper: "#fff" },
      },
    },
    dark: {
      palette: {
        primary: { main: "#90caf9" },
        secondary: { main: "#ce93d8" },
      },
    },
  },
  typography: {
    fontFamily: `"Inter", "Roboto", "Helvetica", "Arial", sans-serif`,
    h1: { fontSize: "2rem", fontWeight: 600 },
    h2: { fontSize: "1.5rem", fontWeight: 500 },
    body1: { fontSize: "1rem" },
  },
  shape: {
    borderRadius: 8,
  },
});
