// state.js - Manages Application State with Supabase (vFinal-RLS-Aware)

import { supabase } from './supabaseClient.js';
import { MATERIALS_CONFIG, RECIPES_CONFIG } from './config.js';
import { showToast } from './ui.js'; // Assuming ui.js is available for showToast

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
        // costPerUnit: dbMaterial.cost_per_unit // If you re-add costs
    };
}

export async function loadInitialAppState() {
    try {
        // User is already set in appState by main.js's onAuthStateChange
        if (!appState.user) {
             // Fallback if called independently, though main.js should set it
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error("User not authenticated for loading state.");
            appState.user = authUser;
        }

        // Fetch materials
        let { data: materials, error: materialsError } = await supabase
            .from('materials')
            .select('*')
            .order('name', { ascending: true });

        if (materialsError) throw materialsError;

        // If no materials in DB (e.g., after TRUNCATE), initialize from config
        if (materials.length === 0 && MATERIALS_CONFIG.length > 0) {
            console.log('No materials found in DB. Attempting to seed from MATERIALS_CONFIG...');
            showToast('Initializing factory materials...', 'info');
            
            const materialsToInsert = MATERIALS_CONFIG.map(m => ({
                name: m.name,
                unit: m.unit,
                current_stock: m.currentStock, // Should be 0 from your config.js
                reorder_point: m.reorderPoint
                // cost_per_unit: m.costPerUnit || 0 // If you re-add costs
            }));

            const { data: insertedMaterials, error: insertError } = await supabase
                .from('materials')
                .insert(materialsToInsert)
                .select();

            if (insertError) {
                console.error("Supabase insert error for materials:", insertError);
                throw new Error(`Failed to seed materials: ${insertError.message}`);
            }
            materials = insertedMaterials; // Use the newly seeded materials
            console.log(`${materials.length} materials seeded successfully.`);
        }
        
        appState.materials = materials.map(dbMaterialToAppMaterial);

        // Fetch production log (respecting RLS - user should only see their own if policy is auth.uid() = user_id)
        const { data: productionLog, error: logError } = await supabase
            .from('production_log')
            .select('*')
            // .eq('user_id', appState.user.id) // Add this if RLS for SELECT is auth.uid() = user_id
            .order('produced_at', { ascending: false })
            .limit(100); 
        
        if (logError) throw logError;

        appState.productionLog = productionLog.map(log => ({
            id: log.id,
            productName: log.product_name,
            quantity: log.quantity,
            date: log.produced_at,
            user_id: log.user_id
        }));
        
        console.log('App state loaded successfully from Supabase.');
        return true;

    } catch (error) {
        console.error('Error loading app state:', error.message);
        // Avoid showing toast if it's due to "User not authenticated" during initial session check before login
        if (!error.message.includes("User not authenticated")) {
            showToast(`Failed to load data: ${error.message}`, 'error');
        }
        return false;
    }
}
