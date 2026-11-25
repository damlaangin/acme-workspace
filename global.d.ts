declare module "*.css";
declare module "*.scss";
declare module "react-simple-maps";

import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    cellClassName?: string;
  }
}

export {};
