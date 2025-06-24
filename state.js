// state.js - Manages Application State with Supabase (vFinal-Simplified)

import { supabase } from './supabaseClient.js';
import { RECIPES_CONFIG } from './config.js';
import { showToast } from './ui.js';

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
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated.");
        appState.user = user;

        // Fetch materials - The seeding is now done via SQL, so we just fetch.
        const { data: materials, error: materialsError } = await supabase
            .from('materials')
            .select('*')
            .order('name', { ascending: true });
        if (materialsError) throw materialsError;

        // Fetch production log
        const { data: productionLog, error: logError } = await supabase
            .from('production_log')
            .select('*')
            .order('produced_at', { ascending: false })
            .limit(100);
        if (logError) throw logError;

        appState.materials = materials.map(dbMaterialToAppMaterial);
        appState.productionLog = productionLog.map(log => ({
            id: log.id,
            productName: log.product_name,
            quantity: log.quantity,
            date: log.produced_at
        }));
        
        console.log('App state loaded successfully from Supabase.');
        return true;
    } catch (error) {
        console.error('Error loading app state:', error.message);
        showToast(`Failed to load data: ${error.message}`, 'error');
        return false;
    }
}
