import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import {
  MenuItem,
  CategoryItem,
  Transaction,
  StockMovement,
  Employee,
  StoreProfile,
  AccessLogItem,
} from '../types';
import {
  getMenuItems,
  saveMenuItems,
  getCategories,
  saveCategories,
  getTransactions,
  saveTransactions,
  getStockMovements,
  saveStockMovements,
  getEmployees,
  saveEmployees,
  getStoreProfile,
  saveStoreProfile,
  getAccessLogs,
  saveAccessLogs,
  broadcastChange,
  onStorageMutation,
} from '../utils/storage';

// Flag to avoid infinite sync feedback loops
let isApplyingRemoteChange = false;

export const isRemoteSyncing = () => isApplyingRemoteChange;

/**
 * Initialize / Seed Local Data to Firestore if Cloud is completely empty
 */
export async function initializeFirestoreDataIfEmpty(): Promise<boolean> {
  try {
    const menuSnapshot = await getDocs(collection(db, 'menuItems'));
    if (menuSnapshot.empty) {
      console.log('⚡ Initializing Firestore cloud database with initial data...');
      const batch = writeBatch(db);

      // Seed menus
      const localMenus = getMenuItems();
      localMenus.forEach(item => {
        batch.set(doc(db, 'menuItems', item.id), item, { merge: true });
      });

      // Seed categories
      const localCategories = getCategories();
      localCategories.forEach(cat => {
        batch.set(doc(db, 'categories', cat.id), cat, { merge: true });
      });

      // Seed employees
      const localEmployees = getEmployees();
      localEmployees.forEach(emp => {
        batch.set(doc(db, 'employees', emp.id), emp, { merge: true });
      });

      // Seed profile
      const localProfile = getStoreProfile();
      batch.set(doc(db, 'settings', 'storeProfile'), localProfile, { merge: true });

      // Seed initial transactions
      const localTxs = getTransactions();
      localTxs.slice(0, 50).forEach(t => {
        batch.set(doc(db, 'transactions', t.id), t, { merge: true });
      });

      // Seed initial stock movements
      const localMovements = getStockMovements();
      localMovements.slice(0, 50).forEach(m => {
        batch.set(doc(db, 'stockMovements', m.id), m, { merge: true });
      });

      await batch.commit();
      console.log('✅ Firestore seeded successfully.');
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to initialize Firestore seed:', err);
    return false;
  }
}

/**
 * Listen to real-time changes across all devices from Firestore
 */
export function subscribeToRealtimeFirestore(onDataUpdated: () => void): () => void {
  const unsubscribers: Array<() => void> = [];

  try {
    // 1. Menu Items Listener with intelligent updatedAt merging
    const unsubMenus = onSnapshot(collection(db, 'menuItems'), snapshot => {
      if (snapshot.empty) return;
      const remoteMenus: MenuItem[] = [];
      snapshot.forEach(d => {
        remoteMenus.push(d.data() as MenuItem);
      });

      if (remoteMenus.length > 0) {
        isApplyingRemoteChange = true;
        const localMenus = getMenuItems();
        const map = new Map<string, MenuItem>();
        localMenus.forEach(m => map.set(m.id, m));
        remoteMenus.forEach(r => {
          if (!map.has(r.id)) {
            map.set(r.id, r);
          } else {
            const loc = map.get(r.id)!;
            const rTime = new Date(r.updatedAt || 0).getTime();
            const lTime = new Date(loc.updatedAt || 0).getTime();
            if (rTime >= lTime) {
              map.set(r.id, { ...loc, ...r });
            }
          }
        });
        saveMenuItems(Array.from(map.values()));
        isApplyingRemoteChange = false;
        onDataUpdated();
      }
    }, err => {
      console.warn('Firestore menu listener notice:', err.message);
    });
    unsubscribers.push(unsubMenus);

    // 2. Categories Listener
    const unsubCategories = onSnapshot(collection(db, 'categories'), snapshot => {
      if (snapshot.empty) return;
      const remoteCategories: CategoryItem[] = [];
      snapshot.forEach(d => {
        remoteCategories.push(d.data() as CategoryItem);
      });

      if (remoteCategories.length > 0) {
        isApplyingRemoteChange = true;
        const localCats = getCategories();
        const map = new Map<string, CategoryItem>();
        localCats.forEach(c => map.set(c.id, c));
        remoteCategories.forEach(c => map.set(c.id, c));
        saveCategories(Array.from(map.values()));
        isApplyingRemoteChange = false;
        onDataUpdated();
      }
    }, err => {
      console.warn('Firestore category listener notice:', err.message);
    });
    unsubscribers.push(unsubCategories);

    // 3. Transactions Listener (Query without index requirements, sorted in-memory)
    const unsubTransactions = onSnapshot(
      query(collection(db, 'transactions'), limit(250)),
      snapshot => {
        if (snapshot.empty) return;
        const remoteTxs: Transaction[] = [];
        snapshot.forEach(d => {
          remoteTxs.push(d.data() as Transaction);
        });

        if (remoteTxs.length > 0) {
          isApplyingRemoteChange = true;
          // Merge with local transactions by unique ID
          const localTxs = getTransactions();
          const map = new Map<string, Transaction>();
          localTxs.forEach(t => map.set(t.id, t));
          remoteTxs.forEach(t => map.set(t.id, t));
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          saveTransactions(merged);
          isApplyingRemoteChange = false;
          onDataUpdated();
        }
      },
      err => {
        console.warn('Firestore transactions listener notice:', err.message);
      }
    );
    unsubscribers.push(unsubTransactions);

    // 4. Stock Movements Listener (Real-time stock deduction audit across devices)
    const unsubStock = onSnapshot(
      query(collection(db, 'stockMovements'), limit(250)),
      snapshot => {
        if (snapshot.empty) return;
        const remoteMovements: StockMovement[] = [];
        snapshot.forEach(d => {
          remoteMovements.push(d.data() as StockMovement);
        });

        if (remoteMovements.length > 0) {
          isApplyingRemoteChange = true;
          const localMovs = getStockMovements();
          const map = new Map<string, StockMovement>();
          localMovs.forEach(m => map.set(m.id, m));
          remoteMovements.forEach(m => map.set(m.id, m));
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          saveStockMovements(merged);
          isApplyingRemoteChange = false;
          onDataUpdated();
        }
      },
      err => {
        console.warn('Firestore stock listener notice:', err.message);
      }
    );
    unsubscribers.push(unsubStock);

    // 5. Access Logs Listener (Live audit log across devices for Owner)
    const unsubLogs = onSnapshot(
      query(collection(db, 'accessLogs'), limit(200)),
      snapshot => {
        if (snapshot.empty) return;
        const remoteLogs: AccessLogItem[] = [];
        snapshot.forEach(d => {
          remoteLogs.push(d.data() as AccessLogItem);
        });

        if (remoteLogs.length > 0) {
          isApplyingRemoteChange = true;
          const localLogs = getAccessLogs();
          const map = new Map<string, AccessLogItem>();
          localLogs.forEach(l => map.set(l.id, l));
          remoteLogs.forEach(l => map.set(l.id, l));
          const merged = Array.from(map.values())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 300);
          saveAccessLogs(merged);
          isApplyingRemoteChange = false;
          onDataUpdated();
        }
      },
      err => {
        console.warn('Firestore logs listener notice:', err.message);
      }
    );
    unsubscribers.push(unsubLogs);

    // 6. Store Profile Listener
    const unsubProfile = onSnapshot(doc(db, 'settings', 'storeProfile'), docSnap => {
      if (docSnap.exists()) {
        const remoteProfile = docSnap.data() as StoreProfile;
        isApplyingRemoteChange = true;
        saveStoreProfile(remoteProfile);
        isApplyingRemoteChange = false;
        onDataUpdated();
      }
    }, err => {
      console.warn('Firestore profile listener notice:', err.message);
    });
    unsubscribers.push(unsubProfile);

    // 7. Employees Listener
    const unsubEmployees = onSnapshot(collection(db, 'employees'), snapshot => {
      if (snapshot.empty) return;
      const remoteEmployees: Employee[] = [];
      snapshot.forEach(d => {
        remoteEmployees.push(d.data() as Employee);
      });

      if (remoteEmployees.length > 0) {
        isApplyingRemoteChange = true;
        const localEmployees = getEmployees();
        const map = new Map<string, Employee>();
        localEmployees.forEach(e => map.set(e.id, e));
        remoteEmployees.forEach(e => map.set(e.id, e));
        saveEmployees(Array.from(map.values()));
        isApplyingRemoteChange = false;
        onDataUpdated();
      }
    }, err => {
      console.warn('Firestore employees listener notice:', err.message);
    });
    unsubscribers.push(unsubEmployees);

  } catch (err) {
    console.error('Error setting up Firestore real-time listeners:', err);
  }

  // Return clean cleanup function
  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}

