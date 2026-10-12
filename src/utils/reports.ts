import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, AccumulatedStockRow, DailyStockAccumulationRow, StoreProfile } from '../types';
import { formatRupiah } from './printer';


// --- SALES REPORT EXPORT ---

export const exportSalesReportToExcel = (
  transactions: Transaction[],
  startDate: string,
  endDate: string,
  profile: StoreProfile
) => {
  const fileName = `Laporan_Penjualan_${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_${startDate}_sd_${endDate}.xlsx`;

  // Sheet 1: Rincian Transaksi
  const txRows = transactions.map((t, idx) => {
    const itemsSummary = t.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
    return {
      No: idx + 1,
      'No Struk': t.receiptNo,
      Tanggal: new Date(t.createdAt).toLocaleString('id-ID'),
      Pelanggan: t.customerName || '-',
      'Meja/Antrean': t.tableOrQueueNo || '-',
      'Tipe Pesanan': t.orderType,
      'Daftar Menu': itemsSummary,
      Subtotal: t.subtotal,
      Diskon: t.discount,
      'Total Akhir': t.total,
      'Metode Bayar': t.paymentMethod,
      Kasir: t.cashierName,
    };
  });

  // Calculate totals
  const totalOmzet = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalDiskon = transactions.reduce((sum, t) => sum + t.discount, 0);
  const countTunai = transactions.filter(t => t.paymentMethod === 'Tunai').length;
  const countQris = transactions.filter(t => t.paymentMethod === 'QRIS').length;
  const countTransfer = transactions.filter(t => t.paymentMethod === 'Transfer').length;

  // Sheet 2: Ringkasan
  const summaryRows = [
    { Parameter: 'Nama Warung', Nilai: profile.name },
    { Parameter: 'Periode Dari', Nilai: startDate },
    { Parameter: 'Periode Sampai', Nilai: endDate },
    { Parameter: 'Total Transaksi', Nilai: transactions.length },
    { Parameter: 'Total Omzet Kotor', Nilai: totalOmzet },
    { Parameter: 'Total Diskon Diberikan', Nilai: totalDiskon },
    { Parameter: 'Rata-rata per Transaksi', Nilai: transactions.length ? Math.round(totalOmzet / transactions.length) : 0 },
    { Parameter: 'Transaksi Tunai', Nilai: `${countTunai} transaksi` },
    { Parameter: 'Transaksi QRIS', Nilai: `${countQris} transaksi` },
    { Parameter: 'Transaksi Transfer', Nilai: `${countTransfer} transaksi` },
    { Parameter: 'Tanggal Export', Nilai: new Date().toLocaleString('id-ID') },
  ];

  const wb = XLSX.utils.book_new();
  const wsTx = XLSX.utils.json_to_sheet(txRows);
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
  XLSX.utils.book_append_sheet(wb, wsTx, 'Daftar Transaksi');

  XLSX.writeFile(wb, fileName);
};

export const exportSalesReportToPDF = (
  transactions: Transaction[],
  startDate: string,
  endDate: string,
  profile: StoreProfile
) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');

  // Header Title
  doc.setFontSize(16);
  doc.setTextColor(190, 18, 60); // Rose 700
  doc.text(profile.name.toUpperCase(), 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`${profile.slogan || 'Pedas Gurih Bikin Nagih'} | ${profile.address || ''}`, 14, 21);
  doc.text(`LAPORAN PENJUALAN KASIR (Periode: ${startDate} s/d ${endDate})`, 14, 27);

  // Summary Metrics Banner
  const totalOmzet = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalQtyItem = transactions.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0);
  
  doc.setFillColor(244, 244, 245);
  doc.roundedRect(14, 31, 269, 14, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(`Total Omzet: ${formatRupiah(totalOmzet)}`, 20, 40);
  doc.text(`Total Transaksi: ${transactions.length} pesanan`, 90, 40);
  doc.text(`Total Item Terjual: ${totalQtyItem} porsi/pcs`, 160, 40);
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 225, 40);

  // Table Data
  const tableData = transactions.map((t, idx) => [
    idx + 1,
    t.receiptNo,
    new Date(t.createdAt).toLocaleDateString('id-ID') + ' ' + new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    t.customerName || t.tableOrQueueNo || '-',
    t.orderType.includes('Takeaway') ? 'Bungkus' : 'Makan Sini',
    t.items.map(i => `${i.name} (x${i.quantity})`).join('\n'),
    formatRupiah(t.subtotal),
    t.discount > 0 ? `-${formatRupiah(t.discount)}` : '-',
    formatRupiah(t.total),
    t.paymentMethod,
    t.cashierName,
  ]);

  autoTable(doc, {
    startY: 48,
    head: [[
      'No',
      'No Struk',
      'Waktu',
      'Pelanggan/Meja',
      'Tipe',
      'Menu Dipesan',
      'Subtotal',
      'Diskon',
      'Total',
      'Bayar',
      'Kasir',
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [225, 29, 72], // Rose 600
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 20 },
      2: { cellWidth: 26 },
      3: { cellWidth: 24 },
      4: { halign: 'center', cellWidth: 18 },
      5: { cellWidth: 60 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
      9: { halign: 'center', cellWidth: 18 },
      10: { cellWidth: 22 },
    },
    styles: { overflow: 'linebreak' },
  });

  const fileName = `Laporan_Penjualan_${startDate}_sd_${endDate}.pdf`;
  doc.save(fileName);
};

