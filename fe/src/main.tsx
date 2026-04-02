import React from "react";
import ReactDOM from "react-dom/client";
import App from "@root/app/app";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from '@mui/material/styles';
import { theme } from "@root/app/theme";
import "@core/index";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
