import React, { useState } from 'react';
import { useTheme, ThemeStyle } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import './ThemeSelector.css';

export const ThemeSelector: React.FC = () => {
  const { style, mode, setStyle, toggleMode } = useTheme();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const themeStyles: { value: ThemeStyle; label: keyof typeof t }[] = [
    { value: 'minimalism', label: 'minimalism' },
    { value: 'material', label: 'material' },
    { value: 'glassmorphism', label: 'glassmorphism' },
    { value: 'neumorphism', label: 'neumorphism' },
  ];

  return (
    <div className="theme-selector">
      <button 
        className="theme-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Theme settings"
      >
        <span className="theme-icon">🎨</span>
        <span className="theme-label">{t('theme')}</span>
      </button>
      
      {isOpen && (
        <div className="theme-dropdown" onMouseLeave={() => setIsOpen(false)}>
          <div className="theme-section">
            <span className="section-label">{t('selectThemeStyle')}</span>
            <div className="theme-styles">
              {themeStyles.map(({ value, label }) => (
                <button
                  key={value}
                  className={`style-btn ${style === value ? 'active' : ''}`}
                  onClick={() => setStyle(value)}
                >
                  {t(label)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="theme-section">
            <span className="section-label">{mode === 'light' ? t('lightMode') : t('darkMode')}</span>
            <button className="mode-toggle" onClick={toggleMode}>
              <span className={`mode-option ${mode === 'light' ? 'active' : ''}`}>☀️</span>
              <span className="mode-slider" data-mode={mode} />
              <span className={`mode-option ${mode === 'dark' ? 'active' : ''}`}>🌙</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
