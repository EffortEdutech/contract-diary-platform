import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Existing pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import AcceptInvitation from './pages/AcceptInvitation';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

// Contract pages
import Contracts from './pages/contracts/Contracts';
import ContractDetail from './pages/contracts/ContractDetail';
import ContractMembers from './pages/contracts/ContractMembers';

// BOQ pages
import BOQList from './pages/boq/BOQList';
import CreateBOQ from './pages/boq/CreateBOQ';
import BOQDetail from './pages/boq/BOQDetail';

// Diary pages
import DiaryList from './pages/diaries/DiaryList';
import DiaryForm from './pages/diaries/DiaryForm';
import DiaryDetail from './pages/diaries/DiaryDetail';

// Claims components
import ClaimList from './pages/claims/ClaimList';
import CreateClaim from './pages/claims/CreateClaim';
import ClaimDetail from './pages/claims/ClaimDetail';

// Reports component - NEW!
import Reports from './pages/reports/Reports';

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

          {/* BOQ routes */}
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
            path="/contracts/:contractId/boq/:boqId"
            element={
              <ProtectedRoute>
                <Layout>
                  <BOQDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Daily Diary Routes */}
          <Route
            path="/contracts/:contractId/diaries"
            element={
              <ProtectedRoute>
                <Layout>
                  <DiaryList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/:contractId/diaries/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <DiaryForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/:contractId/diaries/:diaryId"
            element={
              <ProtectedRoute>
                <Layout>
                  <DiaryDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/:contractId/diaries/:diaryId/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <DiaryForm />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Claims Routes */}
          <Route
            path="/contracts/:contractId/claims"
            element={
              <ProtectedRoute>
                <Layout>
                  <ClaimList />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/contracts/:contractId/claims/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateClaim />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/contracts/:contractId/claims/:claimId"
            element={
              <ProtectedRoute>
                <Layout>
                  <ClaimDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Reports Routes - NEW! */}
          <Route
            path="/contracts/:contractId/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Reports Routes - NEW! */}
          <Route
            path="/contracts/:contractId/members"
            element={
              <ProtectedRoute>
                <Layout>
                  <ContractMembers  />
                </Layout>
              </ProtectedRoute>
            }
          />
           
          {/* Settings Routes - NEW! */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings  />
                </Layout>
              </ProtectedRoute>
            }
          />          

          {/* Settings Routes - NEW! */}
          <Route path="/accept-invitation" element={<AcceptInvitation />} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
