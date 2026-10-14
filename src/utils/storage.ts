import {
  MenuItem,
  StoreProfile,
  StockMovement,
  Transaction,
  PrinterConfig,
  SpreadsheetConfig,
  AccumulatedStockRow,
  DailyStockAccumulationRow,
  Employee,
  EmployeeRole,
  AppFeature,
  CategoryItem,
  SubCategoryItem,
  AccessLogItem,
  LogActionType,
} from '../types';

import {
  DEFAULT_STORE_PROFILE,
  DEFAULT_MENU_ITEMS,
  DEFAULT_STOCK_MOVEMENTS,
  DEFAULT_TRANSACTIONS,
  DEFAULT_EMPLOYEES,
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PRESETS,
  DEFAULT_CATEGORIES,
} from './defaultData';

const STORAGE_KEYS = {
  PROFILE: 'seblak_store_profile',
  MENU: 'seblak_menu_items',
  MOVEMENTS: 'seblak_stock_movements',
  TRANSACTIONS: 'seblak_transactions',
  PRINTER: 'seblak_printer_config',
  SPREADSHEET: 'seblak_spreadsheet_config',
  SYNC_QUEUE: 'seblak_sync_queue',
  EMPLOYEES: 'seblak_employees',
  ACTIVE_EMPLOYEE: 'seblak_active_employee',
  CATEGORIES: 'seblak_categories',
  ACCESS_LOGS: 'seblak_access_logs',
};

// Cross-device/tab real-time sync channel
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('seblak_cinta_realtime_channel')
  : null;

export type StorageMutationType =
  | 'MENU'
  | 'STOCK'
  | 'TRANSACTION'
  | 'PROFILE'
  | 'ALL'
  | 'CATEGORY'
  | 'LOG'
  | 'EMPLOYEES';

type StorageMutationListener = (type: StorageMutationType, data?: any) => void;
const mutationListeners = new Set<StorageMutationListener>();

export const onStorageMutation = (listener: StorageMutationListener): (() => void) => {
  mutationListeners.add(listener);
  return () => {
    mutationListeners.delete(listener);
  };
};

export const notifyMutation = (type: StorageMutationType, data?: any) => {
  mutationListeners.forEach(fn => {
    try {
      fn(type, data);
    } catch (err) {
      console.warn('Mutation listener error:', err);
    }
  });
};

export const broadcastChange = (type: StorageMutationType, data?: any) => {
  if (syncChannel) {
    syncChannel.postMessage({ type, data, timestamp: Date.now() });
  }
  notifyMutation(type, data);
};

export const subscribeToBroadcast = (callback: (type: string) => void) => {
  if (!syncChannel) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data?.type) {
      callback(event.data.type);
    }
  };
  syncChannel.addEventListener('message', handler);
  return () => {
    syncChannel.removeEventListener('message', handler);
  };
};

// --- Store Profile ---
export const getStoreProfile = (): StoreProfile => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading store profile:', e);
  }
  return DEFAULT_STORE_PROFILE;
};

export const saveStoreProfile = (profile: StoreProfile): void => {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  broadcastChange('PROFILE', profile);
};

// --- Menu Items ---
export const getMenuItems = (): MenuItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MENU);
    if (data !== null) {
      const parsed: MenuItem[] = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          ...item,
          subCategory: typeof item.subCategory === 'string' ? item.subCategory : '',
          minStock: typeof item.minStock === 'number' ? item.minStock : 5,
        }));
      }
    }
  } catch (e) {
    console.error('Error reading menu items:', e);
  }
  // Initialize with defaults if not set at all
  saveMenuItems(DEFAULT_MENU_ITEMS);
  return DEFAULT_MENU_ITEMS;
};

export const saveMenuItems = (items: MenuItem[]): void => {
  localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(items));
  broadcastChange('MENU', items);
};

export const addMenuItem = (item: Omit<MenuItem, 'id' | 'updatedAt'>): MenuItem => {
  const current = getMenuItems();
  const newItem: MenuItem = {
    ...item,
    id: 'menu-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    updatedAt: new Date().toISOString(),
  };
  const updated = [newItem, ...current];
  saveMenuItems(updated);
  return newItem;
};

export const updateMenuItem = (item: MenuItem): void => {
  const current = getMenuItems();
  const updated = current.map(m => (m.id === item.id ? { ...item, updatedAt: new Date().toISOString() } : m));
  saveMenuItems(updated);

  try {
    recordAccessLog({
      action: 'MENU_UPDATE',
      actionTitle: `Ubah Menu: ${item.name}`,
      details: `Memperbarui data menu ${item.name} (Kategori: ${item.category}, Sub: ${item.subCategory || '-'}, Harga: Rp ${item.price.toLocaleString('id-ID')})`,
    });
  } catch (err) {
    console.error('Failed to log menu update:', err);
  }
};

export const deleteMenuItem = (id: string): void => {
  const current = getMenuItems();
  const target = current.find(m => m.id === id);
  const updated = current.filter(m => m.id !== id);
  saveMenuItems(updated);

  if (target) {
    try {
      recordAccessLog({
        action: 'MENU_DELETE',
        actionTitle: `Hapus Menu: ${target.name}`,
        details: `Menghapus menu ${target.name} (${target.category}) dari daftar menu warung`,
      });
    } catch (err) {
      console.error('Failed to log menu delete:', err);
    }
  }
};

// --- Categories & Sub-Categories (Manajemen & Tata Ulang Database) ---

