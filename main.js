// main.js - Application Entry Point (vFinal with EXTREME Debugging + Session Refresh Attempt)

import { loadInitialAppState, appState } from './state.js';
import { refreshUI } from './ui.js';
import { attachOneTimeListeners } from './events.js'; // This will call the function in events.js
import { supabase } from './supabaseClient.js';
import { showToast } from './ui.js'; 

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

// This function is defined in main.js and will be passed to events.js
async function handleLoginSubmit(email, password) {
    console.log("[MAIN.JS] handleLoginSubmit called with email:", email);
    // Removed isHandlingAuthChange logic from here, as onAuthStateChange will manage its own flow.
    
    loginScreen.classList.add('hidden'); 
    loader.classList.remove('hidden');
    loader.classList.add('flex');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            console.error('[MAIN.JS] Login Failed (signInWithPassword error):', error);
            showToast(`Login failed: ${error.message}`, 'error');
            loginScreen.classList.remove('hidden'); 
            loader.classList.add('hidden');
            loader.classList.remove('flex');
            return; 
        }
        console.log("[MAIN.JS] signInWithPassword successful. User data:", data.user?.email, "Session:", data.session ? "Exists" : "No Session");
        // onAuthStateChange('SIGNED_IN') will handle the rest.
        // The loader remains visible, waiting for onAuthStateChange to process SIGNED_IN event.
    } catch (catchAllError) { 
        console.error('[MAIN.JS] Critical error during login attempt:', catchAllError);
        showToast(`Login error: ${catchAllError.message}`, 'error');
        loginScreen.classList.remove('hidden');
        loader.classList.add('hidden');
        loader.classList.remove('flex');
    }
}


supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`[MAIN.JS] Auth event: ${event}`, session ? `User: ${session.user?.email}` : "No session");

    if (event === 'INITIAL_SESSION' && session && session.user) { // Added session.user check
        console.log("[MAIN.JS] INITIAL_SESSION detected with user. Attempting to refresh session first...");
        try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.error("[MAIN.JS] Error refreshing session during INITIAL_SESSION:", refreshError);
                // Potentially sign out if refresh fails critically
                await supabase.auth.signOut(); // This will trigger a SIGNED_OUT event
                return;
            } else {
                console.log("[MAIN.JS] Session refreshed successfully during INITIAL_SESSION.");
                // Use the user from the refreshed session if available, otherwise the original session
                appState.user = (refreshData.session && refreshData.session.user) ? refreshData.session.user : session.user;
            }
        } catch (e) {
            console.error("[MAIN.JS] Exception during supabase.auth.refreshSession():", e);
            await supabase.auth.signOut(); // Sign out on exception
            return;
        }
    } else if (event === 'SIGNED_IN' && session && session.user) {
        console.log("[MAIN.JS] SIGNED_IN event detected.");
        appState.user = session.user;
    }


    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && appState.user ) { 
        // Proceed if appState.user is now set (either by SIGNED_IN or successful INITIAL_SESSION refresh)
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
                 // If data load fails after login/session, sign out to prevent broken state
                await supabase.auth.signOut();
            }
        } catch (error) {
            console.error("[MAIN.JS] Critical error during app initialization in onAuthStateChange (try block):", error);
            showToast(`Critical error: ${error.message}. Check console.`, 'error');
            await supabase.auth.signOut(); // Sign out on critical error
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
        if(appState.dataLoaded !== undefined) appState.dataLoaded = false; 
        if(appState.lastLoadedUserId !== undefined) appState.lastLoadedUserId = null; 
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

function initializeStaticEventListeners() {
    console.log("[MAIN.JS] initializeStaticEventListeners called.");
    // Pass the local handleLoginSubmit function to attachOneTimeListeners
    attachOneTimeListeners(handleLoginSubmit); 
}

document.addEventListener('DOMContentLoaded', initializeStaticEventListeners);
console.log("[MAIN.JS] Event listener for DOMContentLoaded attached.");
