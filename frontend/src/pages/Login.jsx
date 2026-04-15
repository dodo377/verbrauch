import React, { useState, useEffect } from 'react';
import { useMutation } from 'urql';
import { useNavigate } from 'react-router-dom';
import { LOGIN_MUTATION } from '../graphql/mutations.js';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loginError, setLoginError] = useState('');

  const navigate = useNavigate();
  const [{ fetching, error }, executeLogin] = useMutation(LOGIN_MUTATION);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const mapLoginError = (errorMessage) => {
    if (!errorMessage) return 'Fehler beim Login. Bitte Daten prüfen.';
    if (errorMessage.includes('Benutzer nicht gefunden')) return 'Benutzername nicht gefunden.';
    if (errorMessage.includes('Falsches Passwort')) return 'Passwort ist falsch.';
    if (errorMessage.includes('Zu viele fehlgeschlagene Anmeldeversuche')) return 'Zu viele Fehlversuche. Bitte später erneut versuchen.';
    return 'Fehler beim Login. Bitte Daten prüfen.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
  
    const result = await executeLogin({ 
      username, 
      password
    });

    if (result.error) {
      setLoginError(mapLoginError(result.error.message));
      return;
    }

    if (result.data?.login) {
      localStorage.setItem('token', result.data.login.token);
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
    
      <button 
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="absolute top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
      >
        {isDarkMode ? '☀️ Hell' : '🌙 Dunkel'}
      </button>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-colors duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            ⚡ Verbrauch
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Willkommen zurück
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Benutzername</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="demo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Passwort</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {(loginError || error) && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {loginError || mapLoginError(error?.message)}
            </div>
          )}

          <button 
            type="submit" 
            disabled={fetching}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all disabled:opacity-70"
          >
            {fetching ? 'Lädt...' : 'Einloggen'}
          </button>
        </form>
      </div>
    </div>
  );
}