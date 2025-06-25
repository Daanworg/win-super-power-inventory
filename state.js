// state.js - TEMPORARY DIAGNOSTIC - Bypassing User Check for Materials

import { supabase } from './supabaseClient.js';
import { MATERIALS_CONFIG, RECIPES_CONFIG } from './config.js'; 
import { showToast, refreshUI } from './ui.js'; // Assuming refreshUI is not needed here for this diagnostic version

export let appState = {
    user: null,
    materials: [],
    productRecipes: RECIPES_CONFIG,
    productionLog: [],
    lastLoadedUserId: null, // Added for consistency with fuller versions
    dataLoaded: false       // Added for consistency
};
const CACHE_KEY = 'appStateCache'; // Not used in this diagnostic version
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // Not used

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
        reorderPoint: dbMaterial.reorder_point,
        updatedAt: dbMaterial.updated_at 
    };
}

function dbLogToAppLog(dbLog) { // Added this function
    if(!dbLog) return null;
    return {
        id: dbLog.id, productName: dbLog.product_name, quantity: dbLog.quantity,
        date: dbLog.produced_at, 
        user_id: dbLog.user_id
    };
}

export async function loadInitialAppState() {
    console.log("[STATE.JS] loadInitialAppState START (TEMP DIAGNOSTIC - Bypassing User Check for Materials)");
    const FETCH_TIMEOUT_MS = 15000; 

    if (!appState.user) {
        try {
            console.log("[STATE.JS] Attempting to get user as appState.user was null.");
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                appState.user = authUser;
                console.log("[STATE.JS] User set via supabase.auth.getUser():", appState.user.email);
            } else {
                 console.warn("[STATE.JS] supabase.auth.getUser() returned no user.");
            }
        } catch (e) {
            console.error("[STATE.JS] Error in supabase.auth.getUser():", e);
             // Decide if this is a fatal error for this diagnostic test.
             // For now, we'll let the materials fetch proceed to see if it works without strict user context.
        }
    }
    const currentUserIdForLog = appState.user ? appState.user.id : "USER_UNKNOWN_FOR_DIAGNOSTIC_MATERIALS_FETCH";
    console.log("[STATE.JS] Current User for state load (or attempt):", currentUserIdForLog);

    appState.materials = []; 
    appState.productionLog = [];
    appState.dataLoaded = false; 

    try {
        let actualMaterialsData = [];
        console.log(`[STATE.JS] Preparing to fetch materials (TEMP DIAGNOSTIC)...`);
        const materialsQuery = supabase.from('materials').select('*').order('name', { ascending: true });
        console.log("[STATE.JS] Executing materials query (TEMP DIAGNOSTIC)...");
        const rawMaterialsResponse = await robustFetchWithTimeout(materialsQuery, FETCH_TIMEOUT_MS, "Fetching materials (TEMP DIAGNOSTIC)");
        
        console.log("[STATE.JS] RAW RESPONSE from materials query (TEMP DIAGNOSTIC):", JSON.stringify(rawMaterialsResponse));

        if (rawMaterialsResponse.error) throw new Error(`Supabase error fetching materials: ${rawMaterialsResponse.error.message}`);
        actualMaterialsData = rawMaterialsResponse.data || [];
        console.log(`[STATE.JS] Fetched ${actualMaterialsData.length} materials from DB.`);
        appState.materials = (actualMaterialsData || []).map(dbMaterialToAppMaterial).filter(m => m !== null);

        if (appState.materials.length === 0 && MATERIALS_CONFIG.length > 0) {
            console.log('[STATE.JS] No materials in DB. Attempting to seed (TEMP DIAGNOSTIC)...');
            showToast('Initializing factory materials...', 'info');
            const materialsToInsert = MATERIALS_CONFIG.map(m => ({ name: m.name, unit: m.unit, current_stock: m.currentStock, reorder_point: m.reorderPoint }));
            const insertQuery = supabase.from('materials').insert(materialsToInsert).select('*');
            const insertResponse = await robustFetchWithTimeout(insertQuery, FETCH_TIMEOUT_MS, "Inserting materials (TEMP DIAGNOSTIC)");
            if (insertResponse.error) throw new Error(`Failed to seed materials: ${insertResponse.error.message}`);
            appState.materials = (insertResponse.data || []).map(dbMaterialToAppMaterial).filter(m => m);
            console.log(`[STATE.JS] ${appState.materials.length} materials seeded.`);
        }
        
        // For this diagnostic, we will still try to fetch production log if user is known
        if (appState.user && appState.user.id) {
            console.log("[STATE.JS] User context available, attempting to fetch production log for user:", appState.user.id);
            const productionLogQuery = supabase.from('production_log').select('*').eq('user_id', appState.user.id).order('produced_at', { ascending: false }).limit(100);
            const productionLogResponse = await robustFetchWithTimeout(productionLogQuery, FETCH_TIMEOUT_MS, "Fetching production log (TEMP DIAGNOSTIC)");
            if (productionLogResponse.error) {
                console.warn("[STATE.JS] Error fetching production log, but continuing as it's diagnostic for materials:", productionLogResponse.error.message);
                appState.productionLog = []; // Set to empty on error
            } else {
                appState.productionLog = (productionLogResponse.data || []).map(dbLogToAppLog).filter(l => l);
                console.log(`[STATE.JS] Fetched ${appState.productionLog.length} production log entries.`);
            }
        } else {
            console.warn("[STATE.JS] No authenticated user to fetch production log for (TEMP DIAGNOSTIC).");
            appState.productionLog = [];
        }
        
        appState.dataLoaded = true; 
        appState.lastLoadedUserId = appState.user ? appState.user.id : null; 
        
        console.log('[STATE.JS] loadInitialAppState END - SUCCESS (TEMP DIAGNOSTIC)');
        return true;

    } catch (error) {
        console.error('[STATE.JS] loadInitialAppState END - FAILED (TEMP DIAGNOSTIC):', error.message, error.stack);
        showToast(`Error loading data (state.js): ${error.message}`, 'error');
        appState.dataLoaded = false; 
        return false; 
    }
}