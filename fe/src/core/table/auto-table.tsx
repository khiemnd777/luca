import * as React from "react";
import { getTableSchema } from "@core/table/table-registry";
import type { TableSchema, TableViewMode } from "@core/table/table.types";
import { SchemaTable, type SchemaTableRef } from "@core/table/schema-table";

export type AutoTableRef = { reload: () => void };

type Props<T extends { id?: string | number }> = {
  name?: string;
  schema?: TableSchema<T>;
  params?: Record<string, any>;
  view?: TableViewMode;
  verticalHeaderExtra?: React.ReactNode;
};

export const AutoTable = React.forwardRef<AutoTableRef, Props<any>>(
  ({ name, schema: schemaProp, params, view, verticalHeaderExtra }, ref) => {
    const schema = React.useMemo(() => {
      if (schemaProp) return schemaProp;
      if (name) return getTableSchema(name);
      return null;
    }, [name, schemaProp]);

    const inner = React.useRef<SchemaTableRef | null>(null);
    React.useImperativeHandle(ref, () => ({
      reload: () => inner.current?.reload(),
    }));

    if (!schema) return <div>Table schema {name ? `"${name}"` : ""} chưa được đăng ký.</div>;

    return (
      <SchemaTable
        ref={inner}
        schema={schema}
        schemaName={name}
        params={params}
        view={view}
        verticalHeaderExtra={verticalHeaderExtra}
      />
    );
  }
);
