import { StoreProfile, Transaction, PrinterConfig, PaperWidth } from '../types';

export interface BluetoothConnectionState {
  isConnected: boolean;
  deviceName: string | null;
  error: string | null;
}

// Active bluetooth device reference
let activeDevice: any = null;
let activeCharacteristic: any = null;

export const isBluetoothSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
};

// Common ESC/POS Bluetooth printer services
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard mini thermal
  '0000ff00-0000-1000-8000-00805f9b34fb', // Common chinese printer
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Posnet / Xprinter
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent
];

/**
 * Connect to a thermal Bluetooth printer via Web Bluetooth API
 */
export const connectBluetoothPrinter = async (): Promise<{ success: boolean; deviceName: string; error?: string }> => {
  if (!isBluetoothSupported()) {
    return {
      success: false,
      deviceName: '',
      error: 'Browser ini belum mendukung Web Bluetooth API. Gunakan Chrome di Android, PC, atau Mac.',
    };
  }

  try {
    const navAny = navigator as any;
    const device = await navAny.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        '0000ffe0-0000-1000-8000-00805f9b34fb',
      ],
    });

    if (!device || !device.gatt) {
      throw new Error('Perangkat Bluetooth tidak memiliki antarmuka GATT');
    }

    const server = await device.gatt.connect();

    // Scan services to find writable characteristic
    let foundChar: any = null;
    const services = await server.getPrimaryServices();

    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            foundChar = char;
            break;
          }
        }
        if (foundChar) break;
      } catch (e) {
        // continue
      }
    }

    if (!foundChar) {
      throw new Error('Tidak ditemukan karakteristik writable ESC/POS pada printer ini');
    }

    activeDevice = device;
    activeCharacteristic = foundChar;

    device.addEventListener('gattserverdisconnected', () => {
      activeDevice = null;
      activeCharacteristic = null;
    });

    return {
      success: true,
      deviceName: device.name || 'Thermal Bluetooth Printer',
    };
  } catch (err: any) {
    console.error('Bluetooth connection error:', err);
    return {
      success: false,
      deviceName: '',
      error: err.message || 'Gagal menghubungkan printer bluetooth',
    };
  }
};

export const disconnectBluetoothPrinter = async (): Promise<void> => {
  if (activeDevice && activeDevice.gatt && activeDevice.gatt.connected) {
    try {
      await activeDevice.gatt.disconnect();
    } catch (e) {
      console.error(e);
    }
  }
  activeDevice = null;
  activeCharacteristic = null;
};

export const isBluetoothConnected = (): boolean => {
  return !!(activeDevice && activeDevice.gatt && activeDevice.gatt.connected && activeCharacteristic);
};

export const getConnectedDeviceName = (): string | null => {
  return activeDevice ? activeDevice.name || 'Bluetooth Printer' : null;
};

/**
 * Format currency helper
 */
export const formatRupiah = (num: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
};

/**
 * Generate 2-column text row padded with spaces for thermal receipt
 */
const makeRow = (left: string, right: string, maxLen: number): string => {
  const availableSpace = maxLen - right.length;
  if (availableSpace <= 0) {
    return left.substring(0, maxLen - 8) + ' ' + right;
  }
  const paddedLeft = left.length > availableSpace 
    ? left.substring(0, availableSpace) 
    : left.padEnd(availableSpace, ' ');
  return paddedLeft + right + '\n';
};

/**
 * Build ESC/POS bytes for raw Bluetooth printing
 */
