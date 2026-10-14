import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Wifi,
  WifiOff,
  Copy,
  CheckCircle2,
  ExternalLink,
  Code,
  Download,
  Upload,
  AlertCircle,
  X,
  Share2,
  BookOpen,
  Check,
  AlertTriangle,
  HelpCircle,
  FileCheck,
  Play,
  Lock,
  ShieldCheck,
  QrCode,
  MessageCircle,
  Smartphone,
  Sparkles,
  Send,
  FileDown,
} from 'lucide-react';
import { SpreadsheetConfig, Employee } from '../types';
import {
  syncWithGoogleSheets,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  validateSpreadsheetUrl,
  testSpreadsheetConnection,
  pullDataFromSpreadsheet,
} from '../utils/sheetsSync';
import {
  getSpreadsheetConfig,
  saveSpreadsheetConfig,
  getTransactions,
  getStockMovements,
  getMenuItems,
  saveTransactions,
  saveStockMovements,
  saveMenuItems,
  broadcastChange,
  isOwnerAccount,
  getActiveEmployee,
  getStoreProfile,
  exportLocalDatabaseBackup,
  restoreLocalDatabaseBackup,
} from '../utils/storage';
import { exportSalesReportToExcel, downloadBlankSpreadsheetTemplate } from '../utils/reports';

interface SpreadsheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  pendingSyncCount: number;
  onSyncCompleted: () => void;
  activeEmployee?: Employee;
}