/**
 * Push a newly created POS transaction to Firestore in real-time
 */
export async function pushTransactionToFirestore(tx: Transaction): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'transactions', tx.id), tx);

    // Update stocks in cloud menu using merge: true so it never throws if doc is missing
    const menuList = getMenuItems();
    tx.items.forEach(item => {
      const target = menuList.find(m => m.id === item.menuItemId);
      if (target) {
        batch.set(
          doc(db, 'menuItems', target.id),
          {
            stock: target.stock,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    });

    await batch.commit();
  } catch (err) {
    console.warn('Could not push transaction to Firestore (will remain safe locally):', err);
  }
}

/**
 * Push stock movement to Firestore in real-time
 */
export async function pushStockMovementToFirestore(mov: StockMovement): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'stockMovements', mov.id), mov);

    // Update target menu item in cloud using merge: true
    const menuList = getMenuItems();
    const target = menuList.find(m => m.id === mov.menuItemId);
    if (target) {
      batch.set(
        doc(db, 'menuItems', target.id),
        {
          stock: target.stock,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    await batch.commit();
  } catch (err) {
    console.warn('Could not push stock movement to Firestore:', err);
  }
}

/**
 * Push menu item add or update to Firestore
 */
export async function pushMenuItemToFirestore(item: MenuItem): Promise<void> {
  try {
    await setDoc(doc(db, 'menuItems', item.id), item);
  } catch (err) {
    console.warn('Could not push menu item to Firestore:', err);
  }
}

/**
 * Delete menu item from Firestore
 */
export async function deleteMenuItemFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'menuItems', id));
  } catch (err) {
    console.warn('Could not delete menu item from Firestore:', err);
  }
}

