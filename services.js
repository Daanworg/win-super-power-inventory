// services.js - Core Business Logic with Supabase (vFinal with user_id)

import { appState } from './state.js';
import { refreshUI, showToast } from './ui.js';
import { supabase } from './supabaseClient.js';

export async function handleUpdateStock(productName, quantity) {
    if (isNaN(quantity) || quantity <= 0) return;
    const recipe = appState.productRecipes[productName];
    if (!recipe) {
        showToast(`Error: No recipe found for ${productName}.`, 'error');
        return;
    }

    // Check if user is available in appState
    if (!appState.user || !appState.user.id) {
        showToast('User not identified. Cannot record production.', 'error');
        console.error('User ID missing in appState for handleUpdateStock');
        return;
    }

    const stockUpdates = [];
    for (const materialName in recipe) {
        const required = recipe[materialName] * quantity;
        const material = appState.materials.find(m => m.name === materialName);
        if (!material || material.currentStock < required) {
            showToast(`Insufficient materials for ${quantity}x ${productName}.`, 'error');
            return;
        }
        stockUpdates.push({
            id: material.id,
            newStock: material.currentStock - required
        });
    }

    showToast(`Producing ${quantity}x ${productName}...`, 'info');

    try {
        for (const update of stockUpdates) {
            const { error } = await supabase
                .from('materials')
                .update({ current_stock: update.newStock, updated_at: new Date().toISOString() })
                .eq('id', update.id);
            if (error) throw error;
        }

        const { error: logError } = await supabase
            .from('production_log')
            .insert({ 
                product_name: productName, 
                quantity: quantity, 
                user_id: appState.user.id // CRITICAL: Pass the user_id
            });
        if (logError) throw logError;

        // Optimistically update local state for immediate UI feedback
        for (const update of stockUpdates) {
            const material = appState.materials.find(m => m.id === update.id);
            if (material) material.currentStock = update.newStock;
        }
        // Also add user_id to local log for consistency, though not strictly used by UI yet
        appState.productionLog.unshift({ productName, quantity, date: new Date().toISOString(), user_id: appState.user.id });
        
        refreshUI();
        showToast(`Produced ${quantity}x ${productName}.`, 'success');
        
        const productCard = document.querySelector(`.dashboard-card[data-product-name="${productName}"]`);
        if (productCard) productCard.querySelector('input').value = '0';

    } catch (error) {
        showToast(`Production failed: ${error.message}`, 'error');
        console.error("Production Error:", error);
    }
}

export async function handleRestock(materialName, quantity) {
    if (isNaN(quantity) || quantity <= 0) return;
    const material = appState.materials.find(m => m.name === materialName);
    if (!material) return;
    
    const newStock = material.currentStock + quantity;

    try {
        const { data, error } = await supabase
            .from('materials')
            .update({ current_stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', material.id)
            .select();
        
        if (error) throw error;

        if (data && data.length > 0) {
            material.currentStock = data[0].current_stock;
        } else {
            // Fallback or error handling if select returns no data
            material.currentStock = newStock; // Optimistic if select fails but update might have succeeded
            console.warn("Restock update select returned no data, using optimistic update for UI.");
        }
        showToast(`Restocked ${quantity} ${material.unit} of ${materialName}.`, 'success');
        refreshUI();
    } catch (error) {
        showToast(`Restock failed: ${error.message}`, 'error');
    }
}

export async function handleSetStock(materialName, newStock) {
    if (isNaN(newStock) || newStock < 0) {
        showToast('Stock must be a valid positive number.', 'error');
        refreshUI(); // Re-render to revert optimistic UI changes if any
        return;
    }
    const material = appState.materials.find(m => m.name === materialName);
    if (!material) return;
    
    try {
        const { data, error } = await supabase
            .from('materials')
            .update({ current_stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', material.id)
            .select();

        if (error) throw error;
        
        if (data && data.length > 0) {
            material.currentStock = data[0].current_stock;
        } else {
            material.currentStock = newStock;
            console.warn("Set stock update select returned no data, using optimistic update for UI.");
        }
        showToast(`Stock for ${materialName} set to ${newStock}.`, 'success');
        refreshUI();
    } catch (error) {
        showToast(`Failed to set stock: ${error.message}`, 'error');
    }
}
