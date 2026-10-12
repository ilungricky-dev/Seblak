import React from 'react';
import {
  ShoppingCart,
  Boxes,
  UtensilsCrossed,
  Receipt,
  Layers,
  Printer,
  Store,
  FileSpreadsheet,
  Wifi,
  WifiOff,
  RefreshCw,
  Flame,
  Users,
  UserCheck,
  LogOut,
  Lock,
  RotateCcw,
  Smartphone,
  QrCode,
} from 'lucide-react';
import { StoreProfile, Employee } from '../types';
import { hasFeatureAccess, isOwnerAccount } from '../utils/storage';

export type ActiveTab = 'pos' | 'stock' | 'menu' | 'report_sales' | 'report_stock' | 'employees';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  storeProfile: StoreProfile;
  activeEmployee?: Employee;
  onLogout?: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  openProfileModal: () => void;
  openPrinterModal: () => void;
  openSpreadsheetModal: () => void;
  openResetModal?: () => void;
  openShareModal?: () => void;
  isBluetoothConnected: boolean;
  bluetoothDeviceName: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  storeProfile,
  activeEmployee,
  onLogout,
  isOnline,
  isSyncing,
  pendingSyncCount,
  openProfileModal,
  openPrinterModal,
  openSpreadsheetModal,
  openResetModal,
  openShareModal,
  isBluetoothConnected,
  bluetoothDeviceName,
}) => {
  const isOwner = activeEmployee ? isOwnerAccount(activeEmployee) : false;
  return (
    <header className="sticky top-0 z-30 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 text-white shadow-xl no-print">
      {/* Top Bar: Brand, Status Indicators & System Modals */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Brand identity */}
        <div
          onClick={openProfileModal}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
          title="Klik untuk edit profil & logo warung"
        >
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-rose-950/80 border-2 border-rose-500/60 shadow-lg flex-shrink-0 flex items-center justify-center">
            {storeProfile.logoUrl ? (
              <img
                src={storeProfile.logoUrl}
                alt={storeProfile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Flame className="w-6 h-6 text-rose-500" />
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold text-white">
              Edit
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate group-hover:text-rose-400 transition-colors">
                {storeProfile.name || 'Warung Seblak "Cinta"'}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Flame className="w-3 h-3 text-rose-400" />
                POS Kasir
              </span>
            </div>
            <p className="text-xs text-stone-400 truncate max-w-[200px] sm:max-w-md">
              {storeProfile.slogan || 'Pedas Gurih Bikin Nagih!'}
            </p>
          </div>
        </div>

        {/* Status badges & Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Active Employee Chip */}
          {activeEmployee && (
            <div
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-950 border border-stone-800 text-stone-200"
              title={`Sedang masuk sebagai ${activeEmployee.name} (${activeEmployee.role})`}
            >
              <UserCheck className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline font-mono">{activeEmployee.name.split(' ')[0]}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${
                activeEmployee.role === 'Owner'
                  ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              }`}>
                {activeEmployee.role}
              </span>
            </div>
          )}

          {/* Kunci Layar / Logout PIN Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-red-950 text-stone-300 hover:text-red-300 border border-stone-700 hover:border-red-800 transition-colors"
              title="Kunci Layar Kasir / Ganti Shift Staf"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Kunci / Ganti Staf</span>
            </button>
          )}

          {/* Online/Offline Status Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              isOnline
                ? 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300'
                : 'bg-amber-950/80 border-amber-700/80 text-amber-300'
            }`}
            title={isOnline ? 'Online - Siap sinkronisasi' : 'Offline - Data tetap tersimpan aman di HP'}
          >
            {isOnline ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden md:inline font-semibold">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-[11px]">Mode Offline</span>
              </>
            )}
          </div>

          {/* Spreadsheet Sync Button */}
          <button
            onClick={openSpreadsheetModal}
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              pendingSyncCount > 0
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300 hover:bg-emerald-900'
                : 'bg-stone-800/80 border-stone-700/70 text-stone-300 hover:bg-stone-700'
            }`}
            title="Sinkronisasi Google Spreadsheet Real-time"
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
            <span className="hidden sm:inline">Spreadsheet</span>
            {pendingSyncCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Bluetooth Thermal Printer Button */}
          <button
            onClick={openPrinterModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isBluetoothConnected
                ? 'bg-sky-950/80 border-sky-600 text-sky-300 hover:bg-sky-900'
                : 'bg-stone-800/80 border-stone-700/70 text-stone-300 hover:bg-stone-700'
            }`}
            title="Pengaturan Printer & Bluetooth Thermal"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">
              {isBluetoothConnected ? bluetoothDeviceName || 'Printer BT' : 'Printer'}
            </span>
            {isBluetoothConnected && (
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
            )}
          </button>

          {/* Buka di HP Lain Button */}
          {openShareModal && (
            <button
              onClick={openShareModal}
              className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 hover:bg-emerald-900 transition-colors shadow-sm"
              title="Buka Aplikasi di HP Lain / Scan QR Code"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Buka di HP Lain</span>
            </button>
          )}

          {/* Store Profile Button */}
          <button
            onClick={openProfileModal}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium bg-stone-800/80 border border-stone-700/70 text-stone-300 hover:bg-stone-700 transition-colors"
            title="Edit Profil & Logo Warung"
          >
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Profil Warung</span>
          </button>

          {/* Reset / Atur Ulang Cabang Button (Khusus Owner) */}
          {isOwner && openResetModal && (
            <button
              onClick={openResetModal}
              className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium bg-red-950/70 border border-red-800/80 text-red-300 hover:bg-red-900 transition-colors"
              title="Bersihkan Data & Atur Ulang untuk Cabang Baru"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden lg:inline">Atur Ulang / Cabang</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs - Menampilkan hanya tab yang dicentang/diizinkan */}
      <nav className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center overflow-x-auto scrollbar-none border-t border-stone-800/80 bg-stone-900/60">
        {hasFeatureAccess(activeEmployee || null, 'pos') && (
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'pos'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Kasir / POS</span>
          </button>
        )}

        {hasFeatureAccess(activeEmployee || null, 'stock') && (
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'stock'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Stok Masuk & Keluar</span>
          </button>
        )}

        {hasFeatureAccess(activeEmployee || null, 'menu') && (
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'menu'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Kelola Menu & Foto</span>
          </button>
        )}

        {hasFeatureAccess(activeEmployee || null, 'report_sales') && (
          <button
            onClick={() => setActiveTab('report_sales')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'report_sales'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Laporan Penjualan</span>
          </button>
        )}

        {hasFeatureAccess(activeEmployee || null, 'report_stock') && (
          <button
            onClick={() => setActiveTab('report_stock')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'report_stock'
                ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Laporan Akumulasi Stok</span>
          </button>
        )}

        {/* Khusus Owner: Tab Karyawan & Hak Akses */}
        {isOwner && (
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'employees'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span>Karyawan & Akses (Owner)</span>
          </button>
        )}
      </nav>
    </header>
  );
};


