// state.js - Manages Application State (Full Logic + Smart Refetch Prevention - vFinal)

import { supabase } from './supabaseClient.js';
import { MATERIALS_CONFIG, RECIPES_CONFIG } from './config.js'; 
import { showToast } from './ui.js';

export let appState = {
    user: null,
    materials: [],
    productRecipes: RECIPES_CONFIG,
    productionLog: [],
    lastLoadedUserId: null, // To track for whom the data was loaded
    dataLoaded: false       // Flag to indicate if initial load happened for current session
};

async function robustFetchWithTimeout(promise, ms, operationName = "Supabase Operation") {
    // ... (same robustFetchWithTimeout function from Turn 58)
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
    // ... (same dbMaterialToAppMaterial function from Turn 58)
    if (!dbMaterial) {
        console.warn("[STATE.JS] dbMaterialToAppMaterial received null or undefined dbMaterial");
        return null; 
    }
    return { 
        id: dbMaterial.id, 
        name: dbMaterial.name, 
        unit: dbMaterial.unit, 
        currentStock: dbMaterial.current_stock, 
        reorderPoint: dbMaterial.reorder_point 
    };
}

export async function loadInitialAppState() {
    console.log("[STATE.JS] loadInitialAppState START (Full Logic + Smart Refetch)");
    const FETCH_TIMEOUT_MS = 15000; 

    try {
        if (!appState.user) { 
            const { data: { user: authUser }, error: getUserError } = await supabase.auth.getUser();
            if (getUserError) throw new Error(`Failed to get user: ${getUserError.message}`);
            if (!authUser) throw new Error("User not authenticated for loading state (checked directly).");
            appState.user = authUser;
        }
        console.log("[STATE.JS] Current User:", appState.user.email);

        // --- Smart Refetch Prevention ---
        if (appState.dataLoaded && appState.lastLoadedUserId === appState.user.id && appState.materials.length > 0) {
            console.log("[STATE.JS] Data already loaded for current user. Skipping full re-fetch.");
            return true; // Assume data is fresh enough
        }
        // --- End Smart Refetch Prevention ---

        console.log(`[STATE.JS] Performing full data fetch for user ${appState.user.id}...`);
        let actualMaterialsData = null;
        const materialsQuery = supabase.from('materials').select('*').order('name', { ascending: true });
        const rawMaterialsResponse = await robustFetchWithTimeout(materialsQuery, FETCH_TIMEOUT_MS, "Fetching materials");
        
        if (rawMaterialsResponse.error) throw new Error(`Supabase error fetching materials: ${rawMaterialsResponse.error.message}`);
        actualMaterialsData = rawMaterialsResponse.data || [];
        console.log(`[STATE.JS] Fetched ${actualMaterialsData.length} materials.`);

        if (actualMaterialsData.length === 0 && MATERIALS_CONFIG.length > 0) {
            console.log('[STATE.JS] No materials in DB. Attempting to seed...');
            showToast('Initializing factory materials...', 'info');
            const materialsToInsert = MATERIALS_CONFIG.map(m => ({ name: m.name, unit: m.unit, current_stock: m.currentStock, reorder_point: m.reorderPoint }));
            const insertQuery = supabase.from('materials').insert(materialsToInsert).select();
            const insertResponse = await robustFetchWithTimeout(insertQuery, FETCH_TIMEOUT_MS, "Inserting materials");
            if (insertResponse.error) throw new Error(`Failed to seed materials: ${insertResponse.error.message}`);
            actualMaterialsData = insertResponse.data || [];
            console.log(`[STATE.JS] ${actualMaterialsData.length} materials seeded.`);
        }
        appState.materials = (actualMaterialsData || []).map(dbMaterialToAppMaterial).filter(m => m !== null);

        const productionLogQuery = supabase.from('production_log').select('*').order('produced_at', { ascending: false }).limit(100);
        const productionLogResponse = await robustFetchWithTimeout(productionLogQuery, FETCH_TIMEOUT_MS, "Fetching production log");
        if (productionLogResponse.error) throw new Error(`Supabase error fetching production log: ${productionLogResponse.error.message}`);
        appState.productionLog = (productionLogResponse.data || []).map(log => ({ id: log.id, productName: log.product_name, quantity: log.quantity, date: log.produced_at, user_id: log.user_id }));
        console.log(`[STATE.JS] Fetched ${appState.productionLog.length} production log entries.`);
        
        appState.dataLoaded = true; // Mark data as loaded for this session
        appState.lastLoadedUserId = appState.user.id; // Store the user ID for whom data was loaded

        console.log('[STATE.JS] loadInitialAppState END - SUCCESS (Full Logic)');
        return true;

    } catch (error) {
        console.error('[STATE.JS] loadInitialAppState END - FAILED (Full Logic):', error.message, error.stack);
        showToast(`Error loading data: ${error.message}`, 'error');
        appState.dataLoaded = false; // Ensure flag is reset on error
        return false; 
    }
}
