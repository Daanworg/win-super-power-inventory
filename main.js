// main.js - Application Entry Point (vFinal with EXTREME Debugging + Session Refresh Attempt)

import { loadInitialAppState, appState } from './state.js';
import { refreshUI } from './ui.js';
import { attachOneTimeListeners } from './events.js';
import { supabase } from './supabaseClient.js';
import { showToast } from './ui.js'; 

const loginScreen = document.getElementById('login-screen');
const mainContent = document.getElementById('main-content');
const loader = document.getElementById('loader');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const reportsBtn = document.getElementById('show-reports-modal-btn');
const footer = document.getElementById('footer');

console.log("[MAIN.JS] Script loaded. Setting up onAuthStateChange listener.");

supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`[MAIN.JS] Auth event: ${event}`, session ? `User: ${session.user.email}` : "No session");

    if (event === 'INITIAL_SESSION' && session) {
        console.log("[MAIN.JS] INITIAL_SESSION detected. Attempting to refresh session first...");
        try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.error("[MAIN.JS] Error refreshing session during INITIAL_SESSION:", refreshError);
                // Decide how to handle this - maybe proceed anyway or sign out
                // For now, let's log and proceed to see if loadInitialAppState still hangs
            } else {
                console.log("[MAIN.JS] Session refreshed successfully during INITIAL_SESSION. New session data:", refreshData.session);
                // Update appState.user with the potentially new session user details
                if (refreshData.session && refreshData.session.user) {
                    appState.user = refreshData.session.user; 
                } else {
                    // If refreshSession somehow clears the session without error, handle it
                    console.warn("[MAIN.JS] refreshSession returned no session. Signing out.");
                    await supabase.auth.signOut();
                    return; // Exit early as we will get a SIGNED_OUT event
                }
            }
        } catch (e) {
            console.error("[MAIN.JS] Exception during supabase.auth.refreshSession():", e);
        }
    }

    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && appState.user) { // Ensure appState.user is valid
        // appState.user should have been set by SIGNED_IN or by the refreshSession block above for INITIAL_SESSION
        console.log("[MAIN.JS] User identified (or session refreshed):", appState.user.email);

        console.log("[MAIN.JS] Hiding login screen, preparing to show loader.");
        loginScreen.classList.add('hidden');
        mainContent.classList.add('hidden'); 
        mainContent.classList.add('opacity-0'); 
        
        console.log("[MAIN.JS] Showing loader...");
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
                if (userEmailSpan && appState.user && appState.user.email) { // Use appState.user here
                   userEmailSpan.textContent = appState.user.email;
                } else {
                    console.warn("[MAIN.JS] userEmailSpan or appState.user.email is null/undefined");
                }
                
                setTimeout(() => {
                    mainContent.classList.remove('opacity-0');
                    console.log("[MAIN.JS] Main content opacity removed.");
                }, 50);
            } else {
                console.warn("[MAIN.JS] loadInitialAppState reported failure (returned false). Not refreshing UI or showing main content.");
                console.error('[MAIN.JS] Failed to load factory data (loaderSuccessfully is false).');
            }
        } catch (error) {
            console.error("[MAIN.JS] Critical error during app initialization in onAuthStateChange (try block):", error);
        } finally {
            console.log("[MAIN.JS] Executing finally block: Attempting to hide loader.");
            loader.classList.add('hidden');
            loader.classList.remove('flex');
            console.log("[MAIN.JS] Loader theoretically hidden.");
        }

    } else if (event === 'SIGNED_OUT') {
        console.log("[MAIN.JS] User signed out.");
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
        console.log("[MAIN.JS] UI reset for signed out state.");
    } else {
        // This will catch INITIAL_SESSION if session is null (no user logged in)
        console.log(`[MAIN.JS] Unhandled or no-action-needed auth event: ${event}. Current session:`, session);
        // If it's INITIAL_SESSION with no session, we typically do nothing and wait for login
        // Or ensure the login screen is visible if it's not already.
        if (event === 'INITIAL_SESSION' && !session) {
            loginScreen.classList.remove('hidden');
            mainContent.classList.add('hidden');
            loader.classList.add('hidden');
        }
    }
});

function init() {
    console.log("[MAIN.JS] DOM content loaded. Initializing app.");
    attachOneTimeListeners();
    console.log("[MAIN.JS] One-time listeners attached.");
}

document.addEventListener('DOMContentLoaded', init);
console.log("[MAIN.JS] Event listener for DOMContentLoaded attached.");
