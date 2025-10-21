import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// Providers
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

// Layout and Route Protection
import AppLayout from './components/Layout';
import { LoggedInRoute, FormateurOrAdminRoute, AdminOnlyRoute } from './components/ProtectedRoute';

// Public Pages
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import MemoFichePreview from './pages/MemoFichePreview';
import LoginView from './pages/LoginView';
import RegisterView from './pages/RegisterView';
import ForgotPasswordView from './pages/ForgotPasswordView';
import ResetPasswordView from './pages/ResetPasswordView';
import UnsubscribePage from './pages/UnsubscribePage';
import { 
    ActivateAccountView,
    ContactFormView,
    ProfileCompletionView,
} from './pages/AuthPage';

// Authenticated Pages
import Dashboard from './pages/Dashboard';
import MemoFichesPage from './pages/MemoFichesPage';
import MemoFichePage from './pages/MemoFicheView';
import QuizPage from './pages/QuizView';

// Admin & Formateur Pages
import GeneratorView from './pages/GeneratorView';
import MemoFicheEditorPage from './pages/MemoFicheEditor';
import AdminPanel from './pages/AdminPanel';
import SubscriptionManagement from './pages/admin/SubscriptionManagement';
import NewsletterManager from './pages/admin/NewsletterManager';
import CRMDashboard from './pages/admin/crm/CRMDashboard';
import ClientDetailPage from './pages/admin/crm/ClientDetailPage';
import ClientList from './pages/admin/crm/ClientList';
import ProspectList from './pages/admin/crm/ProspectList';
import AppointmentList from './pages/admin/crm/AppointmentList';

// Other
import NotFoundPage from './pages/NotFoundPage';


const App: React.FC = () => (
    <HashRouter>
        <AuthProvider>
            <DataProvider>
                <Routes>
                    {/* Public Routes */}
                    <Route element={<AppLayout />}>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/tarifs" element={<PricingPage />} />
                        <Route path="/contact" element={<ContactFormView />} />
                        <Route path="/apercu-memofiche" element={<MemoFichePreview />} /> {/* Add the preview route */}
                    </Route>
                    <Route path="/login" element={<LoginView />} />
                    <Route path="/register" element={<RegisterView />} />
                    <Route path="/forgot-password" element={<ForgotPasswordView />} />
                    <Route path="/reset-password" element={<ResetPasswordView />} />
                    <Route path="/activate-account" element={<ActivateAccountView />} />
                    <Route path="/unsubscribe" element={<UnsubscribePage />} />
                    
                    {/* Authenticated Routes */}
                    <Route element={<LoggedInRoute />}>
                        {/* Routes for ALL authenticated users (Apprenant, Formateur, Admin) */}
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/memofiches" element={<MemoFichesPage />} />
                        <Route path="/memofiche/:id" element={<MemoFichePage />} />
                        <Route path="/quiz/:id" element={<QuizPage />} />
                        <Route path="/complete-profile" element={<ProfileCompletionView />} />

                        {/* Routes for Formateurs & Admins */}
                        <Route element={<FormateurOrAdminRoute />}>
                            <Route path="/edit-memofiche" element={<MemoFicheEditorPage />} />
                            <Route path="/edit-memofiche/:id" element={<MemoFicheEditorPage />} />
                        </Route>

                        {/* Routes for Formateurs & Admins */}
                        <Route element={<FormateurOrAdminRoute />}>
                            <Route path="/edit-memofiche" element={<MemoFicheEditorPage />} />
                            <Route path="/edit-memofiche/:id" element={<MemoFicheEditorPage />} />
                            {/* CRM Routes for Formateurs & Admins */}
                            <Route path="/admin/crm" element={<CRMDashboard />}>
                                <Route index element={<Navigate to="appointments" replace />} />
                                <Route path="clients" element={<ClientList />} />
                                <Route path="prospects" element={<ProspectList />} />
                                <Route path="appointments" element={<AppointmentList />} />
                            </Route>
                            <Route path="/admin/crm/clients/:id" element={<ClientDetailPage />} />
                        </Route>

                        {/* Routes for Admins ONLY */}
                        <Route element={<AdminOnlyRoute />}>
                            <Route path="/generateur" element={<GeneratorView />} />
                            <Route path="/admin" element={<AdminPanel />} />
                            <Route path="/admin/subscriptions" element={<SubscriptionManagement />} />
                            <Route path="/admin/newsletter" element={<NewsletterManager />} />
                        </Route>
                    </Route>
                    
                    {/* Not Found Route */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </DataProvider>
        </AuthProvider>
    </HashRouter>
);

export default App;
