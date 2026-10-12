import React, { useState } from 'react';
import {
  Printer,
  Bluetooth,
  Share2,
  X,
  CheckCircle2,
  Receipt,
  Download,
} from 'lucide-react';
import { Transaction, StoreProfile, PrinterConfig } from '../types';
import {
  formatRupiah,
  generateEscPosCommands,
  printRawToBluetooth,
  printViaBrowser,
  isBluetoothConnected,
} from '../utils/printer';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  storeProfile: StoreProfile;
  printerConfig: PrinterConfig;
  onOpenPrinterSettings?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  storeProfile,
  printerConfig,
  onOpenPrinterSettings,
}) => {
  const [isPrintingBt, setIsPrintingBt] = useState<boolean>(false);
  const [btStatusMsg, setBtStatusMsg] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const handlePrintBluetooth = async () => {
    if (!isBluetoothConnected()) {
      setBtStatusMsg('Printer Bluetooth belum terhubung! Mengarahkan ke pengaturan printer...');
      setTimeout(() => {
        if (onOpenPrinterSettings) onOpenPrinterSettings();
      }, 1200);
      return;
    }

    try {
      setIsPrintingBt(true);
      setBtStatusMsg('Mengirim data struk ke printer Bluetooth...');
      const bytes = generateEscPosCommands(transaction, storeProfile, printerConfig);
      const res = await printRawToBluetooth(bytes);
      if (res.success) {
        setBtStatusMsg('Struk berhasil dicetak ke printer Bluetooth! 🎉');
      } else {
        setBtStatusMsg(`Gagal cetak: ${res.error}`);
      }
    } catch (err: any) {
      setBtStatusMsg(`Error cetak: ${err.message}`);
    } finally {
      setIsPrintingBt(false);
      setTimeout(() => setBtStatusMsg(null), 3500);
    }
  };

  const handlePrintBrowser = () => {
    printViaBrowser();
  };

  const handleShareWhatsApp = () => {
    const itemsText = transaction.items
      .map(
        i =>
          `• ${i.name} (${i.quantity}x) = ${formatRupiah(i.price * i.quantity)} ${
            i.spicyLevel > 0 ? `[Lvl ${i.spicyLevel}]` : ''
          }`
      )
      .join('%0A');

    const message =
      `*STRUK PEMBELIAN ${storeProfile.name.toUpperCase()}*%0A` +
      `-----------------------------------%0A` +
      `No Struk: ${transaction.receiptNo}%0A` +
      `Tanggal: ${new Date(transaction.createdAt).toLocaleString('id-ID')}%0A` +
      `Pelanggan: ${transaction.customerName} (${transaction.tableOrQueueNo})%0A` +
      `Tipe: ${transaction.orderType}%0A` +
      `-----------------------------------%0A` +
      `${itemsText}%0A` +
      `-----------------------------------%0A` +
      `Subtotal: ${formatRupiah(transaction.subtotal)}%0A` +
      (transaction.discount > 0 ? `Diskon: -${formatRupiah(transaction.discount)}%0A` : '') +
      `*TOTAL: ${formatRupiah(transaction.total)}*%0A` +
      `Metode Bayar: ${transaction.paymentMethod}%0A` +
      `-----------------------------------%0A` +
      `${storeProfile.receiptFooter || 'Terima kasih telah berbelanja di Warung Seblak Cinta!'}`;

    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  const is80mm = printerConfig.paperWidth === '80mm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-500" />
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Struk Transaksi #{transaction.receiptNo}
              </h3>
              <span className="text-[10px] text-stone-400">
                Format Kertas: {printerConfig.paperWidth}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bluetooth Feedback */}
        {btStatusMsg && (
          <div className="my-2 p-2.5 rounded-xl bg-sky-950/90 border border-sky-700/80 text-sky-200 text-xs text-center flex items-center justify-center gap-2">
            <Bluetooth className="w-4 h-4 animate-spin text-sky-400" />
            <span>{btStatusMsg}</span>
          </div>
        )}

        {/* Receipt Preview Box */}
        <div className="flex-1 overflow-y-auto my-3 p-3 sm:p-4 bg-white text-stone-900 rounded-xl font-mono-receipt text-[11px] leading-tight border border-stone-200 shadow-inner">
          {/* Receipt Top Header */}
          <div className="text-center pb-2 border-b border-dashed border-stone-400">
            {printerConfig.printLogo && storeProfile.logoUrl && (
              <div className="w-12 h-12 mx-auto mb-1 flex items-center justify-center">
                <img
                  src={storeProfile.logoUrl}
                  alt={storeProfile.name}
                  className="max-h-full max-w-full object-contain filter grayscale contrast-200"
                />
              </div>
            )}
            <div className="font-black text-sm tracking-wide text-rose-700">
              {storeProfile.name.toUpperCase()}
            </div>
            {storeProfile.slogan && <div className="text-[10px]">{storeProfile.slogan}</div>}
            {printerConfig.printAddress && storeProfile.address && (
              <div className="text-[9px] text-stone-600">{storeProfile.address}</div>
            )}
            {printerConfig.printAddress && storeProfile.phone && (
              <div className="text-[9px] text-stone-600">WA: {storeProfile.phone}</div>
            )}
          </div>

          {/* Meta Info */}
          <div className="py-2 border-b border-dashed border-stone-400 space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span>No: {transaction.receiptNo}</span>
              <span>{transaction.tableOrQueueNo || 'Pelanggan'}</span>
            </div>
            <div className="flex justify-between">
              <span>{new Date(transaction.createdAt).toLocaleDateString('id-ID')}</span>
              <span>{new Date(transaction.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir: {transaction.cashierName}</span>
              <span>{transaction.orderType.includes('Takeaway') ? 'Bungkus' : 'Makan Sini'}</span>
            </div>
          </div>

          {/* Items */}
          <div className="py-2 border-b border-dashed border-stone-400 space-y-1.5">
            {transaction.items.map((it, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-bold">{it.name}</div>
                <div className="flex justify-between text-stone-700">
                  <span>{it.quantity} {it.unit} x {formatRupiah(it.price)}</span>
                  <span>{formatRupiah(it.price * it.quantity)}</span>
                </div>
                {it.spicyLevel > 0 && (
                  <div className="text-[9px] text-red-600">
                    * Pedas Level {it.spicyLevel} ({it.spicyLevelLabel.split('(')[0].trim()})
                  </div>
                )}
                {it.note && (
                  <div className="text-[9px] text-stone-600">
                    * Ket: {it.note}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="py-2 space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatRupiah(transaction.subtotal)}</span>
            </div>
            {transaction.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Diskon:</span>
                <span>-{formatRupiah(transaction.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-xs pt-1 border-t border-stone-300">
              <span>TOTAL:</span>
              <span>{formatRupiah(transaction.total)}</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Bayar ({transaction.paymentMethod}):</span>
              <span>{formatRupiah(transaction.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>Kembalian:</span>
              <span>{formatRupiah(transaction.changeAmount)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-2 border-t border-dashed border-stone-400 text-[10px] text-stone-600">
            {printerConfig.printFooter && storeProfile.receiptFooter && (
              <div>{storeProfile.receiptFooter}</div>
            )}
            <div>Terima Kasih Atas Kunjungannya!</div>
            {storeProfile.instagram && <div>IG: {storeProfile.instagram}</div>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-stone-800">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isPrintingBt}
              onClick={handlePrintBluetooth}
              className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-950/40 transition-all"
              title="Cetak langsung ke printer bluetooth thermal kasir"
            >
              <Bluetooth className="w-4 h-4" />
              <span>Cetak Bluetooth</span>
            </button>

            <button
              type="button"
              onClick={handlePrintBrowser}
              className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-stone-700 transition-colors"
              title="Cetak via dialog printer browser (USB / WiFi / PDF)"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Cetak Thermal ({printerConfig.paperWidth})</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="py-2 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Kirim WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs flex items-center justify-center"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
