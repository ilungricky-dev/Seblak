import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  Key,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  AlertCircle,
  X,
  Sparkles,
  CheckSquare,
  Square,
  ShieldCheck,
  HelpCircle,
  Check,
  Smartphone,
} from 'lucide-react';
import { Employee, AppFeature } from '../types';
import {
  addEmployee,
  updateEmployee,
  deleteEmployee,
  setActiveEmployee,
  isOwnerAccount,
} from '../utils/storage';
import {
  ALL_APP_FEATURES,
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PRESETS,
} from '../utils/defaultData';

interface EmployeeManagementViewProps {
  employees: Employee[];
  activeEmployee: Employee;
  onEmployeesUpdated: () => void;
  onActiveEmployeeChanged: (emp: Employee) => void;
  openShareModal?: () => void;
}

const PRESET_JABATAN_SUGGESTIONS = [
  'Kasir',
  'Koki / Dapur',
  'Barista / Minuman',
  'Pelayan / Waiter',
  'Supervisor / Manager',
  'Admin Keuangan',
  'Staff Gudang',
];

export const EmployeeManagementView: React.FC<EmployeeManagementViewProps> = ({
  employees,
  activeEmployee,
  onEmployeesUpdated,
  onActiveEmployeeChanged,
  openShareModal,
}) => {
  const isOwner = isOwnerAccount(activeEmployee);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form fields
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<string>('Kasir');
  const [selectedPermissions, setSelectedPermissions] = useState<AppFeature[]>([
    'pos',
    'report_sales',
    'printer',
  ]);
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [pin, setPin] = useState<string>('1234');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [joinDate, setJoinDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  // PIN switch & reveal states
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [switchPinModal, setSwitchPinModal] = useState<Employee | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // If not owner, strictly deny access
  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center animate-in fade-in">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-950/80 border border-rose-700/60 text-rose-400 flex items-center justify-center mb-4 shadow-xl">
          <Shield className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-white">Khusus Akun Pemilik (Owner)</h3>
        <p className="text-xs text-stone-400 mt-2 leading-relaxed">
          Pengaturan akses dan manajemen data karyawan hanya dapat dilakukan oleh user dengan peran{' '}
          <span className="text-rose-400 font-bold">Owner (Pemilik Warung)</span>.
          <br />
          Anda saat ini sedang login sebagai{' '}
          <span className="font-bold text-white">{activeEmployee.name}</span> ({activeEmployee.role}).
        </p>
      </div>
    );
  }

  const togglePinReveal = (id: string) => {
    setRevealedPins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectJabatanSuggestion = (suggested: string) => {
    setRole(suggested);
    // Suggest relevant preset permissions if available
    const presetPerms = DEFAULT_ROLE_PRESETS[suggested];
    if (presetPerms) {
      setSelectedPermissions([...presetPerms]);
    }
  };

  const togglePermission = (featureId: AppFeature) => {
    setSelectedPermissions(prev => {
      if (prev.includes(featureId)) {
        return prev.filter(f => f !== featureId);
      } else {
        return [...prev, featureId];
      }
    });
  };

  const selectAllPermissions = () => {
    setSelectedPermissions([...ALL_PERMISSION_KEYS]);
  };

  const clearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const applyPresetPermissions = (presetKey: string) => {
    const preset = DEFAULT_ROLE_PRESETS[presetKey];
    if (preset) {
      setSelectedPermissions([...preset]);
    }
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setName('');
    setRole('Kasir');
    setSelectedPermissions(['pos', 'report_sales', 'printer']);
    setPhone('');
    setEmail('');
    setPin('1234');
    setIsActive(true);
    setJoinDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setRole(emp.role);
    setSelectedPermissions(
      Array.isArray(emp.permissions) && emp.permissions.length > 0
        ? [...emp.permissions]
        : isOwnerAccount(emp)
        ? [...ALL_PERMISSION_KEYS]
        : (DEFAULT_ROLE_PRESETS[emp.role] || ['pos'])
    );
    setPhone(emp.phone);
    setEmail(emp.email || '');
    setPin(emp.pin);
    setIsActive(emp.isActive);
    setJoinDate(emp.joinDate);
    setNotes(emp.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama karyawan harus diisi!');
      return;
    }
    if (!role.trim()) {
      alert('Nama status / jabatan karyawan harus diisi!');
      return;
    }
    if (!pin.trim() || pin.length < 4) {
      alert('PIN akses minimal 4 digit angka!');
      return;
    }

    const isCurrentTargetOwner = editingEmployee ? isOwnerAccount(editingEmployee) : false;
    const finalPermissions: AppFeature[] = isCurrentTargetOwner
      ? ALL_PERMISSION_KEYS
      : selectedPermissions.length > 0
      ? selectedPermissions
      : (['pos'] as AppFeature[]);

    if (editingEmployee) {
      updateEmployee({
        ...editingEmployee,
        name: name.trim(),
        role: role.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        pin: pin.trim(),
        isActive,
        joinDate,
        notes: notes.trim() || undefined,
        permissions: finalPermissions,
      });
    } else {
      addEmployee({
        name: name.trim(),
        role: role.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        pin: pin.trim(),
        isActive,
        joinDate,
        notes: notes.trim() || undefined,
        permissions: finalPermissions,
      });
    }

    onEmployeesUpdated();
    setIsModalOpen(false);
  };

  const handleDelete = (emp: Employee) => {
    if (isOwnerAccount(emp)) {
      alert('Akun Pemilik (Owner) utama tidak dapat dihapus demi keamanan sistem warung.');
      return;
    }
    if (activeEmployee.id === emp.id) {
      alert('Tidak dapat menghapus akun yang sedang aktif digunakan saat ini.');
      return;
    }
    if (window.confirm(`Hapus karyawan "${emp.name}" (Jabatan: ${emp.role}) dari sistem?`)) {
      deleteEmployee(emp.id);
      onEmployeesUpdated();
    }
  };

  const handleSwitchStaff = (emp: Employee) => {
    if (emp.id === activeEmployee.id) return;
    setSwitchPinModal(emp);
    setEnteredPin('');
    setPinError(null);
  };

  const confirmSwitchPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!switchPinModal) return;
    if (enteredPin.trim() === switchPinModal.pin) {
      setActiveEmployee(switchPinModal);
      onActiveEmployeeChanged(switchPinModal);
      setSwitchPinModal(null);
    } else {
      setPinError('PIN salah! Silakan coba lagi.');
    }
  };

  const getRoleBadgeStyle = (r: string, isEmpOwner: boolean) => {
    if (isEmpOwner || r.toLowerCase().includes('owner') || r.toLowerCase().includes('pemilik')) {
      return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
    }
    if (r.toLowerCase().includes('manager') || r.toLowerCase().includes('supervisor')) {
      return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
    }
    if (r.toLowerCase().includes('kasir')) {
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
    }
    if (r.toLowerCase().includes('koki') || r.toLowerCase().includes('dapur')) {
      return 'bg-rose-950/80 text-rose-300 border-rose-700/60';
    }
    if (r.toLowerCase().includes('barista') || r.toLowerCase().includes('minuman')) {
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
    }
    if (r.toLowerCase().includes('pelayan') || r.toLowerCase().includes('waiter')) {
      return 'bg-sky-950/80 text-sky-300 border-sky-700/60';
    }
    return 'bg-stone-800 text-stone-200 border-stone-700';
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-4">
      {/* Header bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-lg mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Kelola Karyawan & Hak Akses Fleksibel
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
              Khusus Owner
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl">
            Owner bebas membuat nama status / jenis jabatan sesuai kebutuhan warung, serta mengatur hak akses fitur secara fleksibel dengan mencentang menu yang diizinkan untuk setiap staf.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Employee Chip */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-700/50 text-xs">
            <UserCheck className="w-4 h-4 text-purple-400" />
            <div>
              <span className="text-[10px] text-purple-300/80 block">Sedang Masuk:</span>
              <span className="font-bold text-white">
                {activeEmployee.name} ({activeEmployee.role})
              </span>
            </div>
          </div>

          {openShareModal && (
            <button
              onClick={openShareModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs border border-stone-700 transition-all"
              title="Buka di HP Lain"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Buka di HP Lain</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-950/40 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Karyawan Baru</span>
          </button>
        </div>
      </div>

      {/* Feature explanation info banner */}
      <div className="p-3.5 mb-5 rounded-2xl bg-stone-900/60 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-stone-300">
          <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span>
            <strong className="text-white">Fleksibel Centang Akses:</strong> Setiap staf hanya bisa membuka menu yang dicentang oleh Owner. Akses pengaturan karyawan ini tertutup bagi non-owner.
          </span>
        </div>
        <div className="text-[11px] text-stone-400 font-medium flex items-center gap-1.5 flex-shrink-0">
          <span>Total: <strong className="text-white">{employees.length}</strong> Karyawan Terdaftar</span>
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map(emp => {
          const isCurrentActive = emp.id === activeEmployee.id;
          const isEmpOwner = isOwnerAccount(emp);
          const isPinVisible = !!revealedPins[emp.id];
          const empPermissions = isEmpOwner
            ? ALL_PERMISSION_KEYS
            : Array.isArray(emp.permissions)
            ? emp.permissions
            : DEFAULT_ROLE_PRESETS[emp.role] || ['pos'];

          return (
            <div
              key={emp.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                isCurrentActive
                  ? 'bg-stone-900 border-purple-500 shadow-xl shadow-purple-950/20 ring-1 ring-purple-500/30'
                  : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
              }`}
            >
              <div>
                {/* Top card row */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-stone-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center font-black text-sm text-purple-400 flex-shrink-0">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-sm text-white truncate">{emp.name}</h3>
                        {isCurrentActive && (
                          <span
                            className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"
                            title="Sedang Aktif Digunakan"
                          ></span>
                        )}
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getRoleBadgeStyle(
                          emp.role,
                          isEmpOwner
                        )}`}
                      >
                        {emp.role} {isEmpOwner ? '(Owner)' : ''}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      emp.isActive
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-stone-800 text-stone-400 border-stone-700'
                    }`}
                  >
                    {emp.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                {/* Details list */}
                <div className="py-3 space-y-2 text-xs text-stone-300">
                  {emp.phone && (
                    <div className="flex items-center gap-2 text-stone-400">
                      <Phone className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                      <a
                        href={`https://wa.me/${emp.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-emerald-400 font-mono text-[11px] truncate transition-colors"
                      >
                        {emp.phone}
                      </a>
                    </div>
                  )}

                  {emp.email && (
                    <div className="flex items-center gap-2 text-stone-400">
                      <Mail className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                      <span className="truncate text-[11px]">{emp.email}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-2 text-stone-400">
                      <Key className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span className="text-[11px]">PIN Akses:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {isPinVisible ? emp.pin : '••••'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => togglePinReveal(emp.id)}
                      className="text-stone-500 hover:text-stone-300 p-1"
                      title={isPinVisible ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                    >
                      {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {emp.notes && (
                    <div className="p-2 rounded-lg bg-stone-950 border border-stone-800/80 text-[10px] text-stone-400 italic">
                      "{emp.notes}"
                    </div>
                  )}

                  {/* Flexible Permissions Box */}
                  <div className="pt-2 border-t border-stone-800/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckSquare className="w-3 h-3 text-purple-400" />
                        Hak Akses (Centang):
                      </span>
                      <span className="text-[10px] font-bold text-purple-400">
                        {isEmpOwner
                          ? 'Akses Penuh'
                          : `${empPermissions.length}/${ALL_APP_FEATURES.length} Fitur`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {isEmpOwner ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800">
                          ✓ Akses Penuh Seluruh Sistem
                        </span>
                      ) : empPermissions.length === 0 ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-800 text-stone-400">
                          Belum ada akses dicentang
                        </span>
                      ) : (
                        ALL_APP_FEATURES.filter(f => empPermissions.includes(f.id)).map(f => (
                          <span
                            key={f.id}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950/50 text-emerald-300 border border-emerald-800/50 flex items-center gap-1"
                          >
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                            {f.label.split(' / ')[0]}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                {isCurrentActive ? (
                  <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Sedang Digunakan
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSwitchStaff(emp)}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 transition-colors"
                  >
                    Ganti ke Staf Ini
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(emp)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-950/50 hover:bg-purple-900 text-purple-300 hover:text-white border border-purple-800/60 text-xs font-bold transition-all"
                    title="Atur Hak Akses & Edit Karyawan"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Atur Akses</span>
                  </button>

                  {!isEmpOwner && (
                    <button
                      type="button"
                      onClick={() => handleDelete(emp)}
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-red-950 text-stone-400 hover:text-red-400 transition-colors"
                      title="Hapus Karyawan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- MODAL TAMBAH / EDIT KARYAWAN & HAK AKSES FLEKSIBEL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-700/60 text-purple-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {editingEmployee ? 'Edit Data & Hak Akses Karyawan' : 'Tambah Karyawan Baru'}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Atur nama status/jabatan kustom & centang akses fitur aplikasi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 my-4">
              {/* Nama Lengkap */}
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1">
                  Nama Lengkap: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Teh Nengsih, Kang Dimas, atau Siti"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Status / Jabatan Kustom (Dibuat Sendiri oleh Owner) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-300 block">
                    Nama Status / Jenis Jabatan: <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-purple-400 font-semibold">
                    Bisa dibuat sendiri oleh Owner
                  </span>
                </div>

                <input
                  type="text"
                  required
                  placeholder="Ketik status/jabatan, contoh: Kasir Pagi, Barista, Staff Gudang, Koki..."
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-purple-500 font-medium"
                />

                {/* Suggestion Chips */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-stone-500">Pilihan Cepat:</span>
                  {PRESET_JABATAN_SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSelectJabatanSuggestion(s)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                        role === s
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-white hover:bg-stone-800'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* --- SECTION CENTANG HAK AKSES FLEKSIBEL --- */}
              <div className="pt-2 border-t border-stone-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      Hak Akses Fitur (Centang Akses):
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Beri tanda centang pada menu apa saja yang boleh dibuka oleh karyawan ini
                    </span>
                  </div>

                  {/* Preset Action Buttons */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-bold border border-stone-700"
                    >
                      Centang Semua
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-[10px] font-bold border border-stone-700"
                    >
                      Hapus Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetPermissions('Kasir')}
                      className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 text-[10px] font-bold border border-emerald-800/60"
                    >
                      Kasir
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetPermissions('Koki / Dapur')}
                      className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[10px] font-bold border border-rose-800/60"
                    >
                      Dapur
                    </button>
                  </div>
                </div>

                {editingEmployee && isOwnerAccount(editingEmployee) && (
                  <div className="p-2.5 mb-2.5 rounded-xl bg-purple-950/50 border border-purple-800/70 text-xs text-purple-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>
                      Ini adalah <strong>Akun Pemilik (Owner)</strong>, seluruh hak akses sistem otomatis aktif penuh.
                    </span>
                  </div>
                )}

                {/* Grid of Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {ALL_APP_FEATURES.map(feat => {
                    const isChecked = selectedPermissions.includes(feat.id);
                    const isTargetOwner = editingEmployee ? isOwnerAccount(editingEmployee) : false;

                    return (
                      <div
                        key={feat.id}
                        onClick={() => {
                          if (!isTargetOwner) togglePermission(feat.id);
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                          isChecked || isTargetOwner
                            ? 'bg-purple-950/30 border-purple-700/60 shadow-sm'
                            : 'bg-stone-950/70 border-stone-800/80 hover:border-stone-700 hover:bg-stone-800/20'
                        } ${isTargetOwner ? 'cursor-default opacity-90' : ''}`}
                      >
                        <div className="pt-0.5 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={isChecked || isTargetOwner}
                            disabled={isTargetOwner}
                            onChange={() => {
                              if (!isTargetOwner) togglePermission(feat.id);
                            }}
                            className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-bold ${
                                isChecked || isTargetOwner ? 'text-white' : 'text-stone-300'
                              }`}
                            >
                              {feat.label}
                            </span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-400 font-medium inline-block mt-0.5">
                            {feat.category}
                          </span>
                          <p className="text-[10px] text-stone-400 mt-1 leading-snug line-clamp-2">
                            {feat.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* No WhatsApp & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-800">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    No Telepon / WhatsApp:
                  </label>
                  <input
                    type="text"
                    placeholder="0812-3456-7890"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Email (Opsional):
                  </label>
                  <input
                    type="email"
                    placeholder="staf@seblakcinta.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* PIN Akses & Tanggal Bergabung */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    PIN Akses (4-6 Angka): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    placeholder="1234"
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm font-mono font-bold text-amber-300 focus:outline-none focus:border-purple-500 tracking-widest"
                  />
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    Digunakan staf untuk login di layar kasir
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Tanggal Mulai Kerja:
                  </label>
                  <input
                    type="date"
                    value={joinDate}
                    onChange={e => setJoinDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Status Aktif */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800">
                <div>
                  <span className="text-xs font-bold text-white block">Status Karyawan Aktif</span>
                  <span className="text-[10px] text-stone-400">
                    Aktifkan agar akun ini dapat dipilih saat login kasir
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
              </div>

              {/* Catatan Karyawan */}
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1">
                  Catatan Karyawan (Opsional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Shift pagi 09.00 - 17.00, penanggung jawab kasir & rekap transaksi harian."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-purple-500"
                />
              </div>

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
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-950/40"
                >
                  Simpan Karyawan & Hak Akses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL VERIFIKASI PIN GANTI KASIR --- */}
      {switchPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative">
            <div className="text-center pb-3 border-b border-stone-800">
              <div className="w-12 h-12 mx-auto rounded-full bg-purple-950/80 text-purple-400 border border-purple-700/60 flex items-center justify-center mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-white">
                Ganti ke {switchPinModal.name}
              </h3>
              <p className="text-xs text-stone-400">
                Masukkan PIN akses ({switchPinModal.role}) untuk berganti akun
              </p>
            </div>

            <form onSubmit={confirmSwitchPin} className="my-4 space-y-3">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  placeholder="••••"
                  value={enteredPin}
                  onChange={e => {
                    setEnteredPin(e.target.value.replace(/[^0-9]/g, ''));
                    setPinError(null);
                  }}
                  className="w-full text-center py-2.5 px-3 bg-stone-950 border border-stone-800 rounded-xl text-xl font-mono font-black text-amber-300 tracking-[0.5em] focus:outline-none focus:border-purple-500"
                />
                {pinError && (
                  <p className="text-[11px] text-red-400 text-center mt-1.5 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{pinError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSwitchPinModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-800 bg-stone-950 text-xs font-bold text-stone-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-950/40"
                >
                  Konfirmasi PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
