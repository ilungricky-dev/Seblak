import React from 'react';
import { Transaction, StoreProfile, PrinterConfig } from '../types';
import { formatRupiah } from '../utils/printer';

interface ThermalReceiptPrintAreaProps {
  transaction: Transaction | null;
  profile: StoreProfile;
  config: PrinterConfig;
}

export const ThermalReceiptPrintArea: React.FC<ThermalReceiptPrintAreaProps> = ({
  transaction,
  profile,
  config,
}) => {
  if (!transaction || !transaction.items || transaction.items.length === 0) return null;

  const is80mm = config.paperWidth === '80mm';
  const widthStyle = is80mm ? 'max-w-[72mm]' : 'max-w-[48mm]';

  return (
    <div
      id="thermal-receipt-print-area"
      className={`hidden print:block mx-auto bg-white text-black font-mono-receipt text-[11px] leading-tight select-none ${widthStyle}`}
    >
      {/* Header */}
      <div className="text-center pb-2 border-b border-dashed border-black">
        {config.printLogo && profile.logoUrl && (
          <div className="w-12 h-12 mx-auto mb-1 flex items-center justify-center">
            <img
              src={profile.logoUrl}
              alt={profile.name}
              className="max-h-full max-w-full object-contain filter grayscale contrast-200"
            />
          </div>
        )}
        <div className="font-black text-sm tracking-wide">
          {profile.name.toUpperCase()}
        </div>
        {profile.slogan && <div className="text-[10px]">{profile.slogan}</div>}
        {config.printAddress && profile.address && (
          <div className="text-[9px]">{profile.address}</div>
        )}
        {config.printAddress && profile.phone && (
          <div className="text-[9px]">Telp/WA: {profile.phone}</div>
        )}
      </div>

      {/* Meta Info */}
      <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
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

      {/* Item List */}
      <div className="py-2 border-b border-dashed border-black space-y-1.5">
        {transaction.items.map((it, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="font-bold">{it.name}</div>
            <div className="flex justify-between text-[10px]">
              <span>{it.quantity} {it.unit} x {formatRupiah(it.price)}</span>
              <span>{formatRupiah(it.price * it.quantity)}</span>
            </div>
            {it.spicyLevel > 0 && (
              <div className="text-[9px]">
                * Pedas Level {it.spicyLevel} ({it.spicyLevelLabel.split('(')[0].trim()})
              </div>
            )}
            {it.note && (
              <div className="text-[9px]">
                * Ket: {it.note}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="py-2 border-b border-dashed border-black space-y-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatRupiah(transaction.subtotal)}</span>
        </div>
        {transaction.discount > 0 && (
          <div className="flex justify-between">
            <span>Diskon:</span>
            <span>-{formatRupiah(transaction.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-xs pt-1 border-t border-black">
          <span>TOTAL:</span>
          <span>{formatRupiah(transaction.total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Bayar ({transaction.paymentMethod}):</span>
          <span>{formatRupiah(transaction.paidAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Kembalian:</span>
          <span>{formatRupiah(transaction.changeAmount)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-2 space-y-1 text-[10px]">
        {config.printFooter && profile.receiptFooter && (
          <div>{profile.receiptFooter}</div>
        )}
        <div>Terima Kasih Atas Kunjungan Anda!</div>
        {profile.instagram && <div>IG: {profile.instagram}</div>}
      </div>

      {/* Feed spacing */}
      <div style={{ height: `${(config.feedLines || 2) * 8}mm` }}></div>
    </div>
  );
};
