import React from "react";

type RegisteredWSWidget = {
  id: string;
  element: React.ReactNode;
};

const wsWidgets: RegisteredWSWidget[] = [];
let wsWidgetId = 0;

export function registerWS(element: React.ReactNode) {
  const id = `ws:${wsWidgetId++}`;
  wsWidgets.push({ id, element });
  return () => {
    const idx = wsWidgets.findIndex((w) => w.id === id);
    if (idx >= 0) wsWidgets.splice(idx, 1);
  };
}

export function listWSWidgets() {
  return wsWidgets;
}

export function WebSocketWidgets() {
  return (
    <>
      {wsWidgets.map((w) => (
        <React.Fragment key={w.id}>{w.element}</React.Fragment>
      ))}
    </>
  );
}
