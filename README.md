# Win Super Power - Factory Dashboard

A modern, responsive web application for managing factory inventory, production logging, and material procurement for small-to-medium manufacturing operations, specifically tailored for "Win Super Power Antenna" in Sri Lanka.

 
*(**Note:** You can take a new screenshot of your working dashboard and upload it to a site like Imgur to get a URL to place here.)*

---

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Architecture](#project-architecture)
- [Local Development Setup](#local-development-setup)
- [Deployment](#deployment)

---

## Overview

This project provides a comprehensive dashboard for real-time factory management. It allows users to track the stock levels of raw materials, log the production of various sub-assemblies and finished products, and automatically calculate material consumption based on predefined recipes. The system highlights materials that are running low and provides an interactive interface to generate Purchase Orders (POs) for suppliers.

The application is built with a modular vanilla JavaScript frontend and is powered by a Supabase backend for authentication and data persistence.

---

## Key Features

*   **Secure Authentication:** User login system managed by Supabase Auth.
*   **Real-time Inventory Management:** View current stock levels for all raw materials.
*   **Production Logging:** Log the production of finished goods and sub-assemblies with a single click. Material stock is automatically deducted based on the product's recipe.
*   **Recipe System:** A configurable Bill of Materials (BOM) in `config.js` defines the exact materials required for each product.
*   **Intelligent Re-order System:** Automatically identifies and lists materials that are below their re-order point, suggesting quantities to order.
*   **Interactive Purchase Order (PO) Generation:**
    *   A modal allows users to review all low-stock items.
    *   Users can select specific items to include in the PO.
    *   Quantities can be customized before generation.
    *   Generates a professional, print-ready PDF using `jsPDF`.
*   **Data Visualization:**
    *   **Production History:** A bar chart displaying production trends over the last 7 days.
    *   **Inventory Status:** A doughnut chart providing an at-a-glance view of stock levels (OK, Warning, Critical).
*   **Session Management:** Uses `sessionStorage` for robust session handling, requiring login for each new browser session for enhanced security and stability.

---

## Technology Stack

### Frontend
*   **HTML5**
*   **CSS3**
    *   **Tailwind CSS:** Utility-first CSS framework for rapid UI development (implemented via a local build process).
    *   **Custom Theming:** A custom "Industrial Tech" dark theme using CSS variables.
*   **Vanilla JavaScript (ES6 Modules):** Clean, modular, and dependency-free application logic.
*   **Libraries:**
    *   **Chart.js:** For data visualization and dashboard charts.
    *   **jsPDF & jspdf-autotable:** For generating client-side PDF documents for Purchase Orders.

### Backend
*   **Supabase:**
    *   **Authentication:** Manages user login and sessions.
    *   **PostgreSQL Database:** Securely stores all `materials` and `production_log` data.
    *   **Row Level Security (RLS):** Enforces data access rules, ensuring users can only manage their own production logs while having access to the global materials list.

### Deployment
*   **Git & GitHub:** For version control.
*   **Vercel:** For continuous deployment and hosting of the static frontend.

---

## Project Architecture

The project follows a modular structure to ensure separation of concerns and maintainability.

-   `index.html`: The main entry point and structure of the application.
-   `style.css`: Custom CSS variables and styles for the application's unique theme.
-   `input.css`: The source file for the Tailwind CSS build process.
-   `output.css`: The compiled and minified production CSS file (this is what's linked in `index.html`).
-   `/` (JavaScript Modules):
    -   `main.js`: The application's entry point. Manages the core authentication flow (`onAuthStateChange`) and initializes all other modules.
    -   `state.js`: Manages the global client-side state (`appState`) and handles all data fetching and caching logic with Supabase and `sessionStorage`.
    -   `ui.js`: Responsible for all DOM manipulation. Contains all `render...()` functions that display data on the screen.
    -   `events.js`: Attaches all event listeners for user interactions (clicks, form submissions, etc.).
    -   `services.js`: Contains the core business logic for updating the database (e.g., `handleUpdateStock`, `handleRestock`).
    -   `reportService.js`: Provides functions to generate data for monthly reports.
    -   `purchaseOrderService.js`: Handles the logic for creating PDF Purchase Orders.
    -   `errorService.js`: A centralized utility for handling and displaying errors.
    -   `config.js`: A static configuration file defining the factory's default materials and product recipes.
    -   `supabaseClient.js`: Initializes and exports the Supabase client instance.

---

## Local Development Setup

To run this project on your local machine, you will need to have [Node.js](https://nodejs.org/) (which includes npm) and [Git](https://git-scm.com/) installed.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Daanworg/win-super-power-inventory.git
    cd win-super-power-inventory
    ```

2.  **Install dependencies:**
    This project uses `npm` to manage the development tools for Tailwind CSS.
    ```bash
    npm install
    ```

3.  **Create your Supabase Client config:**
    The `supabaseClient.js` file contains the connection details for the Supabase project. Ensure your Supabase URL and Anon Key are correctly configured in this file.

4.  **Run the Tailwind CSS build:**
    To compile the CSS for development and automatically rebuild when you make changes, run:
    ```bash
    npm run watch:css
    ```
    To generate a final, minified CSS file for production, run:
    ```bash
    npm run build:css
    ```

5.  **Open `index.html`:**
    You can now open the `index.html` file directly in your web browser to view and interact with the application. A live server extension (like Live Server in VS Code) is recommended for the best development experience.

---

## Deployment

This project is configured for seamless deployment to **Vercel** from a GitHub repository.

1.  **Push to GitHub:** Ensure all your code, including the generated `output.css` file, is pushed to your GitHub repository.
2.  **Vercel Project Setup:**
    -   Create a new project in Vercel and import your GitHub repository.
    -   **Framework Preset:** Select "**Other**".
    -   **Build Command:** Leave this field **EMPTY**.
    -   **Output Directory:** Set this to `./` (or the root).
3.  **Environment Variables:**
    -   While the Supabase keys are currently in `supabaseClient.js`, the best practice for production is to set them as Environment Variables in the Vercel project settings. This project can be configured to use them if needed.
4.  **Deploy:** Vercel will automatically deploy every time you push a new commit to your main branch.
