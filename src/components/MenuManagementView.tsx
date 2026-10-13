import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Search,
  Upload,
  Image as ImageIcon,
  Flame,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  PackageCheck,
  PackageMinus,
} from 'lucide-react';
import { MenuItem, ProductCategory, UnitType } from '../types';
import { addMenuItem, updateMenuItem, deleteMenuItem } from '../utils/storage';
import { formatRupiah } from '../utils/printer';
import { parseNumberInput, formatNumberWithDots } from '../utils/numberUtils';

interface MenuManagementViewProps {
  menuItems: MenuItem[];
  onMenuUpdated: () => void;
}

interface StockToastInfo {
  type: 'IN' | 'OUT';
  title: string;
  itemName: string;
  diff: number;
  unit: string;
  reason: string;
}

const PRESET_IMAGES = [
  { label: 'Seblak Komplit', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&auto=format&fit=crop&q=80' },
  { label: 'Seblak Seafood', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80' },
  { label: 'Seblak Ceker Judes', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80' },
  { label: 'Dumpling Keju', url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=400&auto=format&fit=crop&q=80' },
  { label: 'Cuanki Crispy', url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&auto=format&fit=crop&q=80' },
  { label: 'Es Teh Manis', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80' },
  { label: 'Es Jeruk Segar', url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&auto=format&fit=crop&q=80' },
];

export const MenuManagementView: React.FC<MenuManagementViewProps> = ({
  menuItems,
  onMenuUpdated,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [category, setRoleCategory] = useState<ProductCategory>('Seblak');
  const [price, setPrice] = useState<number | string>(15000);
  const [costPrice, setCostPrice] = useState<number | string>(8000);
  const [stock, setStock] = useState<number | string>(30);
  const [minStock, setMinStock] = useState<number | string>(5);
  const [unit, setUnit] = useState<UnitType>('Porsi');
  const [allowSpicyLevel, setAllowSpicyLevel] = useState<boolean>(true);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Stock Notification Toast
  const [menuToast, setMenuToast] = useState<StockToastInfo | null>(null);

  useEffect(() => {
    if (!menuToast) return;
    const timer = setTimeout(() => {
      setMenuToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [menuToast]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filtered menu
  const filtered = useMemo(() => {
    return menuItems.filter(item => {
      const matchCat = selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setRoleCategory('Seblak');
    setPrice(15000);
    setCostPrice(8000);
    setStock(30);
    setMinStock(5);
    setUnit('Porsi');
    setAllowSpicyLevel(true);
    setImageUrl(PRESET_IMAGES[0].url);
    setDescription('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setRoleCategory(item.category);
    setPrice(item.price);
    setCostPrice(item.costPrice);
    setStock(item.stock);
    setMinStock(item.minStock ?? 5);
    setUnit(item.unit);
    setAllowSpicyLevel(item.allowSpicyLevel);
    setImageUrl(item.imageUrl);
    setDescription(item.description || '');
    setIsActive(item.isActive);
    setIsModalOpen(true);
  };

  // Upload image from HP Folder / Gallery
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file gambar (JPG, PNG, WEBP)!');
      return;
    }

    // Read and compress slightly using canvas if large
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setImageUrl(compressedDataUrl);
        } else {
          setImageUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama menu harus diisi!');
      return;
    }

    const numericPrice = parseNumberInput(price);
    const numericCostPrice = parseNumberInput(costPrice);
    const numericStock = parseNumberInput(stock);
    const numericMinStock = Math.max(0, parseNumberInput(minStock) || 5);

    if (numericPrice <= 0) {
      alert('Harga jual harus lebih dari 0! Contoh: ketik 2000 atau 2.000 untuk Rp 2.000');
      return;
    }

    const finalImage =
      imageUrl.trim() ||
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80';

    if (editingItem) {
      const stockDiff = numericStock - editingItem.stock;
      if (stockDiff > 0) {
        setMenuToast({
          type: 'IN',
          title: 'Stok Berhasil Ditambah! 📦✨',
          itemName: name.trim(),
          diff: stockDiff,
          unit,
          reason: 'Penambahan stok master menu',
        });
      } else if (stockDiff < 0) {
        setMenuToast({
          type: 'OUT',
          title: 'Stok Berhasil Dikurangi! ⚠️📉',
          itemName: name.trim(),
          diff: Math.abs(stockDiff),
          unit,
          reason: 'Koreksi data master menu (Kondisi Non-Penjualan)',
        });
      }

      updateMenuItem({
        ...editingItem,
        name: name.trim(),
        category,
        price: numericPrice,
        costPrice: numericCostPrice,
        stock: numericStock,
        minStock: numericMinStock,
        unit,
        allowSpicyLevel,
        imageUrl: finalImage,
        description: description.trim() || undefined,
        isActive,
      });
    } else {
      setMenuToast({
        type: 'IN',
        title: 'Menu & Stok Berhasil Ditambah! 📦✨',
        itemName: name.trim(),
        diff: numericStock,
        unit,
        reason: 'Input menu baru',
      });

      addMenuItem({
        name: name.trim(),
        category,
        price: numericPrice,
        costPrice: numericCostPrice,
        stock: numericStock,
        minStock: numericMinStock,
        unit,
        allowSpicyLevel,
        imageUrl: finalImage,
        description: description.trim() || undefined,
        isActive,
      });
    }

    onMenuUpdated();
    setIsModalOpen(false);
  };

  const handleDelete = (item: MenuItem) => {
    if (window.confirm(`Yakin ingin menghapus menu "${item.name}"?`)) {
      deleteMenuItem(item.id);
      onMenuUpdated();
    }
  };

  const categories = ['Semua', 'Seblak', 'Topping', 'Minuman', 'Paket', 'Lainnya'];

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-4">
      {/* View Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-lg mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-rose-500" />
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Kelola Menu & Foto
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Tambah, edit, hapus menu, atur harga jual & modal, level pedas, dan upload foto langsung dari galeri HP.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-950/40 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Menu Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 sm:p-4 shadow-md mb-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Cari nama menu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Menu Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(item => (
          <div
            key={item.id}
            className={`bg-stone-900 border rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between ${
              item.isActive ? 'border-stone-800' : 'border-stone-800/40 opacity-60'
            }`}
          >
            <div>
              {/* Image with badges */}
              <div className="relative aspect-4/3 w-full bg-stone-950">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-stone-950/80 backdrop-blur-md text-[10px] font-bold text-stone-300 border border-stone-700">
                  {item.category}
                </div>
                {item.allowSpicyLevel && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-rose-600/90 text-white text-[10px] font-bold flex items-center gap-0.5">
                    <Flame className="w-3 h-3 text-amber-300" />
                    <span>Level Pedas</span>
                  </div>
                )}
                {(() => {
                  const itemMin = item.minStock ?? 5;
                  const isOutOfStock = item.stock <= 0;
                  const isLow = item.stock <= itemMin;
                  return (
                    <div
                      className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md flex items-center gap-1 ${
                        isOutOfStock
                          ? 'bg-red-950/90 text-red-300 border border-red-700'
                          : isLow
                          ? 'bg-amber-950/90 text-amber-300 border border-amber-600/80 animate-pulse'
                          : 'bg-stone-900/90 text-stone-300 border border-stone-700'
                      }`}
                    >
                      {isLow && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                      <span>Stok: {item.stock} / Min: {itemMin} {item.unit}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Item Info */}
              <div className="p-3.5 space-y-1.5">
                <h3 className="font-bold text-sm text-white line-clamp-1">{item.name}</h3>
                {item.description && (
                  <p className="text-[11px] text-stone-400 line-clamp-2">{item.description}</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-500 block">Harga Jual:</span>
                    <span className="font-extrabold text-rose-400">{formatRupiah(item.price)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-500 block">Modal / Beli:</span>
                    <span className="font-medium text-stone-300 font-mono text-[11px]">
                      {formatRupiah(item.costPrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-3 bg-stone-950/60 border-t border-stone-800 flex items-center justify-between gap-2">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  item.isActive
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {item.isActive ? 'Tersedia' : 'Dinonaktifkan'}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditModal(item)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white"
                  title="Edit menu"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-red-950 text-stone-400 hover:text-red-400"
                  title="Hapus menu"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL TAMBAH / EDIT MENU --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-rose-500" />
                <h3 className="font-extrabold text-base text-white">
                  {editingItem ? 'Edit Menu' : 'Tambah Menu Baru'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-500 hover:text-stone-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form noValidate onSubmit={handleSave} className="space-y-4 my-4">
              {/* Foto Menu Upload dari Folder HP */}
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">
                  Foto Menu (Bisa Ambil dari Galeri/Folder HP):
                </label>

                <div className="flex items-center gap-3">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-stone-950 border border-stone-800 flex-shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-600">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center gap-2 border border-stone-700 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-rose-400" />
                      <span>Pilih Foto dari Folder HP / Kamera</span>
                    </button>
                    <p className="text-[10px] text-stone-500">
                      Format JPG, PNG atau WebP (akan otomatis dioptimasi)
                    </p>
                  </div>
                </div>

                {/* Preset Fast Picker */}
                <div className="mt-2.5">
                  <span className="text-[10px] text-stone-400 block mb-1">Atau pilih contoh foto:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                    {PRESET_IMAGES.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImageUrl(p.url)}
                        className={`text-[10px] px-2 py-1 rounded-lg border whitespace-nowrap transition-all ${
                          imageUrl === p.url
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nama Menu */}
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1">
                  Nama Menu: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Seblak Ceker Mercon Komplit"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Kategori & Satuan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Kategori:</label>
                  <select
                    value={category}
                    onChange={e => setRoleCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Seblak">Seblak</option>
                    <option value="Topping">Topping</option>
                    <option value="Minuman">Minuman</option>
                    <option value="Paket">Paket</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Satuan:</label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as UnitType)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Porsi">Porsi</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Gelas">Gelas</option>
                    <option value="Bungkus">Bungkus</option>
                    <option value="Mangkok">Mangkok</option>
                    <option value="Butir">Butir</option>
                  </select>
                </div>
              </div>

              {/* Harga Jual & Harga Modal */}
              {(() => {
                const parsedPrice = parseNumberInput(price);
                const parsedCostPrice = parseNumberInput(costPrice);
                const profit = parsedPrice - parsedCostPrice;
                const profitMargin = parsedPrice > 0 ? Math.round((profit / parsedPrice) * 100) : 0;

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-stone-300">
                            Harga Jual (Rp): <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[11px] font-mono font-bold text-rose-400">
                            {formatRupiah(parsedPrice)}
                          </span>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          placeholder="Misal: 2000 atau 2.000"
                          value={price}
                          onChange={e => setPrice(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                        />
                        <div className="flex items-center gap-1 mt-1.5 overflow-x-auto scrollbar-none pb-0.5">
                          <span className="text-[10px] text-stone-500 whitespace-nowrap">Cepat:</span>
                          {[1000, 2000, 3000, 5000, 10000, 15000].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setPrice(val)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 text-stone-400 hover:text-rose-300 hover:border-rose-500 whitespace-nowrap font-mono"
                            >
                              {formatNumberWithDots(val)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-stone-300">
                            Harga Modal / Beli (Rp):
                          </label>
                          <span className="text-[11px] font-mono font-bold text-stone-300">
                            {formatRupiah(parsedCostPrice)}
                          </span>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Misal: 1000 atau 1.000"
                          value={costPrice}
                          onChange={e => setCostPrice(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm font-mono text-stone-200 focus:outline-none focus:border-rose-500"
                        />
                        <div className="flex items-center gap-1 mt-1.5 overflow-x-auto scrollbar-none pb-0.5">
                          <span className="text-[10px] text-stone-500 whitespace-nowrap">Cepat:</span>
                          {[500, 1000, 1500, 2000, 5000, 8000].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setCostPrice(val)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-600 whitespace-nowrap font-mono"
                            >
                              {formatNumberWithDots(val)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Ringkasan Estimasi Laba */}
                    <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-stone-400 block font-medium">Estimasi Keuntungan / Laba Satuan:</span>
                        <span className={`text-xs sm:text-sm font-extrabold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {profit >= 0 ? '+' : ''}{formatRupiah(profit)}
                          <span className="text-[11px] font-normal ml-1 text-stone-400">
                            ({profitMargin}% margin)
                          </span>
                        </span>
                      </div>
                      <div className="text-right text-[10px] text-stone-500 font-mono">
                        <div>Jual: {formatRupiah(parsedPrice)}</div>
                        <div>Modal: {formatRupiah(parsedCostPrice)}</div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Stok Saat Ini & Titik Minimum Stok untuk Peringatan POS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-stone-300">
                      Stok Tersedia Saat Ini:
                    </label>
                    <span className="text-[11px] font-mono text-stone-400">
                      {parseNumberInput(stock)} {unit}
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Contoh: 30"
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm font-mono text-stone-200 focus:outline-none focus:border-rose-500"
                  />
                  <div className="flex items-center gap-1 mt-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    <span className="text-[10px] text-stone-500 whitespace-nowrap">Stok:</span>
                    {[10, 25, 50, 100].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setStock(val)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200 whitespace-nowrap font-mono"
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Titik Min. Stok (Peringatan):</span>
                    </label>
                    <span className="text-[11px] font-mono text-amber-400 font-bold">
                      {parseNumberInput(minStock) || 5} {unit}
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Contoh: 5"
                    value={minStock}
                    onChange={e => setMinStock(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-amber-900/60 rounded-xl text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center gap-1 mt-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    <span className="text-[10px] text-stone-500 whitespace-nowrap">Min:</span>
                    {[3, 5, 10, 15, 20].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMinStock(val)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 text-amber-400/80 hover:text-amber-200 hover:border-amber-700 whitespace-nowrap font-mono"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1 leading-tight">
                    Jika stok menu ≤ angka ini, kasir akan melihat peringatan di POS.
                  </p>
                </div>
              </div>

              {/* Opsi Level Pedas */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-300">
                  <input
                    type="checkbox"
                    checked={allowSpicyLevel}
                    onChange={e => setAllowSpicyLevel(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 rounded"
                  />
                  <span>Aktifkan Opsi Level Pedas (Level 0 - 5) untuk menu ini</span>
                </label>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1">
                  Deskripsi / Komposisi:
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Kerupuk basah, mie, sosis, bakso dengan kuah kencur gurih."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Status Tersedia */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800">
                <span className="text-xs font-bold text-white">Status Menu Aktif (Tersedia)</span>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-800 bg-stone-950 text-xs font-bold text-stone-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-950/40"
                >
                  Simpan Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Menu Stock Notification Toast */}
      {menuToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-top-4 transition-all">
          <div
            className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md relative ${
              menuToast.type === 'IN'
                ? 'bg-stone-900/95 border-emerald-500/80 text-stone-100 shadow-emerald-950/60'
                : 'bg-stone-900/95 border-amber-500/80 text-stone-100 shadow-amber-950/60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    menuToast.type === 'IN'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {menuToast.type === 'IN' ? (
                    <PackageCheck className="w-5 h-5" />
                  ) : (
                    <PackageMinus className="w-5 h-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4
                      className={`font-black text-sm ${
                        menuToast.type === 'IN' ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      {menuToast.title}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        menuToast.type === 'IN'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                          : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                      }`}
                    >
                      {menuToast.type === 'IN'
                        ? `+${menuToast.diff} ${menuToast.unit}`
                        : `-${menuToast.diff} ${menuToast.unit}`}
                    </span>
                    {menuToast.type === 'OUT' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-900/50 text-amber-300 border border-amber-700/60">
                        Kondisi Non-Penjualan
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-200 leading-snug">
                    Bahan menu <strong className="text-white">{menuToast.itemName}</strong>{' '}
                    {menuToast.type === 'IN' ? 'berhasil ditambah' : 'berhasil dikurangi'}{' '}
                    sebanyak{' '}
                    <strong
                      className={menuToast.type === 'IN' ? 'text-emerald-400' : 'text-amber-400'}
                    >
                      {menuToast.type === 'IN' ? '+' : '-'}
                      {menuToast.diff} {menuToast.unit}
                    </strong>
                    .
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Keterangan: {menuToast.reason}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMenuToast(null)}
                className="text-stone-500 hover:text-stone-300 p-1 rounded-lg hover:bg-stone-800 shrink-0 transition-colors"
                title="Tutup Notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
