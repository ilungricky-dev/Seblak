import React, { useState } from 'react';
import {
  Flame,
  Lock,
  UserCheck,
  AlertCircle,
  Delete,
  Shield,
  ArrowRight,
  Store,
  Smartphone,
  QrCode,
} from 'lucide-react';
import { Employee, StoreProfile } from '../types';

interface LoginScreenProps {
  employees: Employee[];
  storeProfile: StoreProfile;
  onLoginSuccess: (employee: Employee) => void;
  openShareModal?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  employees,
  storeProfile,
  onLoginSuccess,
  openShareModal,
}) => {
  const activeEmployees = employees.filter(e => e.isActive);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    activeEmployees[0] || null
  );
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMsg(null);

      // Auto check when length matches selected employee's PIN
      if (selectedEmployee && nextPin.length === selectedEmployee.pin.length) {
        verifyPin(nextPin, selectedEmployee);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg(null);
  };

  const verifyPin = (pinToTest: string, emp: Employee) => {
    if (pinToTest === emp.pin) {
      onLoginSuccess(emp);
    } else {
      setErrorMsg('PIN yang Anda masukkan salah!');
      setPin('');
    }
  };

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setPin('');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white flex flex-col justify-center items-center p-4 selection:bg-rose-500 selection:text-white">
      {/* Background glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md mx-auto">
        {/* Header / Brand Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl overflow-hidden bg-rose-950 border-2 border-rose-500 shadow-2xl shadow-rose-900/50 flex items-center justify-center mb-3">
            {storeProfile.logoUrl ? (
              <img
                src={storeProfile.logoUrl}
                alt={storeProfile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Flame className="w-10 h-10 text-rose-500" />
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {storeProfile.name || 'Warung Seblak "Cinta"'}
          </h1>
          <p className="text-xs text-rose-400 font-semibold mt-0.5">
            {storeProfile.slogan || 'Pedas Gurih Bikin Nagih! 🔥❤️'}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-[11px] text-stone-400 mt-2 font-medium">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Login Kasir & Sistem Otorisasi PIN</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
          {/* Employee Selection Chips */}
          <div className="mb-4">
            <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-2 text-center">
              Pilih Profil Staf / Kasir:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {activeEmployees.map(emp => {
                const isSelected = selectedEmployee?.id === emp.id;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelectEmployee(emp)}
                    className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 shadow-lg shadow-rose-950/40 text-white ring-1 ring-rose-500'
                        : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        isSelected
                          ? 'bg-rose-600 text-white'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs truncate">{emp.name.split(' ')[0]}</div>
                      <div className="text-[10px] text-stone-400">{emp.role}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Staff Info & PIN Display */}
          {selectedEmployee && (
            <div className="my-3 text-center">
              <div className="text-xs text-stone-300 font-medium">
                Masukkan PIN untuk <span className="text-white font-bold">{selectedEmployee.name}</span>{' '}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-amber-400 font-bold border border-stone-700 ml-1">
                  {selectedEmployee.role}
                </span>
              </div>

              {/* PIN Dots Display */}
              <div className="flex items-center justify-center gap-3 my-3">
                {Array.from({ length: selectedEmployee.pin.length || 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      i < pin.length
                        ? 'bg-rose-500 border-rose-500 scale-110 shadow-lg shadow-rose-500/50'
                        : 'bg-stone-950 border-stone-700'
                    }`}
                  />
                ))}
              </div>

              {errorMsg && (
                <div className="p-2 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center justify-center gap-1.5 animate-shake">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* Touchscreen Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 my-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="py-3.5 rounded-2xl bg-stone-950 hover:bg-stone-800 active:bg-rose-600 active:scale-95 text-lg font-bold text-white border border-stone-800/80 shadow-md transition-all flex items-center justify-center"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              className="py-3.5 rounded-2xl bg-stone-950/80 hover:bg-stone-800 text-stone-400 hover:text-white text-xs font-bold border border-stone-800 transition-all flex items-center justify-center"
            >
              C
            </button>

            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="py-3.5 rounded-2xl bg-stone-950 hover:bg-stone-800 active:bg-rose-600 active:scale-95 text-lg font-bold text-white border border-stone-800/80 shadow-md transition-all flex items-center justify-center"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              className="py-3.5 rounded-2xl bg-stone-950/80 hover:bg-stone-800 text-stone-400 hover:text-white text-sm font-bold border border-stone-800 transition-all flex items-center justify-center"
              title="Hapus satu angka"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          {/* PIN Hint for Demo */}
          <div className="mt-4 pt-3 border-t border-stone-800/80 text-center">
            <p className="text-[10px] text-stone-500">
              💡 <span className="text-stone-400 font-semibold">Petunjuk PIN Bawaan Owner:</span> Masukkan PIN <span className="text-amber-400 font-bold font-mono">1234</span> untuk masuk ke sistem
            </p>
          </div>
        </div>

        {/* Link / QR Code for other HP button */}
        {openShareModal && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={openShareModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-emerald-400 border border-stone-800 text-xs font-semibold shadow-lg transition-all"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Buka di HP Lain / Scan QR Code</span>
              <QrCode className="w-3.5 h-3.5 text-stone-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
