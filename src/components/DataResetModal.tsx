import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  Building2,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  ShoppingBag,
  Boxes,
  UtensilsCrossed,
  Layers,
  Store,
  RefreshCw,
} from 'lucide-react';
import { StoreProfile, Transaction, StockMovement, MenuItem } from '../types';
import {
  clearAllTransactions,
  clearAllStockMovements,
  clearAllMenuItems,
  resetMenuToDefault,
  resetBranchData,
} from '../utils/storage';

interface DataResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeProfile: StoreProfile;
  transactions: Transaction[];
  stockMovements: StockMovement[];
  menuItems: MenuItem[];
  onDataReset: () => void;
}

export const DataResetModal: React.FC<DataResetModalProps> = ({
  isOpen,
  onClose,
  storeProfile,
  transactions,
  stockMovements,
  menuItems,
  onDataReset,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'individual' | 'new_branch'>('individual');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New branch form state
  const [branchName, setBranchName] = useState<string>(`${storeProfile.name} - Cabang 2`);
  const [branchAddress, setBranchAddress] = useState<string>('');
  const [branchPhone, setBranchPhone] = useState<string>(storeProfile.phone || '');
  const [optResetTx, setOptResetTx] = useState<boolean>(true);
  const [optResetStock, setOptResetStock] = useState<boolean>(true);
  const [optMenuAction, setOptMenuAction] = useState<'keep' | 'clear' | 'reset_standard'>('keep');

  if (!isOpen) return null;

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    onDataReset();
    setTimeout(() => {
      setSuccessToast(null);
    }, 3000);
  };

  // Handler for individual reset actions
  const handleExecuteIndividualReset = (actionType: string) => {
    if (actionType === 'transactions') {
      clearAllTransactions();
      showSuccess('Semua riwayat transaksi penjualan berhasil dibersihkan! Struk kembali kosong.');
    } else if (actionType === 'stock') {
      clearAllStockMovements();
      showSuccess('Seluruh riwayat pergerakan stok masuk & keluar berhasil dibersihkan!');
    } else if (actionType === 'clear_menu') {
      clearAllMenuItems();
      showSuccess('Semua item menu berhasil dikosongkan. Anda dapat menambah menu baru.');
    } else if (actionType === 'reset_menu_default') {
      resetMenuToDefault();
      showSuccess('Menu berhasil diatur ulang ke template standar Seblak Cinta!');
    }
    setConfirmAction(null);
  };

  // Handler for branch reset
  const handleExecuteBranchReset = (e: React.FormEvent) => {
    e.preventDefault();
    resetBranchData({
      resetTransactions: optResetTx,
      resetStockMovements: optResetStock,
      clearMenu: optMenuAction === 'clear',
      resetMenuToStandard: optMenuAction === 'reset_standard',
      branchName,
      branchAddress,
      branchPhone,
    });

    showSuccess(`Sistem berhasil diatur ulang untuk cabang "${branchName}"!`);
    setConfirmAction(null);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-700/60 text-rose-400 flex items-center justify-center shadow-lg">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-white">
                Bersihkan Data & Atur Ulang Cabang
              </h2>
              <p className="text-xs text-stone-400">
                Fitur khusus Owner untuk mereset riwayat transaksi, stok, atau atur cabang baru
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-stone-800/80 text-stone-400 hover:text-white hover:bg-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Toast */}
        {successToast && (
          <div className="m-4 p-3 rounded-2xl bg-emerald-950/90 border border-emerald-600 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-stone-800 flex items-center gap-2 bg-stone-950/50">
          <button
            type="button"
            onClick={() => setActiveSubTab('individual')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'individual'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-stone-400 hover:text-white'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Pembersihan Data Satuan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('new_branch')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'new_branch'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Atur Ulang Cabang / Tempat Baru</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeSubTab === 'individual' && (
            <div className="space-y-4">
              {/* Option 1: Transaksi Penjualan */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-rose-400" />
                    <h4 className="font-bold text-sm text-white">
                      Bersihkan Semua Riwayat Transaksi Kasir
                    </h4>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Menghapus seluruh riwayat pesanan pelanggan dan struk kasir ({transactions.length} transaksi tersimpan). Nomor struk akan direset dan pratinjau struk menjadi kosong.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmAction('transactions')}
                  className="px-3.5 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-bold whitespace-nowrap self-start sm:self-center transition-colors"
                >
                  Bersihkan Transaksi
                </button>
              </div>

              {/* Option 2: Mutasi Stok */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-sm text-white">
                      Bersihkan Semua Riwayat Mutasi Stok
                    </h4>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Menghapus seluruh riwayat mutasi stok masuk, keluar manual, dan penjualan ({stockMovements.length} catatan pergerakan stok).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmAction('stock')}
                  className="px-3.5 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-200 text-xs font-bold whitespace-nowrap self-start sm:self-center transition-colors"
                >
                  Bersihkan Stok
                </button>
              </div>

              {/* Option 3: Kosongkan Menu */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-sky-400" />
                    <h4 className="font-bold text-sm text-white">
                      Kosongkan Seluruh Menu
                    </h4>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Menghapus seluruh daftar menu makanan & minuman ({menuItems.length} menu tersimpan). Cocok jika cabang baru memiliki menu berbeda total.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmAction('clear_menu')}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-bold whitespace-nowrap self-start sm:self-center transition-colors"
                >
                  Kosongkan Menu
                </button>
              </div>

              {/* Option 4: Reset Menu ke Default */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-sm text-white">
                      Kembalikan Menu Standar Seblak Cinta
                    </h4>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Mengatur ulang daftar menu ke paket menu awal (Seblak Komplit, Dumpling Seafood, Es Teh Manis, dll).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmAction('reset_menu_default')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-xs font-bold whitespace-nowrap self-start sm:self-center transition-colors"
                >
                  Reset Menu Standar
                </button>
              </div>
            </div>
          )}

          {activeSubTab === 'new_branch' && (
            <form onSubmit={handleExecuteBranchReset} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p>
                  Gunakan formulir ini untuk menyiapkan aplikasi saat membuka <strong>cabang baru</strong> atau memindahkan kasir ke <strong>tempat baru</strong>. Semua riwayat lama akan dibersihkan dan profil warung disesuaikan.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Nama Cabang Baru:
                  </label>
                  <input
                    type="text"
                    required
                    value={branchName}
                    onChange={e => setBranchName(e.target.value)}
                    placeholder="Contoh: Warung Seblak Cinta - Cabang 2"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Alamat Cabang:
                  </label>
                  <textarea
                    rows={2}
                    value={branchAddress}
                    onChange={e => setBranchAddress(e.target.value)}
                    placeholder="Contoh: Jl. Raya Cibiru No. 45, Bandung Timur"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    No. Telepon / WhatsApp Cabang:
                  </label>
                  <input
                    type="text"
                    value={branchPhone}
                    onChange={e => setBranchPhone(e.target.value)}
                    placeholder="0812-3456-7890"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800 space-y-2.5">
                <label className="text-xs font-bold text-stone-300 block">
                  Pilihan Pembersihan Data:
                </label>

                <label className="flex items-center gap-2.5 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optResetTx}
                    onChange={e => setOptResetTx(e.target.checked)}
                    className="rounded bg-stone-950 border-stone-800 text-rose-600 focus:ring-0 w-4 h-4"
                  />
                  <span>Bersihkan semua riwayat transaksi penjualan lama</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optResetStock}
                    onChange={e => setOptResetStock(e.target.checked)}
                    className="rounded bg-stone-950 border-stone-800 text-rose-600 focus:ring-0 w-4 h-4"
                  />
                  <span>Bersihkan seluruh catatan mutasi stok lama</span>
                </label>

                <div className="pt-2">
                  <span className="text-xs font-semibold text-stone-400 block mb-1.5">
                    Penanganan Menu untuk Cabang Baru:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setOptMenuAction('keep')}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                        optMenuAction === 'keep'
                          ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                      }`}
                    >
                      Pertahankan Menu Saat Ini ({menuItems.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setOptMenuAction('reset_standard')}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                        optMenuAction === 'reset_standard'
                          ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                      }`}
                    >
                      Reset ke Menu Standar Seblak
                    </button>

                    <button
                      type="button"
                      onClick={() => setOptMenuAction('clear')}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                        optMenuAction === 'clear'
                          ? 'bg-red-600/30 border-red-500 text-red-200'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                      }`}
                    >
                      Kosongkan Menu (0 Menu)
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-stone-800 text-xs font-bold text-stone-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-lg shadow-amber-950/40"
                >
                  Terapkan & Atur Ulang Cabang Baru
                </button>
              </div>
            </form>
          )}
        </div>

        {/* --- CONFIRMATION DIALOG MODAL --- */}
        {confirmAction && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-sm p-5 text-center shadow-2xl space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-950/80 border border-red-700/60 text-red-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h4 className="font-extrabold text-base text-white">
                Konfirmasi Pembersihan Data
              </h4>

              <p className="text-xs text-stone-300 leading-relaxed">
                {confirmAction === 'transactions' &&
                  'Apakah Anda yakin ingin menghapus seluruh riwayat transaksi penjualan? Tindakan ini tidak dapat dibatalkan.'}
                {confirmAction === 'stock' &&
                  'Apakah Anda yakin ingin menghapus seluruh catatan riwayat mutasi stok masuk dan keluar?'}
                {confirmAction === 'clear_menu' &&
                  'Apakah Anda yakin ingin mengosongkan seluruh daftar menu?'}
                {confirmAction === 'reset_menu_default' &&
                  'Apakah Anda yakin ingin mereset daftar menu kembali ke template menu standar Seblak Cinta?'}
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-800 bg-stone-950 text-xs font-bold text-stone-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteIndividualReset(confirmAction)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-950/50"
                >
                  Ya, Bersihkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
