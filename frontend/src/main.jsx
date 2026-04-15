import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'urql';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { client } from './lib/graphqlClient.js';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service Worker Registrierung fehlgeschlagen:', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider value={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);