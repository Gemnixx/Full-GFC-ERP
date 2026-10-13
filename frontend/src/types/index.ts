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
export interface SizeMaster { id: string; name: string; }
export interface ColorMaster { id: string; name: string; hex?: string | null; }

export interface ProductVariant {
  id: string;
  productId: string;
  size?: string | null;
  color?: string | null;
  sku?: string | null;
  barcode?: string | null;
  stock: number;
  purchasePrice: number;
  salePrice: number;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  model?: string | null;
  sku?: string | null;
  barcode?: string | null;
  purchasePrice: number;
  salePrice: number;
  minSalePrice: number;
  weightedAvgCost: number;
  totalStockValue?: number;
  minStockLevel: number;
  warranty?: string | null;
  description?: string | null;
  active: boolean;
  categoryId?: string | null;
  brandId?: string | null;
  unitId?: string | null;
  category?: Category;
  brand?: Brand;
  unit?: Unit;
  inventory?: { quantity: number; reservedQty?: number };
  variants?: ProductVariant[];
}

export interface CartItem {
  cartKey: string;
  productId: string;
  variantId: string | null;
  name: string;
  model?: string | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountPercent: number;
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