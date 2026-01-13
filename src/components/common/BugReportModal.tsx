import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './BugReportModal.css';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageName: string;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose, pageName }) => {
  const { t } = useLanguage();
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const bugReport = {
      page: pageName,
      description,
      steps,
      expected,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    
    console.log('Bug Report Submitted:', bugReport);
    // In production, send to backend
    
    setIsSubmitting(false);
    setSubmitted(true);
  };

  const handleClose = () => {
    setDescription('');
    setSteps('');
    setExpected('');
    setSubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="bug-modal-overlay" onClick={handleClose}>
      <div className="bug-modal" onClick={e => e.stopPropagation()}>
        <button className="bug-modal-close" onClick={handleClose} aria-label="Close">
          ✕
        </button>
        
        {submitted ? (
          <div className="bug-modal-success">
            <div className="success-icon">✓</div>
            <h3>{t('thankYou')}</h3>
            <p>{t('bugReportSuccess')}</p>
            <button className="btn btn-primary" onClick={handleClose}>
              {t('close')}
            </button>
          </div>
        ) : (
          <>
            <div className="bug-modal-header">
              <h2>{t('bugReportTitle')}</h2>
              <span className="page-badge">{pageName}</span>
            </div>
            
            <form onSubmit={handleSubmit} className="bug-modal-form">
              <div className="form-group">
                <label>{t('bugReportDescription')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('bugReportPlaceholder')}
                  required
                  rows={3}
                />
              </div>
              
              <div className="form-group">
                <label>{t('bugReportSteps')}</label>
                <textarea
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder={t('bugReportStepsPlaceholder')}
                  rows={4}
                />
              </div>
              
              <div className="form-group">
                <label>{t('bugReportExpected')}</label>
                <textarea
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                  placeholder={t('bugReportExpectedPlaceholder')}
                  rows={2}
                />
              </div>
              
              <div className="bug-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleClose}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || !description}>
                  {isSubmitting ? '...' : t('submit')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
