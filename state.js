// state.js - Manages Application State with Supabase (vFinal-RLS-Aware with TIMEOUT)

import { supabase } from './supabaseClient.js';
import { MATERIALS_CONFIG, RECIPES_CONFIG } from './config.js';
// import { showToast } from './ui.js'; // Using console.error more for this debug phase

export let appState = {
    user: null,
    materials: [],
    productRecipes: RECIPES_CONFIG,
    productionLog: []
};

// Helper function to add a timeout to a promise
function fetchWithTimeout(promise, ms, timeoutError = new Error('Fetch timed out')) {
    const timeout = new Promise((resolve, reject) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            reject(timeoutError);
        }, ms);
    });
    return Promise.race([
        promise,
        timeout
    ]);
}

function dbMaterialToAppMaterial(dbMaterial) {
    return {
        id: dbMaterial.id,
        name: dbMaterial.name,
        unit: dbMaterial.unit,
        currentStock: dbMaterial.current_stock,
        reorderPoint: dbMaterial.reorder_point
    };
}

export async function loadInitialAppState() {
    console.log("[STATE.JS] loadInitialAppState START");
    const FETCH_TIMEOUT_MS = 10000; // 10 seconds timeout

    try {
        if (!appState.user) {
            console.log("[STATE.JS] appState.user is null, attempting to get user from Supabase...");
            const { data: { user: authUser }, error: getUserError } = await supabase.auth.getUser();
            if (getUserError) {
                console.error("[STATE.JS] Error getting user from Supabase:", getUserError);
                throw new Error(`Failed to get user: ${getUserError.message}`);
            }
            if (!authUser) {
                console.warn("[STATE.JS] No authenticated user found by supabase.auth.getUser().");
                throw new Error("User not authenticated for loading state.");
            }
            appState.user = authUser;
            console.log("[STATE.JS] User set from supabase.auth.getUser():", appState.user.email);
        } else {
            console.log("[STATE.JS] appState.user already set:", appState.user.email);
        }

        console.log(`[STATE.JS] Fetching materials... (Timeout: ${FETCH_TIMEOUT_MS / 1000}s)`);
        
        // --- MODIFIED: Supabase call wrapped in timeout ---
        const materialsPromise = supabase
            .from('materials')
            .select('*')
            .order('name', { ascending: true });
        
        const { data: materialsResponse, error: materialsError } = await fetchWithTimeout(
            materialsPromise, 
            FETCH_TIMEOUT_MS, 
            new Error('Timeout fetching materials from Supabase.')
        );

        if (materialsError) { // This could now be our timeout error or a Supabase error
            console.error("[STATE.JS] Error/Timeout fetching materials:", materialsError);
            throw materialsError; // Re-throw to be caught by the outer try-catch
        }
        // Supabase wraps data in { data, error }. If materialsPromise resolved, data is in materialsResponse directly.
        // However, the structure of the response is { data: actualDataArray, error: null }
        // So, materialsResponse.data is what we need.
        const materials = materialsResponse; // Corrected: the whole response is what we need. Oh, wait, no, the Supabase client returns an object {data, error, count, status, statusText}
                                            // Let's assume the select() method itself returns { data: array, error: object }
                                            // The fetchWithTimeout will pass this whole object through.

        // This part was incorrect based on Supabase's client structure
        // Correct approach: A Supabase call like .select() resolves to an object { data, error, ... }
        // Our fetchWithTimeout passes that object through if it resolves.
        // So, if materialsPromise resolves, materialsResponse will be { data: [...], error: null }
        // If it errors, materialsError will be populated. If it times out, materialsError will be our timeout error.

        // The original structure was:
        // let { data: materials, error: materialsError } = await ...
        // This destructuring happens on the *result* of the await.
        // So, if the promise passed to fetchWithTimeout resolves with { data: [...], error: null },
        // then materialsResponse IS that object.

        let actualMaterialsData = null;
        if (materialsResponse && materialsResponse.data !== undefined) { // Check if it's a Supabase-like response
             actualMaterialsData = materialsResponse.data;
             if (materialsResponse.error) { // If Supabase itself returned an error
                console.error("[STATE.JS] Supabase returned an error for materials:", materialsResponse.error);
                throw materialsResponse.error;
             }
        } else if (materialsError) { // This handles timeout or other direct errors from fetchWithTimeout
            console.error("[STATE.JS] Error fetching materials (could be timeout):", materialsError);
            throw materialsError;
        } else {
            // This case should ideally not happen if fetchWithTimeout works as expected
            console.warn("[STATE.JS] Unexpected response structure from fetching materials.");
            actualMaterialsData = []; // Default to empty if structure is weird
        }


        console.log(`[STATE.JS] Fetched ${actualMaterialsData ? actualMaterialsData.length : 'null/undefined'} materials from DB.`);

        if (actualMaterialsData && actualMaterialsData.length === 0 && MATERIALS_CONFIG.length > 0) {
            console.log('[STATE.JS] No materials in DB. Attempting to seed from MATERIALS_CONFIG...');
            
            const materialsToInsert = MATERIALS_CONFIG.map(m => ({
                name: m.name,
                unit: m.unit,
                current_stock: m.currentStock,
                reorder_point: m.reorderPoint
            }));
            console.log("[STATE.JS] Materials to insert:", materialsToInsert.length, "items.");

            const insertPromise = supabase
                .from('materials')
                .insert(materialsToInsert)
                .select();
            
            const { data: insertedMaterialsResponse, error: insertError } = await fetchWithTimeout(
                insertPromise,
                FETCH_TIMEOUT_MS,
                new Error('Timeout inserting initial materials.')
            );

            if (insertError) {
                console.error("[STATE.JS] Supabase insert error/timeout for materials:", insertError);
                throw insertError;
            }
            actualMaterialsData = (insertedMaterialsResponse && insertedMaterialsResponse.data) ? insertedMaterialsResponse.data : [];
            console.log(`[STATE.JS] ${actualMaterialsData ? actualMaterialsData.length : 'null'} materials seeded successfully.`);
        }
        
        appState.materials = actualMaterialsData ? actualMaterialsData.map(dbMaterialToAppMaterial) : [];

        console.log("[STATE.JS] Fetching production log...");
        const productionLogPromise = supabase
            .from('production_log')
            .select('*')
            .order('produced_at', { ascending: false })
            .limit(100); 
        
        const { data: productionLogResponse, error: logError } = await fetchWithTimeout(
            productionLogPromise,
            FETCH_TIMEOUT_MS,
            new Error('Timeout fetching production log.')
        );
        
        let actualProductionLogData = null;
        if (productionLogResponse && productionLogResponse.data !== undefined) {
            actualProductionLogData = productionLogResponse.data;
            if (productionLogResponse.error) {
                console.error("[STATE.JS] Supabase returned an error for production_log:", productionLogResponse.error);
                throw productionLogResponse.error;
            }
        } else if (logError) {
            console.error("[STATE.JS] Error fetching production_log (could be timeout):", logError);
            throw logError;
        } else {
            console.warn("[STATE.JS] Unexpected response structure from fetching production_log.");
            actualProductionLogData = [];
        }

        console.log(`[STATE.JS] Fetched ${actualProductionLogData ? actualProductionLogData.length : 'null'} production log entries.`);

        appState.productionLog = actualProductionLogData ? actualProductionLogData.map(log => ({
            id: log.id,
            productName: log.product_name,
            quantity: log.quantity,
            date: log.produced_at,
            user_id: log.user_id
        })) : [];
        
        console.log('[STATE.JS] loadInitialAppState END - SUCCESS');
        return true;

    } catch (error) {
        console.error('[STATE.JS] loadInitialAppState END - FAILED:', error.message, error.stack);
        return false; 
    }
}
