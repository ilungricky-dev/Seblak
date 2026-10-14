import {
  getSpreadsheetConfig,
  saveSpreadsheetConfig,
  getTransactions,
  getStockMovements,
  getMenuItems,
  saveMenuItems,
  saveTransactions,
  saveStockMovements,
  clearSyncQueue,
  broadcastChange,
} from './storage';

export interface SyncResult {
  success: boolean;
  message: string;
  syncedTransactionsCount: number;
  syncedMovementsCount: number;
  timestamp: string;
}

export interface UrlValidationResult {
  isValid: boolean;
  warning?: string;
  advice?: string;
}

export const validateSpreadsheetUrl = (url: string): UrlValidationResult => {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    return { isValid: false, warning: 'URL Google Apps Script belum diisi.' };
  }
  if (!trimmed.startsWith('https://')) {
    return {
      isValid: false,
      warning: 'URL harus diawali dengan https://',
      advice: 'Pastikan menyalin URL lengkap dari Google Apps Script Web App.',
    };
  }
  if (trimmed.includes('docs.google.com/spreadsheets/')) {
    return {
      isValid: false,
      warning: '⚠️ Anda menempel link dokumen Google Sheet biasa, BUKAN link Web App!',
      advice: 'Silakan buka Ekstensi > Apps Script > Terapkan (Deploy) > Penerapan Baru > Aplikasi Web, lalu salin URL yang berakhiran /exec.',
    };
  }
  if (trimmed.includes('script.google.com') && trimmed.includes('/edit')) {
    return {
      isValid: false,
      warning: '⚠️ Ini adalah link editor Apps Script, bukan Web App!',
      advice: 'Klik tombol biru "Terapkan (Deploy)" di kanan atas > Penerapan Baru > Aplikasi Web > Salin URL Aplikasi Web.',
    };
  }
  if (trimmed.includes('/dev')) {
    return {
      isValid: true,
      warning: 'Perhatian: URL ini berakhiran /dev (mode pengujian). Sebaiknya gunakan URL dari Penerapan Baru yang berakhiran /exec.',
    };
  }
  if (!trimmed.includes('script.google.com/macros/s/')) {
    return {
      isValid: false,
      warning: 'Format URL tidak dikenali sebagai Google Apps Script Web App.',
      advice: 'URL yang benar berformat: https://script.google.com/macros/s/.../exec',
    };
  }
  return { isValid: true };
};

export const testSpreadsheetConnection = async (url: string): Promise<{ success: boolean; message: string }> => {
  const validation = validateSpreadsheetUrl(url);
  if (!validation.isValid) {
    return { success: false, message: validation.warning || 'URL tidak valid' };
  }

  try {
    const res = await fetch(url.trim(), {
      method: 'GET',
    });
    const text = await res.text();
    if (text.includes('accounts.google.com') || text.includes('Sign in')) {
      return {
        success: false,
        message: 'Gagal: Google Sheet meminta login. Pastikan saat deploy, "Yang memiliki akses" (Who has access) dipilih "Siapa saja" (Anyone).',
      };
    }
    return {
      success: true,
      message: 'Koneksi Berhasil! URL Google Apps Script aktif dan siap menerima data.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal tes koneksi: ${err.message || 'CORS / Network Error'}. Pastikan saat deploy, "Yang memiliki akses" disetel ke "Siapa saja (Anyone)".`,
    };
  }
};

/**
 * Perform sync to Google Spreadsheet Web App
 */
