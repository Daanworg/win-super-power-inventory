// state.js - Manages Application State (Full Logic + sessionStorage Caching - vFinal)

import { supabase } from './supabaseClient.js';
import { MATERIALS_CONFIG, RECIPES_CONFIG } from './config.js'; 
import { showToast, refreshUI } from './ui.js';
import { handleError } from './errorService.js'; // This assumes you will create errorService.js

export let appState = {
    user: null,
    materials: [],
    productRecipes: RECIPES_CONFIG,
    productionLog: [],
    lastLoadedUserId: null, 
    dataLoaded: false,
    cacheTimestamp: null
};

const CACHE_KEY = 'appStateCache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function saveStateToSessionStorage() {
    if (!appState.user) return;
    try {
        const cacheData = {
            materials: appState.materials,
            productionLog: appState.productionLog,
            timestamp: Date.now(),
            userId: appState.user.id 
        };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
        handleError(e, "session_storage_save_error", false); 
    }
}

function loadStateFromSessionStorage() {
    if (!appState.user) return false; 
    try {
        const cachedItem = sessionStorage.getItem(CACHE_KEY);
        if (!cachedItem) return false;
        const parsedData = JSON.parse(cachedItem);
        
        if (parsedData && parsedData.userId === appState.user.id) {
            if ((Date.now() - parsedData.timestamp) < CACHE_EXPIRY_MS) {
                appState.materials = parsedData.materials || [];
                appState.productionLog = parsedData.productionLog || [];
                appState.cacheTimestamp = parsedData.timestamp; 
                appState.lastLoadedUserId = parsedData.userId;
                return true; 
            } else {
                sessionStorage.removeItem(CACHE_KEY);
            }
        } else if (parsedData && parsedData.userId !== appState.user.id) {
            sessionStorage.removeItem(CACHE_KEY);
        }
    } catch (e) {
        handleError(e, "session_storage_load_error", false);
        sessionStorage.removeItem(CACHE_KEY); 
    }
    return false; 
}

async function fetchWithRetry(promiseFn, operationName = "Supabase Operation") {
    const retries = 2;
    const initialDelay = 500;
    for (let i = 0; i <= retries; i++) {
        try {
            const { data, error } = await promiseFn();
            if (error) throw error;
            return data;
        } catch (error) {
            if (i < retries) {
                const delay = initialDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error; 
            }
        }
    }
}

function dbMaterialToAppMaterial(dbMaterial) {
    if (!dbMaterial) return null; 
    return { 
        id: dbMaterial.id, name: dbMaterial.name, unit: dbMaterial.unit, 
        currentStock: dbMaterial.current_stock, reorderPoint: dbMaterial.reorder_point,
        updatedAt: dbMaterial.updated_at 
    };
}

function dbLogToAppLog(dbLog) {
    if(!dbLog) return null;
    return {
        id: dbLog.id, productName: dbLog.product_name, quantity: dbLog.quantity,
        date: dbLog.produced_at, 
        user_id: dbLog.user_id
    };
}

export async function loadInitialAppState() {
    if (!appState.user) {
        handleError(new Error("User not identified for data loading."), "auth_missing_user");
        return false;
    }

    const loadedFromCache = loadStateFromSessionStorage();
    if (loadedFromCache) {
        appState.dataLoaded = true;
        refreshUI(); 
        fetchUpdatesInBackground();
        return true; 
    }

    try {
        const materialsData = await fetchWithRetry(() => supabase.from('materials').select('*, updated_at').order('name', { ascending: true }), "Fetching materials");
        appState.materials = (materialsData || []).map(dbMaterialToAppMaterial).filter(m => m);

        if (appState.materials.length === 0 && MATERIALS_CONFIG.length > 0) {
            showToast('No materials in DB. Seeding initial data...', 'info');
            const materialsToInsert = MATERIALS_CONFIG.map(m => ({ name: m.name, unit: m.unit, current_stock: m.currentStock, reorder_point: m.reorderPoint }));
            const seedData = await fetchWithRetry(() => supabase.from('materials').insert(materialsToInsert).select('*, updated_at'), "Seeding materials");
            appState.materials = (seedData || []).map(dbMaterialToAppMaterial).filter(m => m);
            showToast('Materials seeded successfully!', 'success');
        }

        const productionLogData = await fetchWithRetry(() => supabase.from('production_log').select('*').eq('user_id', appState.user.id).order('produced_at', { ascending: false }).limit(100), "Fetching production log");
        appState.productionLog = (productionLogData || []).map(dbLogToAppLog).filter(l => l);
        
        appState.dataLoaded = true;
        appState.lastLoadedUserId = appState.user.id;
        saveStateToSessionStorage();
        return true;

    } catch (error) {
        handleError(error, "initial_app_state_full_load_failed");
        appState.dataLoaded = false;
        return false;
    }
}
    
async function fetchUpdatesInBackground() {
    if (!appState.user || !appState.cacheTimestamp) return;
    let UIRefreshedNeeded = false;
    try {
        const lastMaterialUpdateISO = new Date(appState.cacheTimestamp).toISOString();
        const newMaterials = await fetchWithRetry(() => supabase.from('materials').select('*, updated_at').gt('updated_at', lastMaterialUpdateISO), "Background materials update");
        
        if (newMaterials.length > 0) {
            const materialsMap = new Map(appState.materials.map(m => [m.id, m]));
            newMaterials.forEach(nm => materialsMap.set(nm.id, dbMaterialToAppMaterial(nm)));
            appState.materials = Array.from(materialsMap.values()).sort((a,b) => a.name.localeCompare(b.name));
            UIRefreshedNeeded = true;
        }

        const lastLogEntryDateISO = new Date(appState.cacheTimestamp).toISOString();
        const newLogs = await fetchWithRetry(() => supabase.from('production_log').select('*').eq('user_id', appState.user.id).gt('produced_at', lastLogEntryDateISO), "Background log update");

        if (newLogs.length > 0) {
            const existingLogIds = new Set(appState.productionLog.map(l => l.id));
            newLogs.forEach(log => { if (!existingLogIds.has(log.id)) appState.productionLog.push(dbLogToAppLog(log)); });
            appState.productionLog.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            if (appState.productionLog.length > 100) appState.productionLog = appState.productionLog.slice(0, 100);
            UIRefreshedNeeded = true;
        }

        if (UIRefreshedNeeded) {
            saveStateToSessionStorage(); 
            refreshUI(); 
            showToast('Data updated in background.', 'info');
        }
    } catch (error) {
        handleError(error, "background_data_fetch_failed", false); 
    }
}
