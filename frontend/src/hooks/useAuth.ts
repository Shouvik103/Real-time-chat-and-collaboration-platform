import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';

export function useAuth() {
  const navigate = useNavigate();
  const { setAuth, clearAuth, isAuthenticated, user } = useAuthStore();
  const { setWorkspaces, setChannels, setActiveChannel } = useChatStore();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      const { user: u, accessToken } = res.data.data;
      setAuth(u, accessToken);
      toast.success(`Welcome back, ${u.displayName}!`);
      navigate('/');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      const msg = err.response?.data?.error?.message ?? 'Login failed';
      toast.error(msg);
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      const { user: u, accessToken } = res.data.data;
      setAuth(u, accessToken);
      toast.success(`Welcome, ${u.displayName}!`);
      navigate('/');
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      const msg = err.response?.data?.error?.message ?? 'Registration failed';
      toast.error(msg);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearAuth();
      setWorkspaces([]);
      setChannels([]);
      setActiveChannel('');
      navigate('/login');
    },
  });

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}

export function useMe() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.getMe().then((r) => r.data.data.user),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}
