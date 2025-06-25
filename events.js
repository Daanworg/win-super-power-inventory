// events.js - Manages all event listeners (vFinal - Receives login handler)

import { appState } from './state.js';
import { handleUpdateStock, handleRestock, handleSetStock } from './services.js';
import { refreshUI, showToast, renderReport, renderCustomPOModal } from './ui.js';
import { generatePurchaseOrder } from './purchaseOrderService.js';
import { supabase } from './supabaseClient.js';
// Removed: import { handleLoginSubmit } from './main.js'; // This was the source of the error

// This function is called by refreshUI in ui.js to re-attach listeners to dynamic elements
export function attachAllListeners() {
    // console.log("[EVENTS.JS] attachAllListeners called.");
    attachProductInputListeners();
    attachCurrentStockEditListeners();
    attachRestockListeners();
    attachPurchaseOrderListener(); 
}

// This function is called once by main.js on DOMContentLoaded for static elements
// It now ACCEPTS the login submit handler from main.js
export function attachOneTimeListeners(loginSubmitHandler) {
    console.log("[EVENTS.JS] attachOneTimeListeners called, received loginSubmitHandler:", typeof loginSubmitHandler);
    attachAuthListeners(loginSubmitHandler); // Pass the handler
    attachModalListeners();
}

function attachProductInputListeners() {
    document.querySelectorAll('.update-btn').forEach(btn => {
        if (btn.dataset.listenerAttached === 'true') return; 
        btn.dataset.listenerAttached = 'true';
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.dashboard-card');
            const productName = e.target.dataset.productName;
            const quantityInput = card.querySelector('input[type="number"]');
            if (quantityInput) {
                const quantity = parseInt(quantityInput.value, 10);
                handleUpdateStock(productName, quantity);
            } else {
                console.error("Quantity input not found for product:", productName);
            }
        });
    });
}

function attachCurrentStockEditListeners() {
    document.querySelectorAll('.edit-current-stock').forEach(icon => {
        if (icon.dataset.listenerAttached === 'true') return;
        icon.dataset.listenerAttached = 'true';
        icon.addEventListener('click', (e) => {
            const card = e.target.closest('.dashboard-card[data-material-name]');
            if (!card) return;
            const valueDiv = card.querySelector('.current-stock-value');
            const materialName = card.dataset.materialName;
            if (!valueDiv || !materialName) {
                console.error("[EVENTS.JS] Could not find valueDiv or materialName for stock edit.");
                return;
            }

            const currentInput = card.querySelector('input.inline-edit-stock');
            if (currentInput) return; 

            const input = document.createElement('input');
            input.type = 'number';
            input.value = valueDiv.textContent;
            input.className = 'input-field w-24 text-2xl font-bold inline-edit-stock';
            valueDiv.replaceWith(input);
            input.focus();
            input.select();

            const saveChange = async () => {
                const newValue = parseInt(input.value, 10);
                await handleSetStock(materialName, newValue); 
            };
            const handleKeyDown = (event) => {
                if (event.key === 'Enter') input.blur();
                else if (event.key === 'Escape') {
                    input.replaceWith(valueDiv); 
                }
            };
            input.addEventListener('blur', saveChange, { once: true });
            input.addEventListener('keydown', handleKeyDown);
        });
    });
}

function attachRestockListeners() {
    document.querySelectorAll('.restock-icon').forEach(btn => {
        if (btn.dataset.listenerAttached === 'true') return;
        btn.dataset.listenerAttached = 'true';
        btn.addEventListener('click', (e) => {
            const parentEl = e.target.closest('[data-material-name]');
            if (!parentEl) return;
            const materialName = parentEl.dataset.materialName;
            const formContainer = parentEl.querySelector('.restock-form');
            if (!formContainer) return;

            document.querySelectorAll('.restock-form').forEach(f => {
                if (f !== formContainer) { f.classList.add('hidden'); f.innerHTML = '';}
            });

            if (formContainer.classList.contains('hidden')) {
                formContainer.classList.remove('hidden');
                formContainer.innerHTML = `<div class="flex items-center gap-2 mt-1"><input type="number" placeholder="Qty" class="input-field w-20 text-sm p-1"><button class="btn btn-primary text-xs confirm-restock-btn p-1">Add</button></div>`;
                const input = formContainer.querySelector('input');
                const confirmBtn = formContainer.querySelector('.confirm-restock-btn');
                input.focus();
                const performRestock = async () => {
                    if (input.value) {
                        await handleRestock(materialName, parseInt(input.value, 10));
                        formContainer.classList.add('hidden'); formContainer.innerHTML = '';
                    }
                };
                confirmBtn.addEventListener('click', performRestock);
                input.addEventListener('keydown', (event) => { 
                    if (event.key === 'Enter') performRestock(); 
                    if (event.key === 'Escape') { formContainer.classList.add('hidden'); formContainer.innerHTML = ''; }
                });
            } else {
                formContainer.classList.add('hidden'); formContainer.innerHTML = '';
            }
        });
    });
}

function attachPurchaseOrderListener() {
    const reorderHeader = document.getElementById('reorder-header');
    if (reorderHeader && !reorderHeader.dataset.poListenerAttached) { 
        reorderHeader.dataset.poListenerAttached = 'true';
        reorderHeader.addEventListener('click', (e) => {
            if (e.target.id === 'open-po-modal-btn' || e.target.closest('#open-po-modal-btn')) {
                console.log("[EVENTS.JS] Create Purchase Order button clicked.");
                const itemsToReorder = appState.materials.filter(m => (m.currentStock || 0) <= (m.reorderPoint || 0) * 1.5);
                if (itemsToReorder.length > 0) renderCustomPOModal(itemsToReorder);
                else showToast('No items currently need reordering.', 'info');
            }
        });
    }
}