/**
 * Push category to Firestore
 */
export async function pushCategoryToFirestore(cat: CategoryItem): Promise<void> {
  try {
    await setDoc(doc(db, 'categories', cat.id), cat);
  } catch (err) {
    console.warn('Could not push category to Firestore:', err);
  }
}

/**
 * Delete category from Firestore
 */
export async function deleteCategoryFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (err) {
    console.warn('Could not delete category from Firestore:', err);
  }
}

/**
 * Push store profile to Firestore
 */
export async function pushStoreProfileToFirestore(profile: StoreProfile): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', 'storeProfile'), profile);
  } catch (err) {
    console.warn('Could not push store profile to Firestore:', err);
  }
}

/**
 * Push access log to Firestore
 */
export async function pushAccessLogToFirestore(log: AccessLogItem): Promise<void> {
  try {
    await setDoc(doc(db, 'accessLogs', log.id), log);
  } catch (err) {
    console.warn('Could not push access log to Firestore:', err);
  }
}

/**
 * Setup two-way realtime sync with Firebase Firestore across multiple cashier devices
 */
export function setupRealtimeSync(onDataUpdated: () => void): () => void {
  // 1. Initial check & seed cloud database if empty
  initializeFirestoreDataIfEmpty().catch(err => {
    console.warn('Initial Firestore seed check notice:', err);
  });

  // 2. Listen to local mutations to push to cloud in real-time
  const unsubLocal = onStorageMutation((type, data) => {
    if (isApplyingRemoteChange) return;

    try {
      if (type === 'TRANSACTION') {
        if (Array.isArray(data) && data.length > 0) {
          pushTransactionToFirestore(data[0]);
        } else if (data && data.id) {
          pushTransactionToFirestore(data);
        }
      } else if (type === 'STOCK') {
        if (Array.isArray(data) && data.length > 0) {
          pushStockMovementToFirestore(data[0]);
        } else if (data && data.id) {
          pushStockMovementToFirestore(data);
        }
      } else if (type === 'MENU') {
        if (Array.isArray(data) && data.length > 0) {
          const batch = writeBatch(db);
          data.forEach(item => {
            batch.set(doc(db, 'menuItems', item.id), item, { merge: true });
          });
          batch.commit().catch(e => console.warn('Batch menu sync notice:', e));
        } else if (data && data.id) {
          pushMenuItemToFirestore(data);
        }
      } else if (type === 'CATEGORY') {
        if (Array.isArray(data) && data.length > 0) {
          const batch = writeBatch(db);
          data.forEach(cat => {
            batch.set(doc(db, 'categories', cat.id), cat, { merge: true });
          });
          batch.commit().catch(e => console.warn('Batch category sync notice:', e));
        } else if (data && data.id) {
          pushCategoryToFirestore(data);
        }
      } else if (type === 'EMPLOYEES') {
        if (Array.isArray(data) && data.length > 0) {
          const batch = writeBatch(db);
          data.forEach(emp => {
            batch.set(doc(db, 'employees', emp.id), emp, { merge: true });
          });
          batch.commit().catch(e => console.warn('Batch employees sync notice:', e));
        }
      } else if (type === 'PROFILE' && data) {
        pushStoreProfileToFirestore(data);
      } else if (type === 'LOG') {
        if (Array.isArray(data) && data.length > 0) {
          pushAccessLogToFirestore(data[0]);
        } else if (data && data.id) {
          pushAccessLogToFirestore(data);
        }
      }
    } catch (e) {
      console.warn('Error pushing local mutation to Firestore:', e);
    }
  });

  // 3. Listen to cloud changes and apply locally
  const unsubRemote = subscribeToRealtimeFirestore(onDataUpdated);

  return () => {
    unsubLocal();
    unsubRemote();
  };
}

