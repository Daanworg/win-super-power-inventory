// services.js - Core Business Logic (vFinal - Integrated with errorService)

import { appState } from './state.js';
import { refreshUI, showToast } from './ui.js';
import { supabase } from './supabaseClient.js';
import { handleError } from './errorService.js';

export async function handleUpdateStock(productName, quantity) {
    if (isNaN(quantity) || quantity <= 0) return; // Silently ignore invalid quantities
    
    const recipe = appState.productRecipes[productName];
    if (!recipe) {
        return handleError(new Error(`No recipe found for ${productName}.`), "production_no_recipe");
    }

    if (!appState.user || !appState.user.id) {
        return handleError(new Error('User not identified. Cannot record production.'), "production_user_missing");
    }

    const stockUpdates = [];
    for (const materialName in recipe) {
        const required = recipe[materialName] * quantity;
        const material = appState.materials.find(m => m.name === materialName);
        if (!material || (material.currentStock || 0) < required) {
            return showToast(`Insufficient materials for ${quantity}x ${productName}.`, 'error');
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
                user_id: appState.user.id
            });
        if (logError) throw logError;

        // Optimistically update local state for immediate UI feedback
        for (const update of stockUpdates) {
            const material = appState.materials.find(m => m.id === update.id);
            if (material) material.currentStock = update.newStock;
        }
        appState.productionLog.unshift({ productName, quantity, date: new Date().toISOString(), user_id: appState.user.id });
        
        refreshUI();
        showToast(`Produced ${quantity}x ${productName}.`, 'success');
        
        const productCard = document.querySelector(`.dashboard-card[data-product-name="${productName}"]`);
        if (productCard) productCard.querySelector('input').value = '0';

    } catch (error) {
        handleError(error, "production_failed");
        // ToDo: Implement logic to revert optimistic updates if the Supabase call fails.
        // For now, a page refresh will get the correct state from the DB.
    }
}

export async function handleRestock(materialName, quantity) {
    if (isNaN(quantity) || quantity <= 0) {
         handleError(new Error('Quantity must be a positive number.'), "restock_invalid_quantity");
         return;
    }
    const material = appState.materials.find(m => m.name === materialName);
    if (!material) {
        return handleError(new Error(`Material "${materialName}" not found.`), "restock_material_not_found");
    }
    
    const newStock = (material.currentStock || 0) + quantity;

    try {
        const { data, error } = await supabase
            .from('materials')
            .update({ current_stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', material.id)
            .select()
            .single(); // Use .single() to get a single object back, not an array
        
        if (error) throw error;

        if (data) {
            material.currentStock = data.current_stock;
        } else {
            material.currentStock = newStock; // Fallback to optimistic update
            console.warn("Restock update select returned no data, using optimistic update for UI.");
        }
        showToast(`Restocked ${quantity} ${material.unit} of ${materialName}.`, 'success');
        refreshUI();
    } catch (error) {
        handleError(error, "restock_failed");
    }
}

export async function handleSetStock(materialName, newStock) {
    if (isNaN(newStock) || newStock < 0) {
        handleError(new Error('Stock must be a valid positive number.'), "set_stock_invalid_value");
        refreshUI(); 
        return;
    }
    const material = appState.materials.find(m => m.name === materialName);
    if (!material) {
        return handleError(new Error(`Material "${materialName}" not found.`), "set_stock_material_not_found");
    }
    
    try {
        const { data, error } = await supabase
            .from('materials')
            .update({ current_stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', material.id)
            .select()
            .single();

        if (error) throw error;
        
        if (data) {
            material.currentStock = data.current_stock;
        } else {
            material.currentStock = newStock;
            console.warn("Set stock update select returned no data, using optimistic update for UI.");
        }
        showToast(`Stock for ${materialName} set to ${newStock}.`, 'success');
        refreshUI();
    } catch (error) {
        handleError(error, "set_stock_failed");
    }
}
