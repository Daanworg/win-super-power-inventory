// events.js - Manages all event listeners (vFinal)

import { appState } from './state.js'; // Assuming appState might be needed for some event logic (e.g., conditional listeners)
import { handleUpdateStock, handleRestock, handleSetStock } from './services.js';
import { refreshUI, showToast, renderReport, renderCustomPOModal } from './ui.js';
import { generatePurchaseOrder } from './purchaseOrderService.js';
import { supabase } from './supabaseClient.js';
import { handleLoginSubmit } from './main.js'; // Import the login handler from main.js

// This function is called by refreshUI in ui.js to re-attach listeners to dynamic elements
export function attachAllListeners() {
    // console.log("[EVENTS.JS] attachAllListeners called.");
    attachProductInputListeners();
    attachCurrentStockEditListeners();
    attachRestockListeners();
    attachPurchaseOrderListener(); // For the button that opens the custom PO modal
}

// This function is called once by main.js on DOMContentLoaded for static elements
export function attachOneTimeListeners() {
    console.log("[EVENTS.JS] attachOneTimeListeners called.");
    attachAuthListeners();
    attachModalListeners();
}

function attachProductInputListeners() {
    document.querySelectorAll('.update-btn').forEach(btn => {
        if (btn.dataset.listenerAttached === 'true') return; // Prevent re-attaching
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
                console.error("Could not find valueDiv or materialName for stock edit.");
                return;
            }

            const currentInput = card.querySelector('input.inline-edit-stock');
            if (currentInput) return; // Already in edit mode

            const input = document.createElement('input');
            input.type = 'number';
            input.value = valueDiv.textContent;
            input.className = 'input-field w-24 text-2xl font-bold inline-edit-stock'; // Added a class for identification
            
            valueDiv.replaceWith(input);
            input.focus();
            input.select();

            const saveChange = async () => {
                const newValue = parseInt(input.value, 10);
                // input.replaceWith(valueDiv); // Revert to div first
                // valueDiv.textContent = newValue; // Optimistic update (optional, service will refresh)
                await handleSetStock(materialName, newValue); // This will trigger refreshUI
            };

            const handleKeyDown = (event) => {
                if (event.key === 'Enter') {
                    input.blur(); // This will trigger the 'blur' event listener
                } else if (event.key === 'Escape') {
                    input.replaceWith(valueDiv); // Revert without saving
                     // No need to refreshUI here, as no change was made
                }
            };

            input.addEventListener('blur', saveChange, { once: true }); // Ensure blur listener is only for this instance
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

            // Close any other open restock forms
            document.querySelectorAll('.restock-form').forEach(f => {
                if (f !== formContainer) {
                    f.classList.add('hidden');
                    f.innerHTML = '';
                }
            });

            if (formContainer.classList.contains('hidden')) {
                formContainer.classList.remove('hidden');
                formContainer.innerHTML = `
                    <div class="flex items-center gap-2 mt-1">
                        <input type="number" placeholder="Qty" class="input-field w-20 text-sm p-1">
                        <button class="btn btn-primary text-xs confirm-restock-btn p-1">Add</button>
                    </div>`;
                const input = formContainer.querySelector('input');
                const confirmBtn = formContainer.querySelector('.confirm-restock-btn');
                
                input.focus();

                const performRestock = async () => {
                    if (input.value) {
                        await handleRestock(materialName, parseInt(input.value, 10));
                        formContainer.classList.add('hidden'); // Hide form after action
                        formContainer.innerHTML = '';
                    }
                };
                
                confirmBtn.addEventListener('click', performRestock);
                input.addEventListener('keydown', (event) => { 
                    if (event.key === 'Enter') performRestock(); 
                    if (event.key === 'Escape') {
                        formContainer.classList.add('hidden'); 
                        formContainer.innerHTML = '';
                    }
                });
            } else {
                formContainer.classList.add('hidden');
                formContainer.innerHTML = '';
            }
        });
    });
}

function attachPurchaseOrderListener() {
    const reorderHeader = document.getElementById('reorder-header');
    if (reorderHeader && !reorderHeader.dataset.poListenerAttached) { // Use a specific dataset attribute
        reorderHeader.dataset.poListenerAttached = 'true';
        reorderHeader.addEventListener('click', (e) => {
            if (e.target.id === 'open-po-modal-btn' || e.target.closest('#open-po-modal-btn')) {
                console.log("[EVENTS.JS] Create Purchase Order button clicked.");
                const materialsToOrder = appState.materials.filter(m => m.currentStock <= m.reorderPoint * 1.5);
                if (materialsToOrder.length > 0) {
                    renderCustomPOModal(materialsToOrder);
                } else {
                    if (typeof showToast === 'function') showToast('No items currently need reordering.', 'info');
                    else console.log('No items currently need reordering.');
                }
            }
        });
    }
}


function attachAuthListeners() {
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginForm && !loginForm.dataset.authListener) {
        loginForm.dataset.authListener = 'true';
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("[EVENTS.JS] Login form submitted.");
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            if (emailInput && passwordInput) {
                await handleLoginSubmit(emailInput.value, passwordInput.value); 
            } else {
                console.error("[EVENTS.JS] Email or password input not found.");
            }
        });
        console.log("[EVENTS.JS] Login form listener attached.");
    }

    if (logoutBtn && !logoutBtn.dataset.authListener) {
        logoutBtn.dataset.authListener = 'true';
        logoutBtn.addEventListener('click', async () => {
            console.log("[EVENTS.JS] Logout button clicked.");
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("[EVENTS.JS] Error signing out:", error);
                if (typeof showToast === 'function') showToast(`Logout error: ${error.message}`, 'error');
                else alert(`Logout error: ${error.message}`);
            }
            // onAuthStateChange in main.js will handle UI cleanup
        });
        console.log("[EVENTS.JS] Logout button listener attached.");
    }
}

