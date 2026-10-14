import React, { useState, useMemo } from 'react';
import {
  Layers,
  FileSpreadsheet,
  FileText,
  Calendar,
  Search,
  Filter,
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  Package,
  TrendingDown,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { StoreProfile, AccumulatedStockRow, DailyStockAccumulationRow, MenuItem } from '../types';
import { calculateAccumulatedStock, calculateDailyStockAccumulation, getMenuItems, getCategories } from '../utils/storage';
import {
  exportStockReportToExcel,
  exportStockReportToPDF,
  exportDailyStockReportToExcel,
  exportDailyStockReportToPDF,
} from '../utils/reports';
import { formatRupiah } from '../utils/printer';

interface ReportsStockViewProps {
  storeProfile: StoreProfile;
  menuItems?: MenuItem[];
}

export const ReportsStockView: React.FC<ReportsStockViewProps> = ({
  storeProfile,
  menuItems: propMenuItems,
}) => {
  const menuList = useMemo(() => propMenuItems || getMenuItems(), [propMenuItems]);

  // View Mode: 'daily_timeline' (requested by user) or 'by_menu'
  const [viewMode, setViewMode] = useState<'daily_timeline' | 'by_menu'>('daily_timeline');

  // Date filters: default from beginning of month to today
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(Math.max(1, d.getDate() - 14)); // last 14 days by default for clear timeline
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Menu filter for daily timeline
  const [selectedMenuId, setSelectedMenuId] = useState<string>('ALL');

  // Categories list
  const categoriesList = useMemo(() => {
    return getCategories();
  }, []);

  // Filters for by_menu mode
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Calculate Daily Timeline Rows (Tanggal, Stock awal, Akumulasi stok masuk, Akumulasi stock keluar, Stock akhir)
  const dailyStockRows = useMemo(() => {
    return calculateDailyStockAccumulation(startDate, endDate, selectedMenuId);
  }, [startDate, endDate, selectedMenuId]);

  // 2. Calculate Per-Menu Rows
  const rawStockRows = useMemo(() => {
    return calculateAccumulatedStock(startDate, endDate);
  }, [startDate, endDate]);

  const filteredMenuRows = useMemo(() => {
    return rawStockRows.filter(r => {
      const matchCat = categoryFilter === 'ALL' || r.category === categoryFilter;
      const matchSearch =
        r.menuItemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [rawStockRows, categoryFilter, searchQuery]);

  // Selected menu label helper
  const selectedMenuLabel = useMemo(() => {
    if (selectedMenuId === 'ALL') return 'Semua Menu (Total Inventaris)';
    const found = menuList.find(m => m.id === selectedMenuId);
    return found ? found.name : 'Semua Menu';
  }, [selectedMenuId, menuList]);

  // Daily totals
  const totalDailyIn = useMemo(() => {
    return dailyStockRows.reduce((sum, r) => sum + r.accumulatedIn, 0);
  }, [dailyStockRows]);

  const totalDailyOut = useMemo(() => {
    return dailyStockRows.reduce((sum, r) => sum + r.accumulatedOut, 0);
  }, [dailyStockRows]);

  // Export handlers
  const handleExportDailyExcel = () => {
    if (dailyStockRows.length === 0) {
      alert('Tidak ada data stok untuk diekspor pada rentang tanggal ini.');
      return;
    }
    exportDailyStockReportToExcel(dailyStockRows, startDate, endDate, storeProfile, selectedMenuLabel);
  };

  const handleExportDailyPDF = () => {
    if (dailyStockRows.length === 0) {
      alert('Tidak ada data stok untuk diekspor pada rentang tanggal ini.');
      return;
    }
    exportDailyStockReportToPDF(dailyStockRows, startDate, endDate, storeProfile, selectedMenuLabel);
  };

  const handleExportMenuExcel = () => {
    if (filteredMenuRows.length === 0) {
      alert('Tidak ada data stok untuk diekspor.');
      return;
    }
    exportStockReportToExcel(filteredMenuRows, startDate, endDate, storeProfile);
  };

  const handleExportMenuPDF = () => {
    if (filteredMenuRows.length === 0) {
      alert('Tidak ada data stok untuk diekspor.');
      return;
    }
    exportStockReportToPDF(filteredMenuRows, startDate, endDate, storeProfile);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-4">
      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-lg mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Laporan Akumulasi Stok (Tanggal, Masuk, Keluar, Akhir)
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Rekapitulasi stok dengan filter tanggal dari dan sampai. Menyajikan data Stock awal, Akumulasi stok masuk, Akumulasi stock keluar, dan Stock akhir.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={viewMode === 'daily_timeline' ? handleExportDailyExcel : handleExportMenuExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all"
            title="Download laporan stok dalam format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={viewMode === 'daily_timeline' ? handleExportDailyPDF : handleExportMenuPDF}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 transition-all"
            title="Download laporan stok dalam format PDF"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher Buttons */}
      <div className="flex items-center gap-2 mb-4 bg-stone-900 border border-stone-800 p-1.5 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setViewMode('daily_timeline')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            viewMode === 'daily_timeline'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Rekap Stok Harian (by Tanggal)</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('by_menu')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            viewMode === 'by_menu'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Rekap per Item Menu</span>
        </button>
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
              className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Sampai Tanggal */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-400 whitespace-nowrap">Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Menu Selector (for daily timeline) or Category (for per-menu) */}
          {viewMode === 'daily_timeline' ? (
            <div className="lg:col-span-2">
              <select
                value={selectedMenuId}
                onChange={e => setSelectedMenuId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">Semua Menu (Total Akumulasi Seluruh Produk)</option>
                {menuList.map(m => (
                  <option key={m.id} value={m.id}>
                    [{m.category}{m.subCategory ? ` • ${m.subCategory}` : ''}] {m.name} ({m.stock} {m.unit})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="ALL">Semua Kategori</option>
                  {categoriesList.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.icon || '🏷️'} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Cari nama menu..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- MODE 1: DAILY TIMELINE TABLE (Tanggal, Stock awal, Akumulasi stok masuk, Akumulasi stock keluar, Stock akhir) --- */}
      {viewMode === 'daily_timeline' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800">
              <span className="text-[10px] text-stone-400 block">Menu Terpilih:</span>
              <span className="text-xs font-bold text-white truncate block">{selectedMenuLabel}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800">
              <span className="text-[10px] text-stone-400 block">Total Akumulasi Masuk:</span>
              <span className="text-sm font-black text-emerald-400">+{totalDailyIn}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800">
              <span className="text-[10px] text-stone-400 block">Total Akumulasi Keluar:</span>
              <span className="text-sm font-black text-rose-400">-{totalDailyOut}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800">
              <span className="text-[10px] text-stone-400 block">Periode Tanggal:</span>
              <span className="text-xs font-mono font-bold text-sky-400">{dailyStockRows.length} Hari</span>
            </div>
          </div>

          {/* Daily Stock Table */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-white">
                Tabel Akumulasi Stok Harian ({selectedMenuLabel})
              </h3>
              <span className="text-xs text-stone-400 font-mono">
                {startDate} s/d {endDate}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950 text-stone-300 font-bold border-b border-stone-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-3 text-center">No</th>
                    <th className="py-3 px-4 font-extrabold text-white">Tanggal</th>
                    <th className="py-3 px-4 text-center bg-stone-900/60">Stock awal</th>
                    <th className="py-3 px-4 text-center text-emerald-400">Akumulasi stok masuk</th>
                    <th className="py-3 px-4 text-center text-rose-400">Akumulasi stock keluar</th>
                    <th className="py-3 px-4 text-center bg-stone-900/80 font-black text-sky-300">Stock akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 bg-stone-900/60 text-stone-300">
                  {dailyStockRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-stone-500">
                        Tidak ada riwayat pergerakan stok pada rentang tanggal ini.
                      </td>
                    </tr>
                  ) : (
                    dailyStockRows.map((r, idx) => {
                      const dateObj = new Date(r.date);
                      const formattedDate = dateObj.toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      });

                      return (
                        <tr key={r.date} className="hover:bg-stone-800/40 transition-colors">
                          <td className="py-2.5 px-3 text-center text-stone-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                            <span>{r.date}</span>
                            <span className="text-[10px] text-stone-400 font-normal ml-2">({formattedDate})</span>
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold bg-stone-900/40 text-stone-200">
                            {r.initialStock}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-extrabold text-emerald-400">
                            {r.accumulatedIn > 0 ? `+${r.accumulatedIn}` : '0'}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-extrabold text-rose-400">
                            {r.accumulatedOut > 0 ? `-${r.accumulatedOut}` : '0'}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-black text-sky-400 bg-stone-900/60 text-sm">
                            {r.endingStock}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODE 2: BY MENU TABLE --- */}
      {viewMode === 'by_menu' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-stone-800 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-white">
              Tabel Rekapitulasi per Item Menu ({filteredMenuRows.length} produk)
            </h3>
            <span className="text-xs text-stone-400 font-mono">
              Periode: {startDate} s/d {endDate}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 text-stone-400 font-bold border-b border-stone-800 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 text-center">No</th>
                  <th className="py-2.5 px-3">Nama Menu / Bahan</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3 text-center">Satuan</th>
                  <th className="py-2.5 px-3 text-right">Modal (HPP)</th>
                  <th className="py-2.5 px-3 text-center bg-stone-900/80">Stok Awal</th>
                  <th className="py-2.5 px-3 text-center text-emerald-400">Masuk (+)</th>
                  <th className="py-2.5 px-3 text-center text-amber-400">Terjual (-)</th>
                  <th className="py-2.5 px-3 text-center text-rose-400">Waste (-)</th>
                  <th className="py-2.5 px-3 text-center font-extrabold">Total Keluar</th>
                  <th className="py-2.5 px-3 text-center bg-stone-900/90 text-sky-400 font-extrabold">Stok Akhir</th>
                  <th className="py-2.5 px-3 text-right">Nilai Aset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 bg-stone-900/60 text-stone-300">
                {filteredMenuRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-10 text-center text-stone-500">
                      Tidak ada data stok yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredMenuRows.map((r, idx) => (
                    <tr key={r.menuItemId} className="hover:bg-stone-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-center text-stone-500 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                        {r.menuItemName}
                      </td>
                      <td className="py-2.5 px-3 text-stone-400 whitespace-nowrap">
                        <span>{r.category}</span>
                        {r.subCategory && (
                          <span className="text-amber-400/90 text-[11px] block">{r.subCategory}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-stone-400 whitespace-nowrap">
                        {r.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-stone-400 whitespace-nowrap">
                        {formatRupiah(r.costPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold bg-stone-900/50 text-stone-200">
                        {r.initialStock}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">
                        +{r.stockIn}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-400">
                        -{r.stockSold}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-400">
                        -{r.stockManualOut}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-stone-300">
                        -{r.totalOut}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-sky-400 bg-stone-900/80 text-xs">
                        {r.endingStock}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-200 whitespace-nowrap">
                        {formatRupiah(r.assetValue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
