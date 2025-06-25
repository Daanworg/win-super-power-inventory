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
    console.log(`[MAIN.JS] Auth event: ${event}`, session ? `User: ${session.user?.email}` : "No session");

    if (event === 'INITIAL_SESSION' && session) {
        console.log("[MAIN.JS] INITIAL_SESSION detected. Attempting to refresh session first...");
        try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.error("[MAIN.JS] Error refreshing session during INITIAL_SESSION:", refreshError);
            } else {
                console.log("[MAIN.JS] Session refreshed successfully during INITIAL_SESSION. New session data:", refreshData.session);
                if (refreshData.session && refreshData.session.user) {
                    appState.user = refreshData.session.user; 
                } else {
                    console.warn("[MAIN.JS] refreshSession returned no session. Will rely on original session object if available or proceed to sign out.");
                    if (!session.user) { // If original INITIAL_SESSION also had no user after refresh
                        await supabase.auth.signOut();
                        return; 
                    }
                    appState.user = session.user; // Fallback to original session user
                }
            }
        } catch (e) {
            console.error("[MAIN.JS] Exception during supabase.auth.refreshSession():", e);
        }
    }

    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && (appState.user || session.user) ) { 
        if(!appState.user && session.user) appState.user = session.user; // Ensure appState.user is set

        console.log("[MAIN.JS] User identified (or session refreshed):", appState.user.email);

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
                console.warn("[MAIN.JS] loadInitialAppState reported failure (returned false). Not refreshing UI or showing main content.");
                showToast('Failed to load factory data (main.js). Please check console.', 'error');
            }
        } catch (error) {
            console.error("[MAIN.JS] Critical error during app initialization in onAuthStateChange (try block):", error);
            showToast(`Critical error: ${error.message}. Check console.`, 'error');
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
        appState.dataLoaded = false; // Reset this flag from state.js if it exists
        appState.lastLoadedUserId = null; // Reset this flag from state.js if it exists
        sessionStorage.removeItem('appStateCache'); // Clear cache on logout
        
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
        console.log(`[MAIN.JS] Other/unhandled auth event: ${event}. Current session:`, session);
        if (event === 'INITIAL_SESSION' && !session) {
            console.log("[MAIN.JS] INITIAL_SESSION with no active session. Ensuring login screen is visible.");
            loginScreen.classList.remove('hidden');
            mainContent.classList.add('hidden');
            loader.classList.add('hidden');
            loader.classList.remove('flex');
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