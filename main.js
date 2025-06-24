// main.js - Application Entry Point (vFinal)

import { loadInitialAppState, appState } from './state.js';
import { refreshUI } from './ui.js';
import { attachOneTimeListeners } from './events.js';
import { supabase } from './supabaseClient.js';

// UI Elements
const loginScreen = document.getElementById('login-screen');
const mainContent = document.getElementById('main-content');
const loader = document.getElementById('loader');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const reportsBtn = document.getElementById('show-reports-modal-btn');
const footer = document.getElementById('footer');

// --- FINAL, ROBUST AUTH STATE CHANGE HANDLER ---
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
        appState.user = session.user;

        loginScreen.classList.add('hidden');
        loader.classList.remove('hidden');
        loader.classList.add('flex');
        mainContent.classList.add('hidden');

        const loadedSuccessfully = await loadInitialAppState();
        
        if (loadedSuccessfully) {
            refreshUI();
            
            mainContent.classList.remove('hidden');
            footer.classList.remove('hidden');
            userInfo.classList.remove('hidden');
            logoutBtn.classList.remove('hidden');
            reportsBtn.classList.remove('hidden');
            userEmailSpan.textContent = session.user.email;
            
            setTimeout(() => mainContent.classList.remove('opacity-0'), 50);
        } else {
            alert('Failed to load factory data. Please try logging in again.');
            await supabase.auth.signOut();
        }

        loader.classList.add('hidden');
        loader.classList.remove('flex');

    } else if (event === 'SIGNED_OUT') {
        appState.user = null;
        appState.materials = [];
        appState.productionLog = [];
        
        mainContent.classList.add('hidden');
        mainContent.classList.add('opacity-0');
        footer.classList.add('hidden');
        userInfo.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        reportsBtn.classList.add('hidden');
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        loginScreen.classList.remove('hidden');
    }
});

function init() {
    attachOneTimeListeners();
}

document.addEventListener('DOMContentLoaded', init);
