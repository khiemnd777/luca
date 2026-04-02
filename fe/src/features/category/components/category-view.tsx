import React from "react";
import type { CategoryModel } from "../model/category.model";

export default function CategoryView({ item }: { item: CategoryModel }) {
  const parts: React.ReactNode[] = [];

  if (item.categoryNameLv1) parts.push(item.categoryNameLv1);
  if (item.categoryNameLv2) parts.push(item.categoryNameLv2);
  if (item.categoryNameLv3) parts.push(item.categoryNameLv3);

  if (item.name) {
    parts.push(<>{item.name}</>);
  }

  return <>{parts.map((p, i) => (
    <React.Fragment key={i}>
      {i > 0 && " > "}
      {p}
    </React.Fragment>
  ))}</>;
}
