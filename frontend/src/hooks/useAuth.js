// frontend/src/hooks/useAuth.js
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, logout as firebaseLogout, getRedirectResult } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, setUser, setLoading, logout: storeLogout } = useAuthStore();

  useEffect(() => {
    // Handle Google redirect result on page load
    getRedirectResult(auth).catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch full user profile from backend
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          // Fallback to basic firebase info if backend fails
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            avatar: firebaseUser.photoURL,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);


  const logout = async () => {
    await firebaseLogout();
    storeLogout();
  };

  return { user, isAuthenticated, isLoading, logout };
};
