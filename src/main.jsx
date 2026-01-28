import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Initialize the root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = createRoot(rootElement);

// Render the app
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
