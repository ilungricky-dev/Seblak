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

/**
 * Perform sync to Google Spreadsheet Web App
 */
export const syncWithGoogleSheets = async (): Promise<SyncResult> => {
  const config = getSpreadsheetConfig();
  if (!config.webAppUrl || !config.webAppUrl.trim().startsWith('http')) {
    return {
      success: false,
      message: 'URL Google Apps Script belum diatur. Silakan atur URL Spreadsheet di menu Pengaturan.',
      syncedTransactionsCount: 0,
      syncedMovementsCount: 0,
      timestamp: new Date().toISOString(),
    };
  }

  if (!navigator.onLine) {
    return {
      success: false,
      message: 'Perangkat sedang Offline. Data tersimpan di HP dan akan disinkronkan saat terhubung internet.',
      syncedTransactionsCount: 0,
      syncedMovementsCount: 0,
      timestamp: new Date().toISOString(),
    };
  }

  const transactions = getTransactions();
  const movements = getStockMovements();
  const menuItems = getMenuItems();

  const unsyncedTransactions = transactions.filter(t => !t.syncedToSheets);
  const unsyncedMovements = movements.filter(m => !m.syncedToSheets);

  const payload = {
    action: 'SYNC_ALL',
    timestamp: new Date().toISOString(),
    storeName: 'Warung Seblak Cinta',
    data: {
      transactions: unsyncedTransactions,
      stockMovements: unsyncedMovements,
      menuItems: menuItems.map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
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

    // Mark items as synced
    const updatedTxs = transactions.map(t => ({ ...t, syncedToSheets: true }));
    saveTransactions(updatedTxs);

    const updatedMvs = movements.map(m => ({ ...m, syncedToSheets: true }));
    saveStockMovements(updatedMvs);

    // If Google Sheet sent back updated menu stock or items
    if (resultJson.updatedMenuItems && Array.isArray(resultJson.updatedMenuItems)) {
      const merged = mergeMenuItemsFromSheet(menuItems, resultJson.updatedMenuItems);
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
      message: `Sinkronisasi berhasil! ${unsyncedTransactions.length} transaksi & ${unsyncedMovements.length} mutasi stok tersimpan di Google Spreadsheet.`,
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
    if (map.has(r.id)) {
      const existing = map.get(r.id);
      map.set(r.id, {
        ...existing,
        stock: r.stock !== undefined ? r.stock : existing.stock,
        price: r.price !== undefined ? r.price : existing.price,
        costPrice: r.costPrice !== undefined ? r.costPrice : existing.costPrice,
      });
    }
  });
  return Array.from(map.values());
};

/**
 * Standard Google Apps Script code for the user to copy-paste into their Google Sheet
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `
/**
 * GOOGLE APPS SCRIPT - SINKRONISASI WARUNG SEBLAK CINTA
 * 
 * CARA PAKAI:
 * 1. Buat Google Sheet baru di https://sheets.new
 * 2. Klik menu "Ekstensi" (Extensions) > "Apps Script"
 * 3. Hapus semua kode default, lalu Tempel (Paste) kode ini
 * 4. Klik tombol "Simpan" (Ctrl+S atau ikon disket)
 * 5. Klik "Terapkan" (Deploy) > "Kelola Penerapan Baru" (New deployment)
 * 6. Pilih Jenis: "Aplikasi Web" (Web app)
 *    - Deskripsi: POS Seblak Cinta
 *    - Jalankan sebagai: Saya (Akun Anda)
 *    - Yang memiliki akses: Siapa saja (Anyone)
 * 7. Klik "Terapkan" dan Salin URL Aplikasi Web (Web App URL)
 * 8. Tempelkan URL tersebut ke kolom Sinkronisasi di aplikasi kasir ini!
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
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
      "ID Menu", "Nama Menu", "Kategori", "Satuan", "Harga Jual", "Harga Modal", "Stok Saat Ini", "Update Terakhir"
    ]);
    
    if (payload.data && payload.data.menuItems && payload.data.menuItems.length > 0) {
      // Clear data lama dan tulis ulang master menu
      var lastRow = sheetMenu.getLastRow();
      if (lastRow > 1) {
        sheetMenu.getRange(2, 1, lastRow - 1, 8).clearContent();
      }
      
      var rows = payload.data.menuItems.map(function(m) {
        return [
          m.id,
          m.name,
          m.category,
          m.unit,
          m.price,
          m.costPrice,
          m.stock,
          new Date(m.updatedAt || new Date()).toLocaleString("id-ID")
        ];
      });
      
      if (rows.length > 0) {
        sheetMenu.getRange(2, 1, rows.length, 8).setValues(rows);
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
  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    message: "Google Apps Script Sinkronisasi Warung Seblak Cinta Aktif!"
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