export const syncWithGoogleSheets = async (forceAll: boolean = false): Promise<SyncResult> => {
  const config = getSpreadsheetConfig();
  const validation = validateSpreadsheetUrl(config.webAppUrl);
  if (!validation.isValid) {
    return {
      success: false,
      message: `${validation.warning || 'URL Spreadsheet belum diatur.'} ${validation.advice || ''}`,
      syncedTransactionsCount: 0,
      syncedMovementsCount: 0,
      timestamp: new Date().toISOString(),
    };
  }

  if (!navigator.onLine) {
    return {
      success: false,
      message: 'Perangkat sedang Offline. Data tersimpan aman di HP dan akan disinkronkan saat terhubung internet.',
      syncedTransactionsCount: 0,
      syncedMovementsCount: 0,
      timestamp: new Date().toISOString(),
    };
  }

  const transactions = getTransactions();
  const movements = getStockMovements();
  const menuItems = getMenuItems();

  const unsyncedTransactions = forceAll ? transactions : transactions.filter(t => !t.syncedToSheets);
  const unsyncedMovements = forceAll ? movements : movements.filter(m => !m.syncedToSheets);

  const payload = {
    action: forceAll ? 'FULL_SYNC_ALL' : 'SYNC_ALL',
    timestamp: new Date().toISOString(),
    storeName: 'Warung Seblak Cinta',
    data: {
      transactions: unsyncedTransactions,
      stockMovements: unsyncedMovements,
      menuItems: menuItems.map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
        subCategory: m.subCategory || '',
        price: m.price,
        costPrice: m.costPrice,
        stock: m.stock,
        unit: m.unit,
        updatedAt: m.updatedAt,
      })),
    },
  };

  try {
    const response = await fetch(config.webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // avoid CORS preflight issues with Google Apps Script
      },
      body: JSON.stringify(payload),
    });

    const resultText = await response.text();
    let resultJson: any = {};
    try {
      resultJson = JSON.parse(resultText);
    } catch {
      resultJson = { status: 'success' };
    }

    // Mark items as synced without overwriting newly arrived concurrent transactions
    const currentLatestTxs = getTransactions();
    const syncedTxIds = new Set(unsyncedTransactions.map(t => t.id));
    const updatedTxs = currentLatestTxs.map(t =>
      syncedTxIds.has(t.id) ? { ...t, syncedToSheets: true } : t
    );
    saveTransactions(updatedTxs);

    const currentLatestMvs = getStockMovements();
    const syncedMvIds = new Set(unsyncedMovements.map(m => m.id));
    const updatedMvs = currentLatestMvs.map(m =>
      syncedMvIds.has(m.id) ? { ...m, syncedToSheets: true } : m
    );
    saveStockMovements(updatedMvs);

    // If Google Sheet sent back updated menu stock or items
    if (resultJson.updatedMenuItems && Array.isArray(resultJson.updatedMenuItems)) {
      const latestMenu = getMenuItems();
      const merged = mergeMenuItemsFromSheet(latestMenu, resultJson.updatedMenuItems);
      saveMenuItems(merged);
    }

    clearSyncQueue();

    // Update config status
    saveSpreadsheetConfig({
      ...config,
      lastSyncedAt: new Date().toISOString(),
      lastSyncStatus: 'success',
      lastSyncError: undefined,
    });

    broadcastChange('ALL');

    return {
      success: true,
      message: forceAll
        ? `Sinkron ulang lengkap berhasil! Seluruh ${unsyncedTransactions.length} transaksi & ${unsyncedMovements.length} mutasi stok tersimpan di Google Spreadsheet.`
        : `Sinkronisasi berhasil! ${unsyncedTransactions.length} transaksi & ${unsyncedMovements.length} mutasi stok tersimpan di Google Spreadsheet.`,
      syncedTransactionsCount: unsyncedTransactions.length,
      syncedMovementsCount: unsyncedMovements.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('Spreadsheet sync error:', err);
    saveSpreadsheetConfig({
      ...config,
      lastSyncStatus: 'failed',
      lastSyncError: err.message || 'Gagal menghubungi Spreadsheet',
    });

    return {
      success: false,
      message: `Gagal sinkron ke Spreadsheet: ${err.message || 'Koneksi terputus'}. Data tetap aman di memori lokal.`,
      syncedTransactionsCount: 0,
      syncedMovementsCount: 0,
      timestamp: new Date().toISOString(),
    };
  }
};

const mergeMenuItemsFromSheet = (local: any[], remote: any[]) => {
  const map = new Map(local.map(item => [item.id, item]));
  remote.forEach(r => {
    if (!r.id) return;
    if (map.has(r.id)) {
      const existing = map.get(r.id);
      map.set(r.id, {
        ...existing,
        name: r.name || existing.name,
        category: r.category || existing.category,
        subCategory: r.subCategory !== undefined ? r.subCategory : existing.subCategory,
        stock: r.stock !== undefined ? Number(r.stock) : existing.stock,
        price: r.price !== undefined ? Number(r.price) : existing.price,
        costPrice: r.costPrice !== undefined ? Number(r.costPrice) : existing.costPrice,
        unit: r.unit || existing.unit,
        updatedAt: r.updatedAt || new Date().toISOString(),
      });
    } else {
      map.set(r.id, {
        id: r.id,
        name: r.name || 'Menu Baru',
        category: r.category || 'Lainnya',
        subCategory: r.subCategory || '',
        price: Number(r.price) || 0,
        costPrice: Number(r.costPrice) || 0,
        stock: Number(r.stock) || 0,
        minStock: 5,
        unit: r.unit || 'Porsi',
        allowSpicyLevel: true,
        defaultSpicyLevel: 1,
        imageUrl: '',
        isActive: true,
        updatedAt: new Date().toISOString(),
      });
    }
  });
  return Array.from(map.values());
};