export const getCategories = (): CategoryItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (data !== null) {
      const parsed: CategoryItem[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(c => ({
          ...c,
          subCategories: Array.isArray(c.subCategories) ? c.subCategories : [],
        }));
      }
    }
  } catch (e) {
    console.error('Error reading categories:', e);
  }
  // Initialize with defaults
  saveCategories(DEFAULT_CATEGORIES);
  return DEFAULT_CATEGORIES;
};

export const saveCategories = (categories: CategoryItem[]): void => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  broadcastChange('CATEGORY', categories);
};

export const addCategory = (
  name: string,
  description?: string,
  icon?: string,
  color?: string,
  initialSubCategories?: string[]
): CategoryItem => {
  const current = getCategories();
  const trimmedName = name.trim();
  const catId = 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

  const subItems: SubCategoryItem[] = (initialSubCategories || [])
    .map(s => s.trim())
    .filter(Boolean)
    .map((s, idx) => ({
      id: `sub-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      name: s,
      categoryId: catId,
    }));

  const newCat: CategoryItem = {
    id: catId,
    name: trimmedName,
    icon: icon || '🏷️',
    color: color || 'rose',
    description: description?.trim() || '',
    subCategories: subItems,
    createdAt: new Date().toISOString(),
  };

  const updated = [...current, newCat];
  saveCategories(updated);
  return newCat;
};

export const updateCategory = (category: CategoryItem): void => {
  const current = getCategories();
  const oldCat = current.find(c => c.id === category.id);
  const updated = current.map(c => (c.id === category.id ? category : c));
  saveCategories(updated);

  // If category name changed, cascade to menu items
  if (oldCat && oldCat.name !== category.name) {
    const items = getMenuItems();
    let hasChanges = false;
    const updatedItems = items.map(m => {
      if (m.category === oldCat.name) {
        hasChanges = true;
        return { ...m, category: category.name, updatedAt: new Date().toISOString() };
      }
      return m;
    });
    if (hasChanges) {
      saveMenuItems(updatedItems);
    }
  }
};

export const deleteCategory = (
  categoryId: string,
  reassignToCategoryName?: string
): { success: boolean; affectedItemsCount: number; message: string } => {
  const current = getCategories();
  const catToDelete = current.find(c => c.id === categoryId);
  if (!catToDelete) {
    return { success: false, affectedItemsCount: 0, message: 'Kategori tidak ditemukan' };
  }

  const remaining = current.filter(c => c.id !== categoryId);
  if (remaining.length === 0) {
    return { success: false, affectedItemsCount: 0, message: 'Minimal harus ada 1 kategori aktif dalam sistem.' };
  }

  const fallbackCat = reassignToCategoryName || remaining[0].name;

  // Check and update affected menu items
  const items = getMenuItems();
  let affectedCount = 0;
  const updatedItems = items.map(m => {
    if (m.category === catToDelete.name) {
      affectedCount++;
      return {
        ...m,
        category: fallbackCat,
        subCategory: '', // reset subCategory since parent changed
        updatedAt: new Date().toISOString(),
      };
    }
    return m;
  });

  saveCategories(remaining);
  if (affectedCount > 0) {
    saveMenuItems(updatedItems);
  }

  return {
    success: true,
    affectedItemsCount: affectedCount,
    message: `Kategori "${catToDelete.name}" berhasil dihapus.${
      affectedCount > 0 ? ` ${affectedCount} menu dialihkan ke kategori "${fallbackCat}".` : ''
    }`,
  };
};

export const addSubCategory = (
  categoryId: string,
  subName: string,
  description?: string
): SubCategoryItem | null => {
  const current = getCategories();
  const cat = current.find(c => c.id === categoryId);
  if (!cat) return null;

  const newSub: SubCategoryItem = {
    id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    name: subName.trim(),
    categoryId,
    description: description?.trim() || '',
  };

  const updatedCategories = current.map(c => {
    if (c.id === categoryId) {
      return {
        ...c,
        subCategories: [...(c.subCategories || []), newSub],
      };
    }
    return c;
  });

  saveCategories(updatedCategories);
  return newSub;
};

export const updateSubCategory = (
  categoryId: string,
  subCategory: SubCategoryItem
): void => {
  const current = getCategories();
  const cat = current.find(c => c.id === categoryId);
  if (!cat) return;

  const oldSub = cat.subCategories?.find(s => s.id === subCategory.id);

  const updatedCategories = current.map(c => {
    if (c.id === categoryId) {
      return {
        ...c,
        subCategories: c.subCategories.map(s => (s.id === subCategory.id ? subCategory : s)),
      };
    }
    return c;
  });

  saveCategories(updatedCategories);

  // Cascade to menu items if subcategory name changed
  if (oldSub && oldSub.name !== subCategory.name) {
    const items = getMenuItems();
    let hasChanges = false;
    const updatedItems = items.map(m => {
      if (m.category === cat.name && m.subCategory === oldSub.name) {
        hasChanges = true;
        return { ...m, subCategory: subCategory.name, updatedAt: new Date().toISOString() };
      }
      return m;
    });
    if (hasChanges) {
      saveMenuItems(updatedItems);
    }
  }
};

export const deleteSubCategory = (
  categoryId: string,
  subCategoryId: string
): { success: boolean; affectedItemsCount: number } => {
  const current = getCategories();
  const cat = current.find(c => c.id === categoryId);
  if (!cat) return { success: false, affectedItemsCount: 0 };

  const subToDelete = cat.subCategories?.find(s => s.id === subCategoryId);
  if (!subToDelete) return { success: false, affectedItemsCount: 0 };

  const updatedCategories = current.map(c => {
    if (c.id === categoryId) {
      return {
        ...c,
        subCategories: c.subCategories.filter(s => s.id !== subCategoryId),
      };
    }
    return c;
  });

  saveCategories(updatedCategories);

  // Clear subCategory for affected menu items
  const items = getMenuItems();
  let affectedCount = 0;
  const updatedItems = items.map(m => {
    if (m.category === cat.name && m.subCategory === subToDelete.name) {
      affectedCount++;
      return { ...m, subCategory: '', updatedAt: new Date().toISOString() };
    }
    return m;
  });

  if (affectedCount > 0) {
    saveMenuItems(updatedItems);
  }

  return { success: true, affectedItemsCount: affectedCount };
};

export const resetCategoriesToDefault = (): void => {
  saveCategories(DEFAULT_CATEGORIES);
};

// Tata Ulang & Migrasi Database:
export const reorganizeAndMigrateDatabase = (): { migratedItems: number; categoriesCount: number } => {
  // 1. Initialise / Ensure categories exist
  const categories = getCategories();

  // 2. Ensure menu items have valid category and subcategory
  const items = getMenuItems();
  let migratedCount = 0;

  const defaultSubMap = new Map<string, { category: string; subCategory: string }>();
  DEFAULT_MENU_ITEMS.forEach(m => {
    if (m.subCategory) {
      defaultSubMap.set(m.id, { category: m.category, subCategory: m.subCategory });
      defaultSubMap.set(m.name.toLowerCase().trim(), { category: m.category, subCategory: m.subCategory });
    }
  });

  const updatedItems = items.map(item => {
    let sub = item.subCategory || '';
    let cat = item.category || 'Lainnya';

    // If subCategory missing, attempt smart auto-assignment
    if (!sub) {
      const match = defaultSubMap.get(item.id) || defaultSubMap.get(item.name.toLowerCase().trim());
      if (match) {
        sub = match.subCategory;
        migratedCount++;
      } else {
        // Find if this category has a default subCategory
        const foundCat = categories.find(c => c.name.toLowerCase() === cat.toLowerCase());
        if (foundCat && foundCat.subCategories && foundCat.subCategories.length > 0) {
          sub = foundCat.subCategories[0].name;
          migratedCount++;
        }
      }
    }

    return {
      ...item,
      category: cat,
      subCategory: sub,
      minStock: typeof item.minStock === 'number' ? item.minStock : 5,
    };
  });

  saveMenuItems(updatedItems);
  broadcastChange('ALL');

  return {
    migratedItems: migratedCount,
    categoriesCount: categories.length,
  };
};

// --- Stock Movements ---
export const getStockMovements = (): StockMovement[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    if (data !== null) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading stock movements:', e);
  }
  localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(DEFAULT_STOCK_MOVEMENTS));
  return DEFAULT_STOCK_MOVEMENTS;
};

export const saveStockMovements = (movements: StockMovement[]): void => {
  localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
  broadcastChange('STOCK', movements);
};

export const recordStockIn = (
  menuItemId: string,
  quantity: number,
  reason: string,
  costPerUnit?: number,
  customDate?: string
): StockMovement => {
  const menuList = getMenuItems();
  const targetMenu = menuList.find(m => m.id === menuItemId);
  if (!targetMenu) throw new Error('Menu tidak ditemukan');

  const prevStock = targetMenu.stock;
  const newStock = prevStock + quantity;

  // Update menu stock
  targetMenu.stock = newStock;
  if (costPerUnit && costPerUnit > 0) {
    targetMenu.costPrice = costPerUnit;
  }
  targetMenu.updatedAt = new Date().toISOString();
  saveMenuItems(menuList);

  // Add movement record
  const movement: StockMovement = {
    id: 'sm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    menuItemId,
    menuItemName: targetMenu.name,
    type: 'MASUK',
    quantity,
    previousStock: prevStock,
    currentStock: newStock,
    reason: reason || 'Restock bahan',
    costPerUnit: costPerUnit || targetMenu.costPrice,
    date: customDate || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    syncedToSheets: false,
  };

  const currentMovements = getStockMovements();
  saveStockMovements([movement, ...currentMovements]);
  addToSyncQueue('STOCK_MOVEMENT', movement);

  try {
    recordAccessLog({
      action: 'STOCK_IN',
      actionTitle: `Mutasi Stok Masuk / Restock (${targetMenu.name})`,
      details: `Restock bahan sebanyak ${quantity} ${targetMenu.unit}. Alasan: ${reason || 'Restock bahan'}. Stok akhir: ${newStock}`,
    });
  } catch (err) {
    console.error('Failed to log restock movement:', err);
  }

  return movement;
};

export const recordStockManualOut = (
  menuItemId: string,
  quantity: number,
  reason: string,
  customDate?: string
): StockMovement => {
  const menuList = getMenuItems();
  const targetMenu = menuList.find(m => m.id === menuItemId);
  if (!targetMenu) throw new Error('Menu tidak ditemukan');

  const prevStock = targetMenu.stock;
  const newStock = Math.max(0, prevStock - quantity);

  // Update menu stock
  targetMenu.stock = newStock;
  targetMenu.updatedAt = new Date().toISOString();
  saveMenuItems(menuList);

  const movement: StockMovement = {
    id: 'sm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    menuItemId,
    menuItemName: targetMenu.name,
    type: 'KELUAR_MANUAL',
    quantity,
    previousStock: prevStock,
    currentStock: newStock,
    reason: reason || 'Bahan rusak/kadaluarsa/penyesuaian',
    costPerUnit: targetMenu.costPrice,
    date: customDate || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    syncedToSheets: false,
  };

  const currentMovements = getStockMovements();
  saveStockMovements([movement, ...currentMovements]);
  addToSyncQueue('STOCK_MOVEMENT', movement);

  try {
    recordAccessLog({
      action: 'STOCK_OUT',
      actionTitle: `Mutasi Stok Keluar (${targetMenu.name})`,
      details: `Pengeluaran manual sebanyak ${quantity} ${targetMenu.unit}. Alasan: ${reason || '-'}. Stok akhir: ${newStock}`,
    });
  } catch (err) {
    console.error('Failed to log stock movement:', err);
  }

  return movement;
};

// --- Transactions & POS ---
export const getTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (data !== null) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading transactions:', e);
  }
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(DEFAULT_TRANSACTIONS));
  return DEFAULT_TRANSACTIONS;
};

export const saveTransactions = (txs: Transaction[]): void => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  broadcastChange('TRANSACTION', txs);
};

export const createTransaction = (
  transactionData: Omit<Transaction, 'id' | 'receiptNo' | 'createdAt' | 'syncedToSheets'>
): Transaction => {
  const currentTxs = getTransactions();
  const currentCount = currentTxs.length + 1;
  const receiptNo = `SC-${String(currentCount + 1000).padStart(4, '0')}`;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const newTx: Transaction = {
    ...transactionData,
    id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    receiptNo,
    createdAt: now.toISOString(),
    syncedToSheets: false,
  };

  // Deduct stock for each cart item and record PENJUALAN movement
  const menuList = getMenuItems();
  const newMovements: StockMovement[] = [];

  newTx.items.forEach(cartItem => {
    const menuIdx = menuList.findIndex(m => m.id === cartItem.menuItemId);
    if (menuIdx !== -1) {
      const targetMenu = menuList[menuIdx];
      const prevStock = targetMenu.stock;
      const newStock = Math.max(0, prevStock - cartItem.quantity);
      targetMenu.stock = newStock;
      targetMenu.updatedAt = now.toISOString();

      newMovements.push({
        id: 'sm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        menuItemId: targetMenu.id,
        menuItemName: targetMenu.name,
        type: 'PENJUALAN',
        quantity: cartItem.quantity,
        previousStock: prevStock,
        currentStock: newStock,
        reason: `Terjual No Struk #${receiptNo}`,
        costPerUnit: targetMenu.costPrice,
        date: todayStr,
        createdAt: now.toISOString(),
        referenceId: newTx.id,
        syncedToSheets: false,
      });
    }
  });

  saveMenuItems(menuList);

  const existingMovements = getStockMovements();
  saveStockMovements([...newMovements, ...existingMovements]);

  saveTransactions([newTx, ...currentTxs]);
  addToSyncQueue('TRANSACTION', newTx);

  try {
    recordAccessLog({
      action: 'TRANSACTION_CREATE',
      actionTitle: `Transaksi POS #${newTx.receiptNo}`,
      details: `Kasir memproses pesanan ${newTx.customerName || 'Pelanggan'} (${newTx.items.length} item, Total Rp ${newTx.total.toLocaleString('id-ID')}, Bayar: ${newTx.paymentMethod})`,
    });
  } catch (err) {
    console.error('Failed to log transaction access:', err);
  }

  return newTx;
};

