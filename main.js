// main.js - Application Entry Point (vFinal with Loader Fix)

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
    // This handles both initial login and session restoration on page refresh
    if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
        appState.user = session.user;

        // 1. Show loader, hide everything else
        loginScreen.classList.add('hidden');
        mainContent.classList.add('hidden');
        loader.classList.remove('hidden');
        loader.classList.add('flex');

        // 2. Load all data from the database
        const loadedSuccessfully = await loadInitialAppState();
        
        // 3. If data loaded, update the UI and show the main content
        if (loadedSuccessfully) {
            refreshUI();
            
            mainContent.classList.remove('hidden');
            footer.classList.remove('hidden');
            userInfo.classList.remove('hidden');
            logoutBtn.classList.remove('hidden');
            reportsBtn.classList.remove('hidden');
            userEmailSpan.textContent = session.user.email;
            
            // Fade in the main content for a smooth transition
            setTimeout(() => mainContent.classList.remove('opacity-0'), 50);
        } else {
            // If data loading fails, sign out to return to a clean login state
            alert('Failed to load factory data. Please try logging in again.');
            await supabase.auth.signOut();
        }

        // 4. CRITICAL FIX: Hide loader AFTER the process is complete, success or fail.
        loader.classList.add('hidden');
        loader.classList.remove('flex');

    } else if (event === 'SIGNED_OUT') {
        appState.user = null;
        appState.materials = [];
        appState.productionLog = [];
        
        // Ensure a clean UI state on logout
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

// Initializes the application when the page content is loaded.
function init() {
    attachOneTimeListeners();
    // The opacity transition is now fully handled by the auth listener
}

document.addEventListener('DOMContentLoaded', init);
