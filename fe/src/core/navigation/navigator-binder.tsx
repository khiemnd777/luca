import React from "react";
import { useNavigate } from "react-router-dom";
import { setNavigator } from "@core/navigation/navigate";

export default function NavigatorBinder() {
  const nav = useNavigate();
  React.useEffect(() => setNavigator(nav), [nav]);
  return null;
}