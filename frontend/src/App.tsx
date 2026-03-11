import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Spinner } from '@/components/ui/Spinner';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const OAuthCallbackPage = lazy(() => import('@/pages/OAuthCallbackPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-chat">
      <Spinner className="h-8 w-8 text-brand" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<ChatPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