// --- Accumulated Stock Calculation (by Date Range) ---
/**
 * Calculates Initial Stock, Stock In, Stock Out (Sold + Manual Out), Ending Stock for each menu item
 * within the specified [startDate, endDate] inclusive range.
 */
export const calculateAccumulatedStock = (
  startDate: string,
  endDate: string
): AccumulatedStockRow[] => {
  const menuList = getMenuItems();
  const allMovements = getStockMovements();

  // Normalize dates to YYYY-MM-DD strings for strict comparison
  const start = startDate.substring(0, 10);
  const end = endDate.substring(0, 10);

  return menuList.map(menu => {
    const itemMovements = allMovements.filter(m => m.menuItemId === menu.id);

    // Movements strictly BEFORE the start date
    const beforeStartMovements = itemMovements.filter(m => m.date < start);
    let beforeIn = 0;
    let beforeOut = 0;
    beforeStartMovements.forEach(m => {
      if (m.type === 'MASUK') beforeIn += m.quantity;
      else beforeOut += m.quantity;
    });
    // Initial stock before start date:
    const initialStock = Math.max(0, beforeIn - beforeOut);

    // Movements WITHIN range [start, end]
    const inRangeMovements = itemMovements.filter(m => m.date >= start && m.date <= end);
    let stockIn = 0;
    let stockSold = 0;
    let stockManualOut = 0;

    inRangeMovements.forEach(m => {
      if (m.type === 'MASUK') {
        stockIn += m.quantity;
      } else if (m.type === 'PENJUALAN') {
        stockSold += m.quantity;
      } else if (m.type === 'KELUAR_MANUAL') {
        stockManualOut += m.quantity;
      }
    });

    const totalOut = stockSold + stockManualOut;
    // Calculated ending stock for this date window
    // (If user looks at up-to-today, ending stock matches current stock)
    const endingStock = Math.max(0, initialStock + stockIn - totalOut);
    const assetValue = endingStock * menu.costPrice;

    return {
      menuItemId: menu.id,
      menuItemName: menu.name,
      category: menu.category,
      subCategory: menu.subCategory || '',
      unit: menu.unit,
      costPrice: menu.costPrice,
      sellingPrice: menu.price,
      initialStock,
      stockIn,
      stockSold,
      stockManualOut,
      totalOut,
      endingStock,
      assetValue,
    };
  });
};