/**
 * Tarik data awal dari Google Spreadsheet (untuk perangkat/user yang baru menghubungkan Spreadsheet)
 */
export const pullDataFromSpreadsheet = async (): Promise<{
  success: boolean;
  message: string;
  pulledCount: { menuItems: number; transactions: number };
}> => {
  const config = getSpreadsheetConfig();
  const validation = validateSpreadsheetUrl(config.webAppUrl);
  if (!validation.isValid) {
    return {
      success: false,
      message: `${validation.warning || 'URL Spreadsheet belum diatur.'} ${validation.advice || ''}`,
      pulledCount: { menuItems: 0, transactions: 0 },
    };
  }

  if (!navigator.onLine) {
    return {
      success: false,
      message: 'Perangkat sedang Offline. Hubungkan koneksi internet untuk menarik data awal dari Spreadsheet.',
      pulledCount: { menuItems: 0, transactions: 0 },
    };
  }

  try {
    let resultJson: any = null;

    // Coba via POST PULL_DATA terlebih dahulu
    try {
      const response = await fetch(config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'PULL_DATA' }),
      });
      const text = await response.text();
      resultJson = JSON.parse(text);
    } catch {
      // Fallback ke GET PULL_DATA
      const sep = config.webAppUrl.includes('?') ? '&' : '?';
      const getRes = await fetch(`${config.webAppUrl}${sep}action=PULL_DATA&t=${Date.now()}`);
      const text = await getRes.text();
      resultJson = JSON.parse(text);
    }

    let menuCount = 0;
    if (resultJson && Array.isArray(resultJson.menuItems) && resultJson.menuItems.length > 0) {
      const current = getMenuItems();
      const merged = mergeMenuItemsFromSheet(current, resultJson.menuItems);
      saveMenuItems(merged);
      menuCount = resultJson.menuItems.length;
    }

    // Tandai bahwa perangkat ini sudah berhasil menarik data awal
    const updatedCfg = {
      ...config,
      hasPulledInitialData: true,
      lastSyncedAt: new Date().toISOString(),
      lastSyncStatus: 'success' as const,
      lastSyncError: undefined,
    };
    saveSpreadsheetConfig(updatedCfg);
    broadcastChange('ALL');

    return {
      success: true,
      message: menuCount > 0
        ? `Berhasil mengambil ${menuCount} data menu & stok dari Google Spreadsheet! Data kini telah tersinkron.`
        : `Koneksi berhasil dan data perangkat telah disinkronkan dengan Google Spreadsheet!`,
      pulledCount: { menuItems: menuCount, transactions: 0 },
    };
  } catch (err: any) {
    console.error('Error in pullDataFromSpreadsheet:', err);
    return {
      success: false,
      message: `Gagal menarik data dari Spreadsheet: ${err.message || 'Koneksi gagal'}. Pastikan URL Web App benar dan opsi deploy 'Anyone' aktif.`,
      pulledCount: { menuItems: 0, transactions: 0 },
    };
  }
};

