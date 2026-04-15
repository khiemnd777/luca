import type { CategoryModel } from "@features/category/model/category.model";
import type { DeparmentModel } from "@features/department/model/department.model";
import type { ProductModel } from "@features/product/model/product.model";

export interface OrderAdvancedSearchFilters {
  department?: DeparmentModel | null;
  categories: CategoryModel[];
  products: ProductModel[];
  orderCode: string;
  dentistName: string;
  patientName: string;
  createdYear: string;
  createdMonth: string;
  deliveryYear: string;
  deliveryMonth: string;
}

export interface OrderAdvancedSearchStatusBreakdownModel {
  status: string;
  count: number;
}

export interface OrderAdvancedSearchTopProductModel {
  productId?: number | null;
  productCode?: string | null;
  productName?: string | null;
  orderCount: number;
  totalQuantity: number;
  totalSales: number;
  totalRevenue: number;
}

export interface OrderAdvancedSearchReportSummaryModel {
  totalOrders: number;
  totalValue: number;
  averageOrderValue: number;
  remakeOrders: number;
  totalSales: number;
  totalRevenue: number;
}

export interface OrderAdvancedSearchReportBreakdownModel {
  statusBreakdown: OrderAdvancedSearchStatusBreakdownModel[];
  topProducts: OrderAdvancedSearchTopProductModel[];
}

export interface OrderAdvancedSearchReportModel
  extends OrderAdvancedSearchReportSummaryModel,
    OrderAdvancedSearchReportBreakdownModel {}