/**
 * Calculates daily stock accumulation timeline:
 * Tanggal, Stock awal, Akumulasi stok masuk, Akumulasi stock keluar, Stock akhir
 */
export const calculateDailyStockAccumulation = (
  startDate: string,
  endDate: string,
  menuItemId?: string
): DailyStockAccumulationRow[] => {
  const menuList = getMenuItems();
  const allMovements = getStockMovements();

  const start = startDate.substring(0, 10);
  const end = endDate.substring(0, 10);

  // Filter movements for target menu item if specified
  const relevantMovements = (!menuItemId || menuItemId === 'ALL')
    ? allMovements
    : allMovements.filter(m => m.menuItemId === menuItemId);

  const targetMenuName = (!menuItemId || menuItemId === 'ALL')
    ? 'Semua Menu'
    : (menuList.find(m => m.id === menuItemId)?.name || 'Menu');

  // 1. Calculate Initial Stock strictly BEFORE start date
  const beforeMovements = relevantMovements.filter(m => m.date < start);
  let initialStockBeforeRange = 0;
  beforeMovements.forEach(m => {
    if (m.type === 'MASUK') initialStockBeforeRange += m.quantity;
    else initialStockBeforeRange -= m.quantity;
  });
  initialStockBeforeRange = Math.max(0, initialStockBeforeRange);

  // 2. Generate date list between start and end
  const dateList: string[] = [];
  const currentD = new Date(start);
  const endD = new Date(end);
  // Cap at 90 days to avoid infinite loops if bad dates
  let loopCount = 0;
  while (currentD <= endD && loopCount < 180) {
    dateList.push(currentD.toISOString().substring(0, 10));
    currentD.setDate(currentD.getDate() + 1);
    loopCount++;
  }

  // 3. Accumulate per date
  const results: DailyStockAccumulationRow[] = [];
  let runningStock = initialStockBeforeRange;

  for (const dateStr of dateList) {
    const dayMovements = relevantMovements.filter(m => m.date === dateStr);
    let dayIn = 0;
    let dayOut = 0;

    dayMovements.forEach(m => {
      if (m.type === 'MASUK') {
        dayIn += m.quantity;
      } else {
        dayOut += m.quantity;
      }
    });

    const dayInitial = runningStock;
    const dayEnding = Math.max(0, dayInitial + dayIn - dayOut);
    runningStock = dayEnding;

    results.push({
      date: dateStr,
      menuName: targetMenuName,
      initialStock: dayInitial,
      accumulatedIn: dayIn,
      accumulatedOut: dayOut,
      endingStock: dayEnding,
    });
  }

  return results;
};


