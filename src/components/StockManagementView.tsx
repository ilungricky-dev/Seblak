import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { MenuItem, StockMovement, StockMovementType } from '../types';
import { recordStockIn, recordStockManualOut } from '../utils/storage';
import { formatRupiah } from '../utils/printer';

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

  // Input Stok Masuk Form State
  const [inMenuId, setInMenuId] = useState<string>(menuItems[0]?.id || '');
  const [inQuantity, setInQuantity] = useState<number>(10);
  const [inCostPrice, setInCostPrice] = useState<number>(0);
  const [inReason, setInReason] = useState<string>('Kulakan / Restock bahan baku');
  const [inDate, setInDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [inSuccessMsg, setInSuccessMsg] = useState<string | null>(null);

  // Input Stok Keluar Form State
  const [outMenuId, setOutMenuId] = useState<string>(menuItems[0]?.id || '');
  const [outQuantity, setOutQuantity] = useState<number>(1);
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
    if (!inMenuId || inQuantity <= 0) {
      alert('Pilih menu dan masukkan jumlah stok masuk yang valid!');
      return;
    }

    try {
      const targetMenu = menuItems.find(m => m.id === inMenuId);
      recordStockIn(
        inMenuId,
        inQuantity,
        inReason.trim() || 'Restock bahan baku',
        inCostPrice > 0 ? inCostPrice : targetMenu?.costPrice,
        inDate
      );
      onStockUpdated();
      setInSuccessMsg(
        `Sukses! +${inQuantity} ${targetMenu?.unit || 'Pcs'} ${targetMenu?.name} berhasil ditambahkan ke stok.`
      );
      setTimeout(() => setInSuccessMsg(null), 3500);
      setInQuantity(10);
    } catch (err: any) {
      alert(`Gagal menambah stok: ${err.message}`);
    }
  };

  // Handle Stok Keluar Submit
  const handleStockOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outMenuId || outQuantity <= 0) {
      alert('Pilih menu dan masukkan jumlah stok keluar yang valid!');
      return;
    }

    try {
      const targetMenu = menuItems.find(m => m.id === outMenuId);
      const combinedReason = `${outReasonType}${outCustomReason ? ` (${outCustomReason})` : ''}`;
      recordStockManualOut(outMenuId, outQuantity, combinedReason, outDate);
      onStockUpdated();
      setOutSuccessMsg(
        `Sukses! -${outQuantity} ${targetMenu?.unit || 'Pcs'} ${targetMenu?.name} berhasil dikeluarkan dari stok.`
      );
      setTimeout(() => setOutSuccessMsg(null), 3500);
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
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{inSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleStockInSubmit} className="space-y-4">
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
                  {menuItems.map(item => (
                    <option key={item.id} value={item.id}>
                      [{item.category}] {item.name} — Stok Saat Ini: {item.stock} {item.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Jumlah Masuk ({selectedInMenu?.unit || 'Pcs'}): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={inQuantity}
                    onChange={e => setInQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Harga Modal / Beli Satuan (Rp):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={inCostPrice || selectedInMenu?.costPrice || ''}
                    onChange={e => setInCostPrice(Math.max(0, Number(e.target.value)))}
                    placeholder="Harga beli"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm font-mono text-stone-200 focus:outline-none focus:border-emerald-500"
                  />
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
              {selectedInMenu && (
                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-stone-400 block">Perkiraan Stok Baru:</span>
                    <span className="text-sm font-bold text-stone-200">
                      {selectedInMenu.stock} + <span className="text-emerald-400">+{inQuantity}</span> ={' '}
                      <span className="text-emerald-400 font-extrabold">
                        {selectedInMenu.stock + inQuantity} {selectedInMenu.unit}
                      </span>
                    </span>
                  </div>
                  {inCostPrice > 0 && (
                    <div className="text-right">
                      <span className="text-[11px] text-stone-400 block">Total Nilai Pembelian:</span>
                      <span className="text-sm font-extrabold text-amber-400">
                        {formatRupiah(inQuantity * inCostPrice)}
                      </span>
                    </div>
                  )}
                </div>
              )}

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
                    <span className="text-[10px] text-stone-500">{item.category} • Modal: {formatRupiah(item.costPrice)}</span>
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
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{outSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleStockOutSubmit} className="space-y-4">
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
                  {menuItems.map(item => (
                    <option key={item.id} value={item.id}>
                      [{item.category}] {item.name} — Stok Saat Ini: {item.stock} {item.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Jumlah Keluar ({selectedOutMenu?.unit || 'Pcs'}): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedOutMenu?.stock || 9999}
                    value={outQuantity}
                    onChange={e => setOutQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                    required
                  />
                  {selectedOutMenu && selectedOutMenu.stock < outQuantity && (
                    <p className="text-[10px] text-red-400 mt-1">
                      ⚠️ Melebihi stok saat ini ({selectedOutMenu.stock} {selectedOutMenu.unit})
                    </p>
                  )}
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
              {selectedOutMenu && (
                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-stone-400 block">Stok Sisa Setelah Keluar:</span>
                    <span className="text-sm font-bold text-stone-200">
                      {selectedOutMenu.stock} - <span className="text-rose-400">-{outQuantity}</span> ={' '}
                      <span className="text-rose-400 font-extrabold">
                        {Math.max(0, selectedOutMenu.stock - outQuantity)} {selectedOutMenu.unit}
                      </span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-stone-400 block">Estimasi Kerugian (Modal):</span>
                    <span className="text-sm font-extrabold text-red-400">
                      {formatRupiah(outQuantity * selectedOutMenu.costPrice)}
                    </span>
                  </div>
                </div>
              )}

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
    </div>
  );
};
