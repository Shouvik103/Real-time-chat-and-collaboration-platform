import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth.api';
import { Spinner } from '@/components/ui/Spinner';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const accessToken = params.get('accessToken');
    if (!accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    // Temporarily set token so the getMe request includes it
    useAuthStore.getState().updateAccessToken(accessToken);

    authApi
      .getMe()
      .then((res) => {
        setAuth(res.data.data.user, accessToken);
        navigate('/', { replace: true });
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center bg-chat">
      <Spinner className="h-8 w-8 text-brand" />
    </div>
  );
}
