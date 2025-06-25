// ui.js - Renders all UI components (vFinal with Chart Fix & showToast export)

import { appState } from './state.js';
import { attachAllListeners } from './events.js'; // For re-attaching to dynamic content
import { getMonthlyProductionSummary, getMonthlyMaterialUsage } from './reportService.js';

let productionChart = null;
let inventoryChart = null;

// Set Chart.js defaults for our dark theme
Chart.defaults.color = 'hsl(210, 14%, 66%)'; // Default text color for charts
Chart.defaults.borderColor = 'hsl(220, 13%, 30%)'; // Default border color for chart elements

// Export showToast so it can be used by other modules (like main.js, state.js)
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error("Toast container not found!");
        return;
    }
    const toast = document.createElement('div');
    const iconClass = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle';
    toast.className = `toast toast-${type} flex items-center`; // Tailwind for alignment
    toast.innerHTML = `<i class="fas ${iconClass} mr-2"></i><span>${message}</span>`; // Added margin to icon
    container.appendChild(toast);
    
    requestAnimationFrame(() => { // Ensure element is in DOM before adding class for transition
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3000);
}

// Master function to update the entire UI
export function refreshUI() {
    console.log("[UI.JS] Refreshing UI. Materials count:", appState.materials.length, "Production log count:", appState.productionLog.length);
    if (!appState.user) {
        console.log("[UI.JS] No user in appState, cannot refresh main UI components.");
        // UI should be showing login screen, handled by main.js
        return;
    }
    renderKpiCards();
    renderCharts();
    renderProductInputs();
    renderInventory();
    renderProductionLog();
    renderModals(); 
    renderReorderList();
    attachAllListeners(); // Re-attach listeners to newly rendered dynamic elements
    console.log("[UI.JS] UI Refresh complete.");
}


function animateValue(element, start, end, duration, prefix = '', suffix = '') {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        element.textContent = `${prefix}${current.toLocaleString()}${suffix}`;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function renderKpiCards() {
    const kpiRow = document.getElementById('kpi-row');
    if (!kpiRow) return;

    const totalStockItems = appState.materials.reduce((sum, mat) => sum + (mat.currentStock || 0), 0);
    const itemsBelowReorder = appState.materials.filter(m => (m.currentStock || 0) <= (m.reorderPoint || 0)).length;
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const unitsProducedMonth = appState.productionLog
        .filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate > oneMonthAgo && entry.productName === 'COMPLETE ANTENNA UNIT';
        })
        .reduce((sum, entry) => sum + (entry.quantity || 0), 0);

    const kpis = [
        { id: 'kpi-stock', label: 'Total Stock Items', value: totalStockItems, suffix: ' pcs', color: 'var(--accent-green)' },
        { id: 'kpi-units', label: 'Units Produced (Month)', value: unitsProducedMonth, suffix: '', color: 'var(--accent-blue)' },
        { id: 'kpi-reorder', label: 'Items Below Reorder', value: itemsBelowReorder, suffix: '', color: 'var(--accent-yellow)' },
        { id: 'kpi-materials', label: 'Materials to Order', value: itemsBelowReorder, suffix: '', color: 'var(--accent-red)' }
    ];

    kpiRow.innerHTML = kpis.map((kpi, index) => `
        <div class="dashboard-card p-4 flex items-center">
            <div class="kpi-icon-wrapper mr-4" style="background-color: ${kpi.color}20; color: ${kpi.color};">
                <i class="fas ${['fa-boxes', 'fa-cogs', 'fa-exclamation-triangle', 'fa-shopping-cart'][index]} fa-lg"></i>
            </div>
            <div>
                <p class="text-sm text-secondary">${kpi.label}</p>
                <p class="text-2xl font-bold text-primary" id="${kpi.id}-${index}">0</p>
            </div>
        </div>
    `).join('');

    kpis.forEach((kpi, index) => {
        const element = document.getElementById(`${kpi.id}-${index}`);
        if (element) {
            animateValue(element, 0, kpi.value, 1500, kpi.prefix, kpi.suffix);
        }
    });
}

function renderCharts() {
    renderProductionHistoryChart();
    renderInventoryStatusChart();
}

