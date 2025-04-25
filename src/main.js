import './style.css' // Keep or modify styles as needed

// Access the chart pages list injected by Vite
const chartPages = import.meta.env.VITE_CHART_PAGES || []; // Default to empty array

// Access the base URL provided by Vite (e.g., '/' in dev, '/charts/' in preview/prod)
const base = import.meta.env.BASE_URL; // ★★★ Get the base URL ★★★

const appElement = document.querySelector('#app');

if (appElement) {
    // Clear existing content (optional)
    // appElement.innerHTML = '';

    const title = document.createElement('h1');
    title.textContent = 'Chart Index';
    appElement.appendChild(title);

    if (chartPages.length > 0) {
        const list = document.createElement('ul');

        const createChartName = (path) => {
            const parts = path.split('/').filter(part => part !== '');
            const name = parts[parts.length - 1];
            return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        };

        chartPages.forEach(path => { // path is like '/cool-data-vis/'
            const listItem = document.createElement('li');
            const link = document.createElement('a');

            // ★★★ Construct the correct href using the base URL ★★★
            // Ensure base ends with '/' and path starts with '/'
            // Remove the leading '/' from path before joining with base
            const relativePath = path.startsWith('/') ? path.substring(1) : path; // -> 'cool-data-vis/'
            link.href = base + relativePath; // -> '/charts/' + 'cool-data-vis/' = '/charts/cool-data-vis/'
                                             // OR -> '/' + 'cool-data-vis/' = '/cool-data-vis/' in dev

            link.textContent = createChartName(path);
            // link.target = '_blank';
            listItem.appendChild(link);
            list.appendChild(listItem);
        });

        appElement.appendChild(list);
    } else {
        const message = document.createElement('p');
        message.textContent = 'No chart pages found.';
        appElement.appendChild(message);
    }

} else {
    console.error('Could not find #app element');
}

// Optional: Remove counter setup if not needed
// import { setupCounter } from './counter.js'
// setupCounter(document.querySelector('#counter'))