import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// Providers
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { CartProvider } from './context/CartContext';

// Layout and Route Protection
import AppLayout from './components/Layout';
import { LoggedInRoute, FormateurOrAdminRoute, AdminOnlyRoute } from './components/ProtectedRoute';

// Lazy-loaded Pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const MemoFichePreview = lazy(() => import('./pages/MemoFichePreview'));
const LoginView = lazy(() => import('./pages/LoginView'));
const RegisterView = lazy(() => import('./pages/RegisterView'));
const ForgotPasswordView = lazy(() => import('./pages/ForgotPasswordView'));
const ResetPasswordView = lazy(() => import('./pages/ResetPasswordView'));
const UnsubscribePage = lazy(() => import('./pages/UnsubscribePage'));
const ActivateAccountView = lazy(() => import('./pages/auth/ActivateAccountView'));
const ContactFormView = lazy(() => import('./pages/auth/ContactFormView'));
const ProfileCompletionView = lazy(() => import('./pages/auth/ProfileCompletionView'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MemoFichesPage = lazy(() => import('./pages/MemoFichesPage'));
const MemoFichePage = lazy(() => import('./pages/MemoFicheView'));
const QuizPage = lazy(() => import('./pages/QuizView'));
const ReadFichesPage = lazy(() => import('./pages/ReadFichesPage'));
const QuizHistoryPage = lazy(() => import('./pages/QuizHistoryPage'));
const LegacyDashboard = lazy(() => import('./pages/LegacyDashboard'));
const GeneratorView = lazy(() => import('./pages/GeneratorView'));
const MemoFicheEditorPage = lazy(() => import('./pages/MemoFicheEditor'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const SubscriptionManagement = lazy(() => import('./pages/admin/SubscriptionManagement'));
const NewsletterManager = lazy(() => import('./pages/admin/NewsletterManager'));
const CRMDashboard = lazy(() => import('./pages/admin/crm/CRMDashboard'));
const ClientDetailPage = lazy(() => import('./pages/admin/crm/ClientDetailPage'));
const ClientList = lazy(() => import('./pages/admin/crm/ClientList'));
const ProspectList = lazy(() => import('./pages/admin/crm/ProspectList'));
const AppointmentList = lazy(() => import('./pages/admin/crm/AppointmentList'));
const WebinarsPage = lazy(() => import('./pages/WebinarsPage'));
const WebinarDetailPage = lazy(() => import('./pages/WebinarDetailPage'));
const WebinarManagement = lazy(() => import('./pages/admin/WebinarManagement'));
const ImageManager = lazy(() => import('./pages/admin/ImageManager'));
const WebinarAdminManager = lazy(() => import('./pages/admin/WebinarAdminManager'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const DataFixerPage = lazy(() => import('./pages/admin/DataFixer'));
const ThankYouPage = lazy(() => import('./pages/ThankYouPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OrderManager = lazy(() => import('./pages/admin/OrderManager'));
const AppsPage = lazy(() => import('./pages/AppsPage'));
const DermoGuideApp = lazy(() => import('./pages/apps/DermoGuideApp'));
const DermoFicheGenerator = lazy(() => import('./pages/apps/DermoFicheGenerator'));

// Other
import NotFoundPage from './pages/NotFoundPage';
import { Spinner } from './components/Icons';


const App: React.FC = () => (
    <HashRouter>
        <AuthProvider>
            <DataProvider>
                <CartProvider>
                    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Spinner className="h-12 w-12 text-teal-600" /></div>}>
                        <Routes>
                            {/* Public Routes */}
                            <Route element={<AppLayout />}>
                                <Route path="/" element={<LandingPage />} />
                                <Route path="/tarifs" element={<PricingPage />} />
                                <Route path="/contact" element={<ContactFormView />} />
                                <Route path="/apercu-memofiche" element={<MemoFichePreview />} />
                                <Route path="/webinars" element={<WebinarsPage />} />
                                <Route path="/webinars/:id" element={<WebinarDetailPage />} />
                                <Route path="/cart" element={<CartPage />} />
                                <Route path="/thank-you" element={<ThankYouPage />} />
                            </Route>
                            <Route path="/login" element={<LoginView />} />
                            <Route path="/register" element={<RegisterView />} />
                            <Route path="/forgot-password" element={<ForgotPasswordView />} />
                            <Route path="/reset-password" element={<ResetPasswordView />} />
                            <Route path="/activate-account" element={<ActivateAccountView />} />
                            <Route path="/unsubscribe" element={<UnsubscribePage />} />
                            
                            {/* Authenticated Routes */}
                            <Route element={<LoggedInRoute />}>
                                <Route path="/checkout/:orderId" element={<CheckoutPage />} />
                                {/* Routes for ALL authenticated users (Apprenant, Formateur, Admin) */}
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/memofiches" element={<MemoFichesPage />} />
                                <Route path="/memofiche/:id" element={<MemoFichePage />} />
                                <Route path="/quiz/:id" element={<QuizPage />} />
                                <Route path="/read-fiches/:userId" element={<ReadFichesPage />} />
                                <Route path="/quiz-history/:userId" element={<QuizHistoryPage />} />
                                <Route path="/complete-profile" element={<ProfileCompletionView />} />
                                <Route path="/my-dashboard" element={<LegacyDashboard />} />
                                <Route path="/profile" element={<ProfilePage />} />

                                {/* Routes for Formateurs & Admins */}
                                <Route element={<FormateurOrAdminRoute />}>
                                    <Route path="/edit-memofiche" element={<MemoFicheEditorPage />} />
                                    <Route path="/edit-memofiche/:id" element={<MemoFicheEditorPage />} />
                                </Route>

                                {/* Routes for Formateurs & Admins */}
                                <Route element={<FormateurOrAdminRoute />}>
                                    <Route path="/edit-memofiche" element={<MemoFicheEditorPage />} />
                                    <Route path="/edit-memofiche/:id" element={<MemoFicheEditorPage />} />
                                    <Route path="/admin" element={<AdminPanel />} />
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
                                    <Route path="/apps" element={<AppsPage />} />
                                    <Route path="/apps/dermo" element={<DermoGuideApp />} />
            <Route path="/apps/dermoguide-generator" element={<DermoFicheGenerator />} />
                                    <Route path="/admin/subscriptions" element={<SubscriptionManagement />} />
                                    <Route path="/admin/newsletter" element={<NewsletterManager />} />
                                    <Route path="/admin/webinars" element={<WebinarManagement />} />
                                    <Route path="/admin/image-manager" element={<ImageManager />} />
                                    <Route path="/admin/webinar-admins" element={<WebinarAdminManager />} />
                                    <Route path="/admin/data-fixer" element={<DataFixerPage />} />
                                    <Route path="/admin/orders" element={<OrderManager />} />
                                </Route>
                            </Route>
                            
                            {/* Not Found Route */}
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </Suspense>
                </CartProvider>
            </DataProvider>
        </AuthProvider>
    </HashRouter>
);

export default App;
