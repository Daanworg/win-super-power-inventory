// main.js - Application Entry Point

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

        // 1. Show loader, hide login screen
        loginScreen.classList.add('hidden');
        loader.classList.remove('hidden');
        loader.classList.add('flex'); // Use flex to center content
        mainContent.classList.add('hidden'); // Ensure main content is hidden during load

        // 2. Load all data from the database
        const loadedSuccessfully = await loadInitialAppState();
        
        // 3. Once data is loaded, update the UI
        if (loadedSuccessfully) {
            refreshUI();
            
            // 4. Show the main content and hide the loader
            mainContent.classList.remove('hidden');
            footer.classList.remove('hidden');
            userInfo.classList.remove('hidden');
            logoutBtn.classList.remove('hidden');
            reportsBtn.classList.remove('hidden');
            userEmailSpan.textContent = session.user.email;
            
            // Fade in the main content for a smooth transition
            setTimeout(() => mainContent.classList.remove('opacity-0'), 50);

        } else {
            // Handle case where data loading fails
            alert('Failed to load factory data. Please try again.');
            await supabase.auth.signOut();
        }

        // 5. Hide loader
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
