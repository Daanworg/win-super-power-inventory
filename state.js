// state.js - TEMPORARY DIAGNOSTIC v3 - ULTRA-Simplified Materials Fetch

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
    console.log("[STATE.JS] loadInitialAppState START (TEMP DIAGNOSTIC v3)");
    const FETCH_TIMEOUT_MS = 10000; // Reduced timeout to 10s for quicker feedback

    if (!appState.user) {
        try {
            console.log("[STATE.JS] Attempting to get user as appState.user was null.");
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) appState.user = authUser;
            else console.warn("[STATE.JS] supabase.auth.getUser() returned no user in diagnostic.");
        } catch (e) { console.error("[STATE.JS] Error in supabase.auth.getUser():", e); }
    }
    const currentUserIdForLog = appState.user ? appState.user.id : "USER_UNKNOWN_FOR_DIAG_MATERIALS_FETCH_V3";
    console.log("[STATE.JS] Current User for state load (or attempt):", currentUserIdForLog);

    appState.materials = []; 
    appState.productionLog = [];
    appState.dataLoaded = false; 

    try {
        let actualMaterialsData = [];
        console.log(`[STATE.JS] Preparing to fetch materials (ULTRA-SIMPLIFIED)...`);
        
        // EVEN SIMPLER QUERY: Just select 'id, name' and limit to 5. No ordering.
        const materialsQuery = supabase.from('materials').select('id, name').limit(5); 
        
        console.log("[STATE.JS] Executing materials query (ULTRA-SIMPLIFIED)...");
        const rawMaterialsResponse = await robustFetchWithTimeout(materialsQuery, FETCH_TIMEOUT_MS, "Fetching materials (ULTRA-SIMPLIFIED)");
        
        console.log("[STATE.JS] RAW RESPONSE from materials query (ULTRA-SIMPLIFIED):", JSON.stringify(rawMaterialsResponse));

        if (rawMaterialsResponse.error) {
            throw new Error(`Supabase error fetching materials (ULTRA-SIMPLIFIED): ${rawMaterialsResponse.error.message}`);
        }
        actualMaterialsData = rawMaterialsResponse.data || [];
        console.log(`[STATE.JS] Fetched ${actualMaterialsData.length} materials from DB (ULTRA-SIMPLIFIED).`);
        
        // For this test, we don't map or seed, just see if the select works
        appState.materials = actualMaterialsData; // Store raw for now if needed for inspection

        // Production log fetch remains commented out for this specific diagnostic
        console.warn("[STATE.JS] Production log fetch and full seeding skipped for this diagnostic.");
            
        appState.dataLoaded = true; // Mark as loaded if we got this far without timeout
        appState.lastLoadedUserId = appState.user ? appState.user.id : null; 
            
        console.log('[STATE.JS] loadInitialAppState END - SUCCESS (TEMP DIAGNOSTIC v3)');
        return true;

    } catch (error) {
        console.error('[STATE.JS] loadInitialAppState END - FAILED (TEMP DIAGNOSTIC v3):', error.message, error.stack);
        showToast(`Error loading data (state.js v3): ${error.message}`, 'error');
        appState.dataLoaded = false; 
        return false; 
    }
}