// --- Printer Configuration ---
export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  paperWidth: '58mm',
  connectionType: 'browser',
  autoCut: true,
  feedLines: 2,
  printLogo: true,
  printAddress: true,
  printFooter: true,
};

export const getPrinterConfig = (): PrinterConfig => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRINTER);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading printer config:', e);
  }
  return DEFAULT_PRINTER_CONFIG;
};

export const savePrinterConfig = (config: PrinterConfig): void => {
  localStorage.setItem(STORAGE_KEYS.PRINTER, JSON.stringify(config));
};

// --- Spreadsheet Configuration & Sync Queue ---
export const DEFAULT_SPREADSHEET_CONFIG: SpreadsheetConfig = {
  webAppUrl: '',
  autoSync: true,
  autoSyncIntervalSec: 30,
  lastSyncStatus: 'idle',
  hasPulledInitialData: false,
};

export const getSpreadsheetConfig = (): SpreadsheetConfig => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SPREADSHEET);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading spreadsheet config:', e);
  }
  return DEFAULT_SPREADSHEET_CONFIG;
};

export const saveSpreadsheetConfig = (config: SpreadsheetConfig): void => {
  localStorage.setItem(STORAGE_KEYS.SPREADSHEET, JSON.stringify(config));
  broadcastChange('ALL');
};

export interface SyncQueueItem {
  id: string;
  type: 'TRANSACTION' | 'STOCK_MOVEMENT' | 'MENU_UPDATE';
  payload: any;
  addedAt: string;
}

export const getSyncQueue = (): SyncQueueItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading sync queue:', e);
  }
  return [];
};

export const addToSyncQueue = (type: 'TRANSACTION' | 'STOCK_MOVEMENT' | 'MENU_UPDATE', payload: any) => {
  const current = getSyncQueue();
  const item: SyncQueueItem = {
    id: 'sync-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
    type,
    payload,
    addedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([...current, item]));
};

export const clearSyncQueue = () => {
  localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));
};

// --- Employee Management, Custom Jabatan & Flexible Permissions ---
export const isOwnerAccount = (employee: { isOwner?: boolean; role?: string; id?: string } | null | undefined): boolean => {
  if (!employee) return false;
  return Boolean(
    employee.isOwner ||
    employee.id === 'emp-owner' ||
    (employee.role && employee.role.toLowerCase() === 'owner') ||
    (employee.role && employee.role.toLowerCase().includes('pemilik'))
  );
};

