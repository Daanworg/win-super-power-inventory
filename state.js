// state.js - Manages Application State with Supabase (vFinal-RLS-Aware with TIMEOUT + RAW RESPONSE LOGGING)
// At the top of state.js
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
import { supabase } from './supabaseClient.js';
import { MATERIALS_CONFIG, RECIPES_CONFIG } from './config.js';

export let appState = {
    user: null,
    materials: [],
    productRecipes: RECIPES_CONFIG,
    productionLog: []
};

function fetchWithTimeout(promise, ms, timeoutError = new Error('Fetch timed out')) {
    const timeout = new Promise((resolve, reject) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            console.warn(`[STATE.JS] Operation triggered timeout after ${ms}ms:`, timeoutError.message);
            reject(timeoutError);
        }, ms);
    });
    return Promise.race([
        promise.finally(() => clearTimeout(timeoutIdVariablePlaceholder)), // Ensure timeout is cleared if promise resolves/rejects first
        timeout
    ]).then(value => { clearTimeout(timeoutIdVariablePlaceholder); return value; }) // Clear timeout on success
     .catch(error => { clearTimeout(timeoutIdVariablePlaceholder); throw error; }); // Clear timeout on error
    // Note: A better way to handle clearTimeout requires the timeout ID to be accessible.
    // For simplicity here, we'll rely on the finally in the promise if it's added there.
    // A more robust fetchWithTimeout would manage its own timeout ID.
    // Let's simplify it for now and focus on the Supabase response.
}

// Simpler fetchWithTimeout for this debugging round, focusing on the promise result
async function robustFetchWithTimeout(promise, ms, operationName = "Supabase Operation") {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            console.warn(`[STATE.JS] ${operationName} TIMED OUT after ${ms}ms.`);
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
    const FETCH_TIMEOUT_MS = 15000; 

    try {
        if (!appState.user) {
            console.log("[STATE.JS] appState.user is null, attempting to get user from Supabase...");
            const { data: { user: authUser }, error: getUserError } = await supabase.auth.getUser(); // This itself might be an issue if called too early
            if (getUserError) throw new Error(`Failed to get user: ${getUserError.message}`);
            if (!authUser) throw new Error("User not authenticated for loading state.");
            appState.user = authUser;
            console.log("[STATE.JS] User set from supabase.auth.getUser():", appState.user.email);
        } else {
            console.log("[STATE.JS] appState.user already set:", appState.user.email);
        }

        console.log(`[STATE.JS] Preparing to fetch materials...`);
        
        // --- Core of the debugging: Log the raw response ---
        let rawMaterialsResponse;
        try {
            const materialsQuery = supabase
                .from('materials')
                .select('*')
                .order('name', { ascending: true });
            
            console.log("[STATE.JS] Executing materials query...");
            rawMaterialsResponse = await robustFetchWithTimeout(materialsQuery, FETCH_TIMEOUT_MS, "Fetching materials");
            
            console.log("[STATE.JS] RAW RESPONSE from materials query:", rawMaterialsResponse);
            // For more detail if it's a complex object that doesn't stringify well:
            if (typeof rawMaterialsResponse === 'object' && rawMaterialsResponse !== null) {
                console.log("[STATE.JS] RAW RESPONSE Keys:", Object.keys(rawMaterialsResponse));
                if ('data' in rawMaterialsResponse) console.log("[STATE.JS] RAW RESPONSE has .data property");
                if ('error' in rawMaterialsResponse) console.log("[STATE.JS] RAW RESPONSE has .error property, value:", rawMaterialsResponse.error);
            }

        } catch (error) {
            console.error("[STATE.JS] Error during materials query execution or timeout:", error);
            throw error; // Propagate the error
        }

        let actualMaterialsData = null;
        // Now, interpret the rawMaterialsResponse
        if (rawMaterialsResponse && rawMaterialsResponse.error) {
            console.error("[STATE.JS] Supabase returned an error for materials:", rawMaterialsResponse.error);
            throw new Error(`Supabase error fetching materials: ${rawMaterialsResponse.error.message || JSON.stringify(rawMaterialsResponse.error)}`);
        } else if (rawMaterialsResponse && rawMaterialsResponse.data !== undefined) {
            actualMaterialsData = rawMaterialsResponse.data;
            console.log("[STATE.JS] Materials data successfully extracted from response.");
        } else {
            console.warn("[STATE.JS] Unexpected structure or null/undefined from materials query. Treating as no data.");
            actualMaterialsData = []; 
        }
       
        console.log(`[STATE.JS] Fetched ${actualMaterialsData ? actualMaterialsData.length : 'null/undefined'} materials from DB (after interpretation).`);

        if (actualMaterialsData && actualMaterialsData.length === 0 && MATERIALS_CONFIG.length > 0) {
            console.log('[STATE.JS] No materials interpreted from DB response. Attempting to seed...');
            const materialsToInsert = MATERIALS_CONFIG.map(m => ({ name: m.name, unit: m.unit, current_stock: m.currentStock, reorder_point: m.reorderPoint }));
            console.log("[STATE.JS] Materials to insert:", materialsToInsert.length, "items.");

            const insertQuery = supabase.from('materials').insert(materialsToInsert).select();
            const insertResponse = await robustFetchWithTimeout(insertQuery, FETCH_TIMEOUT_MS, "Inserting materials");

            if (insertResponse.error) {
                console.error("[STATE.JS] Supabase insert error for materials:", insertResponse.error);
                throw new Error(`Failed to seed materials: ${insertResponse.error.message || JSON.stringify(insertResponse.error)}`);
            }
            actualMaterialsData = insertResponse.data || [];
            console.log(`[STATE.JS] ${actualMaterialsData.length} materials seeded successfully.`);
        }
        appState.materials = actualMaterialsData.map(dbMaterialToAppMaterial);

        // Fetch production log (apply similar raw logging if issues persist here too)
        console.log("[STATE.JS] Fetching production log...");
        const productionLogQuery = supabase.from('production_log').select('*').order('produced_at', { ascending: false }).limit(100);
        const productionLogResponse = await robustFetchWithTimeout(productionLogQuery, FETCH_TIMEOUT_MS, "Fetching production log");
        
        if (productionLogResponse.error) {
            console.error("[STATE.JS] Supabase error fetching production_log:", productionLogResponse.error);
            throw new Error(`Supabase error fetching production log: ${productionLogResponse.error.message || JSON.stringify(productionLogResponse.error)}`);
        }
        appState.productionLog = (productionLogResponse.data || []).map(log => ({ id: log.id, productName: log.product_name, quantity: log.quantity, date: log.produced_at, user_id: log.user_id }));
        console.log(`[STATE.JS] Fetched ${appState.productionLog.length} production log entries.`);
        
        console.log('[STATE.JS] loadInitialAppState END - SUCCESS');
        return true;

    } catch (error) {
        console.error('[STATE.JS] loadInitialAppState END - FAILED:', error.message, error.stack);
        return false; 
    }
}
