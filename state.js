// state.js - Manages Application State with Supabase (vFinal-RLS-Aware with MORE Debugging)

import { supabase } from './supabaseClient.js';
import { MATERIALS_CONFIG, RECIPES_CONFIG } from './config.js';
// import { showToast } from './ui.js'; // Using console.error more for this debug phase

export let appState = {
    user: null,
    materials: [],
    productRecipes: RECIPES_CONFIG,
    productionLog: []
};

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

        console.log("[STATE.JS] Fetching materials...");
        let { data: materials, error: materialsError } = await supabase
            .from('materials')
            .select('*')
            .order('name', { ascending: true });

        if (materialsError) {
            console.error("[STATE.JS] Supabase error fetching materials:", materialsError);
            throw new Error(`Failed to fetch materials: ${materialsError.message}`);
        }
        console.log(`[STATE.JS] Fetched ${materials ? materials.length : 'null'} materials from DB.`);

        if (materials && materials.length === 0 && MATERIALS_CONFIG.length > 0) {
            console.log('[STATE.JS] No materials in DB. Attempting to seed from MATERIALS_CONFIG...');
            // console.info('[STATE.JS] Initializing factory materials...'); // Replaced showToast
            
            const materialsToInsert = MATERIALS_CONFIG.map(m => ({
                name: m.name,
                unit: m.unit,
                current_stock: m.currentStock,
                reorder_point: m.reorderPoint
            }));
            console.log("[STATE.JS] Materials to insert:", materialsToInsert.length, "items.");

            const { data: insertedMaterials, error: insertError } = await supabase
                .from('materials')
                .insert(materialsToInsert)
                .select();

            if (insertError) {
                console.error("[STATE.JS] Supabase insert error for materials:", insertError);
                throw new Error(`Failed to seed materials: ${insertError.message}`);
            }
            materials = insertedMaterials;
            console.log(`[STATE.JS] ${materials ? materials.length : 'null'} materials seeded successfully.`);
        }
        
        appState.materials = materials ? materials.map(dbMaterialToAppMaterial) : [];

        console.log("[STATE.JS] Fetching production log...");
        const { data: productionLog, error: logError } = await supabase
            .from('production_log')
            .select('*')
            .order('produced_at', { ascending: false })
            .limit(100); 
        
        if (logError) {
            console.error("[STATE.JS] Supabase error fetching production_log:", logError);
            throw new Error(`Failed to fetch production log: ${logError.message}`);
        }
        console.log(`[STATE.JS] Fetched ${productionLog ? productionLog.length : 'null'} production log entries.`);

        appState.productionLog = productionLog ? productionLog.map(log => ({
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
        // showToast might not work if UI context is broken, rely on console for this level of debugging
        // showToast(`Failed to load data: ${error.message}`, 'error'); 
        return false; // Ensure it returns false if any error is caught
    }
}