/**
 * Force bidirectional synchronization with Firestore cloud database now
 */
export async function syncFirestoreAllNow(): Promise<{ success: boolean; message: string }> {
  try {
    const batch = writeBatch(db);

    // Push local menus
    const localMenus = getMenuItems();
    localMenus.forEach(item => {
      batch.set(doc(db, 'menuItems', item.id), item, { merge: true });
    });

    // Push local categories
    const localCats = getCategories();
    localCats.forEach(cat => {
      batch.set(doc(db, 'categories', cat.id), cat, { merge: true });
    });

    // Push local transactions
    const localTxs = getTransactions();
    localTxs.slice(0, 100).forEach(tx => {
      batch.set(doc(db, 'transactions', tx.id), tx, { merge: true });
    });

    // Push local stock movements
    const localMovs = getStockMovements();
    localMovs.slice(0, 100).forEach(mov => {
      batch.set(doc(db, 'stockMovements', mov.id), mov, { merge: true });
    });

    await batch.commit();

    // Pull any remote records that local doesn't have yet
    const remoteTxSnap = await getDocs(query(collection(db, 'transactions'), limit(150)));
    const remoteTxs: Transaction[] = [];
    remoteTxSnap.forEach(d => remoteTxs.push(d.data() as Transaction));

    if (remoteTxs.length > 0) {
      const map = new Map<string, Transaction>();
      localTxs.forEach(t => map.set(t.id, t));
      remoteTxs.forEach(t => map.set(t.id, t));
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      isApplyingRemoteChange = true;
      saveTransactions(merged);
      isApplyingRemoteChange = false;
    }

    return {
      success: true,
      message: 'Sinkronisasi real-time multi-perangkat berhasil! Data telah saling diperbarui.',
    };
  } catch (err: any) {
    console.error('Error in syncFirestoreAllNow:', err);
    return {
      success: false,
      message: 'Gagal sinkron cloud: ' + (err.message || 'Koneksi terputus'),
    };
  }
}