export const generateEscPosCommands = (
  transaction: Transaction,
  profile: StoreProfile,
  config: PrinterConfig
): Uint8Array => {
  const maxChars = config.paperWidth === '80mm' ? 48 : 32;
  const divider = '-'.repeat(maxChars) + '\n';
  const doubleDivider = '='.repeat(maxChars) + '\n';

  const encoder = new TextEncoder();
  const byteArrays: Uint8Array[] = [];

  const addBytes = (...bytes: number[]) => {
    byteArrays.push(new Uint8Array(bytes));
  };

  const addText = (text: string) => {
    byteArrays.push(encoder.encode(text));
  };

  // 1. Initialize printer: ESC @
  addBytes(0x1B, 0x40);

  // 2. Center alignment: ESC a 1
  addBytes(0x1B, 0x61, 0x01);

  // 3. Double height & width for Store Name: GS ! 0x11
  addBytes(0x1D, 0x21, 0x11);
  addText(profile.name.toUpperCase() + '\n');

  // Normal font: GS ! 0x00
  addBytes(0x1D, 0x21, 0x00);
  if (profile.slogan) {
    addText(profile.slogan + '\n');
  }
  if (config.printAddress && profile.address) {
    addText(profile.address + '\n');
    if (profile.phone) {
      addText('Telp/WA: ' + profile.phone + '\n');
    }
  }

  addText(doubleDivider);

  // 4. Align Left: ESC a 0
  addBytes(0x1B, 0x61, 0x00);
  addText(makeRow(`No: ${transaction.receiptNo}`, transaction.tableOrQueueNo || 'Pelanggan', maxChars));
  
  const dateFormatted = new Date(transaction.createdAt).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  addText(makeRow(`Tgl: ${dateFormatted}`, transaction.orderType.split(' ')[0], maxChars));
  addText(makeRow(`Kasir: ${transaction.cashierName}`, `Bayar: ${transaction.paymentMethod}`, maxChars));
  addText(divider);

  // 5. Items List
  transaction.items.forEach(item => {
    // Line 1: Item Name
    addText(item.name + '\n');
    
    // Line 2: Details: Qty x Price and Line Total
    const qtyPrice = ` ${item.quantity} ${item.unit} x ${formatRupiah(item.price)}`;
    const lineTotal = formatRupiah(item.price * item.quantity);
    addText(makeRow(qtyPrice, lineTotal, maxChars));

    // Spicy level if applicable
    if (item.spicyLevel > 0) {
      addText(`  * Pedas Lvl ${item.spicyLevel}\n`);
    }
    // Note if applicable
    if (item.note) {
      addText(`  * Catatan: ${item.note}\n`);
    }
  });

  addText(divider);

  // 6. Totals
  addText(makeRow('Subtotal:', formatRupiah(transaction.subtotal), maxChars));
  if (transaction.discount > 0) {
    addText(makeRow('Diskon:', `-${formatRupiah(transaction.discount)}`, maxChars));
  }
  
  // Total in bold / emphasis
  addBytes(0x1B, 0x45, 0x01); // Bold ON
  addText(makeRow('TOTAL AKHIR:', formatRupiah(transaction.total), maxChars));
  addBytes(0x1B, 0x45, 0x00); // Bold OFF

  addText(divider);
  addText(makeRow('Bayar (' + transaction.paymentMethod + '):', formatRupiah(transaction.paidAmount), maxChars));
  addText(makeRow('Kembalian:', formatRupiah(transaction.changeAmount), maxChars));
  addText(divider);

  // 7. Footer - Center aligned
  addBytes(0x1B, 0x61, 0x01);
  if (config.printFooter && profile.receiptFooter) {
    addText(profile.receiptFooter + '\n');
  }
  addText('Terima Kasih Atas Kunjungannya!\n');
  if (profile.instagram) {
    addText('IG: ' + profile.instagram + '\n');
  }

  // 8. Feed lines & cut
  const feedCount = Math.max(2, config.feedLines || 3);
  addBytes(0x1B, 0x64, feedCount); // ESC d n

  if (config.autoCut) {
    addBytes(0x1D, 0x56, 0x41, 0x00); // GS V A 0 (cut)
  }

  // Merge all byte arrays into a single Uint8Array
  const totalLength = byteArrays.reduce((acc, curr) => acc + curr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of byteArrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
};

/**
 * Send bytes to connected Bluetooth thermal printer in chunks
 */
export const printRawToBluetooth = async (data: Uint8Array): Promise<{ success: boolean; error?: string }> => {
  if (!activeCharacteristic) {
    return { success: false, error: 'Printer Bluetooth belum terhubung' };
  }

  try {
    const CHUNK_SIZE = 512;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      if (activeCharacteristic.writeValueWithoutResponse) {
        await activeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await activeCharacteristic.writeValue(chunk);
      }
      // Small pause between chunks to protect cheap microcontrollers
      await new Promise(r => setTimeout(r, 20));
    }
    return { success: true };
  } catch (err: any) {
    console.error('Print error:', err);
    return { success: false, error: err.message || 'Gagal mengirim data cetak ke printer' };
  }
};

/**
 * Print receipt using Browser Print dialog (formatted for 58mm / 80mm thermal printers)
 */
export const printViaBrowser = () => {
  window.print();
};
