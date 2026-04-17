import { registerAuditRenderers } from "@root/core/auditlog/auditlog-registrar";
import type { AuditLog } from "@core/auditlog/types";
import type { AuditRenderer } from "@core/auditlog/types";

function dataValue(row: AuditLog, key: string): string | null {
  const value = row.data?.[key];
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function orderItemLabel(row: AuditLog): string {
  return dataValue(row, "order_item_code")
    ?? dataValue(row, "order_code")
    ?? dataValue(row, "order_id")
    ?? dataValue(row, "order_item_id")
    ?? "không xác định";
}

function productLabel(row: AuditLog): string {
  return dataValue(row, "product_name")
    ?? dataValue(row, "product_code")
    ?? dataValue(row, "product_id")
    ?? "không xác định";
}

const orderAuditRenderers: AuditRenderer[] = [
  {
    match: { module: "order", action: "created" },
    moduleLabel: "Order",
    actionLabel: () => "Created",
    summary: (_row) => `Đơn hàng được tạo mới.`,
    fields: [
      { key: "order_id", label: "Order ID" },
      { key: "order_code", label: "Order Code" },
      { key: "order_item_id", label: "Order Item ID" },
      { key: "order_item_code", label: "Order Item Code" },
    ],
  },
  {
    match: { module: "order", action: "updated" },
    moduleLabel: "Order",
    actionLabel: () => "Updated",
    summary: (_row) => `Đơn hàng được cập nhật.`,
    fields: [
      { key: "order_id", label: "Order ID" },
      { key: "order_code", label: "Order Code" },
      { key: "order_item_id", label: "Order Item ID" },
      { key: "order_item_code", label: "Order Item Code" },
    ],
  },
  {
    match: { module: "order", action: "updated:status:change" },
    moduleLabel: "Order",
    actionLabel: () => "Status Changed",
    summary: (row) => {
      const status = dataValue(row, "status") ?? "không xác định";
      return `Đơn hàng thay đổi trạng thái thành ${status}.`;
    },
    fields: [
      { key: "order_id", label: "Order ID" },
      { key: "order_code", label: "Order Code" },
      { key: "order_item_id", label: "Order Item ID" },
      { key: "order_item_code", label: "Order Item Code" },
      { key: "status", label: "Status" },
    ],
  },
  {
    match: { module: "order", action: "updated:delivery-status:change" },
    moduleLabel: "Order",
    actionLabel: () => "Delivery Status Changed",
    summary: (row) => {
      const deliveryStatus = dataValue(row, "delivery_status");
      const deliveryStatusLabel = deliveryStatus === "delivery_in_progress"
        ? "đang giao"
        : deliveryStatus === "delivered"
          ? "đã giao"
          : deliveryStatus === "returned"
            ? "trả về"
            : (deliveryStatus ?? "không xác định");
      return `Đơn hàng thay đổi trạng thái giao/nhận thành ${deliveryStatusLabel}.`;
    },
    fields: [
      { key: "order_id", label: "Order ID" },
      { key: "order_code", label: "Order Code" },
      { key: "order_item_id", label: "Order Item ID" },
      { key: "order_item_code", label: "Order Item Code" },
      { key: "delivery_status", label: "Delivery Status" },
    ],
  },
  {
    match: { module: "order", action: "inprogress:checkout" },
    moduleLabel: "Order",
    actionLabel: () => "Checkout",
    summary: (row) => {
      const product = productLabel(row);
      const sectionName = dataValue(row, "section_name") ?? "không xác định";
      const processName = dataValue(row, "process_name") ?? "không xác định";
      return `Đơn hàng đã checkout sản phẩm ${product} khỏi khâu ${sectionName} - ${processName}.`;
    },
    fields: [
      { key: "order_id", label: "Order ID" },
      { key: "order_item_id", label: "Order Item ID" },
      { key: "order_item_code", label: "Order Item Code" },
      { key: "product_id", label: "Product ID" },
      { key: "product_code", label: "Product Code" },
      { key: "product_name", label: "Product Name" },
      { key: "section_name", label: "Section" },
      { key: "process_name", label: "Process" },
    ],
  },
  {
    match: { module: "order", action: "inprogress:checkin" },
    moduleLabel: "Order",
    actionLabel: () => "Checkin",
    summary: (row) => {
      const product = productLabel(row);
      const sectionName = dataValue(row, "section_name") ?? "không xác định";
      const processName = dataValue(row, "process_name") ?? "không xác định";
      return `Đơn hàng đã checkin sản phẩm ${product} vào khâu ${sectionName} - ${processName}.`;
    },
    fields: [
      { key: "order_id", label: "Order ID" },
      { key: "order_item_id", label: "Order Item ID" },
      { key: "order_item_code", label: "Order Item Code" },
      { key: "product_id", label: "Product ID" },
      { key: "product_code", label: "Product Code" },
      { key: "product_name", label: "Product Name" },
      { key: "section_name", label: "Section" },
      { key: "process_name", label: "Process" },
    ],
  },
  {
    match: { module: "order", action: "inprogress:checkin:assigned" },
    moduleLabel: "Order",
    actionLabel: () => "Checkin Assigned",
    summary: (row) => {
      const assignedName = dataValue(row, "assigned_name") ?? "không xác định";
      return `Đơn hàng được phân công cho ${assignedName}.`;
    },
    fields: [
      { key: "order_id", label: "Order ID" },
      { key: "order_item_id", label: "Order Item ID" },
      { key: "order_item_code", label: "Order Item Code" },
      { key: "assigned_name", label: "Assigned User" },
    ],
  },
  {
    match: { module: "order", action: "inprogress:*" },
    moduleLabel: "Order",
    actionLabel: (action) => action.replace("inprogress:", ""),
    summary: (row) => {
      const status = dataValue(row, "status");
      const verb = row.action.replace("inprogress:", "");
      return `Đơn hàng cập nhật tiến trình ${verb}${status ? ` (${status})` : ""}.`;
    },
    fields: [
      { key: "order_id", label: "Order ID" },
      { key: "order_item_id", label: "Order Item ID" },
      { key: "order_item_code", label: "Order Item Code" },
      { key: "section_name", label: "Section" },
      { key: "process_name", label: "Process" },
      { key: "assigned_name", label: "Assigned User" },
      { key: "next_section_name", label: "Next Section" },
      { key: "next_process_name", label: "Next Process" },
      { key: "status", label: "Status" },
    ],
  },
  {
    match: { module: "order", action: "*" },
    moduleLabel: "Order",
    summary: (row) => `Đơn hàng ${orderItemLabel(row)} thực hiện thao tác ${row.action}.`,
  },
];

registerAuditRenderers(orderAuditRenderers);
