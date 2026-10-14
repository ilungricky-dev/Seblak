import React, { useState, useMemo, useEffect } from 'react';
import {
  Boxes,
  PlusCircle,
  MinusCircle,
  History,
  Search,
  Calendar,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ShoppingCart,
  CheckCircle2,
  PackageCheck,
  PackageMinus,
  Sparkles,
  X,
} from 'lucide-react';
import { MenuItem, StockMovement, StockMovementType } from '../types';
import { recordStockIn, recordStockManualOut } from '../utils/storage';
import { formatRupiah } from '../utils/printer';
import { parseNumberInput, formatNumberWithDots } from '../utils/numberUtils';

export interface StockNotificationToast {
  type: 'IN' | 'OUT';
  title: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason: string;
  previousStock: number;
  newStock: number;
  timestamp: string;
}

interface StockManagementViewProps {
  menuItems: MenuItem[];
  stockMovements: StockMovement[];
  onStockUpdated: () => void;
}

export const StockManagementView: React.FC<StockManagementViewProps> = ({
  menuItems,
  stockMovements,
  onStockUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'masuk' | 'keluar' | 'riwayat'>('masuk');

  // Floating Stock Notification Toast
  const [stockNotification, setStockNotification] = useState<StockNotificationToast | null>(null);

  // Auto-dismiss floating toast after 5 seconds
  useEffect(() => {
    if (!stockNotification) return;
    const timer = setTimeout(() => {
      setStockNotification(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [stockNotification]);

  // Input Stok Masuk Form State
  const [inMenuId, setInMenuId] = useState<string>(menuItems[0]?.id || '');
  const [inQuantity, setInQuantity] = useState<number | string>(10);
  const [inCostPrice, setInCostPrice] = useState<number | string>(0);
  const [inReason, setInReason] = useState<string>('Kulakan / Restock bahan baku');
  const [inDate, setInDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [inSuccessMsg, setInSuccessMsg] = useState<string | null>(null);

  // Input Stok Keluar Form State
  const [outMenuId, setOutMenuId] = useState<string>(menuItems[0]?.id || '');
  const [outQuantity, setOutQuantity] = useState<number | string>(1);
  const [outReasonType, setOutReasonType] = useState<string>('Bahan Rusak / Basi');
  const [outCustomReason, setOutCustomReason] = useState<string>('');
  const [outDate, setOutDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [outSuccessMsg, setOutSuccessMsg] = useState<string | null>(null);

  // Filter Riwayat Mutasi
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyType, setHistoryType] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Selected menu helpers
  const selectedInMenu = menuItems.find(m => m.id === inMenuId);
  const selectedOutMenu = menuItems.find(m => m.id === outMenuId);

  // Handle Stok Masuk Submit
  const handleStockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseNumberInput(inQuantity);
    const cost = parseNumberInput(inCostPrice);

    if (!inMenuId || qty <= 0) {
      alert('Pilih menu dan masukkan jumlah stok masuk yang valid (lebih dari 0)!');
      return;
    }

    try {
      const targetMenu = menuItems.find(m => m.id === inMenuId);
      const prevStock = targetMenu?.stock ?? 0;
      const cleanReason = inReason.trim() || 'Kulakan / Restock bahan baku';

      recordStockIn(
        inMenuId,
        qty,
        cleanReason,
        cost > 0 ? cost : targetMenu?.costPrice,
        inDate
      );
      onStockUpdated();
      const newStock = prevStock + qty;

      setInSuccessMsg(
        `Stok Berhasil Ditambah! +${qty} ${targetMenu?.unit || 'Pcs'} ${targetMenu?.name} (Stok sekarang: ${newStock} ${targetMenu?.unit || 'Pcs'})`
      );
      setStockNotification({
        type: 'IN',
        title: 'Stok Berhasil Ditambah! 📦✨',
        itemName: targetMenu?.name || 'Menu',
        quantity: qty,
        unit: targetMenu?.unit || 'Pcs',
        reason: cleanReason,
        previousStock: prevStock,
        newStock,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      });

      setTimeout(() => setInSuccessMsg(null), 4500);
      setInQuantity(10);
    } catch (err: any) {
      alert(`Gagal menambah stok: ${err.message}`);
    }
  };

  // Handle Stok Keluar Submit (Pengurangan stok karena kondisi tertentu, bukan penjualan)
  const handleStockOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseNumberInput(outQuantity);

    if (!outMenuId || qty <= 0) {
      alert('Pilih menu dan masukkan jumlah stok keluar yang valid (lebih dari 0)!');
      return;
    }

    try {
      const targetMenu = menuItems.find(m => m.id === outMenuId);
      const prevStock = targetMenu?.stock ?? 0;
      const combinedReason = `${outReasonType}${outCustomReason ? ` (${outCustomReason})` : ''}`;

      recordStockManualOut(outMenuId, qty, combinedReason, outDate);
      onStockUpdated();
      const newStock = Math.max(0, prevStock - qty);

      setOutSuccessMsg(
        `Stok Berhasil Dikurangi! -${qty} ${targetMenu?.unit || 'Pcs'} ${targetMenu?.name} karena kondisi tertentu: ${combinedReason} (Non-Penjualan. Sisa stok: ${newStock} ${targetMenu?.unit || 'Pcs'})`
      );
      setStockNotification({
        type: 'OUT',
        title: 'Stok Berhasil Dikurangi! ⚠️📉',
        itemName: targetMenu?.name || 'Menu',
        quantity: qty,
        unit: targetMenu?.unit || 'Pcs',
        reason: combinedReason,
        previousStock: prevStock,
        newStock,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      });

      setTimeout(() => setOutSuccessMsg(null), 4500);
      setOutQuantity(1);
      setOutCustomReason('');
    } catch (err: any) {
      alert(`Gagal mengurangi stok: ${err.message}`);
    }
  };

  // Filtered movements for history tab
  const filteredMovements = useMemo(() => {
    return stockMovements.filter(m => {
      const matchSearch =
        m.menuItemName.toLowerCase().includes(historySearch.toLowerCase()) ||
        m.reason.toLowerCase().includes(historySearch.toLowerCase());
      const matchType = historyType === 'ALL' || m.type === historyType;
      const matchDate = m.date >= startDate && m.date <= endDate;
      return matchSearch && matchType && matchDate;
    });
  }, [stockMovements, historySearch, historyType, startDate, endDate]);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-4">
      {/* View Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-lg mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-500" />
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Manajemen Stok Masuk & Keluar
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Catat restock bahan baku, barang keluar karena rusak/basi, dan pantau mutasi inventaris secara real-time.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 bg-stone-950 p-1.5 rounded-xl border border-stone-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('masuk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'masuk'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Stok Masuk (+)</span>
          </button>

          <button
            onClick={() => setActiveTab('keluar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'keluar'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5" />
            <span>Stok Keluar (-)</span>
          </button>

          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'riwayat'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Mutasi</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1: INPUT STOK MASUK --- */}
      {activeTab === 'masuk' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-7 bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-800 mb-4">
              <PackageCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Form Input Stok Masuk (Restock / Kulakan)
              </h3>
            </div>

            {inSuccessMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/80 text-emerald-100 text-xs flex items-start gap-2.5 shadow-lg shadow-emerald-950/40 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-extrabold text-emerald-300 block">Notifikasi: Penambahan Stok Berhasil</span>
                  <span>{inSuccessMsg}</span>
                </div>
              </div>
            )}

            <form noValidate onSubmit={handleStockInSubmit} className="space-y-4">
              {/* Menu / Bahan Selection */}
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">
                  Pilih Menu / Bahan Baku: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={inMenuId}
                  onChange={e => {
                    setInMenuId(e.target.value);
                    const selected = menuItems.find(m => m.id === e.target.value);
                    if (selected) {
                      setInCostPrice(selected.costPrice);
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {menuItems.map(item => {
                    const itemMin = item.minStock ?? 5;
                    const isLow = item.stock <= itemMin;
                    return (
                      <option key={item.id} value={item.id}>
                        {isLow ? '⚠️ [KRITIS] ' : ''}[{item.category}{item.subCategory ? ` • ${item.subCategory}` : ''}] {item.name} — Stok: {item.stock}/{itemMin} {item.unit}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-stone-300">
                      Jumlah Masuk ({selectedInMenu?.unit || 'Pcs'}): <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">
                      +{parseNumberInput(inQuantity)} {selectedInMenu?.unit || 'Pcs'}
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={inQuantity}
                    onChange={e => setInQuantity(e.target.value)}
                    placeholder="Contoh: 10"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <div className="flex items-center gap-1 mt-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    <span className="text-[10px] text-stone-500 whitespace-nowrap">Cepat:</span>
                    {[5, 10, 20, 50, 100].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setInQuantity(val)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 text-stone-400 hover:text-emerald-300 whitespace-nowrap font-mono"
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-stone-300">
                      Harga Modal / Beli Satuan (Rp):
                    </label>
                    <span className="text-[11px] font-mono text-stone-300 font-bold">
                      {formatRupiah(parseNumberInput(inCostPrice) || selectedInMenu?.costPrice || 0)}
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={inCostPrice}
                    onChange={e => setInCostPrice(e.target.value)}
                    placeholder="Contoh: 1000 atau 1.000"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm font-mono text-stone-200 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1 mt-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    <span className="text-[10px] text-stone-500 whitespace-nowrap">Cepat:</span>
                    {[1000, 2000, 5000, 10000, 15000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setInCostPrice(val)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200 whitespace-nowrap font-mono"
                      >
                        {formatNumberWithDots(val)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Date & Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Tanggal Masuk:
                  </label>
                  <input
                    type="date"
                    value={inDate}
                    onChange={e => setInDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Keterangan / Supplier:
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Pasar Ciroyom, Agen Frozen"
                    value={inReason}
                    onChange={e => setInReason(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Summary Calculation */}
              {selectedInMenu && (() => {
                const parsedInQty = parseNumberInput(inQuantity);
                const parsedInCost = parseNumberInput(inCostPrice);

                return (
                  <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-stone-400 block">Perkiraan Stok Baru:</span>
                      <span className="text-sm font-bold text-stone-200">
                        {selectedInMenu.stock} + <span className="text-emerald-400">+{parsedInQty}</span> ={' '}
                        <span className="text-emerald-400 font-extrabold">
                          {selectedInMenu.stock + parsedInQty} {selectedInMenu.unit}
                        </span>
                      </span>
                    </div>
                    {parsedInCost > 0 && (
                      <div className="text-right">
                        <span className="text-[11px] text-stone-400 block">Total Nilai Pembelian:</span>
                        <span className="text-sm font-extrabold text-amber-400">
                          {formatRupiah(parsedInQty * parsedInCost)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Simpan Stok Masuk</span>
              </button>
            </form>
          </div>

          {/* Right Side: Quick Current Stock Overview */}
          <div className="md:col-span-5 bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl flex flex-col">
            <h3 className="font-extrabold text-sm text-white pb-3 border-b border-stone-800 mb-3 flex items-center justify-between">
              <span>Stok Saat Ini</span>
              <span className="text-[11px] font-normal text-stone-400">{menuItems.length} menu aktif</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px]">
              {menuItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    setInMenuId(item.id);
                    setInCostPrice(item.costPrice);
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    inMenuId === item.id
                      ? 'bg-emerald-950/40 border-emerald-600'
                      : 'bg-stone-950/60 border-stone-800/80 hover:border-stone-700'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="font-bold text-xs text-stone-200 truncate">{item.name}</h4>
                    <span className="text-[10px] text-stone-500">{item.category}{item.subCategory ? ` • ${item.subCategory}` : ''} • Modal: {formatRupiah(item.costPrice)}</span>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                        item.stock <= 5
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-stone-900 text-stone-200 border border-stone-800'
                      }`}
                    >
                      {item.stock} {item.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: INPUT STOK KELUAR --- */}
      {activeTab === 'keluar' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-7 bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-800 mb-4">
              <PackageMinus className="w-5 h-5 text-rose-500" />
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Form Input Stok Keluar (Waste / Basi / Koreksi)
              </h3>
            </div>

            {outSuccessMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-950/80 border border-amber-500/80 text-amber-100 text-xs flex items-start gap-2.5 shadow-lg shadow-amber-950/40 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-extrabold text-amber-300 block">Notifikasi: Pengurangan Stok Kondisi Tertentu Berhasil (Non-Penjualan)</span>
                  <span>{outSuccessMsg}</span>
                </div>
              </div>
            )}

            <form noValidate onSubmit={handleStockOutSubmit} className="space-y-4">
              {/* Menu / Bahan Selection */}
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">
                  Pilih Menu / Bahan Baku: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={outMenuId}
                  onChange={e => setOutMenuId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {menuItems.map(item => {
                    const itemMin = item.minStock ?? 5;
                    const isLow = item.stock <= itemMin;
                    return (
                      <option key={item.id} value={item.id}>
                        {isLow ? '⚠️ [KRITIS] ' : ''}[{item.category}{item.subCategory ? ` • ${item.subCategory}` : ''}] {item.name} — Stok: {item.stock}/{itemMin} {item.unit}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-stone-300">
                      Jumlah Keluar ({selectedOutMenu?.unit || 'Pcs'}): <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-mono text-rose-400 font-bold">
                      -{parseNumberInput(outQuantity)} {selectedOutMenu?.unit || 'Pcs'}
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={outQuantity}
                    onChange={e => setOutQuantity(e.target.value)}
                    placeholder="Contoh: 1"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                    required
                  />
                  {selectedOutMenu && selectedOutMenu.stock < parseNumberInput(outQuantity) && (
                    <p className="text-[10px] text-red-400 mt-1 font-semibold">
                      ⚠️ Melebihi stok saat ini ({selectedOutMenu.stock} {selectedOutMenu.unit})
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    <span className="text-[10px] text-stone-500 whitespace-nowrap">Cepat:</span>
                    {[1, 2, 5, 10, 20].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setOutQuantity(val)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 text-stone-400 hover:text-rose-300 whitespace-nowrap font-mono"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Tanggal Keluar:
                  </label>
                  <input
                    type="date"
                    value={outDate}
                    onChange={e => setOutDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
              </div>

              {/* Reason Type */}
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">
                  Alasan Pengurangan Stok:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'Bahan Rusak / Basi',
                    'Kadaluarsa',
                    'Koreksi Opname Fisik',
                    'Tumpah / Human Error',
                    'Tester / Konsumsi Sendiri',
                    'Lainnya',
                  ].map(reason => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setOutReasonType(reason)}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                        outReasonType === reason
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Detail */}
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">
                  Catatan Tambahan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jamur bau asam, ceker jatuh ke lantai, dll."
                  value={outCustomReason}
                  onChange={e => setOutCustomReason(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Summary Calculation */}
              {selectedOutMenu && (() => {
                const parsedOutQty = parseNumberInput(outQuantity);

                return (
                  <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-stone-400 block">Stok Sisa Setelah Keluar:</span>
                      <span className="text-sm font-bold text-stone-200">
                        {selectedOutMenu.stock} - <span className="text-rose-400">-{parsedOutQty}</span> ={' '}
                        <span className="text-rose-400 font-extrabold">
                          {Math.max(0, selectedOutMenu.stock - parsedOutQty)} {selectedOutMenu.unit}
                        </span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-stone-400 block">Estimasi Kerugian (Modal):</span>
                      <span className="text-sm font-extrabold text-red-400">
                        {formatRupiah(parsedOutQty * selectedOutMenu.costPrice)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-all"
              >
                <MinusCircle className="w-4 h-4" />
                <span>Simpan Stok Keluar</span>
              </button>
            </form>
          </div>

          {/* Right Side Info Banner */}
          <div className="md:col-span-5 bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-white pb-3 border-b border-stone-800">
                Catatan Penting Inventaris
              </h3>
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Stok Otomatis Saat Penjualan</span>
                </div>
                <p>
                  Setiap kali kasir menyelesaikan transaksi penjualan, stok menu yang terjual akan otomatis terpotong tanpa perlu diinput manual di sini.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 text-xs leading-relaxed space-y-2">
                <span className="font-bold text-white block">Kapan Memakai Fitur Ini?</span>
                <ul className="list-disc list-inside space-y-1 text-stone-400 text-[11px]">
                  <li>Bahan basah (seperti ceker/jamur) yang basi karena freezer mati.</li>
                  <li>Bahan terbuang (waste) saat trial resep bumbu baru.</li>
                  <li>Perbedaan hitungan saat opname tutup toko sore/malam hari.</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-800 text-[11px] text-stone-500 text-center">
              Seluruh mutasi tercatat aman di riwayat dan disinkronkan ke Spreadsheet.
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: RIWAYAT MUTASI STOK --- */}
      {activeTab === 'riwayat' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Cari nama menu / alasan..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Type selector */}
            <div>
              <select
                value={historyType}
                onChange={e => setHistoryType(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Semua Jenis Mutasi</option>
                <option value="MASUK">Stok Masuk (+)</option>
                <option value="KELUAR_MANUAL">Stok Keluar Manual / Waste (-)</option>
                <option value="PENJUALAN">Penjualan Kasir (-)</option>
              </select>
            </div>

            {/* Date Range Start */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-stone-400 whitespace-nowrap">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Date Range End */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-stone-400 whitespace-nowrap">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Movements Table */}
          <div className="overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 text-stone-400 font-bold border-b border-stone-800 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Waktu & Tanggal</th>
                  <th className="py-2.5 px-3">Nama Menu / Bahan</th>
                  <th className="py-2.5 px-3">Tipe</th>
                  <th className="py-2.5 px-3 text-center">Jumlah</th>
                  <th className="py-2.5 px-3 text-center">Sebelum</th>
                  <th className="py-2.5 px-3 text-center">Sesudah</th>
                  <th className="py-2.5 px-3">Alasan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 bg-stone-900/60 text-stone-300">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-500">
                      Tidak ada riwayat mutasi stok pada filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map(m => {
                    const isMasuk = m.type === 'MASUK';
                    const isPenjualan = m.type === 'PENJUALAN';

                    return (
                      <tr key={m.id} className="hover:bg-stone-800/40 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-stone-400">
                          {new Date(m.createdAt).toLocaleDateString('id-ID')} {new Date(m.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                          {m.menuItemName}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isMasuk
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                                : isPenjualan
                                ? 'bg-sky-950 text-sky-300 border border-sky-700/60'
                                : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                            }`}
                          >
                            {isMasuk ? (
                              <>
                                <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                                <span>MASUK</span>
                              </>
                            ) : isPenjualan ? (
                              <>
                                <ShoppingCart className="w-3 h-3 text-sky-400" />
                                <span>TERJUAL</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-3 h-3 text-rose-400" />
                                <span>KELUAR MANUAL</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold font-mono">
                          <span className={isMasuk ? 'text-emerald-400' : 'text-rose-400'}>
                            {isMasuk ? `+${m.quantity}` : `-${m.quantity}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-stone-400 font-mono">
                          {m.previousStock}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold font-mono text-stone-200">
                          {m.currentStock}
                        </td>
                        <td className="py-2.5 px-3 text-stone-300 max-w-[200px] truncate" title={m.reason}>
                          {m.reason}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating Stock Notification Toast */}
      {stockNotification && (
        <div className="fixed top-5 right-5 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-top-4 transition-all">
          <div
            className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md relative ${
              stockNotification.type === 'IN'
                ? 'bg-stone-900/95 border-emerald-500/80 text-stone-100 shadow-emerald-950/60'
                : 'bg-stone-900/95 border-amber-500/80 text-stone-100 shadow-amber-950/60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    stockNotification.type === 'IN'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {stockNotification.type === 'IN' ? (
                    <PackageCheck className="w-5 h-5" />
                  ) : (
                    <PackageMinus className="w-5 h-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4
                      className={`font-black text-sm ${
                        stockNotification.type === 'IN' ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      {stockNotification.title}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        stockNotification.type === 'IN'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                          : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                      }`}
                    >
                      {stockNotification.type === 'IN'
                        ? `+${stockNotification.quantity} ${stockNotification.unit}`
                        : `-${stockNotification.quantity} ${stockNotification.unit}`}
                    </span>
                    {stockNotification.type === 'OUT' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-900/50 text-amber-300 border border-amber-700/60">
                        Kondisi Non-Penjualan
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-200 leading-snug">
                    Bahan menu <strong className="text-white">{stockNotification.itemName}</strong>{' '}
                    {stockNotification.type === 'IN' ? 'berhasil ditambahkan' : 'berhasil dikurangi'}{' '}
                    sebanyak{' '}
                    <strong
                      className={stockNotification.type === 'IN' ? 'text-emerald-400' : 'text-amber-400'}
                    >
                      {stockNotification.type === 'IN' ? '+' : '-'}
                      {stockNotification.quantity} {stockNotification.unit}
                    </strong>
                    .
                  </p>

                  <div className="p-2 rounded-xl bg-stone-950/80 border border-stone-800/80 text-[11px] text-stone-400 space-y-0.5">
                    <div>
                      <span className="text-stone-500">Alasan/Kondisi: </span>
                      <span className="text-stone-200 font-medium">{stockNotification.reason}</span>
                    </div>
                    <div>
                      <span className="text-stone-500">Mutasi Stok: </span>
                      <span className="text-stone-400 font-mono">{stockNotification.previousStock}</span>
                      <span className="text-stone-500 mx-1">➔</span>
                      <strong className="text-white font-mono">
                        {stockNotification.newStock} {stockNotification.unit}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStockNotification(null)}
                className="text-stone-500 hover:text-stone-300 p-1 rounded-lg hover:bg-stone-800 shrink-0 transition-colors"
                title="Tutup Notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
