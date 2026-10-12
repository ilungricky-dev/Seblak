import React, { useState, useEffect, useCallback } from 'react';
import {
  StoreProfile,
  MenuItem,
  StockMovement,
  Transaction,
  PrinterConfig,
  Employee,
  AppFeature,
} from './types';
import {
  getStoreProfile,
  getMenuItems,
  getStockMovements,
  getTransactions,
  getPrinterConfig,
  getEmployees,
  getActiveEmployee,
  setActiveEmployee,
  getSyncQueue,
  subscribeToBroadcast,
  hasFeatureAccess,
} from './utils/storage';
import { syncWithGoogleSheets } from './utils/sheetsSync';
import { isBluetoothConnected, getConnectedDeviceName } from './utils/printer';

// Components
import { Header, ActiveTab } from './components/Header';
import { PosView } from './components/PosView';
import { StockManagementView } from './components/StockManagementView';
import { MenuManagementView } from './components/MenuManagementView';
import { ReportsSaleView } from './components/ReportsSaleView';
import { ReportsStockView } from './components/ReportsStockView';
import { EmployeeManagementView } from './components/EmployeeManagementView';
import { LoginScreen } from './components/LoginScreen';

// Modals
import { StoreProfileModal } from './components/StoreProfileModal';
import { PrinterSettingsModal } from './components/PrinterSettingsModal';
import { SpreadsheetSyncModal } from './components/SpreadsheetSyncModal';
import { DataResetModal } from './components/DataResetModal';
import { ShareAppModal } from './components/ShareAppModal';
import { ThermalReceiptPrintArea } from './components/ThermalReceiptPrintArea';
import { Shield, Lock, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('seblak_is_logged_in');
      return val === 'true';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');


  // Application Data States
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(getStoreProfile);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(getMenuItems);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(getStockMovements);
  const [transactions, setTransactions] = useState<Transaction[]>(getTransactions);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(getPrinterConfig);
  const [employees, setEmployees] = useState<Employee[]>(getEmployees);
  const [activeEmployee, setActiveEmployeeState] = useState<Employee>(getActiveEmployee);

  // Connectivity & Sync States
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => {
    const unsyncedTx = getTransactions().filter(t => !t.syncedToSheets).length;
    const unsyncedMov = getStockMovements().filter(m => !m.syncedToSheets).length;
    return unsyncedTx + unsyncedMov;
  });

  // Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState<boolean>(false);
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Last transaction for Thermal Receipt Print Area
  const [lastTxForPrint, setLastTxForPrint] = useState<Transaction | null>(() => {
    const txs = getTransactions();
    return txs.length > 0 ? txs[0] : null;
  });

  // Role Authorization Gate Modal
  const [authPromptFeature, setAuthPromptFeature] = useState<ActiveTab | null>(null);
  const [authPinInput, setAuthPinInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Refresh all state from local storage (triggered by cross-tab broadcasts or updates)
  const refreshAllState = useCallback(() => {
    setStoreProfile(getStoreProfile());
    setMenuItems(getMenuItems());
    setStockMovements(getStockMovements());
    const allTxs = getTransactions();
    setTransactions(allTxs);
    if (allTxs.length > 0) {
      setLastTxForPrint(allTxs[0]);
    } else {
      setLastTxForPrint(null);
    }
    setPrinterConfig(getPrinterConfig());
    setEmployees(getEmployees());
    setActiveEmployeeState(getActiveEmployee());

    const unsyncedTx = allTxs.filter(t => !t.syncedToSheets).length;
    const unsyncedMov = getStockMovements().filter(m => !m.syncedToSheets).length;
    setPendingSyncCount(unsyncedTx + unsyncedMov);
  }, []);

  // Listen to network online / offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync when back online
      syncWithGoogleSheets().then(() => refreshAllState());
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshAllState]);

  // Subscribe to real-time BroadcastChannel from other tabs/windows
  useEffect(() => {
    const unsubscribe = subscribeToBroadcast(() => {
      refreshAllState();
    });
    return () => {
      unsubscribe();
    };
  }, [refreshAllState]);

  // Background Auto-Sync every 30 seconds if online
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        const queue = getSyncQueue();
        const unsynced = getTransactions().filter(t => !t.syncedToSheets).length;
        if (queue.length > 0 || unsynced > 0) {
          syncWithGoogleSheets().then(res => {
            if (res.success) {
              refreshAllState();
            }
          });
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshAllState]);

  // Transaction Completed Handler
  const handleTransactionComplete = (newTx: Transaction) => {
    setLastTxForPrint(newTx);
    refreshAllState();
  };

  // Safe Tab Switcher with Role Authorization Check
  const handleTabSelect = (tab: ActiveTab) => {
    const canAccess = hasFeatureAccess(activeEmployee, tab as AppFeature);
    if (canAccess) {
      setActiveTab(tab);
    } else {
      // Show PIN authorization gate
      setAuthPromptFeature(tab);
      setAuthPinInput('');
      setAuthError(null);
    }
  };

  const handleAuthorizePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPromptFeature) return;

    // Check if entered PIN matches any Owner or Manager
    const authorizedStaff = employees.find(
      e => (e.role === 'Owner' || e.role === 'Manager') && e.pin === authPinInput.trim()
    );

    if (authorizedStaff) {
      // Authorized! Grant access and switch tab
      setActiveTab(authPromptFeature);
      setAuthPromptFeature(null);
      setAuthPinInput('');
      setAuthError(null);
    } else {
      setAuthError('PIN tidak valid atau tidak memiliki wewenang Owner/Manager!');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    try {
      localStorage.removeItem('seblak_is_logged_in');
    } catch (e) {
      console.error(e);
    }
  };

  // If not logged in, render the touchscreen PIN Login Screen!
  if (!isLoggedIn) {
    return (
      <>
        <LoginScreen
          employees={employees}
          storeProfile={storeProfile}
          onLoginSuccess={emp => {
            setActiveEmployee(emp);
            setActiveEmployeeState(emp);
            setIsLoggedIn(true);
            try {
              localStorage.setItem('seblak_is_logged_in', 'true');
            } catch (e) {
              console.error(e);
            }

            // If current tab is not permitted for this employee, switch to first permitted tab
            if (!hasFeatureAccess(emp, activeTab as AppFeature)) {
              const tabs: ActiveTab[] = ['pos', 'stock', 'menu', 'report_sales', 'report_stock'];
              const firstAllowed = tabs.find(t => hasFeatureAccess(emp, t as AppFeature));
              if (firstAllowed) {
                setActiveTab(firstAllowed);
              }
            }
          }}
          openShareModal={() => setIsShareModalOpen(true)}
        />

        <ShareAppModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          appName={storeProfile.name}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* App Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabSelect}
        storeProfile={storeProfile}
        activeEmployee={activeEmployee}
        onLogout={handleLogout}
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingSyncCount={pendingSyncCount}
        openProfileModal={() => {
          if (hasFeatureAccess(activeEmployee, 'store_profile')) {
            setIsProfileModalOpen(true);
          } else {
            alert('Anda tidak memiliki izin untuk mengubah profil warung. Hubungi Owner.');
          }
        }}
        openPrinterModal={() => {
          if (hasFeatureAccess(activeEmployee, 'printer')) {
            setIsPrinterModalOpen(true);
          } else {
            alert('Anda tidak memiliki izin untuk pengaturan printer. Hubungi Owner.');
          }
        }}
        openSpreadsheetModal={() => {
          if (hasFeatureAccess(activeEmployee, 'spreadsheet_sync')) {
            setIsSpreadsheetModalOpen(true);
          } else {
            alert('Anda tidak memiliki izin untuk sinkronisasi Google Sheets. Hubungi Owner.');
          }
        }}
        openResetModal={() => setIsResetModalOpen(true)}
        openShareModal={() => setIsShareModalOpen(true)}
        isBluetoothConnected={isBluetoothConnected()}
        bluetoothDeviceName={getConnectedDeviceName()}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16 no-print">
        {activeTab === 'pos' && (
          <PosView
            menuItems={menuItems}
            storeProfile={storeProfile}
            printerConfig={printerConfig}
            onTransactionComplete={handleTransactionComplete}
            onOpenPrinterModal={() => setIsPrinterModalOpen(true)}
          />
        )}

        {activeTab === 'stock' && (
          <StockManagementView
            menuItems={menuItems}
            stockMovements={stockMovements}
            onStockUpdated={refreshAllState}
          />
        )}

        {activeTab === 'menu' && (
          <MenuManagementView
            menuItems={menuItems}
            onMenuUpdated={refreshAllState}
          />
        )}

        {activeTab === 'report_sales' && (
          <ReportsSaleView
            transactions={transactions}
            storeProfile={storeProfile}
            printerConfig={printerConfig}
            onOpenPrinterSettings={() => setIsPrinterModalOpen(true)}
          />
        )}

        {activeTab === 'report_stock' && (
          <ReportsStockView
            storeProfile={storeProfile}
            menuItems={menuItems}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeeManagementView
            employees={employees}
            activeEmployee={activeEmployee}
            onEmployeesUpdated={refreshAllState}
            onActiveEmployeeChanged={emp => {
              setActiveEmployee(emp);
              setActiveEmployeeState(emp);
            }}
            openShareModal={() => setIsShareModalOpen(true)}
          />
        )}
      </main>


      {/* --- ROLE AUTHORIZATION PIN PROMPT MODAL --- */}
      {authPromptFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative">
            <div className="text-center pb-3 border-b border-stone-800">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/80 text-rose-400 border border-rose-700/60 flex items-center justify-center mb-2">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-white">
                Otorisasi Akses Ditolak
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Akun aktif <span className="font-bold text-white">"{activeEmployee.name}" ({activeEmployee.role})</span> tidak memiliki izin untuk fitur ini.
              </p>
              <p className="text-[11px] text-amber-400 mt-1">
                Masukkan PIN Supervisor / Owner untuk membuka:
              </p>
            </div>

            <form onSubmit={handleAuthorizePin} className="my-4 space-y-3">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  placeholder="••••"
                  value={authPinInput}
                  onChange={e => {
                    setAuthPinInput(e.target.value.replace(/[^0-9]/g, ''));
                    setAuthError(null);
                  }}
                  className="w-full text-center py-2.5 px-3 bg-stone-950 border border-stone-800 rounded-xl text-xl font-mono font-black text-amber-300 tracking-[0.5em] focus:outline-none focus:border-rose-500"
                />
                {authError && (
                  <p className="text-[11px] text-red-400 text-center mt-1.5 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{authError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthPromptFeature(null);
                    setAuthPinInput('');
                    setAuthError(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-stone-800 bg-stone-950 text-xs font-bold text-stone-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-950/40"
                >
                  Buka Kunci Akses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- GLOBAL MODALS --- */}
      <StoreProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={storeProfile}
        onProfileUpdated={updated => setStoreProfile(updated)}
        openResetModal={() => setIsResetModalOpen(true)}
      />

      <PrinterSettingsModal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
        config={printerConfig}
        storeProfile={storeProfile}
        onConfigUpdated={updated => setPrinterConfig(updated)}
      />

      <SpreadsheetSyncModal
        isOpen={isSpreadsheetModalOpen}
        onClose={() => setIsSpreadsheetModalOpen(false)}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onSyncCompleted={refreshAllState}
      />

      <DataResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        storeProfile={storeProfile}
        transactions={transactions}
        stockMovements={stockMovements}
        menuItems={menuItems}
        onDataReset={refreshAllState}
      />

      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        appName={storeProfile.name}
      />

      {/* Hidden printable receipt for Browser Thermal Printing: Only rendered when there is a valid transaction with items */}
      {lastTxForPrint && lastTxForPrint.items && lastTxForPrint.items.length > 0 && (
        <ThermalReceiptPrintArea
          transaction={lastTxForPrint}
          profile={storeProfile}
          config={printerConfig}
        />
      )}
    </div>
  );
}
