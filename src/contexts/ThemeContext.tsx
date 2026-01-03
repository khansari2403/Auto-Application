import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeStyle = 'minimalism' | 'material' | 'rosePetal' | 'lavenderDream';
export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  style: ThemeStyle;
  mode: ThemeMode;
  setStyle: (style: ThemeStyle) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [style, setStyleState] = useState<ThemeStyle>(() => {
    const saved = localStorage.getItem('theme-style');
    return (saved as ThemeStyle) || 'minimalism';
  });
  
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode');
    return (saved as ThemeMode) || 'light';
  });

  const setStyle = (newStyle: ThemeStyle) => {
    setStyleState(newStyle);
    localStorage.setItem('theme-style', newStyle);
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('theme-mode', newMode);
  };

  const toggleMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-style', style);
    document.documentElement.setAttribute('data-theme-mode', mode);
  }, [style, mode]);

  return (
    <ThemeContext.Provider value={{ style, mode, setStyle, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
