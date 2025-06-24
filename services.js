// services.js - Core Business Logic with Supabase
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

    const stockUpdates = [];
    for (const materialName in recipe) {
        const required = recipe[materialName] * quantity;
        const material = appState.materials.find(m => m.name === materialName);
        if (!material || material.currentStock < required) {
            showToast(`Insufficient materials for ${quantity}x ${productName}. Needed ${required} of ${materialName}, but only have ${material ? material.currentStock : 0}.`, 'error');
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
            .insert({ product_name: productName, quantity: quantity });
        if (logError) throw logError;

        for (const update of stockUpdates) {
            const material = appState.materials.find(m => m.id === update.id);
            if (material) material.currentStock = update.newStock;
        }
        appState.productionLog.unshift({ productName, quantity, date: new Date().toISOString() });

        refreshUI();
        showToast(`Produced ${quantity}x ${productName}.`, 'success');
        
        document.querySelectorAll('.dashboard-card').forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent === productName) {
                card.querySelector('input').value = '0';
            }
        });

    } catch (error) {
        showToast(`Production failed: ${error.message}`, 'error');
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

        material.currentStock = data[0].current_stock;
        showToast(`Restocked ${quantity} ${material.unit} of ${materialName}.`, 'success');
        refreshUI();
    } catch (error) {
        showToast(`Restock failed: ${error.message}`, 'error');
    }
}

export async function handleSetStock(materialName, newStock) {
    if (isNaN(newStock) || newStock < 0) {
        showToast('Stock must be a valid positive number.', 'error');
        refreshUI();
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

        material.currentStock = data[0].current_stock;
        showToast(`Stock for ${materialName} set to ${newStock}.`, 'success');
        refreshUI();
    } catch (error) {
        showToast(`Failed to set stock: ${error.message}`, 'error');
    }
}