// --- STOCK REPORT EXPORT (Stok Awal, Masuk, Keluar, Stok Akhir Akumulasi by Tanggal) ---

export const exportStockReportToExcel = (
  stockRows: AccumulatedStockRow[],
  startDate: string,
  endDate: string,
  profile: StoreProfile
) => {
  const fileName = `Laporan_Akumulasi_Stok_${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_${startDate}_sd_${endDate}.xlsx`;

  const rows = stockRows.map((r, idx) => ({
    No: idx + 1,
    'Nama Menu / Bahan': r.menuItemName,
    Kategori: r.category,
    Satuan: r.unit,
    'Harga Modal (Rp)': r.costPrice,
    'Harga Jual (Rp)': r.sellingPrice,
    'Stok Awal': r.initialStock,
    'Stok Masuk (+)': r.stockIn,
    'Terjual (-)': r.stockSold,
    'Keluar Manual / Waste (-)': r.stockManualOut,
    'Total Keluar (-)': r.totalOut,
    'Stok Akhir': r.endingStock,
    'Nilai Aset Stok (Rp)': r.assetValue,
  }));

  const totalAsset = stockRows.reduce((sum, r) => sum + r.assetValue, 0);
  const totalMasuk = stockRows.reduce((sum, r) => sum + r.stockIn, 0);
  const totalKeluar = stockRows.reduce((sum, r) => sum + r.totalOut, 0);

  const summary = [
    { Parameter: 'Nama Warung', Nilai: profile.name },
    { Parameter: 'Periode Akumulasi Dari', Nilai: startDate },
    { Parameter: 'Periode Akumulasi Sampai', Nilai: endDate },
    { Parameter: 'Total Macam Produk', Nilai: stockRows.length },
    { Parameter: 'Total Jumlah Stok Masuk', Nilai: totalMasuk },
    { Parameter: 'Total Jumlah Stok Keluar', Nilai: totalKeluar },
    { Parameter: 'Total Nilai Aset Stok Berjalan', Nilai: totalAsset },
    { Parameter: 'Waktu Export', Nilai: new Date().toLocaleString('id-ID') },
  ];

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.json_to_sheet(summary);
  const wsStock = XLSX.utils.json_to_sheet(rows);

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
  XLSX.utils.book_append_sheet(wb, wsStock, 'Akumulasi Stok');

  XLSX.writeFile(wb, fileName);
};

export const exportStockReportToPDF = (
  stockRows: AccumulatedStockRow[],
  startDate: string,
  endDate: string,
  profile: StoreProfile
) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');

  // Header Title
  doc.setFontSize(16);
  doc.setTextColor(225, 29, 72); // Rose 600
  doc.text(profile.name.toUpperCase(), 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  doc.text(`${profile.slogan || 'Pedas Gurih Bikin Nagih'} | ${profile.address || ''}`, 14, 21);
  doc.text(`LAPORAN AKUMULASI STOK AWAL, MASUK, KELUAR & AKHIR`, 14, 27);
  doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 32);

  // Summary Banner
  const totalAsset = stockRows.reduce((sum, r) => sum + r.assetValue, 0);
  const totalMasuk = stockRows.reduce((sum, r) => sum + r.stockIn, 0);
  const totalTerjual = stockRows.reduce((sum, r) => sum + r.stockSold, 0);
  const totalManual = stockRows.reduce((sum, r) => sum + r.stockManualOut, 0);

  doc.setFillColor(254, 242, 242); // Rose 50
  doc.roundedRect(14, 36, 269, 14, 2, 2, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text(`Total Masuk: +${totalMasuk}`, 20, 45);
  doc.text(`Terjual Kasir: -${totalTerjual}`, 70, 45);
  doc.text(`Keluar Manual/Waste: -${totalManual}`, 125, 45);
  doc.text(`Total Nilai Aset Stok: ${formatRupiah(totalAsset)}`, 185, 45);

  const tableData = stockRows.map((r, idx) => [
    idx + 1,
    r.menuItemName,
    r.category,
    r.unit,
    formatRupiah(r.costPrice),
    r.initialStock,
    `+${r.stockIn}`,
    `-${r.stockSold}`,
    `-${r.stockManualOut}`,
    `-${r.totalOut}`,
    r.endingStock,
    formatRupiah(r.assetValue),
  ]);

  autoTable(doc, {
    startY: 53,
    head: [[
      'No',
      'Nama Menu/Bahan',
      'Kategori',
      'Satuan',
      'Harga Modal',
      'Stok Awal',
      'Masuk (+)',
      'Terjual (-)',
      'Waste (-)',
      'Total Keluar',
      'Stok Akhir',
      'Nilai Aset',
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [180, 20, 50],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 30, 30],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 55, fontStyle: 'bold' },
      2: { cellWidth: 20 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 18, textColor: [16, 120, 50] },
      7: { halign: 'center', cellWidth: 18, textColor: [180, 30, 30] },
      8: { halign: 'center', cellWidth: 18, textColor: [200, 100, 0] },
      9: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      10: { halign: 'center', cellWidth: 20, fontStyle: 'bold', textColor: [15, 23, 42] },
      11: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
    },
    styles: { overflow: 'linebreak' },
  });

  const fileName = `Laporan_Akumulasi_Stok_${startDate}_sd_${endDate}.pdf`;
  doc.save(fileName);
};

