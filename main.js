// main.js - Application Entry Point (vFinal - Login and Refresh Fix)

import { loadInitialAppState, appState } from './state.js';
import { refreshUI, showToast } from './ui.js'; 
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

let isHandlingAuthChange = false;

// This function is defined here and passed to events.js to handle form submission
async function handleLoginSubmit(email, password) {
    console.log("[MAIN.JS] handleLoginSubmit called.");
    loginScreen.classList.add('hidden');
    loader.classList.remove('hidden');
    loader.classList.add('flex');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        console.error('[MAIN.JS] Login Failed:', error);
        showToast(`Login failed: ${error.message}`, 'error');
        loginScreen.classList.remove('hidden');
        loader.classList.add('hidden');
        loader.classList.remove('flex');
    }
    // On success, the onAuthStateChange listener will handle everything else.
}

async function processAuthenticatedSession(sessionUser, eventType) {
    if (isHandlingAuthChange) {
        console.log(`[MAIN.JS] processAuthenticatedSession skipped for ${eventType} due to active handling.`);
        return;
    }
    isHandlingAuthChange = true;

    try {
        console.log(`[MAIN.JS] User identified via ${eventType}. Proceeding to load data for:`, sessionUser.email);
        appState.user = sessionUser;

        loginScreen.classList.add('hidden');
        mainContent.classList.add('hidden');
        mainContent.classList.add('opacity-0');
        loader.classList.remove('hidden');
        loader.classList.add('flex');

        const loadedSuccessfully = await loadInitialAppState();
        console.log(`[MAIN.JS] loadInitialAppState() completed. Returned: ${loadedSuccessfully}`);

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
            showToast('Failed to load factory data. Please try again.', 'error');
            await supabase.auth.signOut();
        }
    } catch (error) {
        console.error(`[MAIN.JS] Critical error during ${eventType} handling:`, error);
        showToast(`Critical error: ${error.message}. Please check console.`, 'error');
    } finally {
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        isHandlingAuthChange = false;
        console.log(`[MAIN.JS] Finished processing ${eventType}.`);
    }
}

supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`[MAIN.JS] Auth event: ${event}`);

    switch (event) {
        case 'SIGNED_IN':
            await processAuthenticatedSession(session.user, 'SIGNED_IN');
            break;

        case 'INITIAL_SESSION':
            if (session) {
                console.log("[MAIN.JS] INITIAL_SESSION: Refreshing token first.");
                const { error } = await supabase.auth.refreshSession();
                if (error) {
                    console.error("[MAIN.JS] Token refresh failed:", error.message);
                    await supabase.auth.signOut();
                } else {
                    console.log("[MAIN.JS] Token refresh successful. The next auth event (TOKEN_REFRESHED or SIGNED_IN) will handle data loading.");
                }
            } else {
                console.log("[MAIN.JS] INITIAL_SESSION: No session found. Showing login screen.");
                loginScreen.classList.remove('hidden');
            }
            break;
        
        case 'TOKEN_REFRESHED':
            if(session){
                await processAuthenticatedSession(session.user, 'TOKEN_REFRESHED');
            }
            break;

        case 'SIGNED_OUT':
            console.log("[MAIN.JS] User signed out.");
            appState.user = null; appState.materials = []; appState.productionLog = [];
            appState.dataLoaded = false; appState.lastLoadedUserId = null;
            sessionStorage.removeItem('appStateCache');

            mainContent.classList.add('hidden');
            mainContent.classList.add('opacity-0');
            footer.classList.add('hidden');
            userInfo.classList.add('hidden');
            logoutBtn.classList.add('hidden');
            reportsBtn.classList.add('hidden');
            loader.classList.add('hidden');
            loader.classList.remove('flex');
            loginScreen.classList.remove('hidden');
            break;

        case 'USER_DELETED':
             console.log("[MAIN.JS] User deleted. Cleaning up.");
             // Same as SIGNED_OUT
             appState.user = null; appState.materials = []; appState.productionLog = [];
             sessionStorage.removeItem('appStateCache');
             // Refresh to a clean state
             window.location.reload();
             break;
    }
});


document.addEventListener('DOMContentLoaded', () => {
    console.log("[MAIN.JS] DOM content loaded.");
    attachOneTimeListeners(handleLoginSubmit);
});
