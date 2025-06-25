// reportService.js - Logic for generating reports

import { appState } from './state.js';

const THIRTY_DAYS_AGO = new Date(new Date().setDate(new Date().getDate() - 30));

export function getMonthlyProductionSummary() {
    const summary = {};
    const productionLog = appState.productionLog || [];
    productionLog
        .filter(entry => new Date(entry.date) > THIRTY_DAYS_AGO)
        .forEach(entry => {
            if (!summary[entry.productName]) {
                summary[entry.productName] = 0;
            }
            summary[entry.productName] += entry.quantity;
        });
    return summary;
}

export function getMonthlyMaterialUsage() {
    const usage = {};
    const productionLog = appState.productionLog || [];
    productionLog
        .filter(entry => new Date(entry.date) > THIRTY_DAYS_AGO)
        .forEach(entry => {
            const recipe = appState.productRecipes[entry.productName];
            if (!recipe) return;
            for (const materialName in recipe) {
                if (!usage[materialName]) {
                    usage[materialName] = 0;
                }
                usage[materialName] += recipe[materialName] * entry.quantity;
            }
        });
    return usage;
}
