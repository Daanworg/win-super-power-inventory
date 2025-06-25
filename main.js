// main.js - Application Entry Point (vFinal - Comprehensive Fixes)

import { loadInitialAppState, appState } from './state.js';
import { refreshUI, showToast } from './ui.js'; // Correct: showToast from ui.js
import { attachOneTimeListeners, handleLoginSubmit } from './events.js'; // Import handleLoginSubmit
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

console.log("[MAIN.JS] Script loaded. Setting up onAuthStateChange listener.");

let isHandlingAuthChange = false; 

async function handleSuccessfulAuth(sessionUser, eventType = "Auth") {
    if (!sessionUser) {
        console.error(`[MAIN.JS] handleSuccessfulAuth (${eventType}) called with no user.`);
        isHandlingAuthChange = false; // Release lock if erroring early
        return;
    }
    appState.user = sessionUser;
    console.log(`[MAIN.JS] User identified (${eventType}). Proceeding to load data for:`, appState.user.email);

    loginScreen.classList.add('hidden');
    mainContent.classList.add('hidden'); 
    mainContent.classList.add('opacity-0'); 
    
    loader.classList.remove('hidden');
    loader.classList.add('flex');

    let loadedSuccessfully = false;
    try {
        console.log("[MAIN.JS] Attempting to call: await loadInitialAppState()");
        loadedSuccessfully = await loadInitialAppState(); 
        console.log(`[MAIN.JS] loadInitialAppState() call completed. Returned: ${loadedSuccessfully}`);
        
        if (loadedSuccessfully) {
            console.log("[MAIN.JS] Data loaded successfully. Attempting to refresh UI...");
            refreshUI();
            console.log("[MAIN.JS] UI refreshed. Making main content visible.");
            
            mainContent.classList.remove('hidden');
            footer.classList.remove('hidden');
            userInfo.classList.remove('hidden');
            logoutBtn.classList.remove('hidden');
            reportsBtn.classList.remove('hidden');
            if (userEmailSpan && appState.user && appState.user.email) {
               userEmailSpan.textContent = appState.user.email;
            } else {
                console.warn("[MAIN.JS] userEmailSpan or appState.user.email is null/undefined during UI update.");
            }
            
            setTimeout(() => {
                mainContent.classList.remove('opacity-0');
                console.log("[MAIN.JS] Main content opacity removed.");
            }, 50);
        } else {
            console.warn("[MAIN.JS] loadInitialAppState reported failure (returned false).");
            showToast('Failed to load factory data. Please check console.', 'error');
        }
    } catch (error) {
        console.error("[MAIN.JS] Critical error during app initialization:", error);
        showToast(`Critical error: ${error.message}. Check console.`, 'error');
    } finally {
        console.log("[MAIN.JS] Executing finally block for handleSuccessfulAuth: Hiding loader.");
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        console.log("[MAIN.JS] Loader hidden.");
        isHandlingAuthChange = false; 
    }
}

supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`[MAIN.JS] Auth event: ${event}`, session ? `User: ${session.user?.email}` : "No session");

    if (isHandlingAuthChange && event !== 'SIGNED_OUT') { // Allow SIGNED_OUT to proceed to clean up UI
        console.log("[MAIN.JS] Auth change handling already in progress. Skipping event:", event);
        return;
    }
    isHandlingAuthChange = true;

    if (event === 'SIGNED_IN' && session && session.user) {
        console.log("[MAIN.JS] SIGNED_IN event detected.");
        if (appState.user && appState.user.id === session.user.id && appState.dataLoaded) {
            console.log("[MAIN.JS] SIGNED_IN: User already set and data loaded. No action needed.");
            loader.classList.add('hidden'); loader.classList.remove('flex'); // Ensure loader is hidden
            isHandlingAuthChange = false;
            return;
        }
        await handleSuccessfulAuth(session.user, "SIGNED_IN");
    } else if (event === 'INITIAL_SESSION' && session && session.user) {
        console.log("[MAIN.JS] INITIAL_SESSION detected.");
        if (appState.user && appState.user.id === session.user.id && appState.dataLoaded) {
            console.log("[MAIN.JS] INITIAL_SESSION: User already set and data loaded. No action needed.");
            loader.classList.add('hidden'); loader.classList.remove('flex');
            isHandlingAuthChange = false;
            return;
        }
        
        console.log("[MAIN.JS] Attempting to refresh session for INITIAL_SESSION...");
        try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.error("[MAIN.JS] Error refreshing session during INITIAL_SESSION:", refreshError);
                await supabase.auth.signOut(); 
                // isHandlingAuthChange will be reset by the SIGNED_OUT event
                return; 
            } else if (refreshData.session && refreshData.session.user) {
                console.log("[MAIN.JS] Session refreshed successfully during INITIAL_SESSION.");
                await handleSuccessfulAuth(refreshData.session.user, "INITIAL_SESSION_REFRESHED");
            } else {
                console.warn("[MAIN.JS] refreshSession returned no session or no user. Signing out.");
                await supabase.auth.signOut();
                isHandlingAuthChange = false;
                return; 
            }
        } catch (e) {
            console.error("[MAIN.JS] Exception during supabase.auth.refreshSession():", e);
            await supabase.auth.signOut(); 
            isHandlingAuthChange = false;
            return;
        }
    } else if (event === 'SIGNED_OUT') {
        console.log("[MAIN.JS] User signed out.");
        appState.user = null;
        appState.materials = [];
        appState.productionLog = [];
        appState.dataLoaded = false; 
        appState.lastLoadedUserId = null;
        
        mainContent.classList.add('hidden');
        mainContent.classList.add('opacity-0');
        footer.classList.add('hidden');
        userInfo.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        reportsBtn.classList.add('hidden');
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        loginScreen.classList.remove('hidden');
        console.log("[MAIN.JS] UI reset for signed out state.");
        isHandlingAuthChange = false;
    } else if (event === 'TOKEN_REFRESHED' && session && session.user) {
        console.log("[MAIN.JS] TOKEN_REFRESHED event. Updating appState.user.");
        appState.user = session.user; 
        if (!appState.dataLoaded) { // If data wasn't loaded, perhaps due to an earlier issue
            console.log("[MAIN.JS] TOKEN_REFRESHED: Data not loaded, attempting handleSuccessfulAuth.");
            await handleSuccessfulAuth(session.user, "TOKEN_REFRESHED");
        } else {
            console.log("[MAIN.JS] TOKEN_REFRESHED: Data already loaded. No UI action.");
            isHandlingAuthChange = false;
        }
    } else {
        console.log(`[MAIN.JS] Other/unhandled auth event: ${event}. Current session:`, session);
        if (event === 'INITIAL_SESSION' && !session) {
            console.log("[MAIN.JS] INITIAL_SESSION with no active session. Ensuring login screen is visible.");
            loginScreen.classList.remove('hidden');
            mainContent.classList.add('hidden');
            loader.classList.add('hidden');
            loader.classList.remove('flex');
        }
        isHandlingAuthChange = false;
    }
});

// This function is called by init(), which is called on DOMContentLoaded.
// It sets up listeners that don't need to be re-attached on every UI refresh.
function initializeStaticEventListeners() {
    console.log("[MAIN.JS] initializeStaticEventListeners called.");
    // Pass handleLoginSubmit from main.js to events.js
    attachOneTimeListeners(handleLoginSubmit); 
}

document.addEventListener('DOMContentLoaded', initializeStaticEventListeners);
console.log("[MAIN.JS] Event listener for DOMContentLoaded attached to call initializeStaticEventListeners.");
