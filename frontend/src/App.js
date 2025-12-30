import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Existing pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';

// Contract pages
import Contracts from './pages/contracts/Contracts';
import ContractDetail from './pages/contracts/ContractDetail';

// NEW: BOQ pages (we'll create these next)
import BOQList from './pages/boq/BOQList';
import CreateBOQ from './pages/boq/CreateBOQ';
import BOQDetail from './pages/boq/BOQDetail';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Contract routes */}
          <Route
            path="/contracts"
            element={
              <ProtectedRoute>
                <Layout>
                  <Contracts />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ContractDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* NEW: BOQ routes */}
          <Route
            path="/contracts/:contractId/boq"
            element={
              <ProtectedRoute>
                <Layout>
                  <BOQList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/:contractId/boq/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateBOQ />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/boq/:boqId"
            element={
              <ProtectedRoute>
                <Layout>
                  <BOQDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;