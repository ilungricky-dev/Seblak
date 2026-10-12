import React, { useState, useMemo } from 'react';
import {
  Receipt,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Search,
  ArrowUpRight,
  Sparkles,
  Printer,
} from 'lucide-react';
import { Transaction, StoreProfile, PaymentMethod, PrinterConfig } from '../types';
import { exportSalesReportToExcel, exportSalesReportToPDF } from '../utils/reports';
import { formatRupiah } from '../utils/printer';
import { ReceiptModal } from './ReceiptModal';

interface ReportsSaleViewProps {
  transactions: Transaction[];
  storeProfile: StoreProfile;
  printerConfig?: PrinterConfig;
  onOpenPrinterSettings?: () => void;
}

export const ReportsSaleView: React.FC<ReportsSaleViewProps> = ({
  transactions,
  storeProfile,
  printerConfig = {
    paperWidth: '58mm',
    connectionType: 'browser',
    autoCut: true,
    feedLines: 2,
    printLogo: true,
    printAddress: true,
    printFooter: true,
  },
  onOpenPrinterSettings,
}) => {
  // Date filters: default last 30 days
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected transaction to view/print receipt
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  const handleOpenReceipt = (tx: Transaction) => {
    setReceiptTx(tx);
    setIsReceiptModalOpen(true);
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txDate = t.createdAt.substring(0, 10);
      const matchDate = txDate >= startDate && txDate <= endDate;
      const matchPayment = paymentFilter === 'ALL' || t.paymentMethod === paymentFilter;
      const matchSearch =
        t.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tableOrQueueNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.cashierName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDate && matchPayment && matchSearch;
    });
  }, [transactions, startDate, endDate, paymentFilter, searchQuery]);

  // Aggregate Metrics
  const totalOmzet = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  }, [filteredTransactions]);

  const totalDiscount = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.discount, 0);
  }, [filteredTransactions]);

  const totalHPP = useMemo(() => {
    return filteredTransactions.reduce(
      (sum, t) => sum + t.items.reduce((itemSum, i) => itemSum + (i.costPrice || 0) * i.quantity, 0),
      0
    );
  }, [filteredTransactions]);

  const grossProfit = totalOmzet - totalHPP;

  const avgPerTransaction =
    filteredTransactions.length > 0 ? Math.round(totalOmzet / filteredTransactions.length) : 0;

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      alert('Tidak ada transaksi untuk diekspor pada rentang tanggal ini.');
      return;
    }
    exportSalesReportToExcel(filteredTransactions, startDate, endDate, storeProfile);
  };

  const handleExportPDF = () => {
    if (filteredTransactions.length === 0) {
      alert('Tidak ada transaksi untuk diekspor pada rentang tanggal ini.');
      return;
    }
    exportSalesReportToPDF(filteredTransactions, startDate, endDate, storeProfile);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-4">
      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-lg mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Laporan Penjualan Kasir
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Pantau omzet penjualan, total transaksi, estimasi laba kotor, dan ekspor langsung ke format Excel (.xlsx) atau PDF.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all"
            title="Download laporan dalam format Microsoft Excel / Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 transition-all"
            title="Download laporan dalam format PDF siap cetak"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-md">
          <span className="text-[11px] font-semibold text-stone-400 block mb-1">
            Total Omzet Penjualan
          </span>
          <div className="text-lg sm:text-xl font-black text-emerald-400 truncate">
            {formatRupiah(totalOmzet)}
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">
            {filteredTransactions.length} transaksi selesai
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-md">
          <span className="text-[11px] font-semibold text-stone-400 block mb-1">
            Estimasi Laba Kotor
          </span>
          <div className="text-lg sm:text-xl font-black text-rose-400 truncate">
            {formatRupiah(grossProfit)}
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">
            Modal HPP: {formatRupiah(totalHPP)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-md">
          <span className="text-[11px] font-semibold text-stone-400 block mb-1">
            Rata-rata Transaksi
          </span>
          <div className="text-lg sm:text-xl font-black text-amber-400 truncate">
            {formatRupiah(avgPerTransaction)}
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">Per struk penjualan</span>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-md">
          <span className="text-[11px] font-semibold text-stone-400 block mb-1">
            Total Diskon Diberikan
          </span>
          <div className="text-lg sm:text-xl font-black text-sky-400 truncate">
            {formatRupiah(totalDiscount)}
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">Promo potongan harga</span>
        </div>
      </div>

      {/* Filter Bar with Date Dari - Sampai */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Dari Tanggal */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-400 whitespace-nowrap">Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Sampai Tanggal */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-400 whitespace-nowrap">Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Metode Bayar */}
          <div>
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Semua Metode Pembayaran</option>
              <option value="Tunai">Tunai</option>
              <option value="QRIS">QRIS</option>
              <option value="Transfer">Transfer</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Cari no struk, pelanggan, kasir..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-stone-800 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-white">
            Daftar Transaksi ({filteredTransactions.length} pesanan)
          </h3>
          <span className="text-xs font-mono font-bold text-emerald-400">
            Total: {formatRupiah(totalOmzet)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950 text-stone-400 font-bold border-b border-stone-800 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 text-center">No</th>
                <th className="py-2.5 px-3">No Struk</th>
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Pelanggan & Meja</th>
                <th className="py-2.5 px-3">Tipe</th>
                <th className="py-2.5 px-3">Menu Dipesan</th>
                <th className="py-2.5 px-3 text-right">Subtotal</th>
                <th className="py-2.5 px-3 text-right">Diskon</th>
                <th className="py-2.5 px-3 text-right">Total Akhir</th>
                <th className="py-2.5 px-3 text-center">Metode</th>
                <th className="py-2.5 px-3">Kasir</th>
                <th className="py-2.5 px-3 text-center">Aksi Struk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 bg-stone-900/60 text-stone-300">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-stone-500">
                    Tidak ada transaksi pada periode {startDate} s/d {endDate}.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr key={tx.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-center text-stone-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-rose-400 whitespace-nowrap">
                      {tx.receiptNo}
                    </td>
                    <td className="py-2.5 px-3 text-stone-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString('id-ID')} {new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-bold text-white">{tx.customerName}</div>
                      <div className="text-[10px] text-stone-400">{tx.tableOrQueueNo}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-stone-950 border border-stone-800">
                        {tx.orderType.includes('Takeaway') ? 'Bungkus' : 'Makan Sini'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 min-w-[200px]">
                      <div className="space-y-0.5">
                        {tx.items.map((i, iIdx) => (
                          <div key={iIdx} className="text-[11px] text-stone-300">
                            • {i.name} <span className="text-amber-400 font-bold">x{i.quantity}</span>
                            {i.spicyLevel > 0 && (
                              <span className="text-[10px] text-rose-400 ml-1">[Lvl {i.spicyLevel}]</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-400">
                      {formatRupiah(tx.subtotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-red-400">
                      {tx.discount > 0 ? `-${formatRupiah(tx.discount)}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-400 text-xs whitespace-nowrap">
                      {formatRupiah(tx.total)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          tx.paymentMethod === 'Tunai'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : tx.paymentMethod === 'QRIS'
                            ? 'bg-sky-950 text-sky-300 border-sky-800'
                            : 'bg-purple-950 text-purple-300 border-purple-800'
                        }`}
                      >
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-stone-400 whitespace-nowrap">
                      {tx.cashierName}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenReceipt(tx)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[11px] font-bold transition-all shadow-sm"
                        title="Buka atau Cetak Struk Transaksi Ini"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Buka Struk</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reusable Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        transaction={receiptTx}
        storeProfile={storeProfile}
        printerConfig={printerConfig}
        onOpenPrinterSettings={onOpenPrinterSettings}
      />
    </div>
  );
};

