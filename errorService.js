// errorService.js
import { showToast } from './ui.js'; // Assumes ui.js exports showToast

/**
 * Centralized error handling utility.
 * Displays a user-friendly toast message and logs detailed error to console.
 * @param {Error | Object | string} error The error object, Supabase error response, or a string message.
 * @param {string} context A string describing where the error occurred (e.g., "login_failed").
 * @param {boolean} [showUserToast=true] Whether to display a toast message to the user.
 */
export function handleError(error, context = "unknown_operation", showUserToast = true) {
    console.error(`Error Context: [${context}]`, error);

    let userMessage = `An error occurred with ${context.replace(/_/g, ' ')}. Please try again.`;
    
    if (error) {
        if (error.message) {
            // Prioritize Supabase specific error details if available
            if (error.code || error.details || error.hint) {
                userMessage = `Error: ${error.message}.`;
                if(error.hint) userMessage += ` Hint: ${error.hint}`;
            } else if (error.message.toLowerCase().includes("failed to fetch") || error.message.toLowerCase().includes("networkerror")) {
                userMessage = "Network error. Please check your connection and try again.";
            } else if (error.message.toLowerCase().includes("timed out")) {
                 userMessage = `Operation timed out: ${context.replace(/_/g, ' ')}. Please try again.`;
            } else {
                 userMessage = `Operation failed: ${error.message}`;
            }
            
            // Log Supabase specific details if present
            if (typeof error === 'object' && (error.code || error.details || error.hint)) {
                 console.error(`Supabase Error Details: Code - ${error.code}, Hint - ${error.hint}, Details - ${error.details}`);
            }
        } else if (typeof error === 'string') {
            userMessage = error;
        }

        // Customize user-friendly messages based on specific known error messages
        if (error.message && error.message.includes("Invalid login credentials")) {
            userMessage = "Login Failed: Incorrect email or password.";
        }
        if (context === "session_refresh_failed_initial") {
            userMessage = "Your session could not be refreshed. Please log in again.";
        }
    }
    
    if (showUserToast) {
        showToast(userMessage, 'error');
    }

    // Placeholder for more advanced logging (e.g., to a server or external service)
    // logErrorToServer(context, error); 
}
