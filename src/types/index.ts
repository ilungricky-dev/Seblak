export type ProductCategory = 'Seblak' | 'Topping' | 'Minuman' | 'Paket' | 'Lainnya';

export type UnitType = 'Porsi' | 'Pcs' | 'Gelas' | 'Bungkus' | 'Mangkok' | 'Butir';

export interface MenuItem {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  costPrice: number; // Harga modal/beli untuk hitung laba
  stock: number;
  minStock?: number; // Titik minimum stok untuk peringatan visual / notifikasi POS
  unit: UnitType;
  allowSpicyLevel: boolean;
  defaultSpicyLevel?: number; // 0 - 5
  imageUrl: string;
  isActive: boolean;
  description?: string;
  updatedAt: string;
}

export interface CartItem {
  id: string; // unique item in cart (item + level + note)
  menuItemId: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  spicyLevel: number;
  spicyLevelLabel: string;
  note: string;
  unit: UnitType;
}

export type PaymentMethod = 'Tunai' | 'QRIS' | 'Transfer';

export type OrderType = 'Dine-in (Makan Sini)' | 'Takeaway (Bungkus)';

export interface Transaction {
  id: string;
  receiptNo: string;
  customerName: string;
  tableOrQueueNo: string;
  orderType: OrderType;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  cashierName: string;
  createdAt: string; // ISO date string
  syncedToSheets?: boolean;
}

export type StockMovementType = 'MASUK' | 'KELUAR_MANUAL' | 'PENJUALAN';

export interface StockMovement {
  id: string;
  menuItemId: string;
  menuItemName: string;
  type: StockMovementType;
  quantity: number; // positive number
  previousStock: number;
  currentStock: number;
  reason: string; // Misal: "Restock supplier", "Rusak/Basi", "Penjualan Kasir #REC-123"
  costPerUnit?: number;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  referenceId?: string; // id transaksi jika ada
  syncedToSheets?: boolean;
}

export interface StoreProfile {
  name: string;
  slogan: string;
  address: string;
  phone: string;
  logoUrl: string; // data URL or URL
  receiptFooter: string;
  defaultCashier: string;
  instagram?: string;
}

export type PaperWidth = '58mm' | '80mm';

export interface PrinterConfig {
  paperWidth: PaperWidth;
  connectionType: 'bluetooth' | 'browser';
  autoCut: boolean;
  feedLines: number;
  printLogo: boolean;
  printAddress: boolean;
  printFooter: boolean;
  connectedDeviceName?: string;
  lastConnectedTime?: string;
}

export interface SpreadsheetConfig {
  webAppUrl: string; // Google Apps Script web app URL
  sheetId?: string;
  autoSync: boolean;
  autoSyncIntervalSec: number;
  lastSyncedAt?: string;
  lastSyncStatus?: 'success' | 'failed' | 'idle';
  lastSyncError?: string;
}

export interface AccumulatedStockRow {
  menuItemId: string;
  menuItemName: string;
  category: ProductCategory;
  unit: UnitType;
  costPrice: number;
  sellingPrice: number;
  initialStock: number; // Stok awal sebelum tanggal Dari
  stockIn: number; // Total masuk dalam periode
  stockSold: number; // Total terjual dalam periode
  stockManualOut: number; // Total keluar manual dalam periode
  totalOut: number; // stockSold + stockManualOut
  endingStock: number; // initialStock + stockIn - totalOut
  assetValue: number; // endingStock * costPrice
}

export type EmployeeRole = string; // Fleksibel: dapat berupa jabatan standar atau nama status jabatan kustom yang dibuat sendiri oleh Owner

export type AppFeature =
  | 'pos'
  | 'stock'
  | 'menu'
  | 'report_sales'
  | 'report_stock'
  | 'employees'
  | 'printer'
  | 'store_profile'
  | 'spreadsheet_sync'
  | 'reset_data';

export interface Employee {
  id: string;
  name: string;
  role: string; // Nama status jabatan kustom (misal: "Kasir Pagi", "Barista", "Kepala Dapur", "Admin Keuangan", dll)
  isOwner?: boolean;
  phone: string;
  email?: string;
  pin: string; // 4-6 digit numeric PIN for authorization & quick login
  isActive: boolean;
  joinDate: string; // YYYY-MM-DD
  notes?: string;
  permissions: AppFeature[]; // Daftar hak akses fleksibel yang dicentang oleh Owner
  createdAt: string;
}

export interface DailyStockAccumulationRow {
  date: string; // Tanggal (YYYY-MM-DD)
  menuName: string; // Nama Menu (atau Semua Menu)
  initialStock: number; // Stock awal
  accumulatedIn: number; // Akumulasi stok masuk
  accumulatedOut: number; // Akumulasi stock keluar
  endingStock: number; // Stock akhir
}


