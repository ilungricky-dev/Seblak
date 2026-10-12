import React, { useState } from 'react';
import {
  Printer,
  Bluetooth,
  CheckCircle2,
  AlertCircle,
  Scissors,
  FileText,
  RefreshCw,
  X,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { PrinterConfig, StoreProfile, PaperWidth } from '../types';
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  isBluetoothConnected,
  getConnectedDeviceName,
  isBluetoothSupported,
  printRawToBluetooth,
  printViaBrowser,
  generateEscPosCommands,
} from '../utils/printer';
import { savePrinterConfig } from '../utils/storage';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PrinterConfig;
  storeProfile: StoreProfile;
  onConfigUpdated: (newConfig: PrinterConfig) => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  storeProfile,
  onConfigUpdated,
}) => {
  const [paperWidth, setPaperWidth] = useState<PaperWidth>(config.paperWidth);
  const [connectionType, setConnectionType] = useState<'bluetooth' | 'browser'>(config.connectionType);
  const [autoCut, setAutoCut] = useState<boolean>(config.autoCut);
  const [feedLines, setFeedLines] = useState<number>(config.feedLines);
  const [printLogo, setPrintLogo] = useState<boolean>(config.printLogo);
  const [printAddress, setPrintAddress] = useState<boolean>(config.printAddress);
  const [printFooter, setPrintFooter] = useState<boolean>(config.printFooter);

  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [btStatusMsg, setBtStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [connectedName, setConnectedName] = useState<string | null>(getConnectedDeviceName());

  if (!isOpen) return null;

  const handleConnectBt = async () => {
    setIsConnecting(true);
    setBtStatusMsg(null);
    try {
      const res = await connectBluetoothPrinter();
      if (res.success) {
        setConnectedName(res.deviceName);
        setConnectionType('bluetooth');
        setBtStatusMsg({
          type: 'success',
          text: `Berhasil terhubung ke "${res.deviceName}"! Siap cetak langsung.`,
        });
      } else {
        setBtStatusMsg({
          type: 'error',
          text: res.error || 'Gagal menyambungkan perangkat Bluetooth.',
        });
      }
    } catch (err: any) {
      setBtStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectBt = async () => {
    await disconnectBluetoothPrinter();
    setConnectedName(null);
    setBtStatusMsg({ type: 'success', text: 'Koneksi printer Bluetooth diputuskan.' });
  };

  const handleSave = () => {
    const newConfig: PrinterConfig = {
      paperWidth,
      connectionType,
      autoCut,
      feedLines,
      printLogo,
      printAddress,
      printFooter,
      connectedDeviceName: connectedName || undefined,
    };
    savePrinterConfig(newConfig);
    onConfigUpdated(newConfig);
    onClose();
  };

  const handleTestPrint = async () => {
    // Generate dummy transaction for test
    const dummyTx = {
      id: 'test-1',
      receiptNo: 'TES-001',
      customerName: 'Pelanggan Uji Coba',
      tableOrQueueNo: 'Meja 01',
      orderType: 'Dine-in (Makan Sini)' as any,
      items: [
        {
          id: 'item-test-1',
          menuItemId: 'm1',
          name: 'Seblak Spesial Cinta',
          price: 18000,
          costPrice: 10000,
          quantity: 1,
          spicyLevel: 3,
          spicyLevelLabel: 'Level 3: Kasmaran',
          note: 'Kuah Nyemek (Uji Coba)',
          unit: 'Porsi' as any,
        },
        {
          id: 'item-test-2',
          menuItemId: 'm2',
          name: 'Es Teh Manis Jumbo',
          price: 4000,
          costPrice: 1500,
          quantity: 1,
          spicyLevel: 0,
          spicyLevelLabel: '',
          note: '',
          unit: 'Gelas' as any,
        },
      ],
      subtotal: 22000,
      discount: 0,
      total: 22000,
      paidAmount: 50000,
      changeAmount: 28000,
      paymentMethod: 'Tunai' as any,
      cashierName: storeProfile.defaultCashier || 'Kasir',
      createdAt: new Date().toISOString(),
    };

    if (connectionType === 'bluetooth' && isBluetoothConnected()) {
      try {
        const bytes = generateEscPosCommands(dummyTx, storeProfile, {
          paperWidth,
          connectionType,
          autoCut,
          feedLines,
          printLogo,
          printAddress,
          printFooter,
        });
        const res = await printRawToBluetooth(bytes);
        if (res.success) {
          alert('Uji cetak Bluetooth terkirim ke printer!');
        } else {
          alert(`Gagal cetak: ${res.error}`);
        }
      } catch (e: any) {
        alert(`Error cetak: ${e.message}`);
      }
    } else {
      printViaBrowser();
    }
  };

  const isConnected = isBluetoothConnected();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-sky-400" />
            <h3 className="font-extrabold text-base text-white">
              Pengaturan Printer Thermal & Bluetooth
            </h3>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bluetooth Device Connection Card */}
        <div className="my-4 p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bluetooth className={`w-5 h-5 ${isConnected ? 'text-sky-400' : 'text-stone-500'}`} />
              <div>
                <h4 className="text-xs font-bold text-white">Printer Bluetooth Thermal</h4>
                <p className="text-[10px] text-stone-400">
                  {isConnected
                    ? `Tersambung ke: ${connectedName || 'Thermal Printer'}`
                    : 'Belum ada printer Bluetooth tersambung'}
                </p>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                isConnected
                  ? 'bg-sky-950 text-sky-300 border-sky-700 animate-pulse'
                  : 'bg-stone-800 text-stone-400 border-stone-700'
              }`}
            >
              {isConnected ? 'Tersambung' : 'Terputus'}
            </span>
          </div>

          {btStatusMsg && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                btStatusMsg.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-200'
                  : 'bg-red-950/80 border border-red-700 text-red-200'
              }`}
            >
              {btStatusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <span>{btStatusMsg.text}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {!isConnected ? (
              <button
                type="button"
                disabled={isConnecting}
                onClick={handleConnectBt}
                className="flex-1 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-950/40 transition-all"
              >
                <Bluetooth className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                <span>{isConnecting ? 'Mencari Perangkat...' : 'Hubungkan Printer Bluetooth'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDisconnectBt}
                className="flex-1 py-2 px-3 rounded-xl bg-stone-800 hover:bg-red-950 text-stone-300 hover:text-red-300 font-semibold text-xs border border-stone-700 transition-colors"
              >
                Putuskan Koneksi Bluetooth
              </button>
            )}
          </div>
          <p className="text-[10px] text-stone-500">
            Mendukung printer thermal kasir ESC/POS portabel seperti GOOJPRT, Panda, RPP02N, Zjiang, MPT-II via Bluetooth.
          </p>
        </div>

        {/* Paper Size Setting */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-stone-300 block mb-2">
              Ukuran Lebar Kertas Struk:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  paperWidth === '58mm'
                    ? 'bg-sky-950/40 border-sky-500 text-white shadow-md'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">58 mm (Standar)</span>
                  {paperWidth === '58mm' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                </div>
                <p className="text-[10px] text-stone-400">
                  Untuk printer mini thermal bluetooth portabel (lebar ~32 karakter).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  paperWidth === '80mm'
                    ? 'bg-sky-950/40 border-sky-500 text-white shadow-md'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">80 mm (Besar)</span>
                  {paperWidth === '80mm' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                </div>
                <p className="text-[10px] text-stone-400">
                  Untuk printer kasir desktop roll besar (lebar ~48 karakter).
                </p>
              </button>
            </div>
          </div>

          {/* Print Options Switches */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-stone-950 border border-stone-800">
            <span className="text-xs font-bold text-stone-300 block mb-1">
              Opsi Elemen Struk:
            </span>

            <label className="flex items-center justify-between py-1 cursor-pointer text-xs text-stone-300">
              <span>Cetak Nama & Logo Warung di Header</span>
              <input
                type="checkbox"
                checked={printLogo}
                onChange={e => setPrintLogo(e.target.checked)}
                className="w-4 h-4 accent-sky-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer text-xs text-stone-300">
              <span>Cetak Alamat & Nomor Kontak</span>
              <input
                type="checkbox"
                checked={printAddress}
                onChange={e => setPrintAddress(e.target.checked)}
                className="w-4 h-4 accent-sky-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer text-xs text-stone-300">
              <span>Cetak Catatan Kaki / Ucapan Terima Kasih</span>
              <input
                type="checkbox"
                checked={printFooter}
                onChange={e => setPrintFooter(e.target.checked)}
                className="w-4 h-4 accent-sky-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer text-xs text-stone-300">
              <span>Potong Kertas Otomatis (Auto Cut ESC/POS)</span>
              <input
                type="checkbox"
                checked={autoCut}
                onChange={e => setAutoCut(e.target.checked)}
                className="w-4 h-4 accent-sky-500 rounded"
              />
            </label>

            <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 text-xs text-stone-300">
              <span>Jarak Spasi Kertas (Feed Lines):</span>
              <select
                value={feedLines}
                onChange={e => setFeedLines(Number(e.target.value))}
                className="px-2 py-1 bg-stone-900 border border-stone-800 rounded-lg text-xs text-white"
              >
                <option value={2}>2 Baris</option>
                <option value={3}>3 Baris (Standar)</option>
                <option value={4}>4 Baris</option>
              </select>
            </div>
          </div>

          {/* Test Print Button */}
          <button
            type="button"
            onClick={handleTestPrint}
            className="w-full py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center gap-2 border border-stone-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Cetak Struk Uji Coba (Test Print)</span>
          </button>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t border-stone-800 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-800 bg-stone-950 text-xs font-bold text-stone-400 hover:text-white"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-950/40"
          >
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
};