function attachAuthListeners(loginSubmitHandler) { // Accepts the handler
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginForm && !loginForm.dataset.authListener) {
        loginForm.dataset.authListener = 'true';
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("[EVENTS.JS] Login form submitted.");
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            if (emailInput && passwordInput && typeof loginSubmitHandler === 'function') {
                await loginSubmitHandler(emailInput.value, passwordInput.value); 
            } else {
                console.error("[EVENTS.JS] Email/password input not found or loginSubmitHandler not a function. Handler type:", typeof loginSubmitHandler);
                showToast("Login system error. Please contact support.", "error");
            }
        });
        console.log("[EVENTS.JS] Login form listener attached.");
    }

    if (logoutBtn && !logoutBtn.dataset.authListener) {
        logoutBtn.dataset.authListener = 'true';
        logoutBtn.addEventListener('click', async () => {
            console.log("[EVENTS.JS] Logout button clicked.");
            isHandlingAuthChange = true; // Set flag before calling signOut
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("[EVENTS.JS] Error signing out:", error);
                showToast(`Logout error: ${error.message}`, 'error');
                isHandlingAuthChange = false; // Reset on error if signOut doesn't trigger event
            }
            // onAuthStateChange in main.js will handle UI changes and reset isHandlingAuthChange
        });
        console.log("[EVENTS.JS] Logout button listener attached.");
    }
}

function attachModalListeners() {
    const resetModal = document.getElementById('reset-modal');
    const reportsModal = document.getElementById('reports-modal');
    const customPOModal = document.getElementById('custom-po-modal');

    const showResetBtn = document.getElementById('show-reset-modal-btn');
    if (showResetBtn && !showResetBtn.dataset.modalListener) {
        showResetBtn.dataset.modalListener = 'true';
        showResetBtn.addEventListener('click', () => { if(resetModal) resetModal.classList.remove('hidden'); });
    }
    if (resetModal && !resetModal.dataset.modalListenerInteraction) { // Different dataset attr for interaction
        resetModal.dataset.modalListenerInteraction = 'true';
        resetModal.addEventListener('click', async (e) => {
            if (e.target.id === 'cancel-reset-btn' || e.target === resetModal || e.target.closest('#cancel-reset-btn')) {
                resetModal.classList.add('hidden');
            } else if (e.target.id === 'confirm-reset-btn' || e.target.closest('#confirm-reset-btn')) {
                showToast('Resetting user production log...', 'info');
                try {
                    if (!appState.user || !appState.user.id) {
                        showToast('Cannot reset log: User not identified.', 'error');
                        resetModal.classList.add('hidden');
                        return;
                    }
                    const { error: logDelError } = await supabase.from('production_log').delete().eq('user_id', appState.user.id);
                    if (logDelError) throw logDelError;
                    showToast('User production log cleared. Please refresh if needed.', 'success');
                    window.location.reload(); 
                } catch (error) {
                    console.error("Error during data reset:", error);
                    showToast(`Reset failed: ${error.message}`, 'error');
                } finally {
                    resetModal.classList.add('hidden');
                }
            }
        });
    }

    const showReportsBtn = document.getElementById('show-reports-modal-btn');
    if (showReportsBtn && !showReportsBtn.dataset.modalListener) {
        showReportsBtn.dataset.modalListener = 'true';
        showReportsBtn.addEventListener('click', () => { if(reportsModal) reportsModal.classList.remove('hidden'); });
    }
    if (reportsModal && !reportsModal.dataset.modalListenerInteraction) {
        reportsModal.dataset.modalListenerInteraction = 'true';
        reportsModal.addEventListener('click', (e) => {
            if (e.target.id === 'close-reports-modal-btn' || e.target === reportsModal || e.target.closest('#close-reports-modal-btn')) {
                reportsModal.classList.add('hidden');
            } else if (e.target.id === 'report-prod-summary') renderReport('production');
            else if (e.target.id === 'report-mat-usage') renderReport('material');
        });
    }

    if (customPOModal && !customPOModal.dataset.modalListenerInteraction) {
        customPOModal.dataset.modalListenerInteraction = 'true';
        customPOModal.addEventListener('click', e => {
            if (e.target.id === 'custom-po-modal' || e.target.closest('#cancel-po-btn') || e.target.id === 'cancel-po-btn-footer' || e.target.closest('#cancel-po-btn-footer')) {
                customPOModal.classList.add('hidden');
            } else if (e.target.id === 'confirm-po-generation-btn' || e.target.closest('#confirm-po-generation-btn')) {
                const supplierNameInput = document.getElementById('supplier-name');
                const supplierName = supplierNameInput ? supplierNameInput.value.trim() : "";
                const selectedItems = [];
                document.querySelectorAll('.po-item-select:checked').forEach(checkbox => {
                    const row = checkbox.closest('.po-item-row');
                    if (!row) return;
                    const materialName = row.dataset.materialName;
                    const material = appState.materials.find(m => m.name === materialName);
                    const quantityInput = row.querySelector('.po-item-qty');
                    const quantity = quantityInput ? parseInt(quantityInput.value, 10) : NaN;
                    if (material && !isNaN(quantity) && quantity > 0) selectedItems.push({ material, quantity });
                });
                if (selectedItems.length > 0) {
                    generatePurchaseOrder(selectedItems, supplierName);
                    showToast(`Generated PO for ${selectedItems.length} items.`, 'success');
                    customPOModal.classList.add('hidden');
                } else showToast('No items selected or quantities are invalid for PO.', 'error');
            }
        });
    }
}
