import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('indian_music_users')) || [];
    const storedCurrentUserId = localStorage.getItem('indian_music_current_user');
    
    setUsers(storedUsers);
    
    if (storedCurrentUserId) {
      const user = storedUsers.find(u => u.id === storedCurrentUserId);
      if (user) {
        setCurrentUser(user);
      }
    }
  }, []);

  // Save users to local storage whenever they change
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('indian_music_users', JSON.stringify(users));
    }
  }, [users]);

  const login = (username, password) => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('indian_music_current_user', user.id);
      setIsAuthModalOpen(false);
      return { success: true };
    }
    return { success: false, message: 'Invalid username or password' };
  };

  const signup = (username, password) => {
    const exists = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      return { success: false, message: 'Username already exists' };
    }
    
    const newUser = {
      id: Date.now().toString(),
      username,
      password, // In a real app, this would be hashed!
      likedSongs: []
    };
    
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    localStorage.setItem('indian_music_current_user', newUser.id);
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('indian_music_current_user');
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      login, 
      signup, 
      logout,
      isAuthModalOpen,
      setIsAuthModalOpen
    }}>
      {children}
    </AuthContext.Provider>
  );
};
