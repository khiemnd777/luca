import React from "react";
import { Typography } from "@mui/material";
import type { ProcessModel } from "../model/process.model";

const getOptionLabel = (item: ProcessModel) => {
  const sectionName = item.sectionName ? `${item.sectionName} >` : "";
  return `${sectionName} ${item.name}`;
};

const renderItem = (item: ProcessModel) => {
  const sectionName = item.sectionName ? `${item.sectionName} >` : "";
  return React.createElement(
    Typography,
    { sx: { color: item.color } },
    `${sectionName} ${item.name}`,
  );
};

export const processProps = {
  hydrateOrderField: "display_order",
  getOptionLabel,
  renderItem,
};
