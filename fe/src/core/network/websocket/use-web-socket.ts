import { useEffect, useState } from "react";
import { wsClient, type WSStatus } from "./ws-client";

type DefaultWSMessage = {
  type?: unknown;
  [key: string]: unknown;
};

export function useWebSocket<T = DefaultWSMessage>() {
  const [status, setStatus] = useState<WSStatus>(wsClient.getStatus());
  const [lastMessage, setLastMessage] = useState<T | null>(null);

  useEffect(() => {
    const off = wsClient.on((msg) => setLastMessage(msg as T));
    const offStatus = wsClient.onStatus((nextStatus) => setStatus(nextStatus));

    return () => {
      off();
      offStatus();
    };
  }, []);

  return {
    status,
    lastMessage,
    send: wsClient.send.bind(wsClient),
  };
}

/*
// Ví dụ dùng trong component React:

import { useWebSocket } from "@core/network/use-websocket";
export default function RealtimePanel() {
  const { status, lastMessage, send } = useWebSocket<any>();

  return (
    <div>
      <div>WS: {status}</div>
      <pre>{lastMessage ? JSON.stringify(lastMessage, null, 2) : "—"}</pre>
      <button onClick={() => send({ type: "ping-ui", t: Date.now() })}>
        Send test
      </button>
    </div>
  );
}
*/