// --- DAILY TIMELINE STOCK REPORT EXPORT (Tanggal, Stock awal, Akumulasi stok masuk, Akumulasi stock keluar, Stock akhir) ---

export const exportDailyStockReportToExcel = (
  rows: DailyStockAccumulationRow[],
  startDate: string,
  endDate: string,
  profile: StoreProfile,
  menuLabel: string = 'Semua Menu'
) => {
  const fileName = `Laporan_Stok_Harian_${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_${startDate}_sd_${endDate}.xlsx`;

  const excelRows = rows.map((r, idx) => ({
    No: idx + 1,
    Tanggal: r.date,
    'Menu / Produk': r.menuName,
    'Stock awal': r.initialStock,
    'Akumulasi stok masuk': r.accumulatedIn,
    'Akumulasi stock keluar': r.accumulatedOut,
    'Stock akhir': r.endingStock,
  }));

  const totalIn = rows.reduce((s, r) => s + r.accumulatedIn, 0);
  const totalOut = rows.reduce((s, r) => s + r.accumulatedOut, 0);

  const summary = [
    { Parameter: 'Nama Warung', Nilai: profile.name },
    { Parameter: 'Menu Terpilih', Nilai: menuLabel },
    { Parameter: 'Periode Dari Tanggal', Nilai: startDate },
    { Parameter: 'Periode Sampai Tanggal', Nilai: endDate },
    { Parameter: 'Total Baris Tanggal', Nilai: rows.length },
    { Parameter: 'Total Akumulasi Stok Masuk', Nilai: totalIn },
    { Parameter: 'Total Akumulasi Stock Keluar', Nilai: totalOut },
    { Parameter: 'Waktu Export', Nilai: new Date().toLocaleString('id-ID') },
  ];

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.json_to_sheet(summary);
  const wsStock = XLSX.utils.json_to_sheet(excelRows);

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
  XLSX.utils.book_append_sheet(wb, wsStock, 'Rekap Stok Harian');

  XLSX.writeFile(wb, fileName);
};

export const exportDailyStockReportToPDF = (
  rows: DailyStockAccumulationRow[],
  startDate: string,
  endDate: string,
  profile: StoreProfile,
  menuLabel: string = 'Semua Menu'
) => {
  const doc = new jsPDF('portrait', 'mm', 'a4');

  // Kop Warung
  doc.setFontSize(15);
  doc.setTextColor(225, 29, 72); // Rose 600
  doc.text(profile.name.toUpperCase(), 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text(`${profile.slogan || 'Pedas Gurih Bikin Nagih'} | ${profile.address || ''}`, 14, 20);
  doc.text(`LAPORAN AKUMULASI STOK HARIAN (${menuLabel})`, 14, 25);
  doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 29);

  // Summary Banner
  const totalIn = rows.reduce((s, r) => s + r.accumulatedIn, 0);
  const totalOut = rows.reduce((s, r) => s + r.accumulatedOut, 0);

  doc.setFillColor(254, 242, 242);
  doc.roundedRect(14, 32, 182, 11, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text(`Menu: ${menuLabel}`, 18, 39);
  doc.text(`Total Masuk: +${totalIn}`, 75, 39);
  doc.text(`Total Keluar: -${totalOut}`, 120, 39);
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 160, 39);

  // Table
  const tableData = rows.map((r, idx) => [
    idx + 1,
    r.date,
    r.initialStock,
    `+${r.accumulatedIn}`,
    `-${r.accumulatedOut}`,
    r.endingStock,
  ]);

  autoTable(doc, {
    startY: 46,
    head: [[
      'No',
      'Tanggal',
      'Stock awal',
      'Akumulasi stok masuk',
      'Akumulasi stock keluar',
      'Stock akhir',
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [225, 29, 72],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 30, 30],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'center', cellWidth: 35, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 32 },
      3: { halign: 'center', cellWidth: 36, textColor: [16, 120, 50], fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 36, textColor: [180, 30, 30], fontStyle: 'bold' },
      5: { halign: 'center', cellWidth: 31, fontStyle: 'bold', textColor: [15, 23, 42] },
    },
  });

  const fileName = `Laporan_Stok_Harian_${startDate}_sd_${endDate}.pdf`;
  doc.save(fileName);
};

