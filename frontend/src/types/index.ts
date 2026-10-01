export interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
}

export interface Category { id: string; name: string; }
export interface Brand { id: string; name: string; }
export interface Unit { id: string; name: string; symbol?: string; }

export interface Product {
  id: string;
  name: string;
  model?: string;
  sku?: string;
  barcode?: string;
  purchasePrice: number;
  salePrice: number;
  minSalePrice: number;
  weightedAvgCost: number;
  totalStockValue?: number;
  minStockLevel: number;
  warranty?: string;
  description?: string;
  active: boolean;
  categoryId?: string;
  brandId?: string;
  unitId?: string;
  category?: Category;
  brand?: Brand;
  unit?: Unit;
  inventory?: { quantity: number; reservedQty?: number };
}

export interface CartItem {
  productId: string;
  name: string;
  model?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  availableStock: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  openingBalance: number;
  creditLimit: number;
  notes?: string;
  active: boolean;
  totalSales?: number;
  received?: number;
  balance?: number;
}

export interface Supplier {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  taxNumber?: string;
  openingBalance: number;
  creditTerms?: string;
  notes?: string;
  active: boolean;
  purchases?: number;
  paid?: number;
  payable?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}