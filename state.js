// state.js - Manages Application State (TEMPORARY SIMPLIFIED LOAD FOR DEBUGGING v2)

import { supabase } from './supabaseClient.js';
import { MATERIALS_CONFIG, RECIPES_CONFIG } from './config.js'; // Keep RECIPES_CONFIG for appState

export let appState = {
    user: null,
    materials: [],
    productRecipes: RECIPES_CONFIG, // Still needed for other parts of the app if they run
    productionLog: [] // Will remain empty in this simplified load
};

// Placed at the top for clarity and use within this file
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
        clearTimeout(timeoutId); // Clear timeout if promise resolved/rejected first
        return result;
    } catch (error) {
        clearTimeout(timeoutId); // Ensure timeout is cleared on error too
        throw error; // Re-throw the error (either from promise or timeout)
    }
}

function dbMaterialToAppMaterial(dbMaterial) {
    // Ensure dbMaterial is not null or undefined before trying to access its properties
    if (!dbMaterial) {
        console.warn("[STATE.JS] dbMaterialToAppMaterial received null or undefined dbMaterial");
        return null; // Or handle as an error, or return a default object
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
    console.log("[STATE.JS] loadInitialAppState START (SIMPLIFIED DEBUG VERSION v2)");
    const FETCH_TIMEOUT_MS = 15000; // 15 seconds timeout

    try {
        // Ensure user is set in appState. This should be handled by main.js's onAuthStateChange.
        if (!appState.user) { 
            console.warn("[STATE.JS] appState.user is not set at the start of loadInitialAppState. This might indicate an issue in main.js or auth flow.");
            // Attempt to get user directly if not set, though main.js should ideally do this.
            const { data: { user: authUser }, error: getUserError } = await supabase.auth.getUser();
            if (getUserError) {
                console.error("[STATE.JS] Error calling supabase.auth.getUser():", getUserError);
                throw new Error(`Failed to get user: ${getUserError.message}`);
            }
            if (!authUser) {
                console.error("[STATE.JS] supabase.auth.getUser() returned no user.");
                throw new Error("User not authenticated for loading state (checked directly).");
            }
            appState.user = authUser;
            console.log("[STATE.JS] User fetched and set directly in loadInitialAppState:", appState.user.email);
        } else {
            console.log("[STATE.JS] User already set in appState:", appState.user.email);
        }

        console.log(`[STATE.JS] Preparing to fetch materials ONLY (SIMPLIFIED)...`);
        
        let actualMaterialsData = null;
        const materialsQuery = supabase
            .from('materials')
            .select('*')
            .order('name', { ascending: true });
            
        console.log("[STATE.JS] Executing materials query (SIMPLIFIED)...");
        const rawMaterialsResponse = await robustFetchWithTimeout(materialsQuery, FETCH_TIMEOUT_MS, "Fetching materials (SIMPLIFIED)");
        
        console.log("[STATE.JS] RAW RESPONSE from materials query (SIMPLIFIED):", JSON.stringify(rawMaterialsResponse)); // Stringify to see full structure if complex

        if (rawMaterialsResponse && rawMaterialsResponse.error) {
            console.error("[STATE.JS] Supabase explicitly returned an error for materials (SIMPLIFIED):", rawMaterialsResponse.error);
            throw new Error(`Supabase error fetching materials: ${rawMaterialsResponse.error.message || JSON.stringify(rawMaterialsResponse.error)}`);
        } else if (rawMaterialsResponse && rawMaterialsResponse.data !== undefined && rawMaterialsResponse.data !== null) {
            actualMaterialsData = rawMaterialsResponse.data;
            console.log("[STATE.JS] Materials data successfully extracted (SIMPLIFIED).");
        } else {
            // This case means the query completed without a Supabase error object, but the .data field isn't there or is null.
            // This could happen if the timeout occurred and robustFetchWithTimeout threw, which would be caught by the outer catch.
            // Or if the Supabase client returned an unexpected valid (non-error) response.
            console.warn("[STATE.JS] Materials query completed but response.data is undefined or null. Treating as no data. Raw response logged above.");
            actualMaterialsData = []; 
        }
       
        console.log(`[STATE.JS] Interpreted ${actualMaterialsData ? actualMaterialsData.length : 'null/undefined'} materials from DB (SIMPLIFIED).`);
        
        // Filter out any nulls that might have resulted from dbMaterialToAppMaterial if a material record was bad
        appState.materials = (actualMaterialsData || []).map(dbMaterialToAppMaterial).filter(m => m !== null);
        
        // For this simplified test, we assume materials either exist or we don't try to seed.
        // The goal is to see if the SELECT itself times out.
        console.log('[STATE.JS] SIMPLIFIED: Not attempting to seed materials in this test version.');
        console.log('[STATE.JS] SIMPLIFIED: Not fetching production log in this test version.');
        appState.productionLog = []; // Explicitly set to empty for this test.
        
        console.log('[STATE.JS] loadInitialAppState END - SUCCESS (SIMPLIFIED)');
        return true;

    } catch (error) {
        // This catch block handles errors from robustFetchWithTimeout (including timeouts) 
        // or any other error thrown within the try block.
        console.error('[STATE.JS] loadInitialAppState END - FAILED (SIMPLIFIED):', error.message, error.stack);
        return false; 
    }
}
