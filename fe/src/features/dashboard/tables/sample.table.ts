import { registerTable } from "@core/table/table-registry";
import { createTableSchema } from "@core/table/table.types";
import type { ColumnDef, FetchTableOpts } from "@core/table/table.types";

type Product = {
  id: number;
  name: string;
  colorInfo: { color: string; text: string };
  price: number;
  imageUrl: string;
  tags: (string | { color?: string; text: string })[];
  createdAt: string; // ISO
};

async function fetchProducts(opts: FetchTableOpts): Promise<{ items: Product[]; total: number }> {
  const all: Product[] = Array.from({ length: 137 }).map((_, i) => ({
    id: i + 1,
    name: `Product ${i + 1}`,
    colorInfo: [
      { color: "#FF6B6B", text: "#FF6B6B" },
      { color: "#4ECDC4", text: "#4ECDC4" },
      { color: "#FFD93D", text: "#FFD93D" },
      { color: "#A29BFE", text: "#A29BFE" },
      { color: "#55EFC4", text: "#55EFC4" },
    ][i % 5],
    price: Math.round(100000 + Math.random() * 900000),
    imageUrl: `https://picsum.photos/seed/p${i}/200/120`,
    tags: ["fresh", "organic", "premium", "sale", { color: "#E74C3C", text: "Hot" }].slice(0, (i % 5) + 1),
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));

  const { orderBy, direction } = opts;
  if (orderBy) {
    const cmp = (a: Product, b: Product) => {
      const av = (a as any)[orderBy], bv = (b as any)[orderBy];
      const isDate = (v: unknown) => typeof v === "string" && !isNaN(Date.parse(v as string));
      let res = 0;
      if (typeof av === "number" && typeof bv === "number") res = av - bv;
      else if (isDate(av) && isDate(bv)) res = new Date(av as any).getTime() - new Date(bv as any).getTime();
      else res = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { sensitivity: "base" });
      return direction === "asc" ? res : -res;
    };
    all.sort(cmp);
  }

  const start = opts.limit * opts.page;
  const items = all.slice(start, start + opts.page);
  await new Promise(r => setTimeout(r, 300));
  return { items, total: all.length };
}

const columns: ColumnDef<Product>[] = [
  { key: "id", header: "ID", width: 80, type: "number", sortable: true, stickyLeft: true },
  { key: "name", header: "Name", width: 220, sortable: true, stickyLeft: true },
  { key: "colorInfo", header: "Color", width: 160, type: "color", sortable: true },
  { key: "imageUrl", header: "Image", width: 140, type: "image" },
  { key: "tags", header: "Tags", width: 260, type: "chips" },
  {
    key: "price",
    header: "Price (₫)",
    width: 140,
    type: "number",
    sortable: true,
    render: (r) => new Intl.NumberFormat("vi-VN").format(r.price),
  },
  {
    key: "createdAt",
    header: "Created",
    width: 180,
    type: "date",
    sortable: true,
    render: (r) => new Date(r.createdAt).toLocaleString("vi-VN"),
    stickyRight: true,
  },
];

registerTable("sample", () =>
  createTableSchema<Product>({
    columns,
    fetch: fetchProducts,
    initialPageSize: 10,
    initialSort: { by: "id", dir: "asc" },
    stickyHeader: true,
    dense: true,
    stickyTopOffset: 0,
    onView: (r) => console.info("View:", r),
    onEdit: (r) => console.info("Edit:", r),
    onDelete: (r) => console.info("Delete:", r),
  })
);
