// state.js - Manages Application State (Full Logic + sessionStorage Caching - vFinal)

import { supabase } from './supabaseClient.js';
import { MATERIALS_CONFIG, RECIPES_CONFIG } from './config.js'; 
import { showToast, refreshUI } from './ui.js';

export let appState = {
    user: null,
    materials: [],
    productRecipes: RECIPES_CONFIG,
    productionLog: [],
    lastLoadedUserId: null, 
    dataLoaded: false       
};

const CACHE_KEY = 'appStateCache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function saveStateToSessionStorage() {
    if (!appState.user) return; // Don't save if no user
    try {
        const cachedData = {
            materials: appState.materials,
            productionLog: appState.productionLog,
            timestamp: Date.now(),
            userId: appState.user.id 
        };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));
        console.log("[STATE.JS] App state saved to session storage for user:", appState.user.id);
    } catch (e) {
        console.error("[STATE.JS] Error saving state to session storage:", e);
    }
}

function loadStateFromSessionStorage() {
    if (!appState.user) return false; // Need user context to load user-specific cache
    try {
        const cachedItem = sessionStorage.getItem(CACHE_KEY);
        if (!cachedItem) {
            console.log("[STATE.JS] No cached data found in session storage.");
            return false;
        }
        const cachedData = JSON.parse(cachedItem);
        
        if (cachedData && cachedData.userId === appState.user.id) {
            const now = Date.now();
            if (now - cachedData.timestamp < CACHE_EXPIRY_MS) {
                console.log("[STATE.JS] Valid cached data found for user:", appState.user.id);
                appState.materials = cachedData.materials || [];
                appState.productionLog = cachedData.productionLog || [];
                // Do not set appState.dataLoaded = true here yet. Let the main load process confirm.
                // This function just loads data into appState if valid cache exists.
                return true; // Indicates valid cache was loaded into appState
            } else {
                console.log("[STATE.JS] Cached data expired. Removing.");
                sessionStorage.removeItem(CACHE_KEY);
            }
        } else if (cachedData && cachedData.userId !== appState.user.id) {
            console.log("[STATE.JS] Cached data for different user. Clearing cache.");
            sessionStorage.removeItem(CACHE_KEY);
        }
    } catch (e) {
        console.error("[STATE.JS] Error loading state from session storage:", e);
        sessionStorage.removeItem(CACHE_KEY); 
    }
    return false; // No valid cache loaded
}

async function robustFetchWithTimeout(promise, ms, operationName = "Supabase Operation") {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            console.warn(`[STATE.JS] ${operationName} TIMED OUT after ${ms/1000}s.`);
            reject(new Error(`${operationName} timed out after ${ms / 1000} seconds`));
        }, ms);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId); 
        return result;
    } catch (error) {
        clearTimeout(timeoutId); 
        throw error; 
    }
}

function dbMaterialToAppMaterial(dbMaterial) {
    if (!dbMaterial) return null; 
    return { 
        id: dbMaterial.id, name: dbMaterial.name, unit: dbMaterial.unit, 
        currentStock: dbMaterial.current_stock, reorderPoint: dbMaterial.reorder_point,
        updatedAt: dbMaterial.updated_at // Ensure this is selected from DB
    };
}

function dbLogToAppLog(dbLog) {
    if(!dbLog) return null;
    return {
        id: dbLog.id, productName: dbLog.product_name, quantity: dbLog.quantity,
        date: dbLog.produced_at, // This is the timestamp for logs
        user_id: dbLog.user_id
    };
}

