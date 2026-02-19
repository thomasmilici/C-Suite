import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Admin } from './pages/Admin';
import { Join } from './pages/Join';
import { ProjectDashboard } from './pages/ProjectDashboard';
import { DailyPage } from './pages/DailyPage';
import { WeeklyPage } from './pages/WeeklyPage';
import { StrategicThemesPage } from './pages/StrategicThemesPage';
import { StakeholderPage } from './pages/StakeholderPage';
import { ToolboxPage } from './pages/ToolboxPage';

const ProtectedRoute = ({ children, requiredRole }) => {
  const [user, setUser] = useState(auth.currentUser);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) {
          setRole(snap.data().role);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-green-500 font-mono text-xs tracking-widest animate-pulse">VERIFYING CLEARANCE...</div>;

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />

        <Route path="/join/:token" element={<Join />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/progetto/:id"
          element={
            <ProtectedRoute>
              <ProjectDashboard user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/steering/daily/:date"
          element={
            <ProtectedRoute>
              <DailyPage user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/steering/weekly/:weekId"
          element={
            <ProtectedRoute>
              <WeeklyPage user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/themes"
          element={
            <ProtectedRoute>
              <StrategicThemesPage user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stakeholder"
          element={
            <ProtectedRoute>
              <StakeholderPage user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/toolbox"
          element={
            <ProtectedRoute>
              <ToolboxPage user={user} />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
