import React, { useState } from 'react';
import {
  X,
  Smartphone,
  QrCode,
  Copy,
  Check,
  Share2,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Wifi,
  FileSpreadsheet,
} from 'lucide-react';
import { getSpreadsheetConfig } from '../utils/storage';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName?: string;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
  appName = 'Warung Seblak "Cinta"',
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [includeSpreadsheet, setIncludeSpreadsheet] = useState<boolean>(true);

  if (!isOpen) return null;

  const spreadsheetConfig = getSpreadsheetConfig();
  const hasSpreadsheet = Boolean(spreadsheetConfig?.webAppUrl);

  // Use the canonical production shared URL, or fallback to current origin if in web view
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const defaultLiveUrl = 'https://ais-pre-piptb5atesjniopug2utxd-592454551214.asia-east1.run.app';
  
  // Choose the best base link to share
  const baseShareUrl =
    currentOrigin && !currentOrigin.includes('localhost') && !currentOrigin.includes('127.0.0.1')
      ? currentOrigin
      : defaultLiveUrl;

  // Final URL with auto-connect parameter if spreadsheet is enabled
  const shareUrl =
    hasSpreadsheet && includeSpreadsheet
      ? `${baseShareUrl}?sheetsUrl=${encodeURIComponent(spreadsheetConfig.webAppUrl)}`
      : baseShareUrl;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
    shareUrl
  )}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleWhatsAppShare = () => {
    const sheetNote =
      hasSpreadsheet && includeSpreadsheet
        ? '\n\n✅ Link ini sudah otomatis terhubung ke Google Spreadsheet Warung!'
        : '';
    const message = `Halo! Ini link untuk buka Aplikasi Kasir POS ${appName} di HP:\n\n${shareUrl}${sheetNote}\n\nSilakan buka di Google Chrome atau Safari HP kamu, lalu masukkan PIN staf masing-masing.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Buka di HP Lain</h3>
              <p className="text-[11px] text-stone-400">Scan QR Code atau salin link aplikasi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Section */}
        <div className="my-4 text-center">
          <div className="inline-block p-3.5 bg-white rounded-2xl shadow-xl shadow-black/60 border border-stone-200">
            <img
              src={qrImageUrl}
              alt="QR Code Aplikasi Kasir"
              className="w-48 h-48 sm:w-56 sm:h-56 mx-auto object-contain"
              loading="lazy"
            />
          </div>

          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-stone-300 font-semibold">
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Arahkan kamera HP lain ke kode QR di atas</span>
          </div>
        </div>

        {/* Link Box */}
        <div className="space-y-3">
          {hasSpreadsheet && (
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/70 flex items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold text-emerald-300 block truncate">
                    Tautkan Spreadsheet Otomatis (Auto-Connect)
                  </span>
                  <span className="text-[10px] text-stone-400 block leading-tight">
                    HP karyawan otomatis tersambung ke Google Spreadsheet saat link dibuka
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeSpreadsheet}
                onChange={e => setIncludeSpreadsheet(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
              Link Web Kasir {hasSpreadsheet && includeSpreadsheet ? '(Dengan Auto-Connect Spreadsheet)' : ''}:
            </label>
            <div className="flex items-center gap-2 bg-stone-950 border border-stone-800 rounded-xl p-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-transparent text-xs text-emerald-400 font-mono outline-none truncate select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Kirim WhatsApp</span>
            </button>

            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs border border-stone-700 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka di Tab Baru</span>
            </a>
          </div>

          {/* Helpful Tips Guide */}
          <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800/80 space-y-2 text-[11px] text-stone-400">
            <div className="flex items-center gap-1.5 font-bold text-stone-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Tips Penggunaan di HP Kasir / Karyawan:</span>
            </div>
            <ul className="space-y-1.5 pl-4 list-disc text-stone-400">
              <li>
                <strong className="text-stone-300">Bisa Dibuka di Banyak HP:</strong> Owner, kasir, koki dapur, atau pelayan bisa membuka web ini bersamaan di HP masing-masing.
              </li>
              <li>
                <strong className="text-stone-300">Pasang ke Layar Utama (PWA):</strong> Buka link di Chrome/Safari HP, tekan menu titik tiga lalu pilih <span className="text-amber-400 font-semibold">"Tambahkan ke Layar Utama"</span> agar muncul seperti aplikasi di HP.
              </li>
              <li>
                <strong className="text-stone-300">Keamanan PIN:</strong> Setiap staf masuk menggunakan PIN masing-masing dan hanya melihat menu yang diizinkan oleh Owner.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
