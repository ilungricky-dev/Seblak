import React, { useState } from 'react';
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
  Lock,
  RotateCcw,
  Smartphone,
  ChevronDown,
  Settings2,
  X,
  Crown,
  Sparkles,
  Shield,
  FileDown,
} from 'lucide-react';
import { StoreProfile, Employee } from '../types';
import { hasFeatureAccess, isOwnerAccount } from '../utils/storage';

export type ActiveTab = 'pos' | 'stock' | 'menu' | 'report_sales' | 'report_stock' | 'employees' | 'access_log';

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
  onTriggerSync?: () => void;
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
  onTriggerSync,
  isBluetoothConnected,
  bluetoothDeviceName,
}) => {
  const isOwner = activeEmployee ? isOwnerAccount(activeEmployee) : false;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 text-white shadow-xl no-print">
      {/* Top Bar: Brand, Status Indicators & System Modals */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
        {/* Brand identity */}
        <div
          onClick={openProfileModal}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group hover:opacity-90 transition-opacity min-w-0"
          title="Klik untuk edit profil & logo warung"
        >
          <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-rose-950/80 border-2 border-rose-500/60 shadow-lg shrink-0 flex items-center justify-center">
            {storeProfile.logoUrl ? (
              <img
                src={storeProfile.logoUrl}
                alt={storeProfile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] font-bold text-white">
              Edit
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base md:text-lg font-extrabold tracking-tight text-white truncate group-hover:text-rose-400 transition-colors">
                {storeProfile.name || 'Warung Seblak "Cinta"'}
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Flame className="w-2.5 h-2.5 text-rose-400" />
                POS
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-stone-400 truncate max-w-[120px] sm:max-w-[200px] md:max-w-md">
              {storeProfile.slogan || 'Pedas Gurih Bikin Nagih!'}
            </p>
          </div>
        </div>

        {/* --- DESKTOP & TABLET LAYOUT (>= md): Tatanan Berkelompok Estetik --- */}
        <div className="hidden md:flex items-center gap-2 lg:gap-2.5">
          {/* GRUP 1: IDENTITAS KARYAWAN & KEAMANAN PIN */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-950/70 border border-stone-800/80 shadow-inner">
            {activeEmployee && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold text-stone-200"
                title={`Masuk sebagai ${activeEmployee.name} (${activeEmployee.role})`}
              >
                {isOwner ? (
                  <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span className="font-mono text-xs">{activeEmployee.name.split(' ')[0]}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                    isOwner
                      ? 'bg-purple-950/90 text-purple-300 border-purple-700/80'
                      : 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80'
                  }`}
                >
                  {activeEmployee.role}
                </span>
              </div>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-800 hover:border-amber-700/60 transition-colors shadow-sm"
                title="Kunci Layar Kasir / Ganti Shift Staf"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span className="hidden lg:inline text-[11px]">Kunci</span>
              </button>
            )}
          </div>

          {/* GRUP 2: STATUS KONEKSI, SPREADSHEET & PRINTER */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-950/70 border border-stone-800/80 shadow-inner">
            {/* Online/Offline Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                isOnline
                  ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-800/70 text-amber-300'
              }`}
              title={isOnline ? 'Online - Internet Tersambung' : 'Offline - Data tetap tersimpan aman di HP'}
            >
              {isOnline ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="hidden lg:inline font-semibold text-[11px]">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-[11px]">Offline</span>
                </>
              )}
            </div>

            {/* Realtime Instant Sync Trigger */}
            {onTriggerSync && (
              <button
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950/70 border border-emerald-700/80 text-emerald-300 hover:bg-emerald-900 transition-all shadow-sm active:scale-95"
                title="Sinkronisasi instan real-time antar semua perangkat kasir & cloud"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline text-[11px] font-bold">Sync Realtime</span>
              </button>
            )}

            {/* Spreadsheet Button */}
            <button
              onClick={openSpreadsheetModal}
              className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                pendingSyncCount > 0
                  ? 'bg-emerald-950/90 border-emerald-600 text-emerald-200 hover:bg-emerald-900 shadow-sm shadow-emerald-950'
                  : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
              title="Sinkronisasi Google Spreadsheet Real-time"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
              <span className="text-[11px]">Spreadsheet</span>
              {pendingSyncCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-extrabold rounded-full animate-pulse shadow-sm">
                  {pendingSyncCount}
                </span>
              )}
            </button>

            {/* Printer Button */}
            <button
              onClick={openPrinterModal}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                isBluetoothConnected
                  ? 'bg-sky-950/80 border-sky-600 text-sky-200 hover:bg-sky-900 shadow-sm shadow-sky-950'
                  : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
              title="Pengaturan Printer Thermal Bluetooth"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden lg:inline text-[11px]">
                {isBluetoothConnected ? bluetoothDeviceName || 'Printer BT' : 'Printer'}
              </span>
              {isBluetoothConnected && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>
              )}
            </button>
          </div>

          {/* GRUP 3: ALAT WARUNG, SHARE & RESET CABANG */}
          <div className="flex items-center gap-1.5">
            {openShareModal && (
              <button
                onClick={openShareModal}
                className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-semibold bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/80 transition-colors shadow-sm"
                title="Buka Aplikasi di HP Lain / Scan QR Code"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline text-[11px]">Buka di HP</span>
              </button>
            )}

            <button
              onClick={openProfileModal}
              className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-medium bg-stone-950/80 border border-stone-800 text-stone-300 hover:bg-stone-800 transition-colors"
              title="Edit Profil & Logo Warung"
            >
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline text-[11px]">Profil</span>
            </button>

            {isOwner && openResetModal && (
              <button
                onClick={openResetModal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-red-950/60 border border-red-800/70 text-red-300 hover:bg-red-900 transition-colors shadow-sm"
                title="Bersihkan Data & Atur Ulang untuk Cabang Baru (Khusus Owner)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden lg:inline text-[11px]">Reset / Cabang</span>
              </button>
            )}
          </div>
        </div>

        {/* --- MOBILE LAYOUT (< md): RINGKAS, ESTETIK & TIDAK MELEBIHI LAYAR --- */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          {/* Quick Online dot */}
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'
            }`}
            title={isOnline ? 'Online' : 'Offline'}
          />

          {/* Quick Spreadsheet Sync Pill with Pending Count */}
          <button
            onClick={openSpreadsheetModal}
            className={`relative p-1.5 rounded-xl border flex items-center justify-center transition-all ${
              pendingSyncCount > 0
                ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                : 'bg-stone-950 border-stone-800 text-stone-300'
            }`}
            title="Sinkronisasi Spreadsheet"
          >
            <FileSpreadsheet className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
            {pendingSyncCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[15px] h-[15px] flex items-center justify-center bg-rose-600 text-white text-[9px] font-extrabold rounded-full animate-pulse shadow-sm">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Compact Employee Pill */}
          {activeEmployee && (
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold border ${
                isOwner
                  ? 'bg-purple-950/90 text-purple-300 border-purple-800'
                  : 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
              }`}
              title={`${activeEmployee.name} (${activeEmployee.role})`}
            >
              {isOwner ? <Crown className="w-3 h-3 text-amber-400" /> : <UserCheck className="w-3 h-3" />}
              <span className="truncate max-w-[55px] font-mono">{activeEmployee.name.split(' ')[0]}</span>
            </div>
          )}

          {/* Aesthetic Toggle Button for Mobile Control Panel Drawer */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold border transition-all ${
              isMobileMenuOpen
                ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
            }`}
            title="Buka Menu Pengaturan & Alat Warung"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Menu</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* --- MOBILE CONTROL PANEL DRAWER (DROPDOWN POPUP ESTETIK KHUSUS MOBILE) --- */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-stone-800 bg-stone-950/95 backdrop-blur-xl px-3 py-3 animate-in slide-in-from-top-2 duration-200 shadow-2xl space-y-3">
          {/* Header Mobile Drawer */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-800/80">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-extrabold text-white tracking-wide">
                Menu &amp; Kontrol Warung
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Kartu Profil Pengguna & Kunci Shift */}
          {activeEmployee && (
            <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                  isOwner
                    ? 'bg-purple-950/80 border-purple-700 text-amber-400'
                    : 'bg-emerald-950/80 border-emerald-700 text-emerald-400'
                }`}>
                  {isOwner ? <Crown className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{activeEmployee.name}</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                      isOwner ? 'bg-purple-900 text-purple-200' : 'bg-emerald-900 text-emerald-200'
                    }`}>
                      {activeEmployee.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400">Shift Kasir Aktif</span>
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-950/70 border border-amber-800/80 text-amber-300 hover:bg-amber-900 transition-colors shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kunci PIN</span>
                </button>
              )}
            </div>
          )}

          {/* Grid Tombol Aksi Cepat Mobile */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Google Spreadsheet Modal */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                openSpreadsheetModal();
              }}
              className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 flex flex-col gap-1 items-start text-left transition-colors"
            >
              <div className="flex items-center justify-between w-full">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                {pendingSyncCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold">
                    {pendingSyncCount} Antrean
                  </span>
                )}
              </div>
              <span className="font-bold text-stone-200">Google Sheets</span>
              <span className="text-[10px] text-stone-400">Sinkronisasi &amp; Link</span>
            </button>

            {/* Bluetooth Thermal Printer */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                openPrinterModal();
              }}
              className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 flex flex-col gap-1 items-start text-left transition-colors"
            >
              <div className="flex items-center justify-between w-full">
                <Printer className="w-4 h-4 text-sky-400" />
                {isBluetoothConnected && (
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                )}
              </div>
              <span className="font-bold text-stone-200">Printer Thermal</span>
              <span className="text-[10px] text-stone-400">
                {isBluetoothConnected ? bluetoothDeviceName || 'Terhubung' : 'Bluetooth'}
              </span>
            </button>

            {/* Buka di HP Lain */}
            {openShareModal && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openShareModal();
                }}
                className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 flex flex-col gap-1 items-start text-left transition-colors"
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-stone-200">Buka di HP Lain</span>
                <span className="text-[10px] text-stone-400">Scan QR Code</span>
              </button>
            )}

            {/* Profil Warung */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                openProfileModal();
              }}
              className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 flex flex-col gap-1 items-start text-left transition-colors"
            >
              <Store className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-stone-200">Profil Warung</span>
              <span className="text-[10px] text-stone-400">Nama, Logo &amp; Slogan</span>
            </button>

            {/* Cadangan JSON (Kasir & Owner) */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                openSpreadsheetModal();
              }}
              className="p-2.5 rounded-xl bg-sky-950/40 hover:bg-sky-950/70 border border-sky-800/60 flex flex-col gap-1 items-start text-left transition-colors"
            >
              <FileDown className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-sky-200">Cadangan JSON</span>
              <span className="text-[10px] text-sky-400">Simpan File Lokal</span>
            </button>
          </div>

          {/* Tombol Akses Log Data (Khusus Owner / Izin Akses) */}
          {(isOwner || hasFeatureAccess(activeEmployee || null, 'access_log')) && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setActiveTab('access_log');
              }}
              className="w-full p-2.5 rounded-xl bg-purple-950/50 hover:bg-purple-950/80 border border-purple-800/80 flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="font-bold text-purple-200 block text-xs">
                    Log Data Akses &amp; Aktivitas Staf
                  </span>
                  <span className="text-[10px] text-purple-300/80">
                    Audit login, jam akses &amp; perangkat pengguna
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-900/60 px-2 py-0.5 rounded border border-purple-800">
                Audit
              </span>
            </button>
          )}

          {/* Tombol Atur Ulang / Cabang Baru (Khusus Owner) */}
          {isOwner && openResetModal && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                openResetModal();
              }}
              className="w-full p-2.5 rounded-xl bg-red-950/50 hover:bg-red-950/80 border border-red-800/80 flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <div>
                  <span className="font-bold text-red-200 block text-xs">
                    Atur Ulang / Buka Cabang Baru
                  </span>
                  <span className="text-[10px] text-red-300/80">
                    Khusus Akun Owner (Reset Data)
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-red-400 bg-red-900/60 px-2 py-0.5 rounded border border-red-800">
                Owner
              </span>
            </button>
          )}
        </div>
      )}

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

        {/* Khusus Owner / Izin Akses: Tab Log Data */}
        {(isOwner || hasFeatureAccess(activeEmployee || null, 'access_log')) && (
          <button
            onClick={() => setActiveTab('access_log')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'access_log'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Log Data (Owner)</span>
          </button>
        )}
      </nav>
    </header>
  );
};


