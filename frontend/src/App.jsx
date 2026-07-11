import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { setToken } from './api/client';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import UploadPage from './pages/UploadPage.jsx';
import ReportView from './pages/ReportView.jsx';
import AdminPage from './pages/AdminPage.jsx';

// dead simple auth context, just holds the logged in user object.
// nothing fancy, this is a demo dashboard not a production auth system.
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function loadStoredUser() {
  try {
    const raw = localStorage.getItem('yesreal_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function NavBar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">Yesreal Screening</div>
      <div className="navbar-links">
        <Link to="/">Dashboards</Link>
        <Link to="/upload">New Screening</Link>
        {user.role === 'admin' && <Link to="/admin">Admin</Link>}
        <span className="navbar-user">{user.name} ({user.role})</span>
        <button className="btn-link" onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}

export default function App() {
  const [user, setUser] = useState(loadStoredUser);
  const navigate = useNavigate();

  const login = (userData, token) => {
    setToken(token);
    localStorage.setItem('yesreal_user', JSON.stringify(userData));
    setUser(userData);
    navigate('/');
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('yesreal_user');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <NavBar />
      <main className="page">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
          <Route path="/reports/:id" element={<ProtectedRoute><ReportView /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        </Routes>
      </main>
    </AuthContext.Provider>
  );
}