export const getEmployees = (): Employee[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    if (data !== null) {
      const parsed: Employee[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure every employee has valid permissions array and owner is flagged
        const sanitized: Employee[] = parsed.map(emp => {
          const isOwner = isOwnerAccount(emp);
          let perms = emp.permissions;
          if (!Array.isArray(perms) || perms.length === 0) {
            perms = isOwner
              ? ALL_PERMISSION_KEYS
              : (DEFAULT_ROLE_PRESETS[emp.role] || ['pos']);
          }
          return {
            ...emp,
            isOwner,
            permissions: isOwner ? ALL_PERMISSION_KEYS : perms,
          };
        });

        // Always ensure at least one Owner exists in the system
        const hasOwner = sanitized.some(e => isOwnerAccount(e));
        if (!hasOwner) {
          sanitized.unshift(DEFAULT_EMPLOYEES[0]);
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(sanitized));
        }

        return sanitized;
      }
    }
  } catch (e) {
    console.error('Error reading employees:', e);
  }
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(DEFAULT_EMPLOYEES));
  return DEFAULT_EMPLOYEES;
};

export const saveEmployees = (employees: Employee[]): void => {
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  broadcastChange('EMPLOYEES', employees);
};

export const addEmployee = (data: Omit<Employee, 'id' | 'createdAt'>): Employee => {
  const current = getEmployees();
  const isOwner = isOwnerAccount(data);
  const newEmp: Employee = {
    ...data,
    id: 'emp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
    isOwner,
    permissions: isOwner ? ALL_PERMISSION_KEYS : (data.permissions || ['pos']),
    createdAt: new Date().toISOString(),
  };
  saveEmployees([...current, newEmp]);
  return newEmp;
};

export const updateEmployee = (emp: Employee): void => {
  const current = getEmployees();
  const isOwner = isOwnerAccount(emp);
  const updatedEmp: Employee = {
    ...emp,
    isOwner,
    permissions: isOwner ? ALL_PERMISSION_KEYS : (emp.permissions || ['pos']),
  };
  const updated = current.map(e => (e.id === emp.id ? updatedEmp : e));
  saveEmployees(updated);

  // If updating current active employee, update active state too
  const active = getActiveEmployee();
  if (active && active.id === emp.id) {
    setActiveEmployee(updatedEmp);
  }
};

export const deleteEmployee = (id: string): void => {
  const current = getEmployees();
  // Prevent deleting the primary owner
  const target = current.find(e => e.id === id);
  if (target && isOwnerAccount(target)) {
    const ownerCount = current.filter(e => isOwnerAccount(e)).length;
    if (ownerCount <= 1) {
      console.warn('Cannot delete the last Owner account');
      return;
    }
  }
  const updated = current.filter(e => e.id !== id);
  saveEmployees(updated);
};

export const getActiveEmployee = (): Employee => {
  const all = getEmployees();
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_EMPLOYEE);
    if (data) {
      const parsed: Employee = JSON.parse(data);
      const matched = all.find(e => e.id === parsed.id);
      if (matched) return matched;
    }
  } catch (e) {
    console.error('Error reading active employee:', e);
  }
  const defaultEmp = all.find(e => isOwnerAccount(e)) || all[0] || DEFAULT_EMPLOYEES[0];
  localStorage.setItem(STORAGE_KEYS.ACTIVE_EMPLOYEE, JSON.stringify(defaultEmp));
  return defaultEmp;
};

export const setActiveEmployee = (emp: Employee): void => {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_EMPLOYEE, JSON.stringify(emp));
  broadcastChange('ALL');
};

export const hasFeatureAccess = (employee: Employee | null, feature: AppFeature): boolean => {
  if (!employee) return false;
  // Owner always has full access to every feature!
  if (isOwnerAccount(employee)) return true;
  // Flexible checkbox access: check if feature is included in employee's permissions
  if (Array.isArray(employee.permissions)) {
    return employee.permissions.includes(feature);
  }
  return false;
};

// --- Reset & Clean Data Utilities (for Setup New Branch / Reset System) ---
export const clearAllTransactions = (): void => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
  broadcastChange('TRANSACTION');
};

export const clearAllStockMovements = (): void => {
  localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify([]));
  broadcastChange('STOCK');
};

export const clearAllMenuItems = (): void => {
  localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify([]));
  broadcastChange('MENU');
};

export const resetMenuToDefault = (): void => {
  localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(DEFAULT_MENU_ITEMS));
  broadcastChange('MENU');
};

export const resetBranchData = (options: {
  resetTransactions: boolean;
  resetStockMovements: boolean;
  clearMenu: boolean;
  resetMenuToStandard: boolean;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
}): void => {
  if (options.resetTransactions) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
  }
  if (options.resetStockMovements) {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify([]));
  }
  if (options.clearMenu) {
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify([]));
  } else if (options.resetMenuToStandard) {
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(DEFAULT_MENU_ITEMS));
  }
  if (options.branchName || options.branchAddress || options.branchPhone) {
    const current = getStoreProfile();
    const updated: StoreProfile = {
      ...current,
      name: options.branchName?.trim() || current.name,
      address: options.branchAddress !== undefined ? options.branchAddress.trim() : current.address,
      phone: options.branchPhone !== undefined ? options.branchPhone.trim() : current.phone,
    };
    saveStoreProfile(updated);
  }
  clearSyncQueue();
  broadcastChange('ALL');
};

