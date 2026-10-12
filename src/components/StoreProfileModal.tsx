import React, { useState, useRef } from 'react';
import {
  Store,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  CheckCircle2,
  Phone,
  MapPin,
  Flame,
  X,
  FileText,
} from 'lucide-react';
import { StoreProfile } from '../types';
import { DEFAULT_LOGO_SVG } from '../utils/defaultData';
import { saveStoreProfile } from '../utils/storage';

interface StoreProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StoreProfile;
  onProfileUpdated: (updated: StoreProfile) => void;
  openResetModal?: () => void;
}

export const StoreProfileModal: React.FC<StoreProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
  openResetModal,
}) => {
  const [name, setName] = useState<string>(profile.name);
  const [slogan, setSlogan] = useState<string>(profile.slogan);
  const [address, setAddress] = useState<string>(profile.address);
  const [phone, setPhone] = useState<string>(profile.phone);
  const [logoUrl, setLogoUrl] = useState<string>(profile.logoUrl);
  const [receiptFooter, setReceiptFooter] = useState<string>(profile.receiptFooter);
  const [defaultCashier, setDefaultCashier] = useState<string>(profile.defaultCashier);
  const [instagram, setInstagram] = useState<string>(profile.instagram || '');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle Logo Upload from HP folder / Gallery
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar (JPG, PNG, atau WEBP)!');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/png', 0.9);
          setLogoUrl(compressed);
        } else {
          setLogoUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setLogoUrl(DEFAULT_LOGO_SVG);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama warung tidak boleh kosong!');
      return;
    }

    const updated: StoreProfile = {
      name: name.trim(),
      slogan: slogan.trim(),
      address: address.trim(),
      phone: phone.trim(),
      logoUrl: logoUrl.trim(),
      receiptFooter: receiptFooter.trim(),
      defaultCashier: defaultCashier.trim() || 'Kasir',
      instagram: instagram.trim() || undefined,
    };

    saveStoreProfile(updated);
    onProfileUpdated(updated);
    setSuccessMsg('Profil dan Logo Warung berhasil diperbarui!');
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-white">
              Profil Warung & Pengaturan Logo
            </h3>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg && (
          <div className="my-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 my-4">
          {/* Logo Warung Upload */}
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
            <label className="text-xs font-bold text-stone-300 block">
              Logo Warung (Bisa Ambil dari Folder / Galeri HP):
            </label>

            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-stone-900 border-2 border-stone-700 flex items-center justify-center flex-shrink-0 shadow-inner">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Flame className="w-8 h-8 text-rose-500" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-950/40 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Ambil Foto Logo dari HP</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="w-full py-1.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-stone-700 transition-colors"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                  <span>Reset ke Logo Seblak Cinta</span>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-stone-500">
              Logo ini akan muncul di header aplikasi dan kop struk cetak thermal printer.
            </p>
          </div>

          {/* Nama Warung */}
          <div>
            <label className="text-xs font-bold text-stone-300 block mb-1">
              Nama Warung / Usaha: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder='Contoh: Warung Seblak "Cinta"'
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Slogan */}
          <div>
            <label className="text-xs font-bold text-stone-300 block mb-1">
              Slogan / Tagline:
            </label>
            <input
              type="text"
              placeholder="Pedas Gurih Bikin Nagih! 🔥❤️"
              value={slogan}
              onChange={e => setSlogan(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Alamat Lengkap */}
          <div>
            <label className="text-xs font-bold text-stone-300 block mb-1">
              Alamat Lengkap Warung:
            </label>
            <textarea
              rows={2}
              placeholder="Jl. Dipati Ukur No. 88, Bandung (Samping Kampus)"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* No WhatsApp & Instagram */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-300 block mb-1">
                No HP / WhatsApp:
              </label>
              <input
                type="text"
                placeholder="0812-3456-7890"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-300 block mb-1">
                Akun Instagram (Opsional):
              </label>
              <input
                type="text"
                placeholder="@seblakcinta.id"
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Catatan Kaki Struk */}
          <div>
            <label className="text-xs font-bold text-stone-300 block mb-1">
              Catatan Kaki Struk (Receipt Footer):
            </label>
            <input
              type="text"
              placeholder="Matur nuhun tos jajan di Seblak Cinta! Follow IG @seblakcinta"
              value={receiptFooter}
              onChange={e => setReceiptFooter(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Setup Cabang Baru & Reset Data Banner */}
          {openResetModal && (
            <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">
                  Setup Cabang Baru / Bersihkan Data
                </span>
                <span className="text-[11px] text-stone-400 block">
                  Hapus transaksi lama atau atur ulang menu saat pindah cabang
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openResetModal();
                }}
                className="px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-bold whitespace-nowrap transition-colors"
              >
                Atur Ulang Data
              </button>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-3 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-stone-800 bg-stone-950 text-xs font-bold text-stone-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-lg shadow-amber-950/40"
            >
              Simpan Profil Warung
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
