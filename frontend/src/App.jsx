import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

function App() {
  return (
    <Routes>
      {/* Route für den Login */}
      <Route path="/" element={<Login />} />
      
      {/* Dashboard Route */}
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;