function renderProductionHistoryChart() {
    const ctx = document.getElementById('production-history-chart')?.getContext('2d');
    if (!ctx) return;
    if (productionChart) {
        productionChart.destroy(); // Destroy existing chart instance
    }
    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString([], { weekday: 'short' }));
        const totalProduced = appState.productionLog
            .filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate.toDateString() === d.toDateString() && entry.productName === 'COMPLETE ANTENNA UNIT';
            })
            .reduce((sum, entry) => sum + (entry.quantity || 0), 0);
        data.push(totalProduced);
    }
    productionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Complete Units Produced',
                data,
                backgroundColor: 'rgba(66, 153, 225, 0.5)',
                borderColor: 'rgba(66, 153, 225, 1)',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'hsl(220, 13%, 30%)' } }, x: { grid: { display: false } } } }
    });
}

function renderInventoryStatusChart() {
    const ctx = document.getElementById('inventory-status-chart')?.getContext('2d');
    if (!ctx) return;
    if (inventoryChart) {
        inventoryChart.destroy(); // Destroy existing chart instance
    }
    let okCount = 0, warningCount = 0, criticalCount = 0;
    appState.materials.forEach(m => {
        const currentStock = m.currentStock || 0;
        const reorderPoint = m.reorderPoint || 0;
        if (currentStock <= reorderPoint) criticalCount++;
        else if (currentStock <= reorderPoint * 1.5) warningCount++;
        else okCount++;
    });
    const data = {
        labels: ['OK', 'Warning', 'Critical'],
        datasets: [{ data: [okCount, warningCount, criticalCount], backgroundColor: ['hsla(145, 63%, 49%, 0.7)', 'hsla(50, 91%, 64%, 0.7)', 'hsla(0, 89%, 69%, 0.7)'], borderColor: 'hsl(220, 26%, 18%)', borderWidth: 2 }]
    };
    inventoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: 'hsl(210, 14%, 66%)' } } } }
    });
}

function renderModals() {
    const resetModal = document.getElementById('reset-modal');
    if (resetModal && resetModal.innerHTML.trim() === '') { // Check if empty before populating
        resetModal.innerHTML = `<div class="modal-content p-6 max-w-sm w-full mx-4"><h3 class="text-lg font-semibold mb-2">Confirm Reset</h3><p class="text-secondary mb-4">Are you sure you want to reset your production log data? This action cannot be undone for your entries.</p><div class="flex justify-end space-x-2"><button id="cancel-reset-btn" class="btn btn-secondary">Cancel</button><button id="confirm-reset-btn" class="btn btn-danger">Reset My Log</button></div></div>`;
    }
    const reportsModal = document.getElementById('reports-modal');
    if (reportsModal && reportsModal.innerHTML.trim() === '') {
        reportsModal.innerHTML = `<div class="modal-content p-6 max-w-2xl w-full mx-4"><div class="flex justify-between items-center mb-4"><h3 class="text-lg font-semibold">Generate Report</h3><button id="close-reports-modal-btn" class="text-secondary hover:text-primary text-2xl">×</button></div><div class="flex gap-4 mb-4"><button id="report-prod-summary" class="flex-1 btn btn-primary">Monthly Production</button><button id="report-mat-usage" class="flex-1 btn btn-primary" style="background-color: var(--accent-green);">Monthly Material Usage</button></div><div id="report-content" class="p-4 border border-border-color rounded bg-bg-dark min-h-[300px]">Select a report to view data.</div></div>`;
    }
    // Custom PO Modal is rendered dynamically by renderCustomPOModal
}

