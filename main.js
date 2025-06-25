// main.js - Application Entry Point (vFinal - Attempting Comprehensive Fixes)

import { loadInitialAppState, appState, showToast } from './state.js'; // Assuming showToast might be in state.js or ui.js
import { refreshUI } from './ui.js';
import { attachOneTimeListeners } from './events.js'; // Ensure this file correctly imports and calls this from events.js
import { supabase } from './supabaseClient.js';

// If showToast is actually in ui.js, adjust import:
// import { showToast } from './ui.js';

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

let isHandlingAuthChange = false; // Prevents re-entrant calls if events fire rapidly

async function handleSuccessfulAuth(sessionUser) {
    if (!sessionUser) {
        console.error("[MAIN.JS] handleSuccessfulAuth called with no user. This shouldn't happen.");
        return;
    }
    appState.user = sessionUser;
    console.log("[MAIN.JS] User identified. Proceeding to load data for:", appState.user.email);

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
            // Ensure showToast is available and works
            if (typeof showToast === 'function') {
                showToast('Failed to load factory data. Please check console and try logging in again.', 'error');
            } else {
                alert('Failed to load factory data. Please check console and try logging in again.');
            }
            // Consider signing out if data load is critical and fails, especially if it's not the initial load
            // if (appState.dataLoaded) { // Only sign out if we expected data to be there
            //    await supabase.auth.signOut();
            // }
        }
    } catch (error) {
        console.error("[MAIN.JS] Critical error during app initialization:", error);
        if (typeof showToast === 'function') {
            showToast(`Critical error during initialization: ${error.message}. Check console.`, 'error');
        } else {
            alert(`Critical error during initialization: ${error.message}. Check console.`);
        }
        // await supabase.auth.signOut();
    } finally {
        console.log("[MAIN.JS] Executing finally block for handleSuccessfulAuth: Hiding loader.");
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        console.log("[MAIN.JS] Loader theoretically hidden.");
        isHandlingAuthChange = false; // Release the lock
    }
}

supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`[MAIN.JS] Auth event: ${event}`, session ? `User: ${session.user?.email}` : "No session");

    if (isHandlingAuthChange) {
        console.log("[MAIN.JS] Auth change handling already in progress. Skipping this event:", event);
        return;
    }
    isHandlingAuthChange = true;

    if (event === 'SIGNED_IN' && session && session.user) {
        console.log("[MAIN.JS] SIGNED_IN event detected.");
        // If appState.user is already set and matches, and data is loaded, maybe do nothing
        if (appState.user && appState.user.id === session.user.id && appState.dataLoaded) {
            console.log("[MAIN.JS] SIGNED_IN: User already set and data loaded. No action needed.");
            isHandlingAuthChange = false;
            return;
        }
        await handleSuccessfulAuth(session.user);
    } else if (event === 'INITIAL_SESSION' && session && session.user) {
        console.log("[MAIN.JS] INITIAL_SESSION detected.");
        // If appState.user is already set from a previous event in this lifecycle and data is loaded, maybe do nothing
        if (appState.user && appState.user.id === session.user.id && appState.dataLoaded) {
            console.log("[MAIN.JS] INITIAL_SESSION: User already set and data loaded. No action needed.");
            loader.classList.add('hidden'); // Ensure loader is hidden if we skip
            loader.classList.remove('flex');
            isHandlingAuthChange = false;
            return;
        }
        
        console.log("[MAIN.JS] Attempting to refresh session for INITIAL_SESSION...");
        try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.error("[MAIN.JS] Error refreshing session during INITIAL_SESSION:", refreshError);
                await supabase.auth.signOut(); // Force sign out
                isHandlingAuthChange = false;
                return; 
            } else if (refreshData.session && refreshData.session.user) {
                console.log("[MAIN.JS] Session refreshed successfully during INITIAL_SESSION.");
                await handleSuccessfulAuth(refreshData.session.user);
            } else {
                console.warn("[MAIN.JS] refreshSession returned no session or no user. Signing out.");
                await supabase.auth.signOut();
                // The SIGNED_OUT event will handle UI cleanup
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
        appState.dataLoaded = false; // Reset data loaded flag
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
        appState.user = session.user; // Update user state with potentially new token info
        // Usually, no UI change is needed here unless specific UI depends on fresh token claims
        // If data wasn't loaded before, this event might imply we should try now,
        // but typically INITIAL_SESSION or SIGNED_IN would have handled it.
        // For safety, if not dataLoaded, try to load, but be careful of loops.
        if (!appState.dataLoaded) {
            console.log("[MAIN.JS] TOKEN_REFRESHED: Data not loaded, attempting handleSuccessfulAuth.");
            await handleSuccessfulAuth(session.user); // This will set isHandlingAuthChange
        } else {
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

// This function will be attached to the login form's submit event in events.js
export async function handleLoginSubmit(email, password) {
    console.log("[MAIN.JS] handleLoginSubmit called with email:", email);
    if (isHandlingAuthChange) {
        console.warn("[MAIN.JS] Login attempt while auth change is already being handled. Aborting.");
        return;
    }
    isHandlingAuthChange = true; // Set lock

    // Show loader immediately upon login attempt
    loginScreen.classList.add('hidden'); // Optimistically hide login
    loader.classList.remove('hidden');
    loader.classList.add('flex');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            console.error('[MAIN.JS] Login Failed (signInWithPassword error):', error);
            if (typeof showToast === 'function') {
                showToast(`Login failed: ${error.message}`, 'error');
            } else {
                alert(`Login failed: ${error.message}`);
            }
            loginScreen.classList.remove('hidden'); // Show login screen again on error
            loader.classList.add('hidden');
            loader.classList.remove('flex');
            isHandlingAuthChange = false; // Release lock
            return; // Exit early
        }

        // If signInWithPassword is successful, an onAuthStateChange('SIGNED_IN') event WILL fire.
        // We don't need to call handleSuccessfulAuth here directly, as the event listener will pick it up.
        // The purpose of this explicit call was to ensure appState.user is set before proceeding.
        // However, the SIGNED_IN event handler should now manage this.
        console.log("[MAIN.JS] signInWithPassword successful. User data:", data.user?.email, "Session:", data.session ? "Exists" : "No Session");
        // The onAuthStateChange('SIGNED_IN') listener will take over from here.
        // No need to call handleSuccessfulAuth(data.user) directly as it would be redundant
        // and might conflict with the event-driven flow.
        // The isHandlingAuthChange will be reset by the onAuthStateChange handler.

    } catch (catchAllError) { // Catch any unexpected errors during login attempt
        console.error('[MAIN.JS] Critical error during login attempt:', catchAllError);
        if (typeof showToast === 'function') {
            showToast(`Login error: ${catchAllError.message}`, 'error');
        } else {
            alert(`Login error: ${catchAllError.message}`);
        }
        loginScreen.classList.remove('hidden');
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        isHandlingAuthChange = false; // Release lock
    }
    // Note: isHandlingAuthChange will be reset by the onAuthStateChange handler's finally block
    // or in error cases above.
}


function init() {
    console.log("[MAIN.JS] DOM content loaded. Initializing app.");
    // attachOneTimeListeners now needs to be smarter or called from events.js
    // For now, let's assume events.js handles its own listener attachment
    // and possibly calls a function to attach form listeners.
    // The key is that DOM is ready.
    // Let's make sure events.js is also modular and exports its setup function.
    
    // Example if events.js exports an init function:
    // import { initializeEventListeners } from './events.js';
    // initializeEventListeners(handleLoginSubmit); // Pass the login handler
    
    // For now, keeping your original structure:
    attachOneTimeListeners(); // This function in main.js will call the one from events.js
    console.log("[MAIN.JS] One-time listeners attached via main.js's init.");
}

document.addEventListener('DOMContentLoaded', init);
console.log("[MAIN.JS] Event listener for DOMContentLoaded attached.");