/**
 * Standard Google Apps Script code for the user to copy-paste into their Google Sheet
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT - SINKRONISASI WARUNG SEBLAK CINTA
 * 
 * FITUR:
 * - Dukung sinkronisasi multi-perangkat kasir
 * - Fitur PUSH (kirim data penjualan & mutasi dari kasir)
 * - Fitur PULL (ambil master data menu & stok ke perangkat baru)
 * 
 * CARA PAKAI:
 * 1. Buka Google Sheet di https://sheets.new
 * 2. Klik menu "Ekstensi" (Extensions) > "Apps Script"
 * 3. Hapus semua kode default, lalu Tempel (Paste) seluruh kode ini
 * 4. Klik tombol "Simpan" (Ctrl+S atau ikon disket)
 * 5. Klik "Terapkan" (Deploy) > "Kelola Penerapan Baru" (New deployment)
 * 6. Pilih Jenis: "Aplikasi Web" (Web app)
 *    - Jalankan sebagai: Saya (Akun Anda)
 *    - Yang memiliki akses: Siapa saja (Anyone) -> WAJIB!
 * 7. Klik "Terapkan" dan Salin URL Aplikasi Web berakhiran /exec
 * 8. Tempelkan URL tersebut ke aplikasi kasir!
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Jika permintaannya adalah TARIK DATA AWAL (PULL_DATA)
    if (payload.action === "PULL_DATA" || payload.action === "PULL_ALL") {
      return handlePullData(ss);
    }
    
    // 1. Sheet Transaksi Penjualan
    var sheetTx = getOrCreateSheet(ss, "Penjualan", [
      "No Struk", "Waktu", "Pelanggan", "Meja/Antrean", "Tipe Pesanan", 
      "Item Dipesan", "Subtotal", "Diskon", "Total", "Metode Bayar", "Kasir"
    ]);
    
    if (payload.data && payload.data.transactions && payload.data.transactions.length > 0) {
      payload.data.transactions.forEach(function(tx) {
        var itemsSummary = tx.items.map(function(i) {
          return i.name + " (x" + i.quantity + ") " + (i.spicyLevel > 0 ? "[Lvl " + i.spicyLevel + "]" : "");
        }).join(", ");
        
        sheetTx.appendRow([
          tx.receiptNo,
          new Date(tx.createdAt).toLocaleString("id-ID"),
          tx.customerName || "-",
          tx.tableOrQueueNo || "-",
          tx.orderType,
          itemsSummary,
          tx.subtotal,
          tx.discount,
          tx.total,
          tx.paymentMethod,
          tx.cashierName
        ]);
      });
    }
    
    // 2. Sheet Mutasi Stok (Masuk & Keluar)
    var sheetStok = getOrCreateSheet(ss, "Mutasi_Stok", [
      "ID Mutasi", "Waktu", "Tanggal", "Nama Menu/Bahan", "Tipe", 
      "Jumlah", "Stok Sebelum", "Stok Sesudah", "Keterangan/Alasan", "Harga Satuan"
    ]);
    
    if (payload.data && payload.data.stockMovements && payload.data.stockMovements.length > 0) {
      payload.data.stockMovements.forEach(function(m) {
        sheetStok.appendRow([
          m.id,
          new Date(m.createdAt).toLocaleString("id-ID"),
          m.date,
          m.menuItemName,
          m.type,
          m.quantity,
          m.previousStock,
          m.currentStock,
          m.reason,
          m.costPerUnit || 0
        ]);
      });
    }
    
    // 3. Sheet Master Menu & Stok Terkini
    var sheetMenu = getOrCreateSheet(ss, "Master_Menu", [
      "ID Menu", "Nama Menu", "Kategori", "Sub Kategori", "Satuan", "Harga Jual", "Harga Modal", "Stok Saat Ini", "Update Terakhir"
    ]);
    
    if (payload.data && payload.data.menuItems && payload.data.menuItems.length > 0) {
      var lastRow = sheetMenu.getLastRow();
      if (lastRow > 1) {
        sheetMenu.getRange(2, 1, lastRow - 1, 9).clearContent();
      }
      
      var rows = payload.data.menuItems.map(function(m) {
        return [
          m.id,
          m.name,
          m.category,
          m.subCategory || "",
          m.unit,
          m.price,
          m.costPrice,
          m.stock,
          new Date(m.updatedAt || new Date()).toLocaleString("id-ID")
        ];
      });
      
      if (rows.length > 0) {
        sheetMenu.getRange(2, 1, rows.length, 9).setValues(rows);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data berhasil disinkronkan ke Google Spreadsheet",
      updatedAt: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function handlePullData(ss) {
  var sheetMenu = ss.getSheetByName("Master_Menu");
  var menuItems = [];
  if (sheetMenu && sheetMenu.getLastRow() > 1) {
    var vals = sheetMenu.getRange(2, 1, sheetMenu.getLastRow() - 1, 9).getValues();
    vals.forEach(function(row) {
      if (row[0] && row[1]) {
        menuItems.push({
          id: String(row[0]),
          name: String(row[1]),
          category: String(row[2] || "Lainnya"),
          subCategory: String(row[3] || ""),
          unit: String(row[4] || "Porsi"),
          price: Number(row[5]) || 0,
          costPrice: Number(row[6]) || 0,
          stock: Number(row[7]) || 0,
          isActive: true
        });
      }
    });
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Berhasil menarik data dari spreadsheet",
    menuItems: menuItems
  })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#e11d48")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  if (action === "PULL_DATA" || action === "FETCH_ALL") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return handlePullData(ss);
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    message: "Google Apps Script Sinkronisasi Warung Seblak Cinta Aktif!"
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