export function renderReport(type) {
    const content = document.getElementById('report-content');
    if (!content) return;
    let data, title, headers, rows;
    if (type === 'production') {
        data = getMonthlyProductionSummary(); // Assumes this function is correctly getting data from appState
        title = 'Monthly Production Summary (Last 30 Days)';
        headers = ['Product/Assembly', 'Total Units Produced'];
        rows = Object.entries(data).map(([name, qty]) => `<tr><td class="border-b border-border-color px-4 py-2">${name}</td><td class="border-b border-border-color px-4 py-2 text-right">${qty}</td></tr>`).join('');
    } else { // material usage
        data = getMonthlyMaterialUsage(); // Assumes this function is correctly getting data
        title = 'Monthly Material Usage (Last 30 Days)';
        headers = ['Material', 'Total Quantity Consumed'];
        rows = Object.entries(data).map(([name, qty]) => {
            const material = appState.materials.find(m => m.name === name);
            return `<tr><td class="border-b border-border-color px-4 py-2">${name}</td><td class="border-b border-border-color px-4 py-2 text-right">${qty} ${material?.unit || ''}</td></tr>`;
        }).join('');
    }
    if (Object.keys(data).length === 0) {
        content.innerHTML = `<p class="text-center text-secondary pt-12">No data available for this period.</p>`;
        return;
    }
    content.innerHTML = `<h4 class="font-bold mb-2">${title}</h4><table class="table-auto w-full text-sm"><thead><tr><th class="border-b-2 border-border-color px-4 py-2 text-left">${headers[0]}</th><th class="border-b-2 border-border-color px-4 py-2 text-right">${headers[1]}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderProductInputs() {
    const container = document.getElementById('product-cards');
    if (!container) return;
    container.innerHTML = ''; // Clear existing
    for (const productName in appState.productRecipes) {
        const cardHTML = `
            <div class="dashboard-card p-4 border-l-4 border-l-transparent" data-product-name="${productName}">
                <h3 class="font-medium mb-3">${productName}</h3>
                <div class="flex items-center space-x-3">
                    <input type="number" min="0" class="input-field w-20" value="0">
                    <button class="btn btn-primary flex-1 update-btn" data-product-name="${productName}">Produce</button>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', cardHTML);
    }
}

