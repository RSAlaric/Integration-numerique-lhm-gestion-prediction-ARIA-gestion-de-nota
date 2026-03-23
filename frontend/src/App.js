import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { I18nProvider } from './contexts/I18nContext';
import Layout from './components/layout/Layout';

import LoginPage       from './pages/LoginPage';
import DashboardPage   from './pages/DashboardPage';
import PersonnelPage   from './pages/PersonnelPage';
import AbsencesPage    from './pages/AbsencesPage';
import VolontairesPage from './pages/VolontairesPage';
import StockPage       from './pages/StockPage';
import ProjectsPage    from './pages/ProjectsPage';
import UsersPage       from './pages/UsersPage';
import BCCPage         from './pages/BCCPage';
import ProfilePage     from './pages/ProfilePage';
import AIPage          from './pages/AIPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f4f5f7'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTop:'3px solid #0f2044',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px'}}/>
        <p style={{color:'#6b7280',fontSize:'0.88rem'}}>Chargement...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace/>;
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{
            duration:3500,
            style:{fontFamily:'Inter,sans-serif',fontSize:'0.88rem',borderRadius:'10px',boxShadow:'0 4px 20px rgba(15,32,68,0.15)'},
            success:{iconTheme:{primary:'#10b981',secondary:'white'}},
            error:{iconTheme:{primary:'#ef4444',secondary:'white'}},
          }}/>
          <Routes>
            <Route path="/login" element={<LoginPage/>}/>
            <Route path="/" element={<PrivateRoute><Layout/></PrivateRoute>}>
              <Route index              element={<DashboardPage/>}/>
              <Route path="personnel"   element={<PersonnelPage/>}/>
              <Route path="absences"    element={<AbsencesPage/>}/>
              <Route path="volontaires" element={<VolontairesPage/>}/>
              <Route path="stock"       element={<StockPage/>}/>
              <Route path="projets"     element={<ProjectsPage/>}/>
              <Route path="bcc"         element={<BCCPage/>}/>
              <Route path="ia"          element={<AIPage/>}/>
              <Route path="profil"      element={<ProfilePage/>}/>
              <Route path="utilisateurs"element={<UsersPage/>}/>
              <Route path="*"           element={<Navigate to="/" replace/>}/>
            </Route>
            <Route path="*" element={<Navigate to="/" replace/>}/>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}
