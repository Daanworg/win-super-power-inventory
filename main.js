// main.js - Application Entry Point
import { loadInitialAppState, appState } from './state.js';
import { refreshUI } from './ui.js';
import { attachOneTimeListeners } from './events.js';
import { supabase } from './supabaseClient.js';

const loginScreen = document.getElementById('login-screen');
const mainContent = document.getElementById('main-content');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const reportsBtn = document.getElementById('show-reports-modal-btn');

// This function will run whenever the user's login state changes
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
        appState.user = session.user;
        loginScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        userInfo.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        reportsBtn.classList.remove('hidden');
        userEmailSpan.textContent = session.user.email;

        await loadInitialAppState();
        refreshUI();
    } else if (event === 'SIGNED_OUT') {
        appState.user = null;
        appState.materials = [];
        appState.productionLog = [];
        loginScreen.classList.remove('hidden');
        mainContent.classList.add('hidden');
        userInfo.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        reportsBtn.classList.add('hidden');
        refreshUI(); // Re-render to clear out old data from the UI
    }
});

// Initializes the application when the page content is loaded.
function init() {
    attachOneTimeListeners();
    mainContent.classList.remove('opacity-0');
}

document.addEventListener('DOMContentLoaded', init);