function renderInventory() {
    const container = document.getElementById('material-cards');
    if (!container) return;
    container.innerHTML = ''; // Clear existing
    appState.materials.forEach(material => {
        const currentStock = material.currentStock || 0;
        const reorderPoint = material.reorderPoint || 1; // Avoid division by zero if reorderPoint is 0
        const safeStockLevel = reorderPoint * 2;
        const stockPercentage = Math.min((currentStock / (safeStockLevel || 1)) * 100, 100); // Avoid division by zero
        
        let statusColor = 'var(--accent-green)';
        if (currentStock <= reorderPoint * 1.5) statusColor = 'var(--accent-yellow)'; 
        if (currentStock <= reorderPoint) statusColor = 'var(--accent-red)';
        
        const cardHTML = `
             <div class="dashboard-card p-4 border-l-4" style="border-left-color: ${statusColor}" data-material-name="${material.name}">
                 <div class="flex justify-between items-start mb-1">
                     <h3 class="font-medium text-sm">${material.name}</h3>
                     <div class="text-xs text-secondary flex items-center gap-3">
                         <i class="fas fa-plus-circle icon-btn restock-icon" title="Restock"></i>
                         <i class="fas fa-edit icon-btn edit-current-stock" title="Set Current Stock"></i>
                     </div>
                 </div>
                 <div class="flex justify-between items-baseline mb-2">
                     <div class="text-2xl font-bold current-stock-value">${currentStock}</div>
                     <span class="text-sm text-secondary">${material.unit || 'N/A'}</span>
                 </div>
                 <div class="w-full bg-bg-dark rounded-full h-1.5"> <!-- Changed bg-dark to bg-bg-dark for consistency with theme -->
                     <div class="h-1.5 rounded-full" style="width: ${stockPercentage}%; background-color: ${statusColor};"></div>
                 </div>
                 <div class="restock-form mt-2 hidden"></div>
             </div>`;
        container.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function renderProductionLog() {
    const list = document.getElementById('production-log-list');
    if (!list) return;
    list.innerHTML = ''; // Clear existing
    if (appState.productionLog.length === 0) { 
        list.innerHTML = `<li class="text-secondary text-center pt-4">No production recorded yet.</li>`; return; 
    }
    // Create a copy before reversing to avoid mutating the original appState.productionLog if it's referenced elsewhere
    [...appState.productionLog].reverse().forEach(entry => {
        const date = new Date(entry.date);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        const logHTML = `
            <li class="p-2 border-b border-border-color flex justify-between items-center text-sm">
                <div>
                    <span class="font-semibold text-accent-blue">${entry.quantity || 0}x</span> 
                    <span class="text-primary">${entry.productName || 'Unknown Product'}</span>
                </div>
                <span class="text-xs text-secondary">${formattedDate}</span>
            </li>`;
        list.insertAdjacentHTML('beforeend', logHTML);
    });
}

function renderReorderList() {
    const list = document.getElementById('reorder-list');
    const header = document.getElementById('reorder-header');
    if (!list || !header) return;
    
    list.innerHTML = ''; 
    const existingButton = header.querySelector('#open-po-modal-btn');
    if (existingButton) existingButton.remove();

    const itemsToReorder = appState.materials.filter(m => (m.currentStock || 0) <= (m.reorderPoint || 0) * 1.5);

    if (itemsToReorder.length === 0) {
        list.innerHTML = `<li class="text-secondary text-center pt-4">All stock levels are healthy.</li>`;
        return;
    }

    const poButtonHTML = `<button id="open-po-modal-btn" class="btn btn-secondary text-sm">Create Purchase Order</button>`;
    header.insertAdjacentHTML('beforeend', poButtonHTML);
    // Note: The event listener for this button is attached in events.js using delegation or re-attachment.

    itemsToReorder.forEach(item => {
        const currentStock = item.currentStock || 0;
        const reorderPoint = item.reorderPoint || 0;
        const needed = Math.max(1, (reorderPoint * 2) - currentStock);
        const itemHTML = `
            <li class="p-3 rounded-md text-sm flex justify-between items-center" style="background-color: ${currentStock <= reorderPoint ? 'rgba(245, 101, 101, 0.2)' : 'rgba(246, 224, 94, 0.2)'};">
                <div class="flex-grow">
                    <span class="font-semibold">${item.name}</span>
                    <span class="text-xs text-secondary block">Stock: ${currentStock} / Reorder at: ${reorderPoint}</span>
                </div>
                <div class="text-right">
                    <span class="font-bold">Suggests ${needed}</span>
                    <span class="text-xs text-secondary ml-1">${item.unit || ''}</span>
                </div>
            </li>`;
        list.insertAdjacentHTML('beforeend', itemHTML);
    });
}

export function renderCustomPOModal(materials) {
    const modal = document.getElementById('custom-po-modal');
    if (!modal) return;

    const materialRows = materials.map(material => {
        const currentStock = material.currentStock || 0;
        const reorderPoint = material.reorderPoint || 0;
        const suggestedQty = Math.max(1, (reorderPoint * 2) - currentStock);
        return `
             <div class="po-item-row" data-material-name="${material.name}">
                 <input type="checkbox" class="po-item-select form-checkbox h-5 w-5 rounded bg-bg-dark border-border-color text-accent-blue focus:ring-accent-blue"> <!-- Removed checked by default -->
                 <div>
                     <span class="font-semibold">${material.name}</span>
                     <span class="text-xs text-secondary block">Stock: ${currentStock} | Reorder: ${reorderPoint}</span>
                 </div>
                 <input type="number" class="po-item-qty input-field w-24 text-right" value="${suggestedQty}" min="0">
             </div>
         `;
    }).join('');

    modal.innerHTML = `
         <div class="modal-content p-6 max-w-3xl w-full mx-4 flex flex-col">
             <div class="flex justify-between items-center mb-4">
                 <h3 class="text-lg font-semibold">Create Custom Purchase Order</h3>
                 <button id="cancel-po-btn" class="text-secondary hover:text-primary text-2xl">×</button>
             </div>
             <div class="mb-4">
                 <label for="supplier-name" class="block text-sm font-medium text-secondary mb-1">Supplier Name (Optional)</label>
                 <input type="text" id="supplier-name" class="input-field w-full" placeholder="Enter supplier name...">
             </div>
             <div id="po-item-list" class="flex-grow overflow-y-auto pr-2" style="max-height: 40vh;">
                 ${materialRows}
             </div>
             <div class="flex justify-end space-x-2 mt-6">
                 <button id="cancel-po-btn-footer" class="btn btn-secondary">Cancel</button>
                 <button id="confirm-po-generation-btn" class="btn btn-primary">Generate PO PDF</button>
             </div>
         </div>
     `;
    modal.classList.remove('hidden');
}
