import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  Clock,
  Smartphone,
  Laptop,
  UserCheck,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  LogIn,
  LogOut,
  ShoppingCart,
  Boxes,
  UtensilsCrossed,
  FolderTree,
  FileSpreadsheet,
  Layers,
  Crown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Eye,
  Calendar,
  Sparkles,
  ArrowUpDown,
  Share2,
} from 'lucide-react';
import { AccessLogItem, Employee, LogActionType } from '../types';
import {
  getAccessLogs,
  clearAccessLogs,
  exportAccessLogsCsv,
  recordAccessLog,
  getDeviceFingerprint,
  isOwnerAccount,
} from '../utils/storage';

interface AccessLogViewProps {
  employees: Employee[];
  activeEmployee: Employee;
  onRefresh?: () => void;
}

export const AccessLogView: React.FC<AccessLogViewProps> = ({
  employees,
  activeEmployee,
  onRefresh,
}) => {
  const [logs, setLogs] = useState<AccessLogItem[]>(() => getAccessLogs());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const isOwner = isOwnerAccount(activeEmployee);

  const reloadLogs = () => {
    setLogs(getAccessLogs());
    if (onRefresh) onRefresh();
  };

  useEffect(() => {
    reloadLogs();
  }, []);

  // Format relative time in Indonesian
  const formatRelativeTime = (isoString: string): string => {
    try {
      const then = new Date(isoString).getTime();
      const now = Date.now();
      const diffSec = Math.floor((now - then) / 1000);

      if (diffSec < 45) return 'Baru saja';
      if (diffSec < 90) return '1 menit lalu';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} menit lalu`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} jam lalu`;
      const diffDays = Math.floor(diffHour / 24);
      if (diffDays === 1) return 'Kemarin';
      if (diffDays < 7) return `${diffDays} hari lalu`;

      return new Date(isoString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  // Format precise date time
  const formatExactTime = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB';
    } catch {
      return isoString;
    }
  };

  // Action badge and icon configuration
  const getActionMeta = (action: LogActionType) => {
    switch (action) {
      case 'LOGIN':
        return {
          label: 'Login / Masuk Shift',
          badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
          icon: LogIn,
          iconClass: 'text-emerald-400',
        };
      case 'LOGOUT':
        return {
          label: 'Logout / Kunci Shift',
          badgeClass: 'bg-stone-800 text-stone-300 border-stone-700',
          icon: LogOut,
          iconClass: 'text-stone-400',
        };
      case 'TRANSACTION_CREATE':
        return {
          label: 'Transaksi Kasir POS',
          badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
          icon: ShoppingCart,
          iconClass: 'text-rose-400',
        };
      case 'STOCK_IN':
        return {
          label: 'Stok Masuk / Restock',
          badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
          icon: Boxes,
          iconClass: 'text-emerald-400',
        };
      case 'STOCK_OUT':
        return {
          label: 'Stok Keluar Manual',
          badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
          icon: Boxes,
          iconClass: 'text-amber-400',
        };
      case 'MENU_CREATE':
      case 'MENU_UPDATE':
      case 'MENU_DELETE':
        return {
          label: 'Kelola Menu & Harga',
          badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-700/60',
          icon: UtensilsCrossed,
          iconClass: 'text-sky-400',
        };
      case 'CATEGORY_CHANGE':
      case 'DATABASE_REORGANIZE':
        return {
          label: 'Kategori & Database',
          badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
          icon: FolderTree,
          iconClass: 'text-purple-400',
        };
      case 'PAGE_ACCESS':
        return {
          label: 'Akses Halaman',
          badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60',
          icon: Eye,
          iconClass: 'text-indigo-400',
        };
      case 'SPREADSHEET_SYNC':
        return {
          label: 'Sinkronisasi Sheets',
          badgeClass: 'bg-teal-950/80 text-teal-300 border-teal-700/60',
          icon: FileSpreadsheet,
          iconClass: 'text-teal-400',
        };
      case 'DATA_RESET':
        return {
          label: 'Reset Data Cabang',
          badgeClass: 'bg-red-950/80 text-red-300 border-red-700/60',
          icon: AlertTriangle,
          iconClass: 'text-red-400',
        };
      default:
        return {
          label: 'Aktivitas Sistem',
          badgeClass: 'bg-stone-800 text-stone-300 border-stone-700',
          icon: Clock,
          iconClass: 'text-stone-400',
        };
    }
  };

  // Device icon
  const getDeviceIcon = (deviceInfo: string) => {
    if (/HP|iPhone|Android|Tablet|iPad/i.test(deviceInfo)) {
      return <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    return <Laptop className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return logs.filter(log => {
      // Filter by Employee
      if (selectedEmployeeId !== 'all') {
        if (log.employeeId !== selectedEmployeeId && log.employeeName !== selectedEmployeeId) {
          return false;
        }
      }

      // Filter by Action Type
      if (selectedActionType !== 'all') {
        if (selectedActionType === 'LOGIN_LOGOUT') {
          if (log.action !== 'LOGIN' && log.action !== 'LOGOUT') return false;
        } else if (selectedActionType === 'TRANSACTION') {
          if (log.action !== 'TRANSACTION_CREATE') return false;
        } else if (selectedActionType === 'STOCK') {
          if (log.action !== 'STOCK_IN' && log.action !== 'STOCK_OUT') return false;
        } else if (selectedActionType === 'MENU_CAT') {
          if (
            log.action !== 'MENU_CREATE' &&
            log.action !== 'MENU_UPDATE' &&
            log.action !== 'MENU_DELETE' &&
            log.action !== 'CATEGORY_CHANGE' &&
            log.action !== 'DATABASE_REORGANIZE'
          ) {
            return false;
          }
        } else if (selectedActionType === 'SYNC') {
          if (log.action !== 'SPREADSHEET_SYNC') return false;
        }
      }

      // Filter by Time Range
      if (selectedTimeRange !== 'all') {
        const logTime = new Date(log.timestamp).getTime();
        const diffMs = now - logTime;
        if (selectedTimeRange === 'today' && diffMs > oneDayMs) return false;
        if (selectedTimeRange === '7days' && diffMs > 7 * oneDayMs) return false;
        if (selectedTimeRange === '30days' && diffMs > 30 * oneDayMs) return false;
      }

      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = log.employeeName.toLowerCase().includes(q);
        const matchRole = log.role.toLowerCase().includes(q);
        const matchAction = log.actionTitle.toLowerCase().includes(q);
        const matchDetails = log.details.toLowerCase().includes(q);
        const matchDevice = log.deviceInfo.toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchAction && !matchDetails && !matchDevice) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedEmployeeId, selectedActionType, selectedTimeRange, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(l => l.timestamp.startsWith(todayStr));
    const uniqueUsersToday = new Set(todayLogs.map(l => l.employeeName)).size;
    const loginsToday = todayLogs.filter(l => l.action === 'LOGIN').length;
    const transactionsToday = todayLogs.filter(l => l.action === 'TRANSACTION_CREATE').length;

    // Mobile vs Desktop
    const mobileCount = logs.filter(l => /HP|iPhone|Android|Tablet|iPad/i.test(l.deviceInfo)).length;
    const desktopCount = logs.length - mobileCount;

    return {
      totalLogs: logs.length,
      todayCount: todayLogs.length,
      uniqueUsersToday,
      loginsToday,
      transactionsToday,
      mobileCount,
      desktopCount,
    };
  }, [logs]);

  // Handle Export CSV
  const handleExportCsv = () => {
    try {
      const csvContent = exportAccessLogsCsv();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const filename = `Log_Akses_Seblak_Cinta_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setFeedbackNotice('✅ File Log Akses CSV berhasil diunduh!');
      setTimeout(() => setFeedbackNotice(null), 3500);
    } catch (e: any) {
      alert(`Gagal mengunduh file log: ${e.message}`);
    }
  };

  // Handle Clear Logs
  const handleExecuteClear = () => {
    clearAccessLogs();
    reloadLogs();
    setIsConfirmClearOpen(false);
    setFeedbackNotice('Riwayat log berhasil dibersihkan.');
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  // Quick Test Add Log
  const handleAddTestLog = () => {
    recordAccessLog({
      action: 'PAGE_ACCESS',
      actionTitle: 'Pemeriksaan Log Akses',
      details: `${activeEmployee.name} (${activeEmployee.role}) melakukan inspeksi riwayat audit sistem.`,
    });
    reloadLogs();
    setFeedbackNotice('Catatan log baru berhasil disimpan.');
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-5 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-start sm:items-center gap-3.5 relative z-10 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center shrink-0 shadow-lg text-purple-300">
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight">
                Log Data Akses &amp; Aktivitas Staf
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>Khusus Owner</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-400 mt-0.5 leading-relaxed">
              Pantau siapa saja yang login, jam berapa mengakses aplikasi, jenis perangkat HP/komputer yang digunakan, dan rekam jejak kasir secara real-time.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-center flex-wrap relative z-10">
          <button
            type="button"
            onClick={handleAddTestLog}
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Uji coba mencatat satu entri log baru untuk sesi ini"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Catat Log Sekarang</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950"
            title="Download seluruh data log akses ke format Microsoft Excel / CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={reloadLogs}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors shadow-sm"
            title="Segarkan data log"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => setIsConfirmClearOpen(true)}
              className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 transition-colors shadow-sm"
              title="Bersihkan riwayat log audit (Khusus Owner)"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
            </button>
          )}
        </div>
      </div>

      {/* Feedback Toast Notice */}
      {feedbackNotice && (
        <div className="bg-emerald-950/90 border border-emerald-600 text-emerald-200 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Pengguna Aktif */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-stone-400 font-medium block">Pengguna Aktif Saat Ini</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm sm:text-base font-black text-white truncate">
                {activeEmployee.name.split(' ')[0]}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                {activeEmployee.role}
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Terautentikasi PIN</span>
            </span>
          </div>
        </div>

        {/* Card 2: Akses Hari Ini */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-stone-400 font-medium block">Aktivitas Hari Ini</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-amber-300">
                {stats.todayCount}
              </span>
              <span className="text-[11px] text-stone-400">kali akses</span>
            </div>
            <span className="text-[10px] text-stone-400">
              {stats.uniqueUsersToday} staf unik hari ini
            </span>
          </div>
        </div>

        {/* Card 3: Perangkat Terdeteksi */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-stone-400 font-medium block">Perangkat Digunakan</span>
            <div className="flex items-center gap-2 mt-0.5 text-xs font-bold text-white">
              <span className="flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-amber-400" />
                <span>{stats.mobileCount} HP</span>
              </span>
              <span className="text-stone-600">/</span>
              <span className="flex items-center gap-1">
                <Laptop className="w-3 h-3 text-sky-400" />
                <span>{stats.desktopCount} PC</span>
              </span>
            </div>
            <span className="text-[10px] text-stone-400 truncate block mt-0.5" title={getDeviceFingerprint()}>
              {getDeviceFingerprint()}
            </span>
          </div>
        </div>

        {/* Card 4: Total Log Audit */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-stone-400 font-medium block">Total Jejak Audit</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-emerald-300">
                {stats.totalLogs}
              </span>
              <span className="text-[11px] text-stone-400">rekaman</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">
              Terproteksi lokal &amp; akurat
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder="Cari nama staf, nomor struk transaksi, jenis perangkat, atau rincian kegiatan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-2xl text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-xs px-1.5 py-0.5 rounded bg-stone-800"
              >
                Bersihkan
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Staf */}
            <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 rounded-2xl px-3 py-1.5">
              <UserCheck className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                className="bg-transparent text-xs text-stone-200 font-bold focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-stone-900 text-white">Semua Staf / User</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.name} className="bg-stone-900 text-white">
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Aksi */}
            <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 rounded-2xl px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <select
                value={selectedActionType}
                onChange={e => setSelectedActionType(e.target.value)}
                className="bg-transparent text-xs text-stone-200 font-bold focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-stone-900 text-white">Semua Tipe Aksi</option>
                <option value="LOGIN_LOGOUT" className="bg-stone-900 text-white">🔑 Login &amp; Logout</option>
                <option value="TRANSACTION" className="bg-stone-900 text-white">🛒 Transaksi POS Kasir</option>
                <option value="STOCK" className="bg-stone-900 text-white">📦 Mutasi Stok Bahan</option>
                <option value="MENU_CAT" className="bg-stone-900 text-white">🍽️ Kelola Menu &amp; Kategori</option>
                <option value="SYNC" className="bg-stone-900 text-white">🌐 Sinkronisasi Sheets</option>
              </select>
            </div>

            {/* Filter Waktu */}
            <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 rounded-2xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <select
                value={selectedTimeRange}
                onChange={e => setSelectedTimeRange(e.target.value as any)}
                className="bg-transparent text-xs text-stone-200 font-bold focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-stone-900 text-white">Semua Waktu</option>
                <option value="today" className="bg-stone-900 text-white">Hari Ini</option>
                <option value="7days" className="bg-stone-900 text-white">7 Hari Terakhir</option>
                <option value="30days" className="bg-stone-900 text-white">30 Hari Terakhir</option>
              </select>
            </div>
          </div>
        </div>

        {/* Count result */}
        <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
          <span>
            Menampilkan <strong className="text-white font-bold">{filteredLogs.length}</strong> dari{' '}
            {logs.length} data riwayat akses staf.
          </span>
          {(selectedEmployeeId !== 'all' || selectedActionType !== 'all' || selectedTimeRange !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedEmployeeId('all');
                setSelectedActionType('all');
                setSelectedTimeRange('all');
                setSearchQuery('');
              }}
              className="text-rose-400 hover:text-rose-300 font-bold underline"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>

      {/* Log Feed & Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-12 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-stone-800 text-stone-500 flex items-center justify-center">
            <Search className="w-7 h-7" />
          </div>
          <h4 className="font-extrabold text-base text-white">Tidak Ada Riwayat Log Ditemukan</h4>
          <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
            Tidak ada aktivitas staf yang cocok dengan kriteria filter atau pencarian Anda. Coba ubah kata kunci atau pulihkan filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedEmployeeId('all');
              setSelectedActionType('all');
              setSelectedTimeRange('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition-colors"
          >
            Tampilkan Semua Log
          </button>
        </div>
      ) : (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-xl">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950/80 text-stone-400 border-b border-stone-800 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Waktu (WIB)</th>
                  <th className="py-3.5 px-4">Nama Staf / User</th>
                  <th className="py-3.5 px-4">Aktivitas Utama</th>
                  <th className="py-3.5 px-4">Rincian Kegiatan</th>
                  <th className="py-3.5 px-4">Perangkat &amp; Koneksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filteredLogs.map(log => {
                  const meta = getActionMeta(log.action);
                  const ActionIcon = meta.icon;
                  const isLogOwner =
                    log.role?.toLowerCase() === 'owner' ||
                    log.role?.toLowerCase().includes('pemilik');

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-stone-800/40 transition-colors group"
                    >
                      {/* Waktu */}
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                          <Clock className="w-3.5 h-3.5 text-stone-500" />
                          <span>{formatRelativeTime(log.timestamp)}</span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono block mt-0.5">
                          {formatExactTime(log.timestamp)}
                        </span>
                      </td>

                      {/* Staf */}
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                              isLogOwner
                                ? 'bg-purple-950/80 text-amber-300 border-purple-700'
                                : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                            }`}
                          >
                            {isLogOwner ? (
                              <Crown className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              log.employeeName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="font-extrabold text-white block text-xs">
                              {log.employeeName}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold border inline-block mt-0.5 ${
                                isLogOwner
                                  ? 'bg-purple-950/90 text-purple-300 border-purple-800'
                                  : 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
                              }`}
                            >
                              {log.role}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Aksi Utama */}
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${meta.badgeClass}`}
                        >
                          <ActionIcon className={`w-3.5 h-3.5 ${meta.iconClass}`} />
                          <span>{log.actionTitle || meta.label}</span>
                        </span>
                      </td>

                      {/* Rincian Kegiatan */}
                      <td className="py-3.5 px-4 align-top">
                        <p className="text-xs text-stone-200 leading-relaxed max-w-md">
                          {log.details}
                        </p>
                      </td>

                      {/* Perangkat */}
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        <div className="flex items-center gap-1.5 text-xs text-stone-300">
                          {getDeviceIcon(log.deviceInfo)}
                          <span className="truncate max-w-[150px] font-medium" title={log.deviceInfo}>
                            {log.deviceInfo}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>{log.ipOrLocation || 'Online'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Feed View */}
          <div className="md:hidden divide-y divide-stone-800/80">
            {filteredLogs.map(log => {
              const meta = getActionMeta(log.action);
              const ActionIcon = meta.icon;
              const isLogOwner =
                log.role?.toLowerCase() === 'owner' ||
                log.role?.toLowerCase().includes('pemilik');

              return (
                <div key={log.id} className="p-4 space-y-2 hover:bg-stone-800/30 transition-colors">
                  {/* Top line: Staff + Timestamp */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 border ${
                          isLogOwner
                            ? 'bg-purple-950 text-amber-300 border-purple-700'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        }`}
                      >
                        {isLogOwner ? (
                          <Crown className="w-3 h-3 text-amber-400" />
                        ) : (
                          log.employeeName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex items-center gap-1.5">
                        <span className="font-extrabold text-white text-xs truncate">
                          {log.employeeName}
                        </span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-bold border shrink-0 ${
                            isLogOwner
                              ? 'bg-purple-950 text-purple-300 border-purple-800'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {log.role}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-stone-400 shrink-0">
                      {formatRelativeTime(log.timestamp)}
                    </span>
                  </div>

                  {/* Action badge */}
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${meta.badgeClass}`}
                    >
                      <ActionIcon className={`w-3 h-3 ${meta.iconClass}`} />
                      <span>{log.actionTitle || meta.label}</span>
                    </span>
                  </div>

                  {/* Details */}
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {log.details}
                  </p>

                  {/* Device & timestamp */}
                  <div className="flex items-center justify-between pt-1 border-t border-stone-800/60 text-[10px] text-stone-400">
                    <div className="flex items-center gap-1 truncate max-w-[180px]">
                      {getDeviceIcon(log.deviceInfo)}
                      <span className="truncate">{log.deviceInfo}</span>
                    </div>
                    <span>{formatExactTime(log.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Banner for Owner */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 flex items-start gap-3 text-xs text-stone-400">
        <HelpCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-stone-300">
            Kerahasiaan &amp; Akuntabilitas Operasional Warung
          </p>
          <p className="leading-relaxed">
            Seluruh jejak akses pengguna dicatat otomatis di perangkat tanpa perlu internet. Fitur ini melindungi Owner dari kecurangan kasir, memantau pergantian shift kerja staf, dan mendeteksi dari perangkat HP mana kasir bertransaksi.
          </p>
        </div>
      </div>

      {/* Confirm Clear Modal */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-rose-800/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-base text-white">
                  Bersihkan Riwayat Log Akses?
                </h4>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Tindakan ini akan mengosongkan seluruh riwayat log akses pengguna yang ada saat ini. Data transaksi dan stok produk tidak akan terpengaruh.
                </p>
              </div>
            </div>

            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs text-stone-300 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Tips: Anda dapat mengunduh salinan <strong>Ekspor CSV</strong> terlebih dahulu.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmClearOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteClear}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Bersihkan Log</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
