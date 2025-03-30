/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html", // Scan index.html
        "./src/**/*.{js,ts,jsx,tsx}", // Scan all JS/TS/JSX/TSX files in src/
    ],
    theme: {
        extend: {}, // Add custom theme extensions here if needed later
    },
    plugins: [], // Add plugins here if needed later
}