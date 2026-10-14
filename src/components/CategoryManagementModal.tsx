import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Layers,
  Sparkles,
  AlertTriangle,
  FolderTree,
  ChevronDown,
  ChevronRight,
  Database,
  RefreshCw,
  Search,
  CheckCircle2,
  Info,
  Tag,
} from 'lucide-react';
import { CategoryItem, SubCategoryItem, MenuItem } from '../types';
import {
  getCategories,
  saveCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  addSubCategory,
  updateSubCategory,
  deleteSubCategory,
  resetCategoriesToDefault,
  reorganizeAndMigrateDatabase,
} from '../utils/storage';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  onUpdated: () => void;
}

const EMOJI_OPTIONS = [
  '🔥', '🥟', '🥤', '⭐', '🍟', '🍢', '🍜', '🍰',
  '☕', '🍱', '🏷️', '🌶️', '🥣', '🥪', '🥩', '🍹',
  '🍦', '🥘', '🍳', '🧂', '🧀', '🍗', '🥚', '🌽'
];

const COLOR_OPTIONS = [
  { id: 'rose', label: 'Merah Pedas (Rose)', bg: 'bg-rose-950/60 text-rose-300 border-rose-700/60 ring-rose-500' },
  { id: 'amber', label: 'Kuning Gurih (Amber)', bg: 'bg-amber-950/60 text-amber-300 border-amber-700/60 ring-amber-500' },
  { id: 'sky', label: 'Biru Segar (Sky)', bg: 'bg-sky-950/60 text-sky-300 border-sky-700/60 ring-sky-500' },
  { id: 'purple', label: 'Ungu Spesial (Purple)', bg: 'bg-purple-950/60 text-purple-300 border-purple-700/60 ring-purple-500' },
  { id: 'orange', label: 'Oranye Renyah (Orange)', bg: 'bg-orange-950/60 text-orange-300 border-orange-700/60 ring-orange-500' },
  { id: 'emerald', label: 'Hijau Sehat (Emerald)', bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 ring-emerald-500' },
  { id: 'stone', label: 'Abu Netral (Stone)', bg: 'bg-stone-800 text-stone-300 border-stone-700 ring-stone-400' },
];

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  menuItems,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'reorganize'>('list');
  const [categories, setCategories] = useState<CategoryItem[]>(() => getCategories());
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Expanded category cards
  const [expandedCatIds, setExpandedCatIds] = useState<Record<string, boolean>>({});

  // Inline new subcategory inputs: { [categoryId]: string }
  const [newSubInputs, setNewSubInputs] = useState<Record<string, string>>({});

  // Editing Category state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('🔥');
  const [editCatColor, setEditCatColor] = useState('rose');
  const [editCatDesc, setEditCatDesc] = useState('');

  // Editing Subcategory state
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState('');

  // Delete category confirmation dialog
  const [catToDelete, setCatToDelete] = useState<CategoryItem | null>(null);
  const [fallbackCatName, setFallbackCatName] = useState<string>('Lainnya');

  // Form for New Category
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🔥');
  const [newCatColor, setNewCatColor] = useState('rose');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatInitialSubs, setNewCatInitialSubs] = useState<string[]>([]);
  const [tempSubInput, setTempSubInput] = useState('');

  // Re-sync local state when opened or updated
  const refreshCategories = () => {
    const fresh = getCategories();
    setCategories(fresh);
    onUpdated();
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  // Toggle category expand
  const toggleExpand = (catId: string) => {
    setExpandedCatIds(prev => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Calculate stats
  const totalSubCount = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.subCategories?.length || 0), 0);
  }, [categories]);

  // Map of items count per category & subcategory
  const itemsCountPerCat = useMemo(() => {
    const map: Record<string, number> = {};
    menuItems.forEach(item => {
      map[item.category] = (map[item.category] || 0) + 1;
    });
    return map;
  }, [menuItems]);

  const itemsCountPerSub = useMemo(() => {
    const map: Record<string, number> = {};
    menuItems.forEach(item => {
      if (item.subCategory) {
        const key = `${item.category}:::${item.subCategory}`;
        map[key] = (map[key] || 0) + 1;
      }
    });
    return map;
  }, [menuItems]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase().trim();
    return categories.filter(c => {
      const matchCat = c.name.toLowerCase().includes(query) || (c.description && c.description.toLowerCase().includes(query));
      const matchSub = c.subCategories?.some(s => s.name.toLowerCase().includes(query));
      return matchCat || matchSub;
    });
  }, [categories, searchQuery]);

  // Handlers for Category Editing
  const startEditCategory = (cat: CategoryItem) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatIcon(cat.icon || '🏷️');
    setEditCatColor(cat.color || 'rose');
    setEditCatDesc(cat.description || '');
  };

  const saveEditCategory = (cat: CategoryItem) => {
    if (!editCatName.trim()) {
      showToast('error', 'Nama kategori tidak boleh kosong');
      return;
    }
    const updated: CategoryItem = {
      ...cat,
      name: editCatName.trim(),
      icon: editCatIcon,
      color: editCatColor,
      description: editCatDesc.trim(),
    };
    updateCategory(updated);
    setEditingCatId(null);
    refreshCategories();
    showToast('success', `Kategori "${updated.name}" berhasil diperbarui`);
  };

  // Handlers for Category Deletion
  const confirmDeleteCategory = (cat: CategoryItem) => {
    const count = itemsCountPerCat[cat.name] || 0;
    const otherCats = categories.filter(c => c.id !== cat.id);
    if (otherCats.length > 0) {
      setFallbackCatName(otherCats[0].name);
    }
    setCatToDelete(cat);
  };

  const executeDeleteCategory = () => {
    if (!catToDelete) return;
    const res = deleteCategory(catToDelete.id, fallbackCatName);
    setCatToDelete(null);
    refreshCategories();
    if (res.success) {
      showToast('success', res.message);
    } else {
      showToast('error', res.message);
    }
  };

  // Handlers for Subcategory
  const handleAddSubCategory = (catId: string) => {
    const subName = (newSubInputs[catId] || '').trim();
    if (!subName) {
      showToast('error', 'Masukkan nama sub kategori terlebih dahulu');
      return;
    }

    const created = addSubCategory(catId, subName);
    if (created) {
      setNewSubInputs(prev => ({ ...prev, [catId]: '' }));
      refreshCategories();
      showToast('success', `Sub kategori "${subName}" berhasil ditambahkan`);
    }
  };

  const startEditSub = (sub: SubCategoryItem) => {
    setEditingSubId(sub.id);
    setEditSubName(sub.name);
  };

  const saveEditSub = (catId: string, sub: SubCategoryItem) => {
    if (!editSubName.trim()) {
      showToast('error', 'Nama sub kategori tidak boleh kosong');
      return;
    }
    updateSubCategory(catId, {
      ...sub,
      name: editSubName.trim(),
    });
    setEditingSubId(null);
    refreshCategories();
    showToast('success', `Sub kategori diubah menjadi "${editSubName.trim()}"`);
  };

  const handleDeleteSub = (catId: string, sub: SubCategoryItem, catName: string) => {
    const count = itemsCountPerSub[`${catName}:::${sub.name}`] || 0;
    const confirmMsg = count > 0
      ? `Sub kategori "${sub.name}" digunakan oleh ${count} menu. Yakin ingin menghapusnya? (Label sub kategori pada menu tersebut akan dikosongkan).`
      : `Yakin ingin menghapus sub kategori "${sub.name}"?`;

    if (window.confirm(confirmMsg)) {
      const res = deleteSubCategory(catId, sub.id);
      refreshCategories();
      if (res.success) {
        showToast('success', `Sub kategori "${sub.name}" berhasil dihapus`);
      }
    }
  };

  // Add initial sub in create form
  const handleAddInitialSub = () => {
    if (!tempSubInput.trim()) return;
    if (!newCatInitialSubs.includes(tempSubInput.trim())) {
      setNewCatInitialSubs([...newCatInitialSubs, tempSubInput.trim()]);
    }
    setTempSubInput('');
  };

  const handleRemoveInitialSub = (index: number) => {
    setNewCatInitialSubs(newCatInitialSubs.filter((_, idx) => idx !== index));
  };

  // Create New Category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showToast('error', 'Nama kategori wajib diisi');
      return;
    }

    // Check duplicate name
    if (categories.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase())) {
      showToast('error', `Kategori "${newCatName.trim()}" sudah ada! Gunakan nama lain.`);
      return;
    }

    const created = addCategory(
      newCatName.trim(),
      newCatDesc.trim(),
      newCatIcon,
      newCatColor,
      newCatInitialSubs
    );

    // Reset form
    setNewCatName('');
    setNewCatDesc('');
    setNewCatInitialSubs([]);
    setTempSubInput('');
    setActiveTab('list');
    refreshCategories();
    showToast('success', `Kategori baru "${created.name}" dengan ${created.subCategories.length} sub kategori berhasil ditambahkan!`);
  };

  // Run Database Reorganization
  const handleRunReorganize = () => {
    const res = reorganizeAndMigrateDatabase();
    refreshCategories();
    showToast(
      'success',
      `Penataan ulang database berhasil! ${res.migratedItems} menu disinkronkan ke sub kategori, total ${res.categoriesCount} kategori aktif.`
    );
  };

  // Reset to default
  const handleResetDefaults = () => {
    if (
      window.confirm(
        'PERINGATAN: Apakah Anda yakin ingin memulihkan kategori & sub kategori ke standar bawaan Warung Seblak Cinta? Kategori kustom buatan Anda akan direset ke standar.'
      )
    ) {
      resetCategoriesToDefault();
      reorganizeAndMigrateDatabase();
      refreshCategories();
      showToast('success', 'Kategori & sub kategori berhasil dipulihkan ke standar bawaan warung.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 bg-stone-950/80 border-b border-stone-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Kelola Kategori & Sub Kategori
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-950 border border-rose-800 text-rose-300">
                  {categories.length} Kategori
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950 border border-amber-800 text-amber-300">
                  {totalSubCount} Sub Kategori
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Atur struktur menu, buat kategori baru, hapus kategori, tambah sub kategori, dan tata ulang database.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Toast */}
        {feedbackMessage && (
          <div
            className={`mx-4 sm:mx-6 mt-3 p-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-md ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-200'
                : 'bg-rose-950/80 border border-rose-700 text-rose-200'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center px-4 sm:px-6 pt-3 border-b border-stone-800 bg-stone-900/40 gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'list'
                ? 'border-rose-500 text-rose-400 bg-stone-900 shadow-sm'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-850'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Daftar Kategori & Sub Kategori ({categories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'add'
                ? 'border-rose-500 text-rose-400 bg-stone-900 shadow-sm'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-850'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Kategori Baru</span>
          </button>

          <button
            onClick={() => setActiveTab('reorganize')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'reorganize'
                ? 'border-rose-500 text-rose-400 bg-stone-900 shadow-sm'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-850'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Tata Ulang Database</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: LIST CATEGORIES & SUBCATEGORIES */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Search & Actions Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-950/60 p-3 rounded-2xl border border-stone-800">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                  <input
                    type="text"
                    placeholder="Cari kategori atau sub kategori..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-rose-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const allIds: Record<string, boolean> = {};
                      categories.forEach(c => {
                        allIds[c.id] = true;
                      });
                      setExpandedCatIds(allIds);
                    }}
                    className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-[11px] font-bold text-stone-300 transition-colors"
                  >
                    Buka Semua Sub
                  </button>
                  <button
                    onClick={() => setExpandedCatIds({})}
                    className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-[11px] font-bold text-stone-300 transition-colors"
                  >
                    Tutup Semua
                  </button>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Kategori Baru</span>
                  </button>
                </div>
              </div>

              {/* Categories Cards */}
              <div className="space-y-3.5">
                {filteredCategories.length === 0 ? (
                  <div className="p-8 text-center text-stone-500 bg-stone-950/40 rounded-2xl border border-stone-800">
                    <Tag className="w-10 h-10 text-stone-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm">Tidak ada kategori yang cocok</p>
                    <p className="text-xs text-stone-600 mt-1">Coba gunakan kata kunci lain atau tambahkan kategori baru.</p>
                  </div>
                ) : (
                  filteredCategories.map(cat => {
                    const isExpanded = expandedCatIds[cat.id] ?? true; // default open
                    const isEditing = editingCatId === cat.id;
                    const itemsInCatCount = itemsCountPerCat[cat.name] || 0;
                    const subList = cat.subCategories || [];

                    return (
                      <div
                        key={cat.id}
                        className="bg-stone-950/80 border border-stone-800/90 rounded-2xl overflow-hidden transition-all hover:border-stone-700 shadow-md"
                      >
                        {/* Category Card Header */}
                        <div className="p-3.5 sm:p-4 bg-stone-900/70 border-b border-stone-800/60 flex items-center justify-between gap-3">
                          {isEditing ? (
                            <div className="flex-1 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                <div className="sm:col-span-2">
                                  <label className="text-[10px] text-stone-400 block mb-0.5">Ikon/Emoji:</label>
                                  <input
                                    type="text"
                                    value={editCatIcon}
                                    onChange={e => setEditCatIcon(e.target.value)}
                                    className="w-full text-center px-2 py-1.5 bg-stone-950 border border-stone-700 rounded-xl text-lg text-white"
                                  />
                                </div>
                                <div className="sm:col-span-6">
                                  <label className="text-[10px] text-stone-400 block mb-0.5">Nama Kategori:</label>
                                  <input
                                    type="text"
                                    value={editCatName}
                                    onChange={e => setEditCatName(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-stone-950 border border-stone-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-rose-500"
                                  />
                                </div>
                                <div className="sm:col-span-4">
                                  <label className="text-[10px] text-stone-400 block mb-0.5">Warna Badge:</label>
                                  <select
                                    value={editCatColor}
                                    onChange={e => setEditCatColor(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-stone-950 border border-stone-700 rounded-xl text-xs text-white"
                                  >
                                    {COLOR_OPTIONS.map(c => (
                                      <option key={c.id} value={c.id}>
                                        {c.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <input
                                type="text"
                                placeholder="Deskripsi singkat (opsional)..."
                                value={editCatDesc}
                                onChange={e => setEditCatDesc(e.target.value)}
                                className="w-full px-3 py-1 bg-stone-950 border border-stone-800 rounded-xl text-[11px] text-stone-300"
                              />
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => saveEditCategory(cat)}
                                  className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Simpan Perubahan</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCatId(null)}
                                  className="px-3 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div
                                onClick={() => toggleExpand(cat.id)}
                                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                              >
                                <button
                                  type="button"
                                  className="text-stone-400 hover:text-white transition-colors p-1"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-stone-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-stone-400" />
                                  )}
                                </button>

                                <span className="text-xl sm:text-2xl shrink-0 p-1 bg-stone-950 rounded-xl border border-stone-800/80">
                                  {cat.icon || '🏷️'}
                                </span>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-black text-sm sm:text-base text-white truncate">
                                      {cat.name}
                                    </h4>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-800 border border-stone-700 text-stone-300">
                                      {subList.length} Sub Kategori
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 border border-rose-800/60 text-rose-300">
                                      {itemsInCatCount} Menu Terdaftar
                                    </span>
                                  </div>
                                  {cat.description && (
                                    <p className="text-[11px] text-stone-400 truncate mt-0.5">
                                      {cat.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Category Action Buttons */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startEditCategory(cat)}
                                  className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
                                  title="Ubah nama & ikon kategori"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => confirmDeleteCategory(cat)}
                                  className="p-1.5 rounded-xl bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-400 border border-transparent hover:border-rose-800/60 transition-colors"
                                  title="Hapus kategori"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Subcategories Panel (Expandable) */}
                        {isExpanded && (
                          <div className="p-3.5 sm:p-4 bg-stone-950/40 space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-stone-400">
                              <span className="flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-amber-400" />
                                <span>Daftar Sub Kategori di Bawah &quot;{cat.name}&quot;:</span>
                              </span>
                              <span className="text-[11px] text-stone-500">
                                Total: {subList.length} sub
                              </span>
                            </div>

                            {/* Subcategories tags grid */}
                            <div className="flex flex-wrap gap-2 items-center">
                              {subList.length === 0 ? (
                                <p className="text-xs text-stone-500 italic py-1">
                                  Belum ada sub kategori. Tambahkan sub kategori di bawah ini agar menu lebih rapi.
                                </p>
                              ) : (
                                subList.map(sub => {
                                  const isSubEditing = editingSubId === sub.id;
                                  const subCount = itemsCountPerSub[`${cat.name}:::${sub.name}`] || 0;

                                  if (isSubEditing) {
                                    return (
                                      <div
                                        key={sub.id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-900 border border-rose-500 shadow-md"
                                      >
                                        <input
                                          type="text"
                                          value={editSubName}
                                          onChange={e => setEditSubName(e.target.value)}
                                          className="bg-transparent text-xs text-white font-bold focus:outline-none w-32"
                                          autoFocus
                                        />
                                        <button
                                          type="button"
                                          onClick={() => saveEditSub(cat.id, sub)}
                                          className="text-emerald-400 hover:text-emerald-300 p-0.5"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingSubId(null)}
                                          className="text-stone-400 hover:text-stone-200 p-0.5"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={sub.id}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900/90 border border-stone-800 hover:border-stone-700 transition-all text-xs group"
                                    >
                                      <span className="font-semibold text-stone-200">
                                        {sub.name}
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold bg-stone-950 text-stone-400 border border-stone-800">
                                        {subCount}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => startEditSub(sub)}
                                        className="text-stone-500 hover:text-stone-300 transition-colors p-0.5"
                                        title="Ubah nama sub kategori"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSub(cat.id, sub, cat.name)}
                                        className="text-stone-500 hover:text-rose-400 transition-colors p-0.5"
                                        title="Hapus sub kategori"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Inline Form to Add New Subcategory */}
                            <div className="pt-2 border-t border-stone-800/60 flex items-center gap-2">
                              <input
                                type="text"
                                placeholder={`+ Tambah sub kategori baru untuk "${cat.name}"...`}
                                value={newSubInputs[cat.id] || ''}
                                onChange={e =>
                                  setNewSubInputs({
                                    ...newSubInputs,
                                    [cat.id]: e.target.value,
                                  })
                                }
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddSubCategory(cat.id);
                                  }
                                }}
                                className="flex-1 px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddSubCategory(cat.id)}
                                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambah Sub</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TAMBAH KATEGORI BARU */}
          {activeTab === 'add' && (
            <form onSubmit={handleCreateCategory} className="space-y-4 max-w-2xl mx-auto">
              <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone-800">
                  <div className="w-8 h-8 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-white">
                      Buat Kategori Menu Baru
                    </h4>
                    <p className="text-xs text-stone-400">
                      Kategori akan langsung muncul di POS Kasir, Kelola Menu, dan Laporan Stok.
                    </p>
                  </div>
                </div>

                {/* Nama Kategori */}
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Nama Kategori: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Cemilan Kering, Aneka Minuman Boba, Dimsum..."
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-sm font-bold text-white placeholder-stone-600 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Ikon / Emoji Picker */}
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Pilih Ikon / Emoji Kategori:
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl p-2 bg-stone-900 border border-rose-500 rounded-xl">
                      {newCatIcon}
                    </span>
                    <input
                      type="text"
                      value={newCatIcon}
                      onChange={e => setNewCatIcon(e.target.value)}
                      placeholder="Atau ketik emoji..."
                      className="px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white w-40 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-stone-900/60 rounded-xl border border-stone-800">
                    {EMOJI_OPTIONS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewCatIcon(emoji)}
                        className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                          newCatIcon === emoji
                            ? 'bg-rose-600 scale-110 shadow-md ring-2 ring-rose-400'
                            : 'hover:bg-stone-800 text-stone-300'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Warna Badge */}
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Warna Tema Badge:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COLOR_OPTIONS.map(col => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setNewCatColor(col.id)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                          newCatColor === col.id
                            ? `${col.bg} ring-2`
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                        }`}
                      >
                        <span>{col.label}</span>
                        {newCatColor === col.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deskripsi */}
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Deskripsi Singkat (Opsional):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Aneka cemilan renyah pelengkap seblak..."
                    value={newCatDesc}
                    onChange={e => setNewCatDesc(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Sub Kategori Awal */}
                <div className="pt-2 border-t border-stone-800">
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Sub Kategori Awal (Opsional):
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Ketik nama sub kategori (misal: Kerupuk Kulit, Cireng)..."
                      value={tempSubInput}
                      onChange={e => setTempSubInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddInitialSub();
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddInitialSub}
                      className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>

                  {newCatInitialSubs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-stone-900/60 rounded-xl border border-stone-800">
                      {newCatInitialSubs.map((sub, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 text-stone-200 text-xs font-semibold"
                        >
                          <span>{sub}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveInitialSub(idx)}
                            className="text-stone-400 hover:text-rose-400 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-rose-950/50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan & Buat Kategori</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: TATA ULANG DATABASE */}
          {activeTab === 'reorganize' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              {/* Card 1: Reorganize Database */}
              <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-600/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-white">
                      Tata Ulang & Sinkronkan Database
                    </h4>
                    <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                      Sistem akan memvalidasi seluruh data produk menu yang ada di penyimpanan lokal. Menu yang belum memiliki sub-kategori akan otomatis dipetakan ke sub-kategori standar yang sesuai agar laporan dan kasir tersusun rapi.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-stone-900 rounded-xl border border-stone-800 text-xs text-stone-300 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Sinkronisasi relasi kategori & sub-kategori pada setiap item menu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Pembersihan nama dan pembaruan struktur ke database versi terbaru</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Mempertahankan riwayat transaksi dan stok tanpa kehilangan data</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunReorganize}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Jalankan Penataan Ulang Database Sekarang</span>
                </button>
              </div>

              {/* Card 2: Reset to Defaults */}
              <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-white">
                      Pulihkan Kategori Standar Warung
                    </h4>
                    <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                      Mengembalikan daftar kategori lengkap bawaan: <strong>Seblak</strong>, <strong>Topping</strong>, <strong>Minuman</strong>, <strong>Paket</strong>, <strong>Cemilan & Snack</strong>, dan <strong>Lainnya</strong> beserta seluruh sub kategorinya.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="w-full py-2.5 rounded-xl bg-amber-600/80 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Pulihkan Kategori Standar Bawaan Warung</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-950/80 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-stone-500" />
            <span>Perubahan kategori & sub kategori otomatis tersimpan dan aktif di seluruh HP staf.</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* CONFIRM DELETE CATEGORY MODAL */}
      {catToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-rose-800/80 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-base text-white">
                  Hapus Kategori &quot;{catToDelete.name}&quot;?
                </h4>
                <p className="text-xs text-stone-400 mt-1">
                  Tindakan ini akan menghapus kategori beserta seluruh sub kategori di dalamnya.
                </p>
              </div>
            </div>

            {itemsCountPerCat[catToDelete.name] > 0 && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs text-amber-200 space-y-2">
                <p>
                  ⚠️ Terdapat <strong>{itemsCountPerCat[catToDelete.name]} menu</strong> yang saat ini menggunakan kategori ini.
                </p>
                <div>
                  <label className="font-bold text-stone-300 block mb-1">
                    Alihkan menu tersebut ke kategori:
                  </label>
                  <select
                    value={fallbackCatName}
                    onChange={e => setFallbackCatName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {categories
                      .filter(c => c.id !== catToDelete.id)
                      .map(c => (
                        <option key={c.id} value={c.name}>
                          {c.icon || '🏷️'} {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCatToDelete(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteCategory}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Kategori</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
