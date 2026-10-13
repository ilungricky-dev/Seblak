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
} from 'lucide-react';
import { SpreadsheetConfig, Employee } from '../types';
import {
  syncWithGoogleSheets,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  validateSpreadsheetUrl,
  testSpreadsheetConnection,
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
} from '../utils/storage';
import { exportSalesReportToExcel } from '../utils/reports';

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

  const [config, setConfig] = useState<SpreadsheetConfig>(getSpreadsheetConfig());
  const [activeTab, setActiveTab] = useState<'guide' | 'sync' | 'code' | 'backup'>(() =>
    isOwner ? 'guide' : 'sync'
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isTestingUrl, setIsTestingUrl] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // If not owner, ensure tab defaults to 'sync'
  useEffect(() => {
    if (isOpen) {
      if (!isOwner && activeTab !== 'sync') {
        setActiveTab('sync');
      }
    }
  }, [isOpen, isOwner]);

  if (!isOpen) return null;

  const urlValidation = validateSpreadsheetUrl(config.webAppUrl);

  const handleSaveConfig = () => {
    if (!isOwner) {
      alert('Akses Dibatasi: Hanya akun Owner yang dapat mengubah konfigurasi URL Spreadsheet.');
      return;
    }
    saveSpreadsheetConfig(config);
    setSyncFeedback({ type: 'success', text: 'URL Spreadsheet berhasil disimpan!' });
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handleTestConnection = async () => {
    setIsTestingUrl(true);
    setTestResult(null);
    try {
      const res = await testSpreadsheetConnection(config.webAppUrl);
      setTestResult(res);
      if (res.success && isOwner) {
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

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const result = await syncWithGoogleSheets();
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
    }
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

  // Local JSON Backup Download (Khusus Owner)
  const handleExportBackup = () => {
    if (!isOwner) {
      alert('Akses Dibatasi: Pencadangan data warung hanya untuk akun Owner.');
      return;
    }
    const backupData = {
      exportedAt: new Date().toISOString(),
      storeProfile: JSON.parse(localStorage.getItem('seblak_store_profile') || '{}'),
      menuItems: getMenuItems(),
      stockMovements: getStockMovements(),
      transactions: getTransactions(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Seblak_Cinta_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to Excel directly (Khusus Owner)
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

  // Import Backup (Khusus Owner)
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwner) {
      alert('Akses Dibatasi: Pemulihan data hanya untuk akun Owner.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.menuItems && Array.isArray(parsed.menuItems)) {
          saveMenuItems(parsed.menuItems);
        }
        if (parsed.transactions && Array.isArray(parsed.transactions)) {
          saveTransactions(parsed.transactions);
        }
        if (parsed.stockMovements && Array.isArray(parsed.stockMovements)) {
          saveStockMovements(parsed.stockMovements);
        }
        broadcastChange('ALL');
        alert('Cadangan data berhasil dipulihkan!');
        onSyncCompleted();
        onClose();
      } catch {
        alert('File JSON tidak valid!');
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
            <BookOpen className="w-3.5 h-3.5" />
            <span>1. Panduan Langkah</span>
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
            <span>4. Ekspor Excel</span>
            {!isOwner && <Lock className="w-2.5 h-2.5 text-amber-400" />}
          </button>
        </div>

        {/* --- TAB 1: PANDUAN LANGKAH SINKRONISASI --- */}
        {activeTab === 'guide' && (
          !isOwner ? (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-3.5 bg-stone-950/70 border border-stone-800 rounded-2xl animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-white flex items-center justify-center gap-2">
                  <span>Panduan Langkah Integrasi</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    Khusus Owner
                  </span>
                </h4>
                <p className="text-xs text-stone-400 max-w-md leading-relaxed mx-auto">
                  Panduan langkah integrasi Google Spreadsheet &amp; deployment Web App hanya dapat diakses oleh akun <strong className="text-white">Owner (Pemilik Warung)</strong> demi menjaga keamanan konfigurasi cabang.
                </p>
              </div>
              <div className="text-[11px] text-stone-400 bg-stone-900/90 px-3.5 py-1.5 rounded-xl border border-stone-800 flex items-center gap-1.5">
                <span>Akun Aktif:</span>
                <span className="text-stone-200 font-bold">{effectiveEmployee?.name || 'Staf'}</span>
                <span className="text-amber-400/90 font-mono">({effectiveEmployee?.role || 'Bukan Owner'})</span>
              </div>
              <p className="text-[10px] text-stone-500 max-w-sm">
                Hubungi Owner warung jika Anda perlu melihat panduan pengaturan spreadsheet baru.
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
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-950/40 to-stone-950 border border-rose-900/40 flex items-start gap-3">
              <span className="text-xl">🚀</span>
              <div>
                <h4 className="font-bold text-white text-xs">
                  5 Langkah Cepat Menghubungkan Google Spreadsheet
                </h4>
                <p className="text-[11px] text-stone-300 mt-0.5 leading-relaxed">
                  Cukup ikuti langkah bernomor berikut sekali saja. Semua transaksi dan mutasi stok warung akan langsung tercatat rapi di Google Drive Anda.
                </p>
              </div>
            </div>

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
                  <span>Buka sheets.new (Klik)</span>
                </a>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed pl-8">
                Buka tab baru atau klik tombol di atas. Beri nama spreadsheet Anda, misalnya:{' '}
                <strong className="text-stone-200">"Laporan Kasir Seblak Cinta"</strong>.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-extrabold flex items-center justify-center text-xs">
                  2
                </span>
                <span className="font-extrabold text-white text-xs">
                  Buka Menu Ekstensi &gt; Apps Script
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed pl-8">
                Di Google Sheets, klik menu bilah atas:{' '}
                <strong className="text-stone-200">Ekstensi (Extensions)</strong> &gt;{' '}
                <strong className="text-stone-200">Apps Script</strong>. Jendela editor kode Google akan terbuka.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-extrabold flex items-center justify-center text-xs">
                    3
                  </span>
                  <span className="font-extrabold text-white text-xs">
                    Hapus Kode Bawaan &amp; Tempel Kode Script
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyAppsScript}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    copiedCode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Kode Tersalin!' : 'Salin Kode Script'}</span>
                </button>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed pl-8">
                Hapus teks <code className="text-stone-300 bg-stone-900 px-1 rounded">function myFunction()</code> di editor Apps Script, lalu <strong>Tempel (Ctrl+V / Paste)</strong> kode yang disalin. Kemudian klik ikon disket <strong>Simpan (Ctrl+S)</strong>.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-rose-900/50 bg-rose-950/20 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-extrabold flex items-center justify-center text-xs">
                  4
                </span>
                <span className="font-extrabold text-white text-xs">
                  Terapkan (Deploy) Sebagai Aplikasi Web <span className="text-rose-400 font-bold">(PENTING!)</span>
                </span>
              </div>
              <div className="pl-8 text-[11px] text-stone-300 space-y-1.5 leading-relaxed">
                <div>Klik tombol biru di kanan atas Apps Script: <strong>Terapkan (Deploy)</strong> &gt; <strong>Penerapan baru (New deployment)</strong>.</div>
                <div className="p-2 rounded-xl bg-stone-900/90 border border-stone-800 space-y-1 font-mono text-[10px]">
                  <div>• Jenis penerapan: <strong>Aplikasi Web (Web App)</strong></div>
                  <div>• Jalankan sebagai: <strong>Saya (Akun Anda)</strong></div>
                  <div className="text-emerald-400 font-bold">
                    • Yang memiliki akses: <u>Siapa saja (Anyone)</u>
                  </div>
                </div>
                <p className="text-amber-300 text-[10px]">
                  ⚠️ PENTING: Pilihan akses <strong>WAJIB "Siapa saja (Anyone)"</strong> agar aplikasi kasir dapat mengirim data tanpa terblokir proteksi Google.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-extrabold flex items-center justify-center text-xs">
                  5
                </span>
                <span className="font-extrabold text-white text-xs">
                  Salin URL Aplikasi Web &amp; Tempel di Tab "Koneksi"
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed pl-8">
                Setelah klik Terapkan, Google akan memberikan URL yang berakhiran <code className="text-emerald-400 font-mono font-bold">/exec</code>. Salin link tersebut dan tempelkan di tab <strong>"2. Koneksi &amp; Sinkron"</strong> aplikasi ini!
              </p>
              <div className="pl-8 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('sync')}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md"
                >
                  <span>Buka Tab Koneksi &amp; Tempel URL</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
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

            {/* Non-Owner Staff Notice */}
            {!isOwner && (
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/70 text-amber-200 text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block text-amber-300">Akses Staf / Admin: Khusus Sinkronisasi</span>
                  <span className="text-[11px] text-stone-300">
                    Anda dapat melakukan tes koneksi dan menyinkronkan data transaksi ke Google Spreadsheet. Panduan langkah, kode skrip integrasi Web App, dan ekspor file Excel hanya dapat diakses oleh akun <strong className="text-white">Owner</strong>.
                  </span>
                </div>
              </div>
            )}

            {/* URL input field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-300 block">
                  URL Google Apps Script Web App: <span className="text-rose-500">*</span>
                  {!isOwner && <span className="ml-2 text-[10px] text-amber-400 font-mono font-normal">(Dikelola Owner)</span>}
                </label>
                {isOwner && config.webAppUrl && (
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, webAppUrl: '' })}
                    className="text-[10px] text-stone-500 hover:text-red-400"
                  >
                    Hapus URL
                  </button>
                )}
              </div>

              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={config.webAppUrl}
                readOnly={!isOwner}
                onChange={e => {
                  if (!isOwner) return;
                  setConfig({ ...config, webAppUrl: e.target.value.trim() });
                  setTestResult(null);
                }}
                className={`w-full px-3 py-2.5 bg-stone-950 border rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none font-mono ${
                  !isOwner ? 'opacity-80 bg-stone-900/60 cursor-not-allowed' : ''
                } ${
                  urlValidation.warning
                    ? 'border-amber-600 focus:border-amber-500'
                    : 'border-stone-800 focus:border-emerald-500'
                }`}
              />

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
                {!isOwner
                  ? 'URL Web App ini diatur oleh Owner. Anda dapat melakukan pengujian koneksi dan sinkronisasi di bawah.'
                  : 'Format yang benar berakhiran /exec. Contoh: https://script.google.com/macros/s/AKfycb.../exec'}
              </p>
            </div>

            {/* Test Connection Button & Result */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isTestingUrl || !config.webAppUrl || !isOnline}
                onClick={handleTestConnection}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  !config.webAppUrl || isTestingUrl || !isOnline
                    ? 'bg-stone-950 border-stone-800 text-stone-600 cursor-not-allowed'
                    : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200'
                }`}
              >
                <Play className={`w-3.5 h-3.5 ${isTestingUrl ? 'animate-spin' : ''}`} />
                <span>{isTestingUrl ? 'Menguji...' : 'Tes Koneksi URL'}</span>
              </button>

              {isOwner && (
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-bold transition-all"
                >
                  Simpan URL
                </button>
              )}
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

            {/* Auto sync switch */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-stone-800">
              <div>
                <span className="text-xs font-bold text-white block">Sinkronisasi Otomatis di Latar Belakang</span>
                <span className="text-[10px] text-stone-400">
                  Otomatis kirim data transaksi &amp; mutasi setiap 30 detik saat terhubung internet
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
                className="w-4 h-4 accent-emerald-500 rounded"
              />
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

            {/* Trigger Sync Main Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isSyncing || !isOnline || !config.webAppUrl}
                onClick={handleTriggerSync}
                className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isSyncing || !isOnline || !config.webAppUrl
                    ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700/50'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 active:scale-[0.99]'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sedang Menyinkronkan ke Spreadsheet...' : 'Sinkronkan Sekarang ke Google Spreadsheet'}</span>
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

        {/* --- TAB 4: CADANGAN LOKAL & EKSPOR EXCEL --- */}
        {activeTab === 'backup' && (
          !isOwner ? (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-3.5 bg-stone-950/70 border border-stone-800 rounded-2xl animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-white flex items-center justify-center gap-2">
                  <span>Ekspor Excel &amp; Cadangan Data</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    Khusus Owner
                  </span>
                </h4>
                <p className="text-xs text-stone-400 max-w-md leading-relaxed mx-auto">
                  Fitur unduh laporan Excel (.xlsx) dan pencadangan data lokal warung seblak hanya dapat diakses oleh akun <strong className="text-white">Owner (Pemilik Warung)</strong> demi menjaga kerahasiaan omzet dan data penjualan.
                </p>
              </div>
              <div className="text-[11px] text-stone-400 bg-stone-900/90 px-3.5 py-1.5 rounded-xl border border-stone-800 flex items-center gap-1.5">
                <span>Akun Aktif:</span>
                <span className="text-stone-200 font-bold">{effectiveEmployee?.name || 'Staf'}</span>
                <span className="text-amber-400/90 font-mono">({effectiveEmployee?.role || 'Bukan Owner'})</span>
              </div>
              <p className="text-[10px] text-stone-500 max-w-sm">
                Hubungi Owner warung jika Anda membutuhkan file ekspor rekapan dalam format Microsoft Excel.
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
            {/* Direct Excel Export */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-white text-xs">Unduh Laporan Excel (.xlsx) Siap Pakai</h4>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Ingin langsung melihat rekap di laptop atau kirim file ke akuntan tanpa setting Google Apps Script? Unduh file Excel langsung:
              </p>
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Excel (.xlsx) Transaksi &amp; Omzet</span>
              </button>
            </div>

            {/* JSON Backup Download */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <h4 className="font-bold text-white text-xs">Cadangkan Semua Data Warung ke File (.json)</h4>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Menyimpan seluruh master menu, transaksi, dan riwayat mutasi stok ke perangkat Anda sebagai arsip cadangan darurat offline.
              </p>
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-950/40 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Cadangan JSON (.json)</span>
              </button>
            </div>

            {/* Restore from JSON */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <h4 className="font-bold text-white text-xs">Pulihkan Data dari File Cadangan</h4>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Impor file cadangan JSON yang sebelumnya diunduh untuk mengembalikan data warung seblak.
              </p>
              <label className="w-full py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-2 border border-stone-700 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Pilih File Cadangan JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )
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
      </div>
    </div>
  );
};
