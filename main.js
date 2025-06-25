// main.js - Application Entry Point (Final Polished Version)

import { loadInitialAppState, appState } from './state.js';
import { refreshUI, showToast } from './ui.js'; 
import { attachOneTimeListeners } from './events.js';
import { supabase } from './supabaseClient.js';
import { handleError } from './errorService.js';

const loginScreen = document.getElementById('login-screen');
const mainContent = document.getElementById('main-content');
const loader = document.getElementById('loader');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const reportsBtn = document.getElementById('show-reports-modal-btn');
const footer = document.getElementById('footer');

let isProcessingAuthEvent = false;

// This function is now simplified, it just triggers the Supabase client.
export async function handleLoginSubmit(email, password) {
    console.log("[MAIN.JS] Login attempt initiated.");
    loader.classList.remove('hidden');
    loader.classList.add('flex');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        handleError(error, "login_failed");
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        loginScreen.classList.remove('hidden');
    }
    // On success, onAuthStateChange('SIGNED_IN') will take over.
}

// Unified function to load the application for any authenticated state.
async function loadApplication(session) {
    if (!session || !session.user) {
        handleError(new Error("Cannot load application without a valid session."), "load_app_no_session");
        return;
    }
    
    appState.user = session.user;
    console.log(`[MAIN.JS] Authenticated. Proceeding to load data for: ${appState.user.email}`);

    loginScreen.classList.add('hidden');
    mainContent.classList.add('hidden');
    mainContent.classList.add('opacity-0');
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
            userEmailSpan.textContent = appState.user.email;
            setTimeout(() => mainContent.classList.remove('opacity-0'), 50);
        } else {
            // loadInitialAppState now handles its own error toasts.
            // If it returns false, it means we have a non-recoverable state, so sign out.
            console.error("[MAIN.JS] loadInitialAppState returned false. Forcing sign out.");
            await supabase.auth.signOut();
        }
    } catch (error) {
        handleError(error, "load_application_critical");
        await supabase.auth.signOut();
    } finally {
        loader.classList.add('hidden');
        loader.classList.remove('flex');
    }
}

supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`[MAIN.JS] Auth event received: ${event}`);

    // If an auth event is already being processed, ignore subsequent rapid-fire events.
    if (isProcessingAuthEvent) {
        console.log(`[MAIN.JS] Skipping event (${event}) as another is in progress.`);
        return;
    }
    isProcessingAuthEvent = true;

    try {
        // Unify the logic for all events that result in an authenticated user.
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session?.user) {
            
            // Introduce a small delay to allow the Supabase client to stabilize,
            // especially after INITIAL_SESSION or a rapid SIGNED_IN.
            // This is a pragmatic fix for the intermittent timeout race condition.
            await new Promise(resolve => setTimeout(resolve, 150)); 
            
            await loadApplication(session);

        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            console.log(`[MAIN.JS] User signed out or deleted.`);
            appState.user = null; appState.materials = []; appState.productionLog = [];
            appState.dataLoaded = false; appState.lastLoadedUserId = null;
            sessionStorage.removeItem('appStateCache');

            mainContent.classList.add('hidden'); mainContent.classList.add('opacity-0');
            footer.classList.add('hidden'); userInfo.classList.add('hidden');
            logoutBtn.classList.add('hidden'); reportsBtn.classList.add('hidden');
            loader.classList.add('hidden'); loader.classList.remove('flex');
            loginScreen.classList.remove('hidden');

        } else if (event === 'INITIAL_SESSION' && !session) {
            console.log("[MAIN.JS] Initial check: No active session found.");
            loginScreen.classList.remove('hidden');
        } else {
            console.log(`[MAIN.JS] Unhandled auth event state: ${event}`);
        }
    } finally {
        isProcessingAuthEvent = false;
        // console.log(`[MAIN.JS] Finished processing auth event: ${event}. Flag reset.`);
    }
});


document.addEventListener('DOMContentLoaded', () => {
    console.log("[MAIN.JS] DOM content loaded.");
    attachOneTimeListeners(handleLoginSubmit);
});