// --- Fitur Backup Data Lokal ke File JSON (Bisa Digunakan Kasir & Owner) ---

export interface LocalDatabaseBackupPayload {
  app: string;
  version: string;
  exportedAt: string;
  exportedBy: string;
  deviceInfo: string;
  data: {
    menuItems: MenuItem[];
    categories: CategoryItem[];
    transactions: Transaction[];
    stockMovements: StockMovement[];
    storeProfile: StoreProfile;
    printerConfig: PrinterConfig;
    spreadsheetConfig: SpreadsheetConfig;
    employees: Employee[];
    accessLogs: AccessLogItem[];
  };
}

/**
 * Membuat cadangan lengkap database lokal ke format teks JSON
 */
export const exportLocalDatabaseBackup = (exportedBy?: string): string => {
  const activeEmp = getActiveEmployee();
  const backupObj: LocalDatabaseBackupPayload = {
    app: 'Warung Seblak Cinta POS',
    version: '1.2',
    exportedAt: new Date().toISOString(),
    exportedBy: exportedBy || `${activeEmp.name} (${activeEmp.role})`,
    deviceInfo: getDeviceFingerprint(),
    data: {
      menuItems: getMenuItems(),
      categories: getCategories(),
      transactions: getTransactions(),
      stockMovements: getStockMovements(),
      storeProfile: getStoreProfile(),
      printerConfig: getPrinterConfig(),
      spreadsheetConfig: getSpreadsheetConfig(),
      employees: getEmployees(),
      accessLogs: getAccessLogs(),
    },
  };

  try {
    recordAccessLog({
      action: 'DATA_RESET',
      actionTitle: 'Cadangkan Database ke JSON',
      details: `${backupObj.exportedBy} mengunduh file cadangan data lokal warung (.json)`,
    });
  } catch (err) {
    console.error(err);
  }

  return JSON.stringify(backupObj, null, 2);
};

/**
 * Memulihkan database lokal dari teks JSON cadangan
 */
