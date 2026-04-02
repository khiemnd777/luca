import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { AppRouter } from "@root/app/routes";
import { Toaster } from "react-hot-toast";
import { FormDialogHost } from "@core/form/form-dialog-host";
import { WebSocketProvider } from "@root/core/network/websocket/ws-provider";
import { WebSocketWidgets } from "@root/core/network/websocket/ws-widgets";
import { StackMessage } from "@root/core/network/websocket/ws-stack";
import { useAuthStore } from "@root/store/auth-store";

function SessionBootstrap() {
  const bootstrap = useAuthStore((state) => state.bootstrap);

  React.useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return null;
}

export default function App() {
  return (
    <WebSocketProvider>
      <WebSocketWidgets />
      <StackMessage />
      <SessionBootstrap />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <AppRouter />
        <Toaster position="top-right" />
        <FormDialogHost />
      </LocalizationProvider>
    </WebSocketProvider>
  );
}
