# Sliding Side Navigation Panel Implementation Plan

## Goal

Replace the current top navigation bar links with a modern sliding side panel, triggered by a hamburger icon. This panel should contain the main navigation links and the site title ("UUbrella"), and it should push the main content aside when open. This behavior should apply to all screen sizes.

## Implementation Steps

**1. Create a New `SideNav` Component:**

*   **File:** `frontend/src/components/SideNav.tsx`
*   **Purpose:** Encapsulates the side panel's structure, content, and behavior.
*   **Props:**
    *   `isOpen: boolean`: Controls panel visibility.
    *   `onClose: () => void`: Callback function to close the panel.
*   **Content:**
    *   "UUbrella" title/logo.
    *   "Hide Item" link.
    *   "Community Map" link.
    *   A close button ('X' icon).
*   **Styling (Tailwind CSS):**
    *   Fixed positioning, appropriate width (e.g., `w-64`).
    *   Background color.
    *   Slide-in/out animation using `transform: translateX()` (from `-100%` to `0`) and `transition-transform`.
    *   Vertical layout for links/title.

**2. Refactor `App.tsx`:**

*   **State:** Maintain `isMenuOpen` state using `useState`.
*   **Header (`<nav>`):**
    *   Remove existing "UUbrella" and navigation links.
    *   Keep only the hamburger button to toggle `isMenuOpen`.
*   **Layout Structure:**
    *   Create a main layout container `div`.
    *   Render `<SideNav isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />` inside the container.
    *   Render the `<main>` content area *next to* the `SideNav` within the container.
*   **Content Pushing:**
    *   Conditionally apply `margin-left` (e.g., `ml-64`) or `transform: translateX()` to the `<main>` element when `isMenuOpen` is true.
    *   Apply a CSS transition (`transition-all duration-300 ease-in-out`) to the `<main>` element's margin/transform for smooth animation.

**3. Styling & Animation:**

*   Use Tailwind CSS for transitions, transforms, positioning, and layout.
*   Ensure smooth animations (`duration-300`, `ease-in-out`).

**4. Accessibility Considerations:**

*   Implement focus trapping within the open panel.
*   Add mechanisms to close the panel (Escape key, clicking outside).

## Component Interaction Diagram

```mermaid
graph TD
    subgraph App.tsx
        A(State: isMenuOpen)
        B(Header: Hamburger Button)
        C(Layout Container)
        D(Main Content)
    end

    subgraph SideNav.tsx
        E(Panel Container)
        F("UUbrella" Title)
        G("Hide Item" Link)
        H("Community Map" Link)
        I(Close Mechanism)
    end

    A -- Toggles --> A
    A -- Controls Visibility --> E
    A -- Controls Styling --> D(Push Effect)

    B -- onClick --> A

    C --> B
    C --> E
    C --> D

    E --> F
    E --> G
    E --> H
    E --> I

    I -- onClick/onEvent --> A(Set isMenuOpen=false)
    G -- onClick --> A(Set isMenuOpen=false)
    H -- onClick --> A(Set isMenuOpen=false)

    style E fill:#ccf,stroke:#333,stroke-width:2px