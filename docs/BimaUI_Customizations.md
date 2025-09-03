# Bima UI Customizations and Theming

This document outlines the significant UI/UX changes implemented across the application, focusing on the integration of Bima-specific branding, improved navigation, and a new landing page experience.

---

## 1. Top Navigation Bar Enhancements (`apps/ui/src/components/App/Topnav.vue`)

The top navigation bar has been redesigned to offer context-sensitive navigation and brand representation based on the current route.

### 1.1 Bima Branding for 'My' Routes
*   **Feature:** When navigating to any `/my` route (e.g., `my-home`, `my-explore`), the left-hand side of the top navigation now prominently displays the **Bima logo** alongside direct navigation links for "Home" and "Explore".
*   **Files Affected:** `apps/ui/src/components/App/Topnav.vue`
*   **Impact:** Provides consistent branding and quick access to core user sections.

### 1.2 Notifications Icon Relocation
*   **Feature:** The "Notifications" icon, along with its unread count, has been moved from the sidebar to the top navigation bar. It appears to the left of the user's address/login button when a user is authenticated.
*   **Files Affected:** `apps/ui/src/components/App/Topnav.vue`, `apps/ui/src/components/App/Nav.vue`
*   **Impact:** Improves accessibility of notifications and declutters the sidebar for `/my` routes.

### 1.3 Space-Specific Navigation
*   **Feature:** For `/space` routes (e.g., `space-overview`, `space-proposals`), the top navigation now includes direct links to "Overview", "Proposals", and "Leaderboard".
*   **Files Affected:** `apps/ui/src/components/App/Topnav.vue`, `apps/ui/src/components/App/Nav.vue`
*   **Impact:** Offers primary space navigation options directly in the top bar, reducing reliance on the sidebar for key actions within a space.

### 1.4 Bima Logo for 'bima.eth' Space
*   **Feature:** When viewing the `bima.eth` space, the Bima logo is displayed in the top navigation, to the left of the "Overview", "Proposals", and "Leaderboard" links.
*   **Files Affected:** `apps/ui/src/components/App/Topnav.vue`
*   **Impact:** Reinforces brand identity when users are interacting with the primary Bima DAO space.

### 1.5 Search Bar Visibility
*   **Feature:** The search bar is now conditionally hidden on `/my` routes to align with the new design, while remaining visible on `/space` and other relevant routes.
*   **Files Affected:** `apps/ui/src/components/App/Topnav.vue`
*   **Impact:** Streamlines the UI for the `/my` section.

---

## 2. Sidebar Filtering (`apps/ui/src/components/App/Sidebar.vue`)

The sidebar's "followed spaces" section has been refined.

*   **Feature:** The list of followed spaces is now filtered to display only the `bima.eth` space.
*   **Files Affected:** `apps/ui/src/components/App/Sidebar.vue`
*   **Impact:** Prioritizes the primary Bima DAO space in the main navigation sidebar.

---

## 3. Home Page Transformation (`apps/ui/src/views/My/Home.vue`)

The `My/Home.vue` view has been completely redesigned to serve as a high-quality landing page for "Bima DAO Governance".

### 3.1 New Landing Page Layout
*   **Feature:** Replaced the previous `My/Home.vue` content with a new hero section, a Bima DAO statistics card, and calls to action.
*   **Files Affected:** `apps/ui/src/views/My/Home.vue`
*   **Impact:** Provides a visually engaging and informative entry point for users interested in Bima DAO Governance.

### 3.2 Themed Background and Styling
*   **Feature:** The hero section now features a full-width abstract orange-toned background with a gradient overlay. Text and buttons within this section are styled for optimal contrast and a modern aesthetic.
*   **Files Affected:** `apps/ui/src/views/My/Home.vue`
*   **Prerequisite:** A background image file (e.g., `bima-hero-bg.webp`) must be placed in `apps/ui/public/` for the full visual effect.
*   **Impact:** Elevates the visual appeal of the landing page, aligning with a "world-class" design language.

### 3.3 Dynamic Space Statistics
*   **Feature:** Integrated dynamic data fetching for the `bima.eth` space to display real-time statistics like followers count, active proposals, and total proposals. Some stats (e.g., "Members (Static)", "Treasury (Static)") remain hardcoded as per design.
*   **Files Affected:** `apps/ui/src/views/My/Home.vue`
*   **Impact:** Provides up-to-date and relevant information about the Bima DAO.

### 3.4 Action Buttons
*   **Feature:** Prominent "View Proposals", "Create Proposal", and "Enter Governance Portal" buttons are included, styled to match the new theme.
*   **Files Affected:** `apps/ui/src/views/My/Home.vue`
*   **Impact:** Guides users to key governance actions.

### 3.5 Removal of Old UI Elements
*   **Feature:** The `OnboardingUser` component, `ProposalsList`, and related state filters have been removed from this view.
*   **Files Affected:** `apps/ui/src/views/My/Home.vue`
*   **Impact:** Simplifies the page, focusing solely on its new landing page purpose.

---

## 4. Onboarding User Section Removal

*   **Feature:** The `<OnboardingUser />` component has been commented out.
*   **Files Affected:** `apps/ui/src/views/My/Home.vue`, `apps/ui/src/views/My/Explore.vue`
*   **Impact:** Removes a specific onboarding UI element, potentially in favor of a different user introduction flow or for a refined user experience.

---

## 5. New Component Introduction (`apps/ui/src/components/App/BimaLogo.vue`)

*   **Feature:** A new reusable Vue component, `BimaLogo.vue`, was created to encapsulate the Bima SVG logo.
*   **Files Affected:** `apps/ui/src/components/App/BimaLogo.vue` (new file), `apps/ui/src/components/App/Topnav.vue` (usage)
*   **Impact:** Improves component reusability and maintainability for the Bima logo.

---
