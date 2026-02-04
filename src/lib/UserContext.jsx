import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { createOrUpdateUser } from '../services/userService';

const UserContext = createContext(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userLevel, setUserLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(null);

  useEffect(() => {
    console.log('Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? user.email : 'No user');
      setUser(user);
      
      if (user) {
        try {
          const userData = await createOrUpdateUser(user.email, user.displayName);
          console.log('User data from backend:', userData);
          
          // Check if user is not registered
          if (userData.error === 'Not registered' || userData.user_level === null) {
            setUserLevel(null);
            setIsActive(false);
          } else {
            setUserLevel(userData.user_level || 'L4');
            setIsActive(userData.is_active !== undefined ? userData.is_active : true);
          }
        } catch (error) {
          console.error('Error fetching user level:', error);
          setUserLevel(null);
          setIsActive(false);
        }
      } else {
        setUserLevel(null);
        setIsActive(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, userLevel, loading, isActive }}>
      {children}
    </UserContext.Provider>
  );
};
