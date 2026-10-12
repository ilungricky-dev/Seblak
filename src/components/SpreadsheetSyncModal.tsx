import React, { useState } from 'react';
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
} from 'lucide-react';
import { SpreadsheetConfig } from '../types';
import { syncWithGoogleSheets, GOOGLE_APPS_SCRIPT_TEMPLATE } from '../utils/sheetsSync';
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
} from '../utils/storage';

interface SpreadsheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  pendingSyncCount: number;
  onSyncCompleted: () => void;
}

export const SpreadsheetSyncModal: React.FC<SpreadsheetSyncModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  pendingSyncCount,
  onSyncCompleted,
}) => {
  const [config, setConfig] = useState<SpreadsheetConfig>(getSpreadsheetConfig());
  const [activeTab, setActiveTab] = useState<'sync' | 'code' | 'backup'>('sync');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    saveSpreadsheetConfig(config);
    setSyncFeedback({ type: 'success', text: 'Konfigurasi Spreadsheet disimpan!' });
    setTimeout(() => setSyncFeedback(null), 3000);
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
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Local JSON Backup Download
  const handleExportBackup = () => {
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

  // Import Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      } catch (err: any) {
        alert('File JSON tidak valid!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-base text-white">
              Sinkronisasi Google Spreadsheet Real-Time
            </h3>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 my-3 p-1 rounded-xl bg-stone-950 border border-stone-800">
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'sync'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Koneksi & Sinkron
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'code'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Kode Script (Siap Pakai)
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'backup'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Cadangan Lokal (.json)
          </button>
        </div>

        {/* TAB 1: KONEKSI & SINKRON */}
        {activeTab === 'sync' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Status cards */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                  isOnline
                    ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-700/60 text-amber-300'
                }`}
              >
                {isOnline ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-amber-400" />}
                <div>
                  <span className="text-[10px] text-stone-400 block">Status Jaringan:</span>
                  <span className="text-xs font-bold">{isOnline ? 'Online (Terhubung)' : 'Mode Offline Aktif'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-sky-400" />
                <div>
                  <span className="text-[10px] text-stone-400 block">Antrean Belum Sinkron:</span>
                  <span className="text-xs font-bold text-white">
                    {pendingSyncCount} transaksi / mutasi
                  </span>
                </div>
              </div>
            </div>

            {/* Offline Mode explanation */}
            <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 text-[11px] text-stone-400 leading-relaxed">
              💡 <span className="font-bold text-stone-200">Dukungan Mode Offline:</span> Anda tetap dapat bertransaksi, mencetak struk, dan mengubah stok tanpa internet. Semua data disimpan aman di HP dan akan otomatis disinkronkan saat terhubung kembali!
            </div>

            {/* Feedback message */}
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

            {/* URL Web App input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-300 block">
                URL Google Apps Script Web App:
              </label>
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                value={config.webAppUrl}
                onChange={e => setConfig({ ...config, webAppUrl: e.target.value })}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <p className="text-[10px] text-stone-500">
                Tempel URL hasil deploy Google Apps Script spreadsheet Anda di sini.
              </p>
            </div>

            {/* Auto sync switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800">
              <div>
                <span className="text-xs font-bold text-white block">Sinkronisasi Otomatis</span>
                <span className="text-[10px] text-stone-400">
                  Otomatis kirim data setiap 30 detik saat online
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.autoSync}
                onChange={e => setConfig({ ...config, autoSync: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </div>

            {/* Sync Trigger Action */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveConfig}
                className="flex-1 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 transition-colors"
              >
                Simpan URL
              </button>

              <button
                type="button"
                disabled={isSyncing || !isOnline}
                onClick={handleTriggerSync}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isSyncing || !isOnline
                    ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: KODE SCRIPT GOOGLE APPS SCRIPT */}
        {activeTab === 'code' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 space-y-1.5 leading-relaxed text-[11px]">
              <span className="font-bold text-white block text-xs">
                Cara Menghubungkan Google Sheet:
              </span>
              <ol className="list-decimal list-inside space-y-1 text-stone-400">
                <li>Buka Google Sheets baru di browser: <span className="text-emerald-400 font-mono">sheets.new</span></li>
                <li>Klik menu <span className="text-white font-semibold">Ekstensi</span> &gt; <span className="text-white font-semibold">Apps Script</span>.</li>
                <li>Hapus semua teks, lalu klik tombol <span className="text-rose-400 font-bold">Salin Kode</span> di bawah dan tempelkan.</li>
                <li>Klik <span className="text-white font-semibold">Terapkan (Deploy)</span> &gt; <span className="text-white font-semibold">Penerapan Baru</span> &gt; Jenis: <span className="text-white font-semibold">Aplikasi Web</span>.</li>
                <li>Akses: <span className="text-emerald-400 font-bold">Siapa Saja (Anyone)</span>, lalu klik Terapkan.</li>
                <li>Salin URL Aplikasi Web dan tempelkan di tab "Koneksi" aplikasi ini!</li>
              </ol>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-stone-400">Kode Google Apps Script:</span>
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
                <span>{copiedCode ? 'Tersalin!' : 'Salin Kode Script'}</span>
              </button>
            </div>

            <pre className="p-3 bg-stone-950 border border-stone-800 rounded-xl text-[10px] font-mono text-stone-400 max-h-48 overflow-y-auto whitespace-pre leading-tight">
              {GOOGLE_APPS_SCRIPT_TEMPLATE}
            </pre>
          </div>
        )}

        {/* TAB 3: BACKUP & RESTORE LOKAL */}
        {activeTab === 'backup' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <h4 className="font-bold text-white text-xs">Cadangkan Data Warung ke File (.json)</h4>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Unduh salinan lengkap semua menu, transaksi, dan riwayat mutasi stok ke perangkat Anda sebagai file cadangan offline.
              </p>
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-950/40 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Cadangan (.json)</span>
              </button>
            </div>

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
        )}

        <div className="pt-3 border-t border-stone-800 mt-3 text-right">
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
