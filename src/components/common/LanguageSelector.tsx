import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './LanguageSelector.css';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, availableLanguages, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = availableLanguages.find(l => l.code === language);

  return (
    <div className="language-selector">
      <button 
        className="language-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Language settings"
      >
        <span className="lang-icon">🌐</span>
        <span className="lang-label">{currentLang?.nativeName}</span>
        <span className="lang-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className="language-dropdown" onMouseLeave={() => setIsOpen(false)}>
          <div className="dropdown-header">
            <span>{t('selectLanguage')}</span>
          </div>
          <div className="language-list">
            {availableLanguages.map((lang) => (
              <button
                key={lang.code}
                className={`language-option ${language === lang.code ? 'active' : ''}`}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
              >
                <span className="lang-native">{lang.nativeName}</span>
                <span className="lang-english">{lang.name}</span>
                {language === lang.code && <span className="check-mark">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