function attachModalListeners() {
    // Ensure listeners are attached only once using a flag or by checking existing listeners
    // This simplified example assumes modals are always in the DOM.
    // A more robust approach might involve event delegation from a persistent parent.

    const resetModal = document.getElementById('reset-modal');
    const reportsModal = document.getElementById('reports-modal');
    const customPOModal = document.getElementById('custom-po-modal');

    // Reset Modal
    const showResetBtn = document.getElementById('show-reset-modal-btn');
    if (showResetBtn && !showResetBtn.dataset.modalListener) {
        showResetBtn.dataset.modalListener = 'true';
        showResetBtn.addEventListener('click', () => resetModal.classList.remove('hidden'));
    }
    if (resetModal && !resetModal.dataset.modalListener) {
        resetModal.dataset.modalListener = 'true';
        resetModal.addEventListener('click', async (e) => {
            if (e.target.id === 'cancel-reset-btn' || e.target === resetModal || e.target.closest('#cancel-reset-btn')) {
                resetModal.classList.add('hidden');
            } else if (e.target.id === 'confirm-reset-btn' || e.target.closest('#confirm-reset-btn')) {
                if (typeof showToast === 'function') showToast('Resetting data... please wait.', 'info');
                else console.log('Resetting data...');
                
                try {
                    // It's safer to not rely on 'neq' with a magic UUID for full truncation.
                    // However, if RLS prevents full TRUNCATE, deleting by user_id might be an option for production_log.
                    // For a full admin reset, RLS might need to be temporarily bypassed or an RPC used.
                    // Given the existing RLS, deleting all might be complex from client.
                    // Let's assume this function is for the user to clear *their* accessible data or we have permissive RLS for delete.
                    // The SQL script from Turn 48 handles TRUNCATE which is more thorough.
                    // This client-side reset is less robust than a backend/SQL TRUNCATE.

                    const { error: logDelError } = await supabase.from('production_log').delete().eq('user_id', appState.user.id); // Example: delete only user's logs
                    if (logDelError) throw logDelError;
                    
                    // Materials are usually global, resetting them might require admin rights or different RLS
                    // For now, let's assume the SQL TRUNCATE is the primary reset method.
                    // This button could perhaps only clear the production_log for the current user.
                    console.warn("[EVENTS.JS] Client-side reset of 'materials' table is complex due to RLS and shared data. Focusing on user's production_log.");
                    // If you truly want to clear materials from client, ensure RLS allows it or use an RPC.
                    // const { error: matDelError } = await supabase.from('materials').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Risky
                    // if (matDelError) throw matDelError;

                    if (typeof showToast === 'function') showToast('User production log cleared. Full material reset requires DB access.', 'success');
                    else console.log('User production log cleared.');
                    
                    // Reload to fetch fresh (potentially empty or re-seeded if no materials) state.
                    window.location.reload(); 
                } catch (error) {
                    console.error("Error during data reset:", error);
                    if (typeof showToast === 'function') showToast(`Reset failed: ${error.message}`, 'error');
                    else alert(`Reset failed: ${error.message}`);
                } finally {
                    resetModal.classList.add('hidden');
                }
            }
        });
    }

    // Reports Modal
    const showReportsBtn = document.getElementById('show-reports-modal-btn');
    if (showReportsBtn && !showReportsBtn.dataset.modalListener) {
        showReportsBtn.dataset.modalListener = 'true';
        showReportsBtn.addEventListener('click', () => reportsModal.classList.remove('hidden'));
    }
    if (reportsModal && !reportsModal.dataset.modalListener) {
        reportsModal.dataset.modalListener = 'true';
        reportsModal.addEventListener('click', (e) => {
            if (e.target.id === 'close-reports-modal-btn' || e.target === reportsModal || e.target.closest('#close-reports-modal-btn')) {
                reportsModal.classList.add('hidden');
            } else if (e.target.id === 'report-prod-summary') {
                renderReport('production');
            } else if (e.target.id === 'report-mat-usage') {
                renderReport('material');
            }
        });
    }

    // Custom PO Modal
    if (customPOModal && !customPOModal.dataset.modalListener) {
        customPOModal.dataset.modalListener = 'true';
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

                    if (material && !isNaN(quantity) && quantity > 0) {
                        selectedItems.push({ material, quantity });
                    }
                });

                if (selectedItems.length > 0) {
                    generatePurchaseOrder(selectedItems, supplierName);
                    if (typeof showToast === 'function') showToast(`Generated PO for ${selectedItems.length} items.`, 'success');
                    else console.log(`Generated PO for ${selectedItems.length} items.`);
                    customPOModal.classList.add('hidden');
                } else {
                    if (typeof showToast === 'function') showToast('No items selected or quantities are invalid for PO.', 'error');
                    else console.log('No items selected or quantities are invalid for PO.');
                }
            }
        });
    }
}
