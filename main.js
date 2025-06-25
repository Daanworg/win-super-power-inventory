// main.js - Application Entry Point (vFinal - Login Flow & Flag Management Corrected)

import { loadInitialAppState, appState } from './state.js';
import { refreshUI, showToast } from './ui.js'; 
import { attachOneTimeListeners } from './events.js';
import { supabase } from './supabaseClient.js';

const loginScreen = document.getElementById('login-screen');
const mainContent = document.getElementById('main-content');
const loader = document.getElementById('loader');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const reportsBtn = document.getElementById('show-reports-modal-btn');
const footer = document.getElementById('footer');

console.log("[MAIN.JS] Script loaded. Setting up onAuthStateChange listener.");

let isProcessingAuthEvent = false; // Renamed for clarity

// This function is defined in main.js and passed to events.js
export async function handleLoginSubmit(email, password) {
    console.log("[MAIN.JS] handleLoginSubmit called for email:", email);

    // Show loader immediately upon login attempt
    loginScreen.classList.add('hidden'); 
    loader.classList.remove('hidden');
    loader.classList.add('flex');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            console.error('[MAIN.JS] Login Failed (signInWithPassword error):', error);
            showToast(`Login failed: ${error.message}`, 'error');
            // UI cleanup if login fails before onAuthStateChange handles SIGNED_OUT
            loginScreen.classList.remove('hidden'); 
            loader.classList.add('hidden');
            loader.classList.remove('flex');
            // isProcessingAuthEvent will be handled by onAuthStateChange if it fires an error event or no event
            return; 
        }
        // If signInWithPassword is successful, Supabase will emit a SIGNED_IN event.
        // onAuthStateChange will handle the rest, including setting isProcessingAuthEvent.
        console.log("[MAIN.JS] signInWithPassword successful. User data:", data.user?.email);
        // The loader remains visible, waiting for onAuthStateChange to process SIGNED_IN.
    } catch (catchAllError) { 
        console.error('[MAIN.JS] Critical error during login attempt:', catchAllError);
        showToast(`Login error: ${catchAllError.message}`, 'error');
        loginScreen.classList.remove('hidden');
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        isProcessingAuthEvent = false; // Ensure reset if we don't reach onAuthStateChange
    }
}

async function processAuthenticatedSession(sessionUser, eventType = "Auth") {
    if (!sessionUser) {
        console.error(`[MAIN.JS] processAuthenticatedSession (${eventType}) called with no user.`);
        return false; // Indicate failure
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
            // If data load fails, sign out to prevent inconsistent state
            await supabase.auth.signOut(); 
            return false; // Indicate failure
        }
    } catch (error) {
        console.error("[MAIN.JS] Critical error during app initialization:", error);
        showToast(`Critical error: ${error.message}. Check console.`, 'error');
        await supabase.auth.signOut();
        return false; // Indicate failure
    } finally {
        // Loader is hidden regardless of success/failure of data load
        console.log("[MAIN.JS] Executing finally block for processAuthenticatedSession: Hiding loader.");
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        console.log("[MAIN.JS] Loader hidden.");
    }
    return loadedSuccessfully; // Return the status of data loading
}

supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`[MAIN.JS] Auth event: ${event}`, session ? `User: ${session.user?.email}` : "No session");

    if (isProcessingAuthEvent) {
        console.log("[MAIN.JS] Auth change handling already in progress. Skipping event:", event);
        return;
    }
    isProcessingAuthEvent = true;

    try {
        if (event === 'SIGNED_IN' && session && session.user) {
            console.log("[MAIN.JS] SIGNED_IN event detected.");
            // Avoid redundant processing if already handled (e.g., by TOKEN_REFRESHED leading to data load)
            if (appState.user && appState.user.id === session.user.id && appState.dataLoaded) {
                console.log("[MAIN.JS] SIGNED_IN: User session already active and data loaded. Ensuring UI is correct.");
                loginScreen.classList.add('hidden');
                mainContent.classList.remove('hidden');
                mainContent.classList.remove('opacity-0');
                loader.classList.add('hidden'); loader.classList.remove('flex');
            } else {
                await processAuthenticatedSession(session.user, "SIGNED_IN");
            }
        } else if (event === 'INITIAL_SESSION' && session && session.user) {
            console.log("[MAIN.JS] INITIAL_SESSION detected.");
            if (appState.user && appState.user.id === session.user.id && appState.dataLoaded) {
                console.log("[MAIN.JS] INITIAL_SESSION: User session already active and data loaded. Ensuring UI is correct.");
                loginScreen.classList.add('hidden');
                mainContent.classList.remove('hidden');
                mainContent.classList.remove('opacity-0');
                loader.classList.add('hidden'); loader.classList.remove('flex');
            } else {
                console.log("[MAIN.JS] Attempting to refresh session for INITIAL_SESSION...");
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                if (refreshError) {
                    console.error("[MAIN.JS] Error refreshing session during INITIAL_SESSION:", refreshError);
                    await supabase.auth.signOut(); // This will trigger SIGNED_OUT
                } else if (refreshData.session && refreshData.session.user) {
                    console.log("[MAIN.JS] Session refreshed successfully during INITIAL_SESSION.");
                    await processAuthenticatedSession(refreshData.session.user, "INITIAL_SESSION_REFRESHED");
                } else {
                    console.warn("[MAIN.JS] refreshSession returned no session or no user. Signing out.");
                    await supabase.auth.signOut(); // This will trigger SIGNED_OUT
                }
            }
        } else if (event === 'TOKEN_REFRESHED' && session && session.user) {
            console.log("[MAIN.JS] TOKEN_REFRESHED event. Updating appState.user.");
            appState.user = session.user; 
            if (!appState.dataLoaded) { 
                console.log("[MAIN.JS] TOKEN_REFRESHED: Data not loaded, attempting processAuthenticatedSession.");
                await processAuthenticatedSession(session.user, "TOKEN_REFRESHED");
            } else {
                console.log("[MAIN.JS] TOKEN_REFRESHED: Data already loaded. No major UI action, session updated.");
            }
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            console.log(`[MAIN.JS] User signed out or deleted (Event: ${event}).`);
            appState.user = null;
            appState.materials = [];
            appState.productionLog = [];
            appState.dataLoaded = false; 
            appState.lastLoadedUserId = null;
            sessionStorage.removeItem('appStateCache'); // Clear session storage on logout

            mainContent.classList.add('hidden');
            mainContent.classList.add('opacity-0');
            footer.classList.add('hidden');
            userInfo.classList.add('hidden');
            logoutBtn.classList.add('hidden');
            reportsBtn.classList.add('hidden');
            loader.classList.add('hidden');
            loader.classList.remove('flex');
            loginScreen.classList.remove('hidden');
            console.log("[MAIN.JS] UI reset for signed out/deleted state.");
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
    } finally {
        isProcessingAuthEvent = false;
        console.log(`[MAIN.JS] Auth event ${event} processing complete. isProcessingAuthEvent: ${isProcessingAuthEvent}`);
    }
});

function initializeStaticEventListeners() {
    console.log("[MAIN.JS] initializeStaticEventListeners called.");
    attachOneTimeListeners(handleLoginSubmit); 
}

document.addEventListener('DOMContentLoaded', initializeStaticEventListeners);
console.log("[MAIN.JS] Event listener for DOMContentLoaded attached to call initializeStaticEventListeners.");
