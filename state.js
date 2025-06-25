// state.js - Manages Application State (Full Logic + Smart Refetch - vFinal)

import { supabase } from './supabaseClient.js';
import { MATERIALS_CONFIG, RECIPES_CONFIG } from './config.js'; 
import { showToast } from './ui.js'; // Assuming ui.js exports showToast

export let appState = {
    user: null,
    materials: [],
    productRecipes: RECIPES_CONFIG,
    productionLog: [],
    lastLoadedUserId: null, 
    dataLoaded: false       
};

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
            console.warn("[STATE.JS] Attempting to load state, but appState.user is not yet set. Main.js should set this.");
            // This block is a fallback, main.js should ideally always set appState.user before calling this.
            const { data: { user: authUser }, error: getUserError } = await supabase.auth.getUser();
            if (getUserError) throw new Error(`Failed to get user: ${getUserError.message}`);
            if (!authUser) throw new Error("User not authenticated for loading state (checked directly).");
            appState.user = authUser;
            console.log("[STATE.JS] User fetched and set directly in loadInitialAppState:", appState.user.email);
        } else {
            console.log("[STATE.JS] Current User for state load:", appState.user.email);
        }

        if (appState.dataLoaded && appState.lastLoadedUserId === appState.user.id && appState.materials.length > 0) {
            console.log("[STATE.JS] Data already loaded for current user. Skipping full re-fetch.");
            return true; 
        }
        console.log(`[STATE.JS] Performing full data fetch for user ${appState.user.id}...`);
        
        let actualMaterialsData = null;
        const materialsQuery = supabase.from('materials').select('*').order('name', { ascending: true });
        const rawMaterialsResponse = await robustFetchWithTimeout(materialsQuery, FETCH_TIMEOUT_MS, "Fetching materials");
        
        console.log("[STATE.JS] RAW RESPONSE from materials query:", JSON.stringify(rawMaterialsResponse));

        if (rawMaterialsResponse.error) throw new Error(`Supabase error fetching materials: ${rawMaterialsResponse.error.message || JSON.stringify(rawMaterialsResponse.error)}`);
        actualMaterialsData = rawMaterialsResponse.data || [];
        console.log(`[STATE.JS] Fetched ${actualMaterialsData.length} materials from DB.`);

        if (actualMaterialsData.length === 0 && MATERIALS_CONFIG.length > 0) {
            console.log('[STATE.JS] No materials in DB. Attempting to seed from MATERIALS_CONFIG...');
            showToast('Initializing factory materials...', 'info'); 
            const materialsToInsert = MATERIALS_CONFIG.map(m => ({ name: m.name, unit: m.unit, current_stock: m.currentStock, reorder_point: m.reorderPoint }));
            const insertQuery = supabase.from('materials').insert(materialsToInsert).select();
            const insertResponse = await robustFetchWithTimeout(insertQuery, FETCH_TIMEOUT_MS, "Inserting materials");
            if (insertResponse.error) throw new Error(`Failed to seed materials: ${insertResponse.error.message || JSON.stringify(insertResponse.error)}`);
            actualMaterialsData = insertResponse.data || [];
            console.log(`[STATE.JS] ${actualMaterialsData.length} materials seeded successfully.`);
        }
        appState.materials = (actualMaterialsData || []).map(dbMaterialToAppMaterial).filter(m => m !== null);

        console.log("[STATE.JS] Fetching production log...");
        const productionLogQuery = supabase.from('production_log').select('*').eq('user_id', appState.user.id).order('produced_at', { ascending: false }).limit(100);
        const productionLogResponse = await robustFetchWithTimeout(productionLogQuery, FETCH_TIMEOUT_MS, "Fetching production log");
        if (productionLogResponse.error) throw new Error(`Supabase error fetching production log: ${productionLogResponse.error.message || JSON.stringify(productionLogResponse.error)}`);
        appState.productionLog = (productionLogResponse.data || []).map(log => ({ id: log.id, productName: log.product_name, quantity: log.quantity, date: log.produced_at, user_id: log.user_id }));
        console.log(`[STATE.JS] Fetched ${appState.productionLog.length} production log entries for current user.`);
        
        appState.dataLoaded = true; 
        appState.lastLoadedUserId = appState.user.id; 

        console.log('[STATE.JS] loadInitialAppState END - SUCCESS (Full Logic)');
        return true;

    } catch (error) {
        console.error('[STATE.JS] loadInitialAppState END - FAILED (Full Logic):', error.message, error.stack);
        showToast(`Error loading data: ${error.message}`, 'error');
        appState.dataLoaded = false; 
        return false; 
    }
}
