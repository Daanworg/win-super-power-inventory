// main.js - Application Entry Point (vFinal with MORE Robust Loader Fix)

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

supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
        appState.user = session.user;

        loginScreen.classList.add('hidden');
        mainContent.classList.add('hidden'); // Keep main content hidden initially
        mainContent.classList.add('opacity-0'); // Keep it transparent initially
        
        loader.classList.remove('hidden');
        loader.classList.add('flex');

        try {
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
                // loadInitialAppState returned false or an error was caught by its internal try/catch
                showToast('Failed to load factory data. Please check console and try again.', 'error'); 
                // Consider signing out if data load is critical and fails
                // await supabase.auth.signOut(); // Uncomment if critical failure should log out
            }
        } catch (error) {
            // Catch any unexpected errors from loadInitialAppState or refreshUI
            console.error("Critical error during app initialization:", error);
            showToast(`Critical error: ${error.message}. Check console.`, 'error');
            // await supabase.auth.signOut(); // Uncomment if critical failure should log out
        } finally {
            // This block will ALWAYS execute, ensuring the loader is hidden.
            loader.classList.add('hidden');
            loader.classList.remove('flex');
        }

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