export async function loadInitialAppState() {
    console.log("[STATE.JS] loadInitialAppState START");
    const FETCH_TIMEOUT_MS = 15000; 

    if (!appState.user) { 
        console.error("[STATE.JS] No user in appState at start of loadInitialAppState. Aborting.");
        return false;
    }
    console.log("[STATE.JS] Current User for state load:", appState.user.email);

    // Try to load from cache first
    const loadedFromCache = loadStateFromSessionStorage();
    if (loadedFromCache) {
        console.log("[STATE.JS] Initial UI render will use cached data. Fetching updates in background.");
        refreshUI(); // Render UI immediately with cached data
    } else {
        console.log("[STATE.JS] No valid cache. Performing full initial fetch.");
        // Reset local state if no valid cache to ensure clean fetch
        appState.materials = [];
        appState.productionLog = [];
    }
    
    appState.dataLoaded = false; // Mark as not fully loaded from DB yet

    try {
        // --- Fetch Materials (Full or Incremental) ---
        let lastKnownMaterialUpdate = 0;
        if (loadedFromCache && appState.materials.length > 0) {
            const timestamps = appState.materials.map(m => new Date(m.updatedAt || 0).getTime());
            if (timestamps.length > 0) {
                lastKnownMaterialUpdate = Math.max(...timestamps);
            }
        }
        console.log(`[STATE.JS] Last known material update timestamp: ${new Date(lastKnownMaterialUpdate).toISOString()}`);

        const materialsQuery = supabase.from('materials').select('*').order('name', { ascending: true });
        if (loadedFromCache && lastKnownMaterialUpdate > 0) {
            materialsQuery.gt('updated_at', new Date(lastKnownMaterialUpdate).toISOString());
            console.log("[STATE.JS] Fetching only materials updated after cache timestamp.");
        }
        
        const materialsResponse = await robustFetchWithTimeout(materialsQuery, FETCH_TIMEOUT_MS, "Fetching materials");
        if (materialsResponse.error) throw new Error(`Supabase error fetching materials: ${materialsResponse.error.message}`);
        const newOrUpdatedMaterials = (materialsResponse.data || []).map(dbMaterialToAppMaterial).filter(m => m);
        console.log(`[STATE.JS] Fetched ${newOrUpdatedMaterials.length} new/updated materials.`);

        if (loadedFromCache) { // Merge with cache
            const materialsMap = new Map(appState.materials.map(m => [m.id, m]));
            newOrUpdatedMaterials.forEach(m => materialsMap.set(m.id, m));
            appState.materials = Array.from(materialsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        } else { // This was a full fetch
            appState.materials = newOrUpdatedMaterials;
        }

        // Seed if still empty (only on first ever load scenario)
        if (appState.materials.length === 0 && MATERIALS_CONFIG.length > 0 && !loadedFromCache) {
            console.log('[STATE.JS] No materials in DB. Attempting to seed...');
            showToast('Initializing factory materials...', 'info');
            const materialsToInsert = MATERIALS_CONFIG.map(m => ({ name: m.name, unit: m.unit, current_stock: m.currentStock, reorder_point: m.reorderPoint }));
            const insertQuery = supabase.from('materials').insert(materialsToInsert).select('*'); // Select all columns
            const insertResponse = await robustFetchWithTimeout(insertQuery, FETCH_TIMEOUT_MS, "Inserting materials");
            if (insertResponse.error) throw new Error(`Failed to seed materials: ${insertResponse.error.message}`);
            appState.materials = (insertResponse.data || []).map(dbMaterialToAppMaterial).filter(m => m);
            console.log(`[STATE.JS] ${appState.materials.length} materials seeded.`);
        }

        // --- Fetch Production Log (Full or Incremental) ---
        let lastKnownLogTime = 0;
        if (loadedFromCache && appState.productionLog.length > 0) {
            const logTimestamps = appState.productionLog.map(l => new Date(l.date || 0).getTime());
            if (logTimestamps.length > 0) {
                lastKnownLogTime = Math.max(...logTimestamps);
            }
        }
        console.log(`[STATE.JS] Last known production log timestamp: ${new Date(lastKnownLogTime).toISOString()}`);

        const productionLogQuery = supabase.from('production_log').select('*').eq('user_id', appState.user.id).order('produced_at', { ascending: false });
        if (loadedFromCache && lastKnownLogTime > 0) {
            productionLogQuery.gt('produced_at', new Date(lastKnownLogTime).toISOString());
            console.log("[STATE.JS] Fetching only production logs created after cache timestamp.");
        } else {
            productionLogQuery.limit(100); 
        }

        const productionLogResponse = await robustFetchWithTimeout(productionLogQuery, FETCH_TIMEOUT_MS, "Fetching production log");
        if (productionLogResponse.error) throw new Error(`Supabase error fetching production log: ${productionLogResponse.error.message}`);
        const newLogs = (productionLogResponse.data || []).map(dbLogToAppLog).filter(l => l);
        console.log(`[STATE.JS] Fetched ${newLogs.length} new/updated production log entries.`);

        if (loadedFromCache) { // Merge new logs
            const existingLogIds = new Set(appState.productionLog.map(l => l.id));
            newLogs.forEach(log => {
                if (!existingLogIds.has(log.id)) {
                    appState.productionLog.push(log);
                }
            });
            appState.productionLog.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            if (appState.productionLog.length > 100) {
                appState.productionLog = appState.productionLog.slice(0, 100);
            }
        } else {
            appState.productionLog = newLogs;
        }
        
        appState.dataLoaded = true; 
        appState.lastLoadedUserId = appState.user.id; 
        saveStateToSessionStorage(); 

        console.log('[STATE.JS] loadInitialAppState END - SUCCESS (Full Logic with Cache)');
        if (loadedFromCache && (newOrUpdatedMaterials.length > 0 || newLogs.length > 0)) {
            console.log("[STATE.JS] Cache was updated, refreshing UI again.");
            refreshUI(); // Refresh UI again if background fetch brought new data
        } else if (!loadedFromCache) {
             // If it was a full fetch because no cache, main.js's handleSuccessfulAuth will call refreshUI
             // But if we want to ensure it's called from here:
             // refreshUI();
        }
        return true;

    } catch (error) {
        console.error('[STATE.JS] loadInitialAppState END - FAILED (Full Logic with Cache):', error.message, error.stack);
        showToast(`Error loading data: ${error.message}`, 'error');
        appState.dataLoaded = false; 
        // Don't clear cache here, user might want to see stale data if network is down
        return false; 
    }
}