export const restoreLocalDatabaseBackup = (
  jsonString: string
): { success: boolean; message: string; summary?: { menus: number; txs: number; movs: number } } => {
  try {
    const parsed = JSON.parse(jsonString);
    const data = parsed.data || parsed; // Support both standard and legacy backups

    if (!data.menuItems && !data.transactions && !data.stockMovements) {
      return {
        success: false,
        message: 'Format file JSON tidak valid atau bukan file cadangan Seblak Cinta.',
      };
    }

    if (Array.isArray(data.menuItems)) {
      saveMenuItems(data.menuItems);
    }
    if (Array.isArray(data.categories)) {
      saveCategories(data.categories);
    }
    if (Array.isArray(data.transactions)) {
      saveTransactions(data.transactions);
    }
    if (Array.isArray(data.stockMovements)) {
      saveStockMovements(data.stockMovements);
    }
    if (data.storeProfile && typeof data.storeProfile === 'object') {
      saveStoreProfile(data.storeProfile);
    }
    if (data.printerConfig && typeof data.printerConfig === 'object') {
      savePrinterConfig(data.printerConfig);
    }
    if (data.spreadsheetConfig && typeof data.spreadsheetConfig === 'object') {
      saveSpreadsheetConfig(data.spreadsheetConfig);
    }
    if (Array.isArray(data.employees) && data.employees.length > 0) {
      saveEmployees(data.employees);
    }

    reorganizeAndMigrateDatabase();
    broadcastChange('ALL');

    const menusCount = Array.isArray(data.menuItems) ? data.menuItems.length : 0;
    const txsCount = Array.isArray(data.transactions) ? data.transactions.length : 0;
    const movsCount = Array.isArray(data.stockMovements) ? data.stockMovements.length : 0;

    try {
      recordAccessLog({
        action: 'DATA_RESET',
        actionTitle: 'Pulihkan Data dari JSON',
        details: `Memulihkan database lokal dari file cadangan (${menusCount} menu, ${txsCount} transaksi)`,
      });
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      message: `Berhasil memulihkan data: ${menusCount} menu, ${txsCount} transaksi, dan ${movsCount} mutasi stok.`,
      summary: { menus: menusCount, txs: txsCount, movs: movsCount },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal membaca file JSON: ${err.message || 'Format rusak'}`,
    };
  }
};

// --- Access Log & User Activity Audit System (Khusus Owner) ---

/**
 * Mendeteksi jenis perangkat, sistem operasi, dan browser pengguna saat ini secara ramah
 */
export const getDeviceFingerprint = (): string => {
  if (typeof navigator === 'undefined') return 'Perangkat Tidak Dikenal';

  const ua = navigator.userAgent || '';
  let os = 'Perangkat';
  let deviceType = '💻 Komputer';

  if (/android/i.test(ua)) {
    os = 'Android';
    deviceType = '📱 HP';
  } else if (/iPad|iPhone|iPod/.test(ua)) {
    os = /iPad/.test(ua) ? 'iPad (iOS)' : 'iPhone (iOS)';
    deviceType = /iPad/.test(ua) ? '📱 Tablet' : '🍎 HP';
  } else if (/Windows NT/i.test(ua)) {
    os = 'Windows';
    deviceType = '💻 PC / Laptop';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
    deviceType = '💻 Mac / MacBook';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    deviceType = '💻 Komputer';
  }

  // Browser check
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) {
    browser = 'Edge';
  } else if (/Chrome|CriOS/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'Firefox';
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  }

  return `${deviceType} ${os} (${browser})`;
};

/**
 * Data awal log audit jika penyimpanan masih kosong
 */
const getInitialSeedLogs = (): AccessLogItem[] => {
  const now = Date.now();
  const formatIso = (offsetMinutes: number) =>
    new Date(now - offsetMinutes * 60 * 1000).toISOString();

  return [
    {
      id: 'log-seed-1',
      employeeId: 'emp-owner',
      employeeName: 'Owner (Pemilik Warung)',
      role: 'Owner',
      action: 'LOGIN',
      actionTitle: 'Login Berhasil (PIN)',
      details: 'Pemilik warung login ke sistem kasir utama dan membuka dashboard kontrol',
      deviceInfo: getDeviceFingerprint(),
      ipOrLocation: 'Lokal / Wi-Fi Toko',
      timestamp: formatIso(15),
    },
    {
      id: 'log-seed-2',
      employeeId: 'emp-owner',
      employeeName: 'Owner (Pemilik Warung)',
      role: 'Owner',
      action: 'PAGE_ACCESS',
      actionTitle: 'Buka Kelola Menu & Kategori',
      details: 'Mengakses modul penataan kategori dan harga menu seblak',
      deviceInfo: getDeviceFingerprint(),
      ipOrLocation: 'Lokal / Wi-Fi Toko',
      timestamp: formatIso(12),
    },
    {
      id: 'log-seed-3',
      employeeId: 'emp-owner',
      employeeName: 'Owner (Pemilik Warung)',
      role: 'Owner',
      action: 'DATABASE_REORGANIZE',
      actionTitle: 'Tata Ulang Database & Sub-Kategori',
      details: 'Sinkronisasi struktur kategori & sub-kategori otomatis diperbarui',
      deviceInfo: getDeviceFingerprint(),
      ipOrLocation: 'Lokal / Wi-Fi Toko',
      timestamp: formatIso(10),
    },
  ];
};

/**
 * Mengambil seluruh riwayat log akses pengguna
 */
export const getAccessLogs = (): AccessLogItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACCESS_LOGS);
    if (data !== null) {
      const parsed: AccessLogItem[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading access logs:', e);
  }

  // Jika kosong, inisialisasi data log awal
  const initial = getInitialSeedLogs();
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_LOGS, JSON.stringify(initial));
  } catch (e) {
    console.error('Failed to save initial access logs:', e);
  }
  return initial;
};

/**
 * Menyimpan daftar log (dibatasi 300 data terbaru agar hemat memori)
 */
export const saveAccessLogs = (logs: AccessLogItem[]): void => {
  try {
    const trimmed = logs.slice(0, 300);
    localStorage.setItem(STORAGE_KEYS.ACCESS_LOGS, JSON.stringify(trimmed));
    broadcastChange('LOG', trimmed);
  } catch (e) {
    console.error('Error saving access logs:', e);
  }
};

/**
 * Mencatat aktivitas / akses baru pengguna ke dalam sistem
 */
export const recordAccessLog = (entry: {
  employeeId?: string;
  employeeName?: string;
  role?: string;
  action: LogActionType;
  actionTitle: string;
  details: string;
  deviceInfo?: string;
  ipOrLocation?: string;
}): AccessLogItem => {
  const activeEmp = getActiveEmployee();
  const currentLogs = getAccessLogs();

  const newLog: AccessLogItem = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    employeeId: entry.employeeId || activeEmp?.id || 'emp-unknown',
    employeeName: entry.employeeName || activeEmp?.name || 'Pengguna Tidak Dikenal',
    role: entry.role || activeEmp?.role || 'Staf',
    action: entry.action,
    actionTitle: entry.actionTitle,
    details: entry.details,
    deviceInfo: entry.deviceInfo || getDeviceFingerprint(),
    ipOrLocation: entry.ipOrLocation || (navigator?.onLine ? 'Online' : 'Offline (Lokal)'),
    timestamp: new Date().toISOString(),
  };

  saveAccessLogs([newLog, ...currentLogs]);
  return newLog;
};

/**
 * Menghapus / membersihkan seluruh riwayat log akses (Tindakan Owner)
 */
export const clearAccessLogs = (): void => {
  localStorage.setItem(STORAGE_KEYS.ACCESS_LOGS, JSON.stringify([]));
  broadcastChange('LOG');
};

/**
 * Mengekspor data log ke format file CSV untuk diunduh
 */
export const exportAccessLogsCsv = (): string => {
  const logs = getAccessLogs();
  const headers = ['No', 'ID Log', 'Waktu (WIB)', 'Nama Staf', 'Jabatan / Peran', 'Aksi Utama', 'Rincian Aktivitas', 'Perangkat Pengguna', 'Status Koneksi'];

  const rows = logs.map((log, index) => {
    const dateFormatted = new Date(log.timestamp).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return [
      index + 1,
      `"${log.id}"`,
      `"${dateFormatted}"`,
      `"${(log.employeeName || '').replace(/"/g, '""')}"`,
      `"${(log.role || '').replace(/"/g, '""')}"`,
      `"${(log.actionTitle || log.action || '').replace(/"/g, '""')}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`,
      `"${(log.deviceInfo || '').replace(/"/g, '""')}"`,
      `"${(log.ipOrLocation || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
};