export const SpreadsheetSyncModal: React.FC<SpreadsheetSyncModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  pendingSyncCount,
  onSyncCompleted,
  activeEmployee,
}) => {
  const effectiveEmployee = activeEmployee || getActiveEmployee();
  const isOwner = isOwnerAccount(effectiveEmployee);
  const storeProfile = getStoreProfile();

  const [config, setConfig] = useState<SpreadsheetConfig>(getSpreadsheetConfig());
  const [activeTab, setActiveTab] = useState<'guide' | 'sync' | 'code' | 'backup'>(() =>
    isOwner ? 'guide' : 'sync'
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isForceSyncing, setIsForceSyncing] = useState<boolean>(false);
  const [isTestingUrl, setIsTestingUrl] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Sharing states for employees on other phones
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedAutoConnect, setCopiedAutoConnect] = useState<boolean>(false);
  const [copiedRawLink, setCopiedRawLink] = useState<boolean>(false);

  // Interval state helper for custom seconds/minutes
  const [customIntervalValue, setCustomIntervalValue] = useState<number>(() => {
    const sec = config.autoSyncIntervalSec || 30;
    return sec >= 60 && sec % 60 === 0 ? sec / 60 : sec;
  });
  const [customIntervalUnit, setCustomIntervalUnit] = useState<'sec' | 'min'>(() => {
    const sec = config.autoSyncIntervalSec || 30;
    return sec >= 60 && sec % 60 === 0 ? 'min' : 'sec';
  });

  // Base URL & Auto-Connect Link Generator
  const getBaseAppUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const defaultLiveUrl = 'https://ais-pre-piptb5atesjniopug2utxd-592454551214.asia-east1.run.app';
    return origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')
      ? origin
      : defaultLiveUrl;
  };

  const getAutoConnectLink = () => {
    const base = getBaseAppUrl();
    if (!config.webAppUrl) return base;
    return `${base}?sheetsUrl=${encodeURIComponent(config.webAppUrl)}`;
  };

  const handleCopyAutoConnect = async () => {
    const link = getAutoConnectLink();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const input = document.createElement('input');
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedAutoConnect(true);
      setTimeout(() => setCopiedAutoConnect(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyRawUrl = async () => {
    if (!config.webAppUrl) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(config.webAppUrl);
      } else {
        const input = document.createElement('input');
        input.value = config.webAppUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedRawLink(true);
      setTimeout(() => setCopiedRawLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareToWhatsApp = () => {
    const autoLink = getAutoConnectLink();
    const name = storeProfile?.name || 'Warung Seblak Cinta';
    const msg = `Halo Tim Kasir! Ini link Aplikasi Kasir POS ${name} yang sudah otomatis terhubung ke Google Spreadsheet Warung:\n\n${autoLink}\n\nCukup klik link di atas dari Google Chrome / Safari di HP kamu, dan aplikasi kasir langsung otomatis tersambung ke Google Spreadsheet warung!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDownloadTemplate = () => {
    downloadBlankSpreadsheetTemplate(storeProfile?.name || 'Warung Seblak Cinta');
  };

  // If not owner, allow 'sync' and 'backup' tabs
  useEffect(() => {
    if (isOpen) {
      if (!isOwner && activeTab !== 'sync' && activeTab !== 'backup') {
        setActiveTab('sync');
      }
    }
  }, [isOpen, isOwner]);

  const [isPullingData, setIsPullingData] = useState<boolean>(false);

  const handlePullData = async () => {
    setIsPullingData(true);
    setSyncFeedback(null);
    try {
      const res = await pullDataFromSpreadsheet();
      if (res.success) {
        setSyncFeedback({ type: 'success', text: res.message });
        const updated = getSpreadsheetConfig();
        setConfig(updated);
        onSyncCompleted();
      } else {
        setSyncFeedback({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setSyncFeedback({ type: 'error', text: err.message || 'Gagal menarik data dari Spreadsheet' });
    } finally {
      setIsPullingData(false);
    }
  };

  if (!isOpen) return null;

  const urlValidation = validateSpreadsheetUrl(config.webAppUrl);

  const handleSaveConfig = (overrideCfg?: SpreadsheetConfig) => {
    const cfgToSave = overrideCfg || config;
    saveSpreadsheetConfig(cfgToSave);
    setConfig(cfgToSave);
    setSyncFeedback({ type: 'success', text: 'Pengaturan link Spreadsheet & sinkronisasi berhasil disimpan!' });
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  const handleTestConnection = async () => {
    setIsTestingUrl(true);
    setTestResult(null);
    try {
      const res = await testSpreadsheetConnection(config.webAppUrl);
      setTestResult(res);
      if (res.success) {
        saveSpreadsheetConfig(config);
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Gagal menguji koneksi.',
      });
    } finally {
      setIsTestingUrl(false);
    }
  };

  const handleTriggerSync = async (forceAll: boolean = false) => {
    if (forceAll) {
      setIsForceSyncing(true);
    } else {
      setIsSyncing(true);
    }
    setSyncFeedback(null);
    try {
      const result = await syncWithGoogleSheets(forceAll);
      if (result.success) {
        setSyncFeedback({ type: 'success', text: result.message });
        onSyncCompleted();
      } else {
        setSyncFeedback({ type: 'error', text: result.message });
      }
    } catch (e: any) {
      setSyncFeedback({ type: 'error', text: e.message || 'Gagal melakukan sinkronisasi' });
    } finally {
      setIsSyncing(false);
      setIsForceSyncing(false);
    }
  };

  const updateAutoSyncInterval = (seconds: number) => {
    const validSec = Math.max(5, seconds);
    const updated = { ...config, autoSyncIntervalSec: validSec };
    setConfig(updated);
    saveSpreadsheetConfig(updated);
    if (validSec >= 60 && validSec % 60 === 0) {
      setCustomIntervalValue(validSec / 60);
      setCustomIntervalUnit('min');
    } else {
      setCustomIntervalValue(validSec);
      setCustomIntervalUnit('sec');
    }
    setSyncFeedback({
      type: 'success',
      text: `Interval sinkronisasi otomatis diatur menjadi setiap ${
        validSec >= 60 ? `${Math.round(validSec / 60)} menit` : `${validSec} detik`
      }!`,
    });
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handleCustomIntervalApply = (val: number, unit: 'sec' | 'min') => {
    const rawVal = Math.max(1, Number(val) || 1);
    const totalSec = unit === 'min' ? rawVal * 60 : Math.max(5, rawVal);
    updateAutoSyncInterval(totalSec);
  };

  const copyAppsScript = () => {
    if (!isOwner) {
      alert('Akses Dibatasi: Kode skrip Google Apps Script hanya dapat diakses oleh akun Owner.');
      return;
    }
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Local JSON Backup Download (Tersedia untuk Kasir dan Owner)
  const handleExportBackup = () => {
    try {
      const jsonStr = exportLocalDatabaseBackup(
        effectiveEmployee?.name ? `${effectiveEmployee.name} (${effectiveEmployee.role})` : undefined
      );
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanStoreName = (storeProfile?.name || 'Seblak_Cinta').replace(/[^a-zA-Z0-9_-]/g, '_');
      const today = new Date().toISOString().split('T')[0];
      a.download = `Backup_${cleanStoreName}_${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSyncFeedback({
        type: 'success',
        text: 'File cadangan JSON database lokal berhasil diunduh ke perangkat Anda!',
      });
      setTimeout(() => setSyncFeedback(null), 3500);
    } catch (e: any) {
      console.error(e);
      setSyncFeedback({ type: 'error', text: 'Gagal mengunduh cadangan JSON: ' + (e.message || '') });
    }
  };

  // Export to Excel directly (Khusus Owner / Manager)
  const handleExportExcel = () => {
    if (!isOwner) {
      alert('Akses Dibatasi: Ekspor data ke Microsoft Excel hanya untuk akun Owner.');
      return;
    }
    const txs = getTransactions();
    const profile = JSON.parse(localStorage.getItem('seblak_store_profile') || '{"name":"Warung Seblak Cinta"}');
    const today = new Date().toISOString().split('T')[0];
    exportSalesReportToExcel(txs, 'Awal', today, profile);
  };

  // Import Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Pulihkan data dari file cadangan ini? Data lokal di perangkat akan diperbarui dengan data dalam file cadangan.')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const content = event.target?.result as string;
        const res = restoreLocalDatabaseBackup(content);
        if (res.success) {
          setSyncFeedback({ type: 'success', text: res.message });
          alert('✅ ' + res.message);
          onSyncCompleted();
          onClose();
        } else {
          setSyncFeedback({ type: 'error', text: res.message });
          alert('❌ ' + res.message);
        }
      } catch (err: any) {
        setSyncFeedback({ type: 'error', text: 'Format file tidak valid: ' + err.message });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-extrabold text-base text-white">
                Sinkronisasi Google Spreadsheet
              </h3>
              <p className="text-[11px] text-stone-400">
                Otomatis rekap penjualan, mutasi stok, & master menu ke Google Sheet
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Helper Restricted Screen untuk Non-Owner */}
        {(() => null)()}

        {/* Tab switcher */}
        <div className="grid grid-cols-4 gap-1 my-3 p-1 rounded-xl bg-stone-950 border border-stone-800 text-[11px] font-bold">
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 relative ${
              activeTab === 'guide'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>1. Tools Buat &amp; Bagikan</span>
            {!isOwner && <Lock className="w-2.5 h-2.5 text-amber-400" />}
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'sync'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>2. Koneksi &amp; Sinkron</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 relative ${
              activeTab === 'code'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>3. Kode Skrip</span>
            {!isOwner && <Lock className="w-2.5 h-2.5 text-amber-400" />}
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 relative ${
              activeTab === 'backup'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>4. Cadangan JSON &amp; Ekspor</span>
          </button>
        </div>

        {/* --- TAB 1: TOOLS PEMBUATAN SPREADSHEET BARU & BAGIKAN KE KARYAWAN --- */}
        {activeTab === 'guide' && (
          !isOwner ? (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-3.5 bg-stone-950/70 border border-stone-800 rounded-2xl animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-white flex items-center justify-center gap-2">
                  <span>Tools Pembuatan Spreadsheet Baru</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    Khusus Owner
                  </span>
                </h4>
                <p className="text-xs text-stone-400 max-w-md leading-relaxed mx-auto">
                  Tools pembuatan spreadsheet baru dan penyalinan kode skrip integrasi khusus untuk akun <strong className="text-white">Owner (Pemilik Warung)</strong> demi menjaga keamanan konfigurasi.
                </p>
              </div>
              <div className="text-[11px] text-stone-400 bg-stone-900/90 px-3.5 py-1.5 rounded-xl border border-stone-800 flex items-center gap-1.5">
                <span>Akun Aktif:</span>
                <span className="text-stone-200 font-bold">{effectiveEmployee?.name || 'Staf'}</span>
                <span className="text-amber-400/90 font-mono">({effectiveEmployee?.role || 'Bukan Owner'})</span>
              </div>
              <p className="text-[10px] text-stone-500 max-w-sm">
                Staf kasir dapat membuka menu <strong className="text-stone-300">2. Koneksi &amp; Sinkron</strong> untuk melihat status koneksi dan menyinkronkan data transaksi.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('sync')}
                className="mt-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Buka Menu Sinkronisasi</span>
              </button>
            </div>
          ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            {/* Header Tools Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-stone-900 to-emerald-950/40 border border-rose-800/50 shadow-lg flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 text-lg">
                🛠️
              </div>
              <div>
                <h4 className="font-extrabold text-white text-sm">
                  Tools Pembuatan Spreadsheet Baru &amp; Pembagian ke Karyawan
                </h4>
                <p className="text-[11px] text-stone-300 mt-0.5 leading-relaxed">
                  Gunakan tombol-tombol cepat di bawah untuk membuat Google Sheets baru dalam 1-klik, menyalin kode script, dan membagikan link auto-connect ke HP karyawan.
                </p>
              </div>
            </div>

            {/* QUICK ACTIONS BAR: TOMBOL PEMBUATAN SPREADSHEET */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Tombol 1: Buka sheets.new */}
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/70 text-emerald-200 flex items-center gap-2.5 transition-all group shadow-sm"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold block text-xs text-white group-hover:text-emerald-300">
                    Buka sheets.new
                  </span>
                  <span className="text-[10px] text-emerald-400/90">
                    Buat Sheet Baru di Drive
                  </span>
                </div>
              </a>

              {/* Tombol 2: Unduh Template Excel */}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="p-3 rounded-2xl bg-sky-950/50 hover:bg-sky-900/60 border border-sky-700/70 text-sky-200 flex items-center gap-2.5 transition-all group shadow-sm text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold block text-xs text-white group-hover:text-sky-300">
                    Unduh Template .xlsx
                  </span>
                  <span className="text-[10px] text-sky-400/90">
                    Struktur 4 Sheet Lengkap
                  </span>
                </div>
              </button>

              {/* Tombol 3: Salin Kode Script */}
              <button
                type="button"
                onClick={copyAppsScript}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all group shadow-sm text-left ${
                  copiedCode
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-rose-950/50 hover:bg-rose-900/60 border-rose-700/70 text-rose-200'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  {copiedCode ? <Check className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                </div>
                <div>
                  <span className="font-extrabold block text-xs text-white">
                    {copiedCode ? 'Kode Tersalin!' : 'Salin Kode Script'}
                  </span>
                  <span className="text-[10px] opacity-90">
                    {copiedCode ? 'Siap Ditempel di Google' : 'Google Apps Script'}
                  </span>
                </div>
              </button>
            </div>

            {/* FITUR UTAMA: 📲 BAGIKAN LINK KE KARYAWAN DI HP LAIN */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-stone-950 to-stone-950 border-2 border-emerald-600/80 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-950">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span>Bagikan Link ke Karyawan di HP Lain</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Auto-Connect
                      </span>
                    </h5>
                    <p className="text-[11px] text-stone-300">
                      Karyawan di HP lain cukup buka link atau scan QR. Kasir otomatis terhubung tanpa perlu setting!
                    </p>
                  </div>
                </div>
              </div>

              {/* Box URL Auto Connect */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Tautan Kasir Khusus Karyawan (Sudah Termasuk Link Spreadsheet):
                </label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-900 border border-stone-800 font-mono text-[11px]">
                  <input
                    type="text"
                    readOnly
                    value={getAutoConnectLink()}
                    className="w-full bg-transparent text-emerald-400 outline-none truncate select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyAutoConnect}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                      copiedAutoConnect
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                    }`}
                  >
                    {copiedAutoConnect ? 'Tersalin!' : 'Salin'}
                  </button>
                </div>
              </div>

              {/* 3 Tombol Aksi Praktis Pembagian ke Karyawan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyAutoConnect}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 transition-all active:scale-[0.98]"
                >
                  {copiedAutoConnect ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedAutoConnect ? 'Tautan Tersalin!' : 'Salin Link Kasir'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareToWhatsApp}
                  className="py-2.5 px-3 rounded-xl bg-green-700 hover:bg-green-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-green-950 transition-all active:scale-[0.98]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim WhatsApp Staf</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>Tampilkan QR Code</span>
                </button>
              </div>

              <div className="pt-1 flex items-center justify-between text-[10px] text-stone-400 border-t border-stone-800/80">
                <span>💡 Karyawan langsung otomatis tersambung saat link dibuka di Chrome/Safari HP.</span>
                {config.webAppUrl && (
                  <button
                    type="button"
                    onClick={handleCopyRawUrl}
                    className="text-stone-400 hover:text-white underline font-mono"
                  >
                    {copiedRawLink ? 'URL Mentah Tersalin!' : 'Salin URL Script Saja'}
                  </button>
                )}
              </div>
            </div>

            {/* PANDUAN LANGKAH PEMBUATAN SPREADSHEET LENGKAP */}
            <div className="space-y-3 pt-1">
              <h5 className="font-extrabold text-xs text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-rose-400" />
                <span>Panduan 4 Langkah Pembuatan &amp; Deploy Spreadsheet Baru:</span>
              </h5>

              {/* Step 1 */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-extrabold flex items-center justify-center text-xs">
                      1
                    </span>
                    <span className="font-extrabold text-white text-xs">
                      Buat Dokumen Google Sheets Baru
                    </span>
                  </div>
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka sheets.new</span>
                  </a>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed pl-8">
                  Klik tombol di atas untuk membuka tab Google Sheets baru, lalu beri judul misalnya <strong className="text-stone-200">"Rekap POS Seblak Cinta"</strong>. Atau Anda bisa mengunduh template Excel di bilah atas lalu unggah ke Google Drive.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-extrabold flex items-center justify-center text-xs">
                      2
                    </span>
                    <span className="font-extrabold text-white text-xs">
                      Buka Ekstensi &gt; Apps Script &amp; Tempel Kode Script
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyAppsScript}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-sm transition-all"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed pl-8">
                  Di Google Sheets, klik menu <strong className="text-stone-200">Ekstensi (Extensions)</strong> &gt; <strong className="text-stone-200">Apps Script</strong>. Hapus teks bawaan <code className="text-stone-300 bg-stone-900 px-1 rounded">myFunction</code>, lalu <strong>Tempel (Ctrl+V)</strong> kode yang disalin, kemudian klik <strong>Simpan (Ctrl+S)</strong>.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-rose-900/50 bg-rose-950/20 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-extrabold flex items-center justify-center text-xs">
                    3
                  </span>
                  <span className="font-extrabold text-white text-xs">
                    Terapkan (Deploy) Sebagai Aplikasi Web <span className="text-rose-400 font-bold">(PENTING!)</span>
                  </span>
                </div>
                <div className="pl-8 text-[11px] text-stone-300 space-y-1.5 leading-relaxed">
                  <div>Klik tombol biru kanan atas Apps Script: <strong>Terapkan (Deploy)</strong> &gt; <strong>Penerapan baru (New deployment)</strong>.</div>
                  <div className="p-2 rounded-xl bg-stone-900/90 border border-stone-800 space-y-1 font-mono text-[10px]">
                    <div>• Jenis penerapan: <strong>Aplikasi Web (Web App)</strong></div>
                    <div>• Jalankan sebagai: <strong>Saya (Akun Anda)</strong></div>
                    <div className="text-emerald-400 font-bold">
                      • Yang memiliki akses: <u>Siapa saja (Anyone)</u>
                    </div>
                  </div>
                  <p className="text-amber-300 text-[10px]">
                    ⚠️ PENTING: Pilihan akses <strong>WAJIB "Siapa saja (Anyone)"</strong> agar transaksi kasir dapat dikirim tanpa login akun Google di tiap HP kasir.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-extrabold flex items-center justify-center text-xs">
                      4
                    </span>
                    <span className="font-extrabold text-white text-xs">
                      Salin URL Web App &amp; Simpan di Tab "2. Koneksi &amp; Sinkron"
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sync')}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-sm transition-all"
                  >
                    <span>Buka Tab 2</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed pl-8">
                  Salin URL Aplikasi Web berakhiran <code className="text-emerald-400 font-mono font-bold">/exec</code> yang diberikan Google, tempel di tab <strong>"2. Koneksi &amp; Sinkron"</strong>, lalu bagikan link ke karyawan di HP lain.
                </p>
              </div>
            </div>
          </div>
        )
      )}

        {/* --- TAB 2: KONEKSI & SINKRON --- */}
        {activeTab === 'sync' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            {/* Status cards */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
                  isOnline
                    ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-700/60 text-amber-300'
                }`}
              >
                {isOnline ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-amber-400" />}
                <div>
                  <span className="text-[10px] text-stone-400 block">Status Koneksi Internet:</span>
                  <span className="text-xs font-bold">{isOnline ? 'Online (Terhubung)' : 'Mode Offline Aktif'}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-sky-400" />
                <div>
                  <span className="text-[10px] text-stone-400 block">Antrean Data Belum Sinkron:</span>
                  <span className="text-xs font-bold text-white">
                    {pendingSyncCount} transaksi &amp; mutasi
                  </span>
                </div>
              </div>
            </div>

            {/* Offline Explanation */}
            <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 text-[11px] text-stone-400 leading-relaxed">
              💡 <span className="font-bold text-stone-200">Tetap Beroperasi Tanpa Internet:</span> Jika WiFi atau sinyal HP putus, kasir tetap lancar membuat pesanan dan mencetak struk. Data tersimpan otomatis di perangkat dan akan disinkronkan saat online!
            </div>

            {/* Info Akses: Terbuka untuk Semua Staf */}
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold block text-emerald-300">Akses Pengaturan Link & Sinkronisasi Terbuka</span>
                <span className="text-[11px] text-stone-300">
                  Seluruh staf (Owner, Kasir, Admin) dapat memperbarui link Google Apps Script, mengetes koneksi, dan menjalankan sinkronisasi kapan saja. Panduan langkah, kode skrip integrasi, dan ekspor file Excel tetap khusus untuk akun <strong className="text-white font-mono">Owner</strong>.
                </span>
              </div>
            </div>

            {/* URL input field (Bisa diubah oleh semua user) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                  <span>URL Google Apps Script Web App:</span>
                  <span className="text-rose-500">*</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-normal">(Bisa diedit semua user)</span>
                </label>
                {config.webAppUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Hapus link Google Spreadsheet ini dari warung?')) {
                        const updated = { ...config, webAppUrl: '' };
                        setConfig(updated);
                        handleSaveConfig(updated);
                        setTestResult(null);
                      }
                    }}
                    className="text-[10px] text-stone-400 hover:text-red-400 underline transition-colors"
                  >
                    Hapus URL
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={config.webAppUrl}
                  onChange={e => {
                    setConfig({ ...config, webAppUrl: e.target.value.trim() });
                    setTestResult(null);
                  }}
                  className={`w-full px-3.5 py-2.5 bg-stone-950 border rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none font-mono ${
                    urlValidation.warning
                      ? 'border-amber-600 focus:border-amber-500'
                      : 'border-stone-800 focus:border-emerald-500'
                  }`}
                />
              </div>

              {/* URL Realtime Warning / Guidance */}
              {urlValidation.warning && config.webAppUrl && (
                <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-700/70 text-amber-200 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>{urlValidation.warning}</span>
                  </div>
                  {urlValidation.advice && (
                    <p className="text-[10px] text-amber-300/90 pl-5">
                      {urlValidation.advice}
                    </p>
                  )}
                </div>
              )}

              <p className="text-[10px] text-stone-500">
                Format yang benar berakhiran <code className="text-stone-300 font-mono">/exec</code>. Contoh: https://script.google.com/macros/s/AKfycb.../exec
              </p>
            </div>

            {/* Tombol Simpan URL & Tes Koneksi (Tersedia untuk semua user) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveConfig()}
                className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan URL</span>
              </button>

              <button
                type="button"
                disabled={isTestingUrl || !config.webAppUrl || !isOnline}
                onClick={handleTestConnection}
                className={`py-2 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  !config.webAppUrl || isTestingUrl || !isOnline
                    ? 'bg-stone-950 border-stone-800 text-stone-600 cursor-not-allowed'
                    : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200'
                }`}
              >
                <Play className={`w-3.5 h-3.5 ${isTestingUrl ? 'animate-spin' : ''}`} />
                <span>{isTestingUrl ? 'Menguji...' : 'Tes Koneksi URL'}</span>
              </button>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950 border border-emerald-700 text-emerald-200'
                    : 'bg-red-950 border border-red-700 text-red-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">
                  <span className="font-bold block">{testResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}</span>
                  <span className="text-[11px]">{testResult.message}</span>
                </div>
              </div>
            )}

            {/* --- FITUR BAGIKAN LINK KE KARYAWAN DI HP LAIN (AUTO-CONNECT) --- */}
            {config.webAppUrl && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/70 via-stone-950 to-stone-950 border border-emerald-600/70 shadow-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-900/80 border border-emerald-600/80 text-emerald-300 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-white block">
                        Bagikan Link ke Karyawan di HP Lain
                      </span>
                      <span className="text-[10px] text-emerald-300/90">
                        HP karyawan otomatis tersambung ke Spreadsheet tanpa perlu setting!
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Auto-Connect
                  </span>
                </div>

                {/* Box Link Kasir Auto-Connect */}
                <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-stone-900 border border-stone-800 text-[11px] font-mono">
                  <span className="text-stone-500 text-[10px] px-1 select-none">Link Kasir:</span>
                  <input
                    type="text"
                    readOnly
                    value={getAutoConnectLink()}
                    className="w-full bg-transparent text-emerald-400 font-mono text-[11px] outline-none truncate select-all"
                  />
                </div>

                {/* Tombol Aksi Karyawan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleCopyAutoConnect}
                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 transition-all active:scale-[0.98]"
                    title="Salin link auto-connect untuk karyawan"
                  >
                    {copiedAutoConnect ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAutoConnect ? 'Tautan Tersalin!' : 'Salin Link Kasir'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareToWhatsApp}
                    className="py-2 px-3 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-green-950 transition-all active:scale-[0.98]"
                    title="Kirim ke WhatsApp karyawan"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Kirim WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                    title="Tampilkan QR Code untuk scan di HP karyawan"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Scan QR Code</span>
                  </button>
                </div>

                <div className="pt-0.5 flex items-center justify-between text-[10px] text-stone-400">
                  <span>💡 Karyawan tidak perlu copy-paste URL script yang rumit.</span>
                  <button
                    type="button"
                    onClick={handleCopyRawUrl}
                    className="text-stone-400 hover:text-white underline font-mono text-[10px]"
                  >
                    {copiedRawLink ? 'URL Mentah Tersalin!' : 'Salin URL Script Saja'}
                  </button>
                </div>
              </div>
            )}

            {/* --- FITUR AMBIL DATA SPREADSHEET (UNTUK PENGGUNA BARU SINKRON SPREADSHEET) --- */}
            {config.webAppUrl && (
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  config.hasPulledInitialData
                    ? 'bg-stone-950/80 border-stone-800'
                    : 'bg-gradient-to-br from-amber-950/40 via-stone-950 to-stone-950 border-amber-600/70 shadow-lg'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        config.hasPulledInitialData
                          ? 'bg-stone-800 text-emerald-400'
                          : 'bg-amber-600 text-white shadow-md shadow-amber-950'
                      }`}
                    >
                      {config.hasPulledInitialData ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-white">
                          Ambil Data Master dari Google Spreadsheet
                        </span>
                        {config.hasPulledInitialData ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Sudah Tersinkron
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            Pengguna Baru
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400 leading-relaxed mt-1">
                        {config.hasPulledInitialData
                          ? 'Data master menu dan stok awal telah berhasil diambil dan tersinkron ke perangkat ini. Fitur dinonaktifkan otomatis agar tidak menimpa data yang sedang berjalan.'
                          : 'Khusus pengguna/perangkat yang baru menghubungkan link Spreadsheet: Ambil master menu, kategori, dan stok dari Google Spreadsheet ke perangkat ini.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    disabled={config.hasPulledInitialData || isPullingData || !config.webAppUrl || !isOnline}
                    onClick={handlePullData}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                      config.hasPulledInitialData
                        ? 'bg-stone-900 border border-stone-800 text-stone-500 cursor-not-allowed'
                        : isPullingData
                        ? 'bg-amber-700 text-white cursor-wait'
                        : !isOnline
                        ? 'bg-stone-900 border border-stone-800 text-stone-600 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950 active:scale-[0.98]'
                    }`}
                  >
                    {isPullingData ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sedang Mengambil Data dari Spreadsheet...</span>
                      </>
                    ) : config.hasPulledInitialData ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Data Sudah Diambil &amp; Tersinkron (Fitur Dinonaktifkan)</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Ambil Data Spreadsheet Sekarang</span>
                      </>
                    )}
                  </button>
                </div>

                {config.hasPulledInitialData && isOwner && (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Aktifkan kembali tombol ambil data spreadsheet? Perhatian: pastikan data di spreadsheet sudah sesuai.')) {
                          const updated = { ...config, hasPulledInitialData: false };
                          setConfig(updated);
                          saveSpreadsheetConfig(updated);
                        }
                      }}
                      className="text-[10px] text-stone-500 hover:text-amber-400 underline"
                    >
                      Owner: Aktifkan kembali tombol tarik data
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* --- FITUR CADANGAN DATABASE LOKAL KE FILE JSON (UNTUK KASIR & OWNER) --- */}
            <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-800/50 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-900/80 border border-sky-700/80 text-sky-300 flex items-center justify-center shrink-0">
                    <FileDown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-white block">
                      Cadangan Data Lokal ke File JSON
                    </span>
                    <span className="text-[10px] text-stone-300">
                      Kasir dapat menyimpan cadangan database secara manual ke perangkat ini
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  Semua Staf
                </span>
              </div>
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-950 transition-all active:scale-[0.98]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh File Cadangan JSON (.json) Sekarang</span>
              </button>
            </div>

            {/* --- PENGATURAN SINKRONISASI OTOMATIS FLEKSIBEL (DETIK / MENIT) --- */}
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Sinkronisasi Otomatis di Latar Belakang</span>
                  <span className="text-[10px] text-stone-400">
                    Kirim data transaksi &amp; mutasi otomatis berkala tanpa perlu klik manual
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.autoSync}
                  onChange={e => {
                    const updated = { ...config, autoSync: e.target.checked };
                    setConfig(updated);
                    saveSpreadsheetConfig(updated);
                  }}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {config.autoSync && (
                <div className="pt-2 border-t border-stone-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-stone-300">
                      Pilih Interval Waktu Sinkronisasi Otomatis:
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                      Aktif: {config.autoSyncIntervalSec >= 60 ? `${Math.round(config.autoSyncIntervalSec / 60)} Menit` : `${config.autoSyncIntervalSec} Detik`}
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[
                      { label: '10 Detik', sec: 10 },
                      { label: '30 Detik', sec: 30 },
                      { label: '1 Menit', sec: 60 },
                      { label: '2 Menit', sec: 120 },
                      { label: '5 Menit', sec: 300 },
                      { label: '10 Menit', sec: 600 },
                    ].map(preset => {
                      const isSelected = config.autoSyncIntervalSec === preset.sec;
                      return (
                        <button
                          key={preset.sec}
                          type="button"
                          onClick={() => updateAutoSyncInterval(preset.sec)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm shadow-emerald-950'
                              : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Interval Input (Detik atau Menit bebas) */}
                  <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[11px] text-stone-400">Atau atur manual:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="5"
                        max="3600"
                        value={customIntervalValue}
                        onChange={e => setCustomIntervalValue(Math.max(1, Number(e.target.value) || 1))}
                        className="w-16 px-2 py-1 bg-stone-900 border border-stone-800 rounded-lg text-xs font-mono text-white text-center focus:outline-none focus:border-emerald-500"
                      />
                      <select
                        value={customIntervalUnit}
                        onChange={e => setCustomIntervalUnit(e.target.value as 'sec' | 'min')}
                        className="px-2 py-1 bg-stone-900 border border-stone-800 rounded-lg text-xs font-semibold text-stone-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="sec">Detik</option>
                        <option value="min">Menit</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleCustomIntervalApply(customIntervalValue, customIntervalUnit)}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-[11px] font-bold transition-colors"
                      >
                        Terapkan
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sync Feedback Message */}
            {syncFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  syncFeedback.type === 'success'
                    ? 'bg-emerald-950 border border-emerald-700 text-emerald-200'
                    : 'bg-red-950 border border-red-700 text-red-200'
                }`}
              >
                {syncFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <span>{syncFeedback.text}</span>
              </div>
            )}

            {/* --- TOMBOL SINKRON FLEKSIBEL (SINKRON CEPAT & PAKSA FULL SYNC) --- */}
            <div className="pt-2 space-y-2">
              {/* Tombol Utama: Sinkronkan Sekarang */}
              <button
                type="button"
                disabled={isSyncing || isForceSyncing || !isOnline || !config.webAppUrl}
                onClick={() => handleTriggerSync(false)}
                className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isSyncing || isForceSyncing || !isOnline || !config.webAppUrl
                    ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700/50'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 active:scale-[0.99]'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncing
                    ? 'Sedang Menyinkronkan ke Spreadsheet...'
                    : `Sinkronkan Sekarang ke Google Spreadsheet ${pendingSyncCount > 0 ? `(${pendingSyncCount} Tertunda)` : ''}`}
                </span>
              </button>

              {/* Tombol Alternatif: Paksa Kirim Ulang Seluruh Data */}
              <button
                type="button"
                disabled={isSyncing || isForceSyncing || !isOnline || !config.webAppUrl}
                onClick={() => {
                  if (confirm('Kirim ulang SELURUH riwayat transaksi, mutasi stok, dan data menu ke Google Spreadsheet? Gunakan ini jika sheet baru dibuat atau perlu refresh total.')) {
                    handleTriggerSync(true);
                  }
                }}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  isSyncing || isForceSyncing || !isOnline || !config.webAppUrl
                    ? 'bg-stone-900 border-stone-800 text-stone-600 cursor-not-allowed'
                    : 'bg-stone-900 hover:bg-stone-800 border-stone-800 hover:border-stone-700 text-stone-300 hover:text-white'
                }`}
              >
                <Download className={`w-3.5 h-3.5 ${isForceSyncing ? 'animate-bounce text-sky-400' : 'text-sky-400'}`} />
                <span>
                  {isForceSyncing
                    ? 'Sedang Mengirim Ulang Seluruh Data...'
                    : 'Paksa Kirim Ulang Seluruh Data (Full Re-Sync)'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* --- TAB 3: KODE APPS SCRIPT --- */}
        {activeTab === 'code' && (
          !isOwner ? (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-3.5 bg-stone-950/70 border border-stone-800 rounded-2xl animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-white flex items-center justify-center gap-2">
                  <span>Kode Skrip Google Apps Script</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    Khusus Owner
                  </span>
                </h4>
                <p className="text-xs text-stone-400 max-w-md leading-relaxed mx-auto">
                  Kode skrip integrasi Google Apps Script hanya dapat dilihat dan disalin oleh akun <strong className="text-white">Owner (Pemilik Warung)</strong> demi menjaga keamanan dan arsitektur database warung.
                </p>
              </div>
              <div className="text-[11px] text-stone-400 bg-stone-900/90 px-3.5 py-1.5 rounded-xl border border-stone-800 flex items-center gap-1.5">
                <span>Akun Aktif:</span>
                <span className="text-stone-200 font-bold">{effectiveEmployee?.name || 'Staf'}</span>
                <span className="text-amber-400/90 font-mono">({effectiveEmployee?.role || 'Bukan Owner'})</span>
              </div>
              <p className="text-[10px] text-stone-500 max-w-sm">
                Hubungi Owner warung apabila diperlukan pembaharuan atau penyalinan skrip Google Apps Script.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('sync')}
                className="mt-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Buka Menu Sinkronisasi</span>
              </button>
            </div>
          ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 text-stone-300 space-y-1.5 leading-relaxed text-[11px]">
              <span className="font-bold text-white block text-xs">
                Struktur Sheet yang Otomatis Dibuat di Google Drive Anda:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                <div className="p-2 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="font-bold text-rose-400 block">1. Sheet 'Penjualan'</span>
                  <span className="text-stone-400">No Struk, Tanggal, Item, Total, Metode Bayar, Kasir</span>
                </div>
                <div className="p-2 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="font-bold text-amber-400 block">2. Sheet 'Mutasi_Stok'</span>
                  <span className="text-stone-400">Masuk/Keluar, Sisa Stok, Alasan, Harga Modal</span>
                </div>
                <div className="p-2 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="font-bold text-emerald-400 block">3. Sheet 'Master_Menu'</span>
                  <span className="text-stone-400">Daftar Menu, Harga Jual, Modal, Stok Realtime</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-stone-400">
                Kode Google Apps Script (Bisa langsung disalin):
              </span>
              <button
                type="button"
                onClick={copyAppsScript}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  copiedCode
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Tersalin!' : 'Salin Semua Kode'}</span>
              </button>
            </div>

            <pre className="p-3.5 bg-stone-950 border border-stone-800 rounded-2xl text-[10px] font-mono text-stone-400 max-h-56 overflow-y-auto whitespace-pre leading-tight">
              {GOOGLE_APPS_SCRIPT_TEMPLATE}
            </pre>
          </div>
          )
        )}

        {/* --- TAB 4: CADANGAN LOKAL JSON & EKSPOR EXCEL --- */}
        {activeTab === 'backup' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            {/* JSON Backup Download (Tersedia untuk Kasir & Owner) */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-sky-800/60 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-950 border border-sky-700/80 text-sky-400 flex items-center justify-center">
                    <FileDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-xs">Cadangkan Semua Data Warung ke File (.json)</h4>
                    <span className="text-[10px] text-sky-300">Format JSON Portabel &amp; Aman</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  Kasir &amp; Owner
                </span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                Menyimpan seluruh master menu, sub-kategori, riwayat transaksi kasir, dan pergerakan mutasi stok ke perangkat Anda sebagai arsip cadangan darurat offline.
              </p>
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-950/40 transition-all active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Cadangan JSON (.json) Sekarang</span>
              </button>
            </div>

            {/* Restore from JSON */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-700/80 text-emerald-400 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-xs">Pulihkan Data dari File Cadangan JSON</h4>
                    <span className="text-[10px] text-stone-400">Kembalikan data dari file cadangan sebelumnya</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Pilih file cadangan JSON yang sebelumnya diunduh untuk mengembalikan data menu, stok, atau riwayat transaksi ke memori perangkat ini.
              </p>
              <label className="w-full py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-2 border border-stone-700 cursor-pointer transition-all active:scale-[0.98]">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Pilih &amp; Pulihkan File Cadangan JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>

            {/* Direct Excel Export */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-xs">Unduh Laporan Excel (.xlsx) Siap Pakai</h4>
                    <span className="text-[10px] text-stone-400">Rekap transaksi &amp; omzet dalam format spreadsheet</span>
                  </div>
                </div>
                {!isOwner && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Khusus Owner
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Rekap lengkap penjualan dan omzet warung seblak yang bisa langsung dibuka di aplikasi Excel laptop / HP.
              </p>
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40 transition-all active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Excel (.xlsx) Transaksi &amp; Omzet</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-stone-800 mt-3 flex items-center justify-between">
          <span className="text-[10px] text-stone-500">
            Terakhir sinkron:{' '}
            {config.lastSyncedAt
              ? new Date(config.lastSyncedAt).toLocaleString('id-ID')
              : 'Belum pernah'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold"
          >
            Tutup
          </button>
        </div>

        {/* --- MODAL POPUP QR CODE KHUSUS HP KARYAWAN --- */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative space-y-3.5 text-center">
              <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                <div className="flex items-center gap-2 text-left">
                  <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-700/60 text-emerald-400 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Scan QR di HP Karyawan</h4>
                    <p className="text-[10px] text-stone-400">Otomatis Terhubung ke Spreadsheet</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQrModal(false)}
                  className="p-1 rounded-lg text-stone-500 hover:text-white hover:bg-stone-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-white rounded-2xl inline-block shadow-xl border border-stone-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(
                    getAutoConnectLink()
                  )}`}
                  alt="QR Code Auto-Connect Spreadsheet"
                  className="w-44 h-44 mx-auto object-contain"
                />
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-bold text-white text-[11px] flex items-center justify-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Arahkan kamera HP karyawan ke kode QR</span>
                </p>
                <p className="text-[10px] text-stone-400 leading-relaxed px-2">
                  HP karyawan akan membuka kasir dan <strong className="text-emerald-400">langsung tersambung ke Google Spreadsheet</strong> warung yang sama tanpa perlu mengetik URL apapun!
                </p>
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyAutoConnect}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 transition-all active:scale-[0.98]"
                >
                  {copiedAutoConnect ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAutoConnect ? 'Tautan Tersalin!' : 'Salin Link Kasir'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
