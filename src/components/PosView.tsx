import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Flame,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  CheckCircle2,
  Share2,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Bell,
  PackageX,
  Info,
  X,
  Bluetooth,
  Receipt,
  Tag,
} from 'lucide-react';
import {
  MenuItem,
  CartItem,
  OrderType,
  PaymentMethod,
  Transaction,
  StoreProfile,
  PrinterConfig,
  ProductCategory,
} from '../types';
import { SPICY_LEVELS } from '../utils/defaultData';
import { formatRupiah, printViaBrowser, generateEscPosCommands, printRawToBluetooth, isBluetoothConnected } from '../utils/printer';
import { createTransaction, getCategories } from '../utils/storage';
import { parseNumberInput, formatNumberWithDots } from '../utils/numberUtils';
import { ReceiptModal } from './ReceiptModal';

interface PosViewProps {
  menuItems: MenuItem[];
  storeProfile: StoreProfile;
  printerConfig: PrinterConfig;
  onTransactionComplete: (tx: Transaction) => void;
  onOpenPrinterModal: () => void;
}


export const PosView: React.FC<PosViewProps> = ({
  menuItems,
  storeProfile,
  printerConfig,
  onTransactionComplete,
  onOpenPrinterModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [tableOrQueueNo, setTableOrQueueNo] = useState<string>('Meja 01');
  const [orderType, setOrderType] = useState<OrderType>('Dine-in (Makan Sini)');
  const [discount, setDiscount] = useState<number>(0);

  // Spicy Level Selection Modal State
  const [spicyModalItem, setSpicyModalItem] = useState<MenuItem | null>(null);
  const [selectedSpicyLevel, setSelectedSpicyLevel] = useState<number>(2);
  const [itemNote, setItemNote] = useState<string>('');

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cashInputRaw, setCashInputRaw] = useState<string>('');

  // Success Modal State
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [receiptModalTx, setReceiptModalTx] = useState<Transaction | null>(null);
  const [lastSavedTx, setLastSavedTx] = useState<Transaction | null>(null);
  const [isPrintingBt, setIsPrintingBt] = useState<boolean>(false);
  const [btPrintStatus, setBtPrintStatus] = useState<string | null>(null);

  // Visual Warning & Stock Notification States
  const [isLowStockBannerDismissed, setIsLowStockBannerDismissed] = useState<boolean>(false);
  const [isLowStockDetailsExpanded, setIsLowStockDetailsExpanded] = useState<boolean>(false);
  const [stockAlertToast, setStockAlertToast] = useState<{
    itemName: string;
    remainingStock: number;
    unit: string;
    minStock: number;
    isOut: boolean;
  } | null>(null);

  // Auto-dismiss stock alert toast after 4.5 seconds
  useEffect(() => {
    if (!stockAlertToast) return;
    const timer = setTimeout(() => {
      setStockAlertToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [stockAlertToast]);

  // Low Stock Items (stok mencapai atau di bawah titik minimum)
  const lowStockItems = useMemo(() => {
    return menuItems.filter(item => {
      const minThreshold = typeof item.minStock === 'number' ? item.minStock : 5;
      return item.isActive && item.stock <= minThreshold;
    });
  }, [menuItems]);

  const outOfStockItems = useMemo(() => {
    return lowStockItems.filter(item => item.stock <= 0);
  }, [lowStockItems]);

  const criticalStockItems = useMemo(() => {
    return lowStockItems.filter(item => item.stock > 0);
  }, [lowStockItems]);

  // Filter menu items (dukung filter kategori khusus '⚠️ Stok Menipis' & Sub Kategori)
  const filteredMenu = useMemo(() => {
    return menuItems.filter(item => {
      const minThreshold = typeof item.minStock === 'number' ? item.minStock : 5;
      const isLow = item.stock <= minThreshold;

      if (selectedCategory === '⚠️ Stok Menipis') {
        const matchSearch =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.subCategory && item.subCategory.toLowerCase().includes(searchQuery.toLowerCase()));
        return isLow && matchSearch && item.isActive;
      }

      const matchCat = selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchSub =
        selectedSubCategory === 'Semua' ||
        (item.subCategory && item.subCategory === selectedSubCategory);
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.subCategory && item.subCategory.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSub && matchSearch && item.isActive;
    });
  }, [menuItems, selectedCategory, selectedSubCategory, searchQuery]);

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount);
  }, [subtotal, discount]);

  const changeAmount = useMemo(() => {
    if (paymentMethod !== 'Tunai') return 0;
    return Math.max(0, cashAmount - total);
  }, [paymentMethod, cashAmount, total]);

  // Handle menu click
  const handleMenuClick = (item: MenuItem) => {
    const minThreshold = typeof item.minStock === 'number' ? item.minStock : 5;

    if (item.stock <= 0) {
      setStockAlertToast({
        itemName: item.name,
        remainingStock: 0,
        unit: item.unit,
        minStock: minThreshold,
        isOut: true,
      });
      return;
    }

    if (item.stock <= minThreshold) {
      setStockAlertToast({
        itemName: item.name,
        remainingStock: item.stock,
        unit: item.unit,
        minStock: minThreshold,
        isOut: false,
      });
    }

    if (item.allowSpicyLevel) {
      setSpicyModalItem(item);
      setSelectedSpicyLevel(item.defaultSpicyLevel ?? 2);
      setItemNote('');
    } else {
      addToCart(item, 0, '', '');
    }
  };

  const confirmSpicySelection = () => {
    if (!spicyModalItem) return;
    const spicyObj = SPICY_LEVELS.find(s => s.level === selectedSpicyLevel);
    addToCart(
      spicyModalItem,
      selectedSpicyLevel,
      spicyObj?.label || `Level ${selectedSpicyLevel}`,
      itemNote
    );
    setSpicyModalItem(null);
  };

  const addToCart = (
    item: MenuItem,
    spicyLevel: number,
    spicyLevelLabel: string,
    note: string
  ) => {
    const minThreshold = typeof item.minStock === 'number' ? item.minStock : 5;
    if (item.stock <= minThreshold) {
      setStockAlertToast({
        itemName: item.name,
        remainingStock: item.stock,
        unit: item.unit,
        minStock: minThreshold,
        isOut: false,
      });
    }

    setCart(prev => {
      const itemCartId = `${item.id}-lvl${spicyLevel}-${note.trim().toLowerCase()}`;
      const existingIdx = prev.findIndex(ci => ci.id === itemCartId);

      if (existingIdx !== -1) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + 1;
        if (newQty > item.stock) return prev; // Cannot exceed stock
        updated[existingIdx].quantity = newQty;
        return updated;
      } else {
        const newCartItem: CartItem = {
          id: itemCartId,
          menuItemId: item.id,
          name: item.name,
          category: item.category,
          subCategory: item.subCategory || '',
          price: item.price,
          costPrice: item.costPrice,
          quantity: 1,
          spicyLevel,
          spicyLevelLabel,
          note,
          unit: item.unit,
        };
        return [...prev, newCartItem];
      }
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.id === cartItemId) {
            const menuRef = menuItems.find(m => m.id === item.menuItemId);
            const maxStock = menuRef ? menuRef.stock : 999;
            const newQty = item.quantity + delta;
            if (newQty > maxStock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(item => item.quantity > 0);
    });
  };

  const removeCartItem = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const openPaymentModal = () => {
    if (cart.length === 0) return;
    setCashAmount(total);
    setCashInputRaw(String(total));
    setPaymentMethod('Tunai');
    setIsPaymentModalOpen(true);
  };

  const handleQuickCash = (amount: number) => {
    setCashAmount(amount);
    setCashInputRaw(String(amount));
  };

  const handleCompleteTransaction = () => {
    if (paymentMethod === 'Tunai' && cashAmount < total) {
      alert('Nominal uang tunai kurang dari total belanja!');
      return;
    }

    const newTx = createTransaction({
      customerName: customerName.trim() || 'Pelanggan Walk-in',
      tableOrQueueNo: tableOrQueueNo.trim() || '-',
      orderType,
      items: cart,
      subtotal,
      discount,
      total,
      paidAmount: paymentMethod === 'Tunai' ? cashAmount : total,
      changeAmount: paymentMethod === 'Tunai' ? Math.max(0, cashAmount - total) : 0,
      paymentMethod,
      cashierName: storeProfile.defaultCashier || 'Kasir',
    });

    onTransactionComplete(newTx);
    setCompletedTransaction(newTx);
    setLastSavedTx(newTx);
    setIsPaymentModalOpen(false);

    // Reset Cart
    setCart([]);
    setCustomerName('');
    setDiscount(0);

    // If bluetooth is connected, auto print if desired
    if (isBluetoothConnected()) {
      handlePrintBluetoothDirect(newTx);
    }
  };

  // Direct Bluetooth Thermal Printing
  const handlePrintBluetoothDirect = async (txToPrint?: Transaction) => {
    const tx = txToPrint || completedTransaction;
    if (!tx) return;

    if (!isBluetoothConnected()) {
      setBtPrintStatus('Printer Bluetooth belum tersambung. Mengarahkan ke menu printer...');
      setTimeout(() => {
        onOpenPrinterModal();
      }, 1200);
      return;
    }

    try {
      setIsPrintingBt(true);
      setBtPrintStatus('Mengirim data struk ke printer Bluetooth...');
      const bytes = generateEscPosCommands(tx, storeProfile, printerConfig);
      const res = await printRawToBluetooth(bytes);
      if (res.success) {
        setBtPrintStatus('Struk berhasil dicetak ke printer Bluetooth! 🎉');
      } else {
        setBtPrintStatus(`Gagal cetak: ${res.error}`);
      }
    } catch (err: any) {
      setBtPrintStatus(`Error cetak: ${err.message}`);
    } finally {
      setIsPrintingBt(false);
      setTimeout(() => setBtPrintStatus(null), 4000);
    }
  };

  // WhatsApp share receipt
  const handleShareWhatsApp = (tx: Transaction) => {
    const itemsText = tx.items
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
      `No Struk: ${tx.receiptNo}%0A` +
      `Tanggal: ${new Date(tx.createdAt).toLocaleString('id-ID')}%0A` +
      `Pelanggan: ${tx.customerName} (${tx.tableOrQueueNo})%0A` +
      `Tipe: ${tx.orderType}%0A` +
      `-----------------------------------%0A` +
      `${itemsText}%0A` +
      `-----------------------------------%0A` +
      `Subtotal: ${formatRupiah(tx.subtotal)}%0A` +
      (tx.discount > 0 ? `Diskon: -${formatRupiah(tx.discount)}%0A` : '') +
      `*TOTAL: ${formatRupiah(tx.total)}*%0A` +
      `Metode Bayar: ${tx.paymentMethod}%0A` +
      `-----------------------------------%0A` +
      `${storeProfile.receiptFooter || 'Terima kasih telah berbelanja di Warung Seblak Cinta!'}`;

    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  const categoriesList = useMemo(() => {
    return getCategories();
  }, [menuItems]);

  const posCategories = useMemo(() => {
    return ['Semua', ...categoriesList.map(c => c.name)];
  }, [categoriesList]);

  const activePosCategoryObj = useMemo(() => {
    return categoriesList.find(c => c.name.toLowerCase() === selectedCategory.toLowerCase());
  }, [categoriesList, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Menu Catalog (Cols 7 on Desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">

          {/* --- INDIKATOR PERINGATAN VISUAL / NOTIFIKASI STOK MINIMUM --- */}
          {lowStockItems.length > 0 && !isLowStockBannerDismissed && (
            <div className="bg-gradient-to-r from-amber-950/70 via-stone-900 to-amber-950/40 border border-amber-500/70 rounded-2xl p-3.5 sm:p-4 shadow-xl shadow-amber-950/30 relative overflow-hidden transition-all animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm sm:text-base text-amber-200 flex items-center gap-1.5">
                        <span>Peringatan Stok Menu / Bahan Baku Menipis</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {lowStockItems.length} Bahan
                        </span>
                      </h3>
                    </div>
                    <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                      Terdapat <strong className="text-amber-300">{lowStockItems.length} menu</strong> yang telah mencapai atau berada di bawah titik minimum stok.
                      {outOfStockItems.length > 0 && (
                        <span className="text-red-400 ml-1 font-bold">({outOfStockItems.length} menu sudah habis!)</span>
                      )}
                      {' '}Segera persiapkan bahan baku atau lakukan restock di dapur.
                    </p>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsLowStockDetailsExpanded(!isLowStockDetailsExpanded)}
                        className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-600/60 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        {isLowStockDetailsExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Tutup Daftar Bahan</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Lihat Daftar Bahan Menipis ({lowStockItems.length})</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(selectedCategory === '⚠️ Stok Menipis' ? 'Semua' : '⚠️ Stok Menipis');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                          selectedCategory === '⚠️ Stok Menipis'
                            ? 'bg-amber-500 text-stone-950 font-black shadow-md'
                            : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-200 border border-amber-500/40'
                        }`}
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{selectedCategory === '⚠️ Stok Menipis' ? 'Tampilkan Semua Menu' : 'Filter Menu Kritis di POS'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLowStockBannerDismissed(true)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors shrink-0"
                  title="Sembunyikan ke bar ringkas"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Rincian item yang mencapai stok minimum */}
              {isLowStockDetailsExpanded && (
                <div className="mt-3.5 pt-3 border-t border-amber-900/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {lowStockItems.map(item => {
                    const itemMin = item.minStock ?? 5;
                    const isZero = item.stock <= 0;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSearchQuery(item.name);
                          setSelectedCategory('Semua');
                        }}
                        className="p-2.5 rounded-xl bg-stone-950/80 border border-amber-900/50 hover:border-amber-500/70 cursor-pointer transition-all flex items-center justify-between gap-2 group"
                        title="Klik untuk menyorot menu ini"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-stone-100 group-hover:text-amber-300 truncate transition-colors">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-stone-400">{item.category}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                              isZero
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {isZero ? 'HABIS (0)' : `Sisa ${item.stock}/${itemMin}`}
                          </span>
                          <span className="block text-[9px] text-stone-500">{item.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Bar ringkas saat banner ditutup */}
          {lowStockItems.length > 0 && isLowStockBannerDismissed && (
            <div className="bg-amber-950/40 border border-amber-800/70 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 shadow-md">
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <span className="font-semibold">
                  Perhatian: {lowStockItems.length} menu mencapai titik minimum stok
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('⚠️ Stok Menipis')}
                  className="text-xs text-amber-400 hover:text-amber-200 underline font-bold"
                >
                  Filter POS
                </button>
                <button
                  type="button"
                  onClick={() => setIsLowStockBannerDismissed(false)}
                  className="text-xs px-2.5 py-0.5 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-700/60 font-semibold"
                >
                  Buka Peringatan
                </button>
              </div>
            </div>
          )}

          {/* Search & Category Filter */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 sm:p-4 shadow-md flex flex-col gap-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Cari menu seblak, topping, minuman..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white placeholder-stone-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {posCategories.map(cat => {
                const catObj = categoriesList.find(c => c.name === cat);
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedSubCategory('Semua');
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedCategory === cat
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                        : 'bg-stone-950 text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-stone-800/80'
                    }`}
                  >
                    {catObj?.icon && <span>{catObj.icon}</span>}
                    <span>{cat === 'Semua' ? 'Semua Menu' : cat}</span>
                  </button>
                );
              })}

              {/* Dynamic Tab: Menu Stok Menipis */}
              {lowStockItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(selectedCategory === '⚠️ Stok Menipis' ? 'Semua' : '⚠️ Stok Menipis');
                    setSelectedSubCategory('Semua');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedCategory === '⚠️ Stok Menipis'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40 ring-1 ring-amber-400'
                      : 'bg-amber-950/40 text-amber-300 hover:text-amber-100 hover:bg-amber-900/50 border border-amber-800/80'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                  <span>Stok Kritis ({lowStockItems.length})</span>
                </button>
              )}
            </div>

            {/* Sub-Category filter pills in POS */}
            {activePosCategoryObj && activePosCategoryObj.subCategories && activePosCategoryObj.subCategories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-2 border-t border-stone-800/60">
                <span className="text-[10px] font-bold text-stone-500 whitespace-nowrap mr-0.5 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-amber-400" />
                  <span>Sub:</span>
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedSubCategory('Semua')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedSubCategory === 'Semua'
                      ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  Semua Sub
                </button>

                {activePosCategoryObj.subCategories.map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubCategory(sub.name)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                      selectedSubCategory === sub.name
                        ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                        : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5">
            {filteredMenu.length === 0 ? (
              <div className="col-span-full py-12 text-center text-stone-500 flex flex-col items-center justify-center">
                <UtensilsCrossedIcon className="w-10 h-10 text-stone-600 mb-2" />
                <p className="font-medium text-sm">Tidak ada menu yang sesuai kriteria</p>
                <p className="text-xs text-stone-600">
                  {selectedCategory === '⚠️ Stok Menipis'
                    ? 'Bagus! Semua stok menu saat ini berada di atas titik minimum.'
                    : 'Coba ubah kata kunci atau pilih kategori lain'}
                </p>
              </div>
            ) : (
              filteredMenu.map(item => {
                const minThreshold = typeof item.minStock === 'number' ? item.minStock : 5;
                const isOutOfStock = item.stock <= 0;
                const isLowStock = item.stock > 0 && item.stock <= minThreshold;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleMenuClick(item)}
                    className={`group relative rounded-2xl overflow-hidden transition-all duration-200 flex flex-col ${
                      isOutOfStock
                        ? 'opacity-60 bg-stone-900/80 border border-red-900/60 cursor-not-allowed'
                        : isLowStock
                        ? 'bg-gradient-to-b from-amber-950/20 via-stone-900/90 to-stone-900/90 border border-amber-500/80 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-950/40 active:scale-[0.98] cursor-pointer'
                        : 'bg-stone-900/90 border border-stone-800 hover:border-rose-500/80 hover:shadow-xl hover:shadow-rose-950/20 active:scale-[0.98] cursor-pointer'
                    }`}
                  >
                    {/* Item Image */}
                    <div className="relative aspect-4/3 w-full bg-stone-950 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={e => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80';
                        }}
                      />
                      {/* Spicy badge indicator */}
                      {item.allowSpicyLevel && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-600/90 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                          <Flame className="w-3 h-3 text-amber-300" />
                          <span>Pilih Level</span>
                        </div>
                      )}

                      {/* Stock badge with visual warning indicator */}
                      <div
                        className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold backdrop-blur-md shadow-md flex items-center gap-1 ${
                          isOutOfStock
                            ? 'bg-red-950/95 text-red-300 border border-red-700/80'
                            : isLowStock
                            ? 'bg-amber-950/95 text-amber-300 border border-amber-500/80 ring-1 ring-amber-500/50 animate-pulse'
                            : 'bg-stone-900/80 text-stone-300 border border-stone-700/60'
                        }`}
                      >
                        {isLowStock && <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />}
                        {isOutOfStock ? (
                          'Habis (0)'
                        ) : isLowStock ? (
                          <span>Sisa {item.stock}/{minThreshold} {item.unit}</span>
                        ) : (
                          `Sisa ${item.stock} ${item.unit}`
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm text-stone-100 line-clamp-2 group-hover:text-rose-400 transition-colors">
                          {item.name}
                        </h3>

                        <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-0.5">
                          <span>{item.category}</span>
                          {item.subCategory && <span className="text-amber-400/90 font-medium">• {item.subCategory}</span>}
                        </div>

                        {/* Indikator Peringatan Visual pada Kartu */}
                        {isLowStock && (
                          <div className="mt-1 px-1.5 py-0.5 rounded-lg bg-amber-950/70 border border-amber-700/60 text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">Stok Menipis (Min: {minThreshold} {item.unit})</span>
                          </div>
                        )}
                        {isOutOfStock && (
                          <div className="mt-1 px-1.5 py-0.5 rounded-lg bg-red-950/70 border border-red-800/60 text-[10px] text-red-300 font-semibold flex items-center gap-1">
                            <PackageX className="w-3 h-3 text-red-400 shrink-0" />
                            <span className="truncate">Stok Habis di Dapur</span>
                          </div>
                        )}

                        {item.description && (
                          <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-stone-800/80">
                        <span className="font-extrabold text-xs sm:text-sm text-rose-400">
                          {formatRupiah(item.price)}
                        </span>
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                            isOutOfStock
                              ? 'bg-stone-800 text-stone-600'
                              : isLowStock
                              ? 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-600 group-hover:text-white'
                              : 'bg-rose-500/20 text-rose-400 group-hover:bg-rose-600 group-hover:text-white'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Order Cart & Checkout (Cols 5 on Desktop) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="sticky top-24 bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-xl flex flex-col max-h-[calc(100vh-7rem)]">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-rose-500" />
                <h2 className="font-extrabold text-base text-white">Keranjang Pesanan</h2>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-stone-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Kosongkan
                </button>
              )}
            </div>

            {/* Customer Details Form */}
            <div className="grid grid-cols-2 gap-2 my-3">
              <div>
                <label className="text-[11px] text-stone-400 font-medium block mb-1">
                  Nama Pelanggan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kak Rina"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-stone-400 font-medium block mb-1">
                  Meja / Antrean
                </label>
                <input
                  type="text"
                  placeholder="Meja 01 / Antrean A1"
                  value={tableOrQueueNo}
                  onChange={e => setTableOrQueueNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="col-span-2 flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOrderType('Dine-in (Makan Sini)')}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    orderType.includes('Dine-in')
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  🍽️ Makan Sini
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('Takeaway (Bungkus)')}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    orderType.includes('Takeaway')
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  🛍️ Bungkus (Takeaway)
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[140px] max-h-[300px]">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 text-stone-500">
                  <Flame className="w-8 h-8 text-stone-700 mb-2 animate-pulse" />
                  <p className="text-xs font-medium">Keranjang masih kosong</p>
                  <p className="text-[11px] text-stone-600">Pilih menu di samping untuk mulai transaksi</p>
                </div>
              ) : (
                cart.map(item => {
                  const menuRef = menuItems.find(m => m.id === item.menuItemId);
                  const minThreshold = menuRef ? (typeof menuRef.minStock === 'number' ? menuRef.minStock : 5) : 5;
                  const kitchenRemaining = menuRef ? menuRef.stock - item.quantity : 999;
                  const isNearOrBelowMin = menuRef && kitchenRemaining <= minThreshold;

                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 bg-stone-950/70 border rounded-xl flex flex-col gap-1.5 transition-colors ${
                        isNearOrBelowMin
                          ? 'border-amber-700/80 bg-amber-950/15'
                          : 'border-stone-800/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-stone-100 truncate">{item.name}</h4>
                          {item.spicyLevel > 0 && (
                            <div className="flex items-center gap-1 text-[11px] text-rose-400 font-semibold mt-0.5">
                              <Flame className="w-3 h-3 flex-shrink-0" />
                              <span>Level {item.spicyLevel} ({item.spicyLevelLabel.split('(')[0]})</span>
                            </div>
                          )}
                          {item.note && (
                            <p className="text-[10px] text-amber-400/90 italic truncate">
                              Catatan: {item.note}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => removeCartItem(item.id)}
                          className="text-stone-500 hover:text-red-400 p-0.5"
                          title="Hapus item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Peringatan stok dapur kritis di keranjang */}
                      {isNearOrBelowMin && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-950/70 border border-amber-800/70 text-[10px] text-amber-300 font-semibold">
                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
                          <span className="truncate">
                            {kitchenRemaining <= 0
                              ? 'Menghabiskan seluruh stok dapur (sisa 0)!'
                              : `Sisa stok dapur: ${kitchenRemaining} ${item.unit} (Min: ${minThreshold})`}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-stone-800/60">
                        <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-5 h-5 rounded flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-5 h-5 rounded flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-extrabold text-stone-200">
                            {formatRupiah(item.price * item.quantity)}
                          </span>
                          <div className="text-[10px] text-stone-500">
                            @{formatRupiah(item.price)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Calculations & Pay Button */}
            <div className="pt-3 border-t border-stone-800 mt-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>Subtotal</span>
                <span className="font-medium text-stone-200">{formatRupiah(subtotal)}</span>
              </div>

              {/* Discount input */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-stone-400">Diskon (Rp)</span>
                <div className="w-28">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={discount || ''}
                    placeholder="0"
                    onChange={e => setDiscount(Math.max(0, parseNumberInput(e.target.value)))}
                    className="w-full text-right px-2 py-0.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-base font-extrabold text-white pt-1 border-t border-stone-800/80">
                <span>Total Bayar</span>
                <span className="text-rose-400 text-lg">{formatRupiah(total)}</span>
              </div>

              <button
                disabled={cart.length === 0}
                onClick={openPaymentModal}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                  cart.length === 0
                    ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50 hover:shadow-rose-700/30 active:scale-[0.99]'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Bayar Sekarang ({formatRupiah(total)})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- SPICY LEVEL SELECTOR MODAL --- */}
      {spicyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md p-5 shadow-2xl relative">
            <div className="flex items-start justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <img
                  src={spicyModalItem.imageUrl}
                  alt={spicyModalItem.name}
                  className="w-12 h-12 rounded-xl object-cover border border-stone-700"
                />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    {spicyModalItem.name}
                  </h3>
                  <p className="text-xs text-rose-400 font-bold">
                    {formatRupiah(spicyModalItem.price)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSpicyModalItem(null)}
                className="text-stone-500 hover:text-stone-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5 mb-2.5">
                <Flame className="w-4 h-4 text-rose-500" />
                Pilih Tingkat Kepedasan:
              </label>

              <div className="space-y-2">
                {SPICY_LEVELS.map(s => {
                  const isSelected = selectedSpicyLevel === s.level;
                  return (
                    <button
                      key={s.level}
                      type="button"
                      onClick={() => setSelectedSpicyLevel(s.level)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-rose-500/20 border-rose-500 shadow-md shadow-rose-950/40 text-white'
                          : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                            isSelected ? 'bg-rose-500 text-white' : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {s.level}
                        </span>
                        <span className="text-xs font-semibold">{s.label}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-rose-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Special Note */}
              <div className="mt-4">
                <label className="text-xs font-medium text-stone-400 block mb-1">
                  Catatan Khusus (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kuah nyemek, banyakin kencur, sawi dipisah"
                  value={itemNote}
                  onChange={e => setItemNote(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setSpicyModalItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-800 bg-stone-950 text-xs font-semibold text-stone-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmSpicySelection}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-950/40"
              >
                Tambahkan ke Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PAYMENT MODAL --- */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base text-white">Pembayaran Kasir</h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-stone-500 hover:text-stone-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total display banner */}
            <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 to-stone-950 border border-rose-900/40 text-center">
              <span className="text-xs text-stone-400 font-medium">TOTAL TAGIHAN</span>
              <div className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight mt-0.5">
                {formatRupiah(total)}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                {cart.reduce((s, i) => s + i.quantity, 0)} item ({customerName || 'Pelanggan'} - {tableOrQueueNo})
              </div>
            </div>

            {/* Payment method selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-stone-300">Pilih Metode Pembayaran:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Tunai', 'QRIS', 'Transfer'] as PaymentMethod[]).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method);
                      if (method !== 'Tunai') {
                        setCashAmount(total);
                      }
                    }}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      paymentMethod === method
                        ? 'bg-rose-600 border-rose-500 text-white shadow-md'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {method === 'Tunai' ? (
                      <Banknote className="w-4 h-4" />
                    ) : method === 'QRIS' ? (
                      <QrCode className="w-4 h-4" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    <span>{method}</span>
                  </button>
                ))}
              </div>

              {/* Cash Input & Quick Amounts (only for Tunai) */}
              {paymentMethod === 'Tunai' ? (
                <div className="space-y-2.5 pt-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-stone-400">
                        Uang Diterima dari Pelanggan (Rp):
                      </label>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatRupiah(parseNumberInput(cashInputRaw))}
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cashInputRaw}
                      onChange={e => {
                        setCashInputRaw(e.target.value);
                        setCashAmount(parseNumberInput(e.target.value));
                      }}
                      placeholder="Contoh: 50.000 atau 50000"
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-lg font-mono font-bold text-emerald-400 text-right focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickCash(total)}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px] font-bold text-stone-200 border border-stone-700"
                    >
                      Uang Pas
                    </button>
                    {[20000, 50000, 100000, 150000, 200000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickCash(val)}
                        className="px-2.5 py-1 rounded-lg bg-stone-950 hover:bg-stone-800 text-[11px] font-semibold text-stone-300 border border-stone-800"
                      >
                        {formatRupiah(val)}
                      </button>
                    ))}
                  </div>

                  {/* Kembalian Banner */}
                  <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-400">Kembalian:</span>
                    <span
                      className={`text-base font-extrabold ${
                        cashAmount < total ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {cashAmount < total
                        ? `Kurang ${formatRupiah(total - cashAmount)}`
                        : formatRupiah(changeAmount)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
                    {paymentMethod === 'QRIS' ? <QrCode className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                  </div>
                  <p className="text-xs font-semibold text-stone-200">
                    {paymentMethod === 'QRIS'
                      ? 'Tunjukkan QRIS Warung kepada pelanggan'
                      : 'Konfirmasi bukti transfer m-Banking'}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Pastikan pembayaran senilai {formatRupiah(total)} telah berhasil sebelum klik selesai.
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="mt-5 flex items-center gap-2 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-stone-800 bg-stone-950 text-xs font-bold text-stone-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={paymentMethod === 'Tunai' && cashAmount < total}
                onClick={handleCompleteTransaction}
                className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'Tunai' && cashAmount < total
                    ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Selesaikan & Cetak</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUCCESS & PRINT RECEIPT MODAL --- */}
      {completedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
            <div className="text-center pb-3 border-b border-stone-800">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                Transaksi Berhasil Disimpan!
              </h3>
              <p className="text-xs text-stone-400">
                No Struk: <span className="font-mono text-rose-400 font-bold">{completedTransaction.receiptNo}</span>
              </p>
            </div>

            {/* Status Bluetooth Print Toast */}
            {btPrintStatus && (
              <div className="my-2 p-2.5 rounded-xl bg-sky-950/80 border border-sky-700/80 text-sky-200 text-xs text-center flex items-center justify-center gap-2">
                <Bluetooth className="w-4 h-4 animate-spin text-sky-400" />
                <span>{btPrintStatus}</span>
              </div>
            )}

            {/* Receipt Preview Box */}
            <div className="flex-1 overflow-y-auto my-3 p-3 bg-white text-stone-900 rounded-xl font-mono-receipt text-[11px] leading-tight border border-stone-200 shadow-inner">
              <div className="text-center pb-2 border-b border-dashed border-stone-400">
                <div className="font-black text-sm tracking-wide text-rose-700">
                  {storeProfile.name.toUpperCase()}
                </div>
                {storeProfile.slogan && <div className="text-[10px]">{storeProfile.slogan}</div>}
                {storeProfile.address && <div className="text-[9px] text-stone-600">{storeProfile.address}</div>}
                {storeProfile.phone && <div className="text-[9px] text-stone-600">WA: {storeProfile.phone}</div>}
              </div>

              <div className="py-2 border-b border-dashed border-stone-400 space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>No: {completedTransaction.receiptNo}</span>
                  <span>{completedTransaction.tableOrQueueNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>{new Date(completedTransaction.createdAt).toLocaleDateString('id-ID')}</span>
                  <span>{new Date(completedTransaction.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir: {completedTransaction.cashierName}</span>
                  <span>{completedTransaction.paymentMethod}</span>
                </div>
              </div>

              {/* Items */}
              <div className="py-2 border-b border-dashed border-stone-400 space-y-1.5">
                {completedTransaction.items.map((it, idx) => (
                  <div key={idx}>
                    <div className="font-bold">{it.name}</div>
                    <div className="flex justify-between text-stone-700">
                      <span>{it.quantity} {it.unit} x {formatRupiah(it.price)}</span>
                      <span>{formatRupiah(it.price * it.quantity)}</span>
                    </div>
                    {it.spicyLevel > 0 && (
                      <div className="text-[9px] text-red-600">
                        * Pedas Level {it.spicyLevel}
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
                  <span>{formatRupiah(completedTransaction.subtotal)}</span>
                </div>
                {completedTransaction.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(completedTransaction.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs pt-1 border-t border-stone-300">
                  <span>TOTAL:</span>
                  <span>{formatRupiah(completedTransaction.total)}</span>
                </div>
                <div className="flex justify-between text-stone-700">
                  <span>Bayar ({completedTransaction.paymentMethod}):</span>
                  <span>{formatRupiah(completedTransaction.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-stone-700">
                  <span>Kembalian:</span>
                  <span>{formatRupiah(completedTransaction.changeAmount)}</span>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-dashed border-stone-400 text-[10px] text-stone-600">
                <div>{storeProfile.receiptFooter || 'Matur nuhun tos jajan!'}</div>
              </div>
            </div>

            {/* Print & Share Actions */}
            <div className="space-y-2 pt-2 border-t border-stone-800">
              <div className="grid grid-cols-2 gap-2">
                {/* Bluetooth Thermal Print */}
                <button
                  type="button"
                  disabled={isPrintingBt}
                  onClick={() => handlePrintBluetoothDirect()}
                  className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-950/40"
                  title="Cetak langsung ke printer bluetooth kasir"
                >
                  <Bluetooth className="w-4 h-4" />
                  <span>Cetak Bluetooth</span>
                </button>

                {/* Browser Thermal Print */}
                <button
                  type="button"
                  onClick={printViaBrowser}
                  className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-stone-700"
                  title="Cetak via dialog printer browser (USB / Wifi / PDF)"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Cetak Browser (58/80mm)</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Share WhatsApp */}
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(completedTransaction)}
                  className="py-2 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Kirim WhatsApp</span>
                </button>

                {/* New Transaction */}
                <button
                  type="button"
                  onClick={() => setCompletedTransaction(null)}
                  className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Transaksi Baru</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Stock Alert Toast Notification */}
      {stockAlertToast && (
        <div className="fixed bottom-5 right-4 sm:right-6 z-50 max-w-sm w-full bg-stone-900/95 backdrop-blur-md border border-amber-500/80 rounded-2xl p-3.5 shadow-2xl shadow-amber-950/60 animate-in slide-in-from-bottom-5 fade-in flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs text-amber-300">
                {stockAlertToast.isOut ? 'Stok Telah Habis!' : 'Peringatan Stok Minimum!'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                {stockAlertToast.isOut ? '0 Sisa' : `Sisa ${stockAlertToast.remainingStock}`}
              </span>
            </div>
            <p className="text-xs text-stone-200 mt-1 leading-snug">
              Bahan menu <strong>{stockAlertToast.itemName}</strong> {stockAlertToast.isOut ? 'sudah habis (0). Tidak dapat dipesan.' : `telah mencapai titik minimum (${stockAlertToast.minStock} ${stockAlertToast.unit}). Harap segera restock!`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStockAlertToast(null)}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors shrink-0"
            title="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

function UtensilsCrossedIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8Z" />
      <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" />
      <path d="m2.1 21.8 6.4-6.3" />
      <path d="m19 5-7 7" />
    </svg>
  );
}
