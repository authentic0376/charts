// src/main.js
import './style.css' // Keep or modify styles as needed

// Access the chart pages list injected by Vite
// Vite replaces 'import.meta.env.VITE_CHART_PAGES' with the actual JSON string during build
// JSON.parse converts the string back into a JavaScript array
const chartPages = import.meta.env.VITE_CHART_PAGES || []; // Default to empty array if not defined

const appElement = document.querySelector('#app');

if (appElement) {
    // Clear existing content (optional, if you want ONLY the links)
    // appElement.innerHTML = ''; // Uncomment this line to remove Vite default content

    // Create a title for the index
    const title = document.createElement('h1');
    title.textContent = 'Chart Index';
    appElement.appendChild(title); // Add title to the #app div

    if (chartPages.length > 0) {
        // Create an unordered list for the links
        const list = document.createElement('ul');

        // Function to create a more readable name from the path
        const createChartName = (path) => {
            // Example: '/charts/cool-data-vis/' -> 'cool-data-vis'
            const parts = path.split('/').filter(part => part !== ''); // Split and remove empty parts
            const name = parts[parts.length - 1]; // Get the last part
            // Example: 'cool-data-vis' -> 'Cool Data Vis'
            return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        };


        // Generate list items and links
        chartPages.forEach(path => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = path; // The path like '/charts/some-chart/'
            link.textContent = createChartName(path); // Generate a nice name
            //   link.target = '_blank'; // Optional: Open in new tab
            listItem.appendChild(link);
            list.appendChild(listItem);
        });

        appElement.appendChild(list); // Add the list to the #app div
    } else {
        // Display a message if no chart pages were found
        const message = document.createElement('p');
        message.textContent = 'No chart pages found.';
        appElement.appendChild(message);
    }

} else {
    console.error('Could not find #app element');
}

// Remove or comment out the counter setup if you cleared the #app content
// import { setupCounter } from './counter.js'
// setupCounter(document.querySelector('#counter'))