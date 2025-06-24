// events.js - Manages all event listeners (vFinal)

import { appState, saveState, loadState } from './state.js';
import { handleUpdateStock, handleRestock, handleSetStock } from './services.js';
import { refreshUI, showToast, renderReport, renderCustomPOModal } from './ui.js';
import { generatePurchaseOrder } from './purchaseOrderService.js';
import { supabase } from './supabaseClient.js';

export function attachAllListeners() {
    attachProductInputListeners();
    attachCurrentStockEditListeners();
    attachRestockListeners();
    attachPurchaseOrderListener();
}

export function attachOneTimeListeners() {
    attachAuthListeners();
    attachModalListeners();
}

function attachProductInputListeners() {
    document.querySelectorAll('.update-btn').forEach(btn => {
        if (btn.dataset.listenerAttached) return;
        btn.dataset.listenerAttached = 'true';
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.dashboard-card');
            const productName = e.target.dataset.productName;
            const quantity = parseInt(card.querySelector('input').value, 10);
            handleUpdateStock(productName, quantity);
        });
    });
}

function attachCurrentStockEditListeners() {
    document.querySelectorAll('.edit-current-stock').forEach(icon => {
        if (icon.dataset.listenerAttached) return;
        icon.dataset.listenerAttached = 'true';
        icon.addEventListener('click', (e) => {
            const card = e.target.closest('.dashboard-card');
            const valueDiv = card.querySelector('.current-stock-value');
            const materialName = card.dataset.materialName;
            
            const input = document.createElement('input');
            input.type = 'number';
            input.value = valueDiv.textContent;
            input.className = 'input-field w-24 text-2xl font-bold bg-dark text-primary';
            
            valueDiv.replaceWith(input);
            input.focus();
            input.select();

            const saveChange = () => {
                const newValue = parseInt(input.value, 10);
                handleSetStock(materialName, newValue);
            };

            input.addEventListener('blur', saveChange);
            input.addEventListener('keydown', (event) => { if (event.key === 'Enter') input.blur(); });
        });
    });
}

function attachRestockListeners() {
    document.querySelectorAll('.restock-icon').forEach(btn => {
        if (btn.dataset.listenerAttached) return;
        btn.dataset.listenerAttached = 'true';
        btn.addEventListener('click', (e) => {
            const parentEl = e.target.closest('[data-material-name]');
            const materialName = parentEl.dataset.materialName;
            const formContainer = parentEl.querySelector('.restock-form');

            if (formContainer.classList.contains('hidden')) {
                document.querySelectorAll('.restock-form').forEach(f => { f.classList.add('hidden'); f.innerHTML = ''; });
                formContainer.classList.remove('hidden');
                formContainer.innerHTML = `<div class="flex items-center gap-2"><input type="number" placeholder="Qty" class="input-field w-20"><button class="btn btn-primary text-xs confirm-restock-btn">Add</button></div>`;
                const input = formContainer.querySelector('input');
                input.focus();
                formContainer.querySelector('.confirm-restock-btn').addEventListener('click', () => { handleRestock(materialName, parseInt(input.value, 10)); });
                input.addEventListener('keydown', (event) => { if (event.key === 'Enter') handleRestock(materialName, parseInt(input.value, 10)); if (event.key === 'Escape') formContainer.classList.add('hidden'); });
            } else {
                formContainer.classList.add('hidden');
                formContainer.innerHTML = '';
            }
        });
    });
}

function attachPurchaseOrderListener() {
    const reorderHeader = document.getElementById('reorder-header');
    if (reorderHeader && !reorderHeader.dataset.listenerAttached) {
        reorderHeader.dataset.listenerAttached = 'true';
        reorderHeader.addEventListener('click', (e) => {
            if (e.target.id === 'open-po-modal-btn') {
                const materialsToOrder = appState.materials.filter(m => m.currentStock <= m.reorderPoint * 1.5);
                if (materialsToOrder.length > 0) {
                    renderCustomPOModal(materialsToOrder);
                } else {
                    showToast('No items need reordering.', 'info');
                }
            }
        });
    }
}

function attachAuthListeners() {
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            
            if (error) {
                showToast(`Login failed: ${error.message}`, 'error');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
        });
    }
}

function attachModalListeners() {
    const resetModal = document.getElementById('reset-modal');
    const reportsModal = document.getElementById('reports-modal');
    const customPOModal = document.getElementById('custom-po-modal');

    document.getElementById('show-reset-modal-btn')?.addEventListener('click', () => resetModal.classList.remove('hidden'));
    
    resetModal.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if ((target && target.id === 'cancel-reset-btn') || e.target === resetModal) {
            resetModal.classList.add('hidden');
        }
        if (target && target.id === 'confirm-reset-btn') {
            showToast('Resetting data... please wait.', 'info');
            // Use Supabase RPC to call a function that truncates tables
            const { error } = await supabase.rpc('reset_data');
            if (error) {
                showToast(`Reset failed: ${error.message}`, 'error');
            } else {
                window.location.reload();
            }
        }
    });

    document.getElementById('show-reports-modal-btn')?.addEventListener('click', () => reportsModal.classList.remove('hidden'));
    reportsModal.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if ((target && target.id === 'close-reports-modal-btn') || e.target === reportsModal) {
            reportsModal.classList.add('hidden');
        }
        if (target && target.id === 'report-prod-summary') renderReport('production');
        if (target && target.id === 'report-mat-usage') renderReport('material');
    });
    
    customPOModal.addEventListener('click', e => {
        const target = e.target;
        if (target.id === 'custom-po-modal' || target.closest('#cancel-po-btn') || target.id === 'cancel-po-btn-footer') {
            customPOModal.classList.add('hidden');
        }

        if (target.id === 'confirm-po-generation-btn') {
            const supplierName = document.getElementById('supplier-name').value.trim();
            const selectedItems = [];
            
            document.querySelectorAll('.po-item-select:checked').forEach(checkbox => {
                const row = checkbox.closest('.po-item-row');
                const materialName = row.dataset.materialName;
                const material = appState.materials.find(m => m.name === materialName);
                const quantity = parseInt(row.querySelector('.po-item-qty').value, 10);

                if (material && !isNaN(quantity) && quantity > 0) {
                    selectedItems.push({ material, quantity });
                }
            });

            if (selectedItems.length > 0) {
                generatePurchaseOrder(selectedItems, supplierName);
                showToast(`Generated PO for ${selectedItems.length} items.`, 'success');
                customPOModal.classList.add('hidden');
            } else {
                showToast('No items selected or quantities are invalid.', 'error');
            }
        }
    });
}
