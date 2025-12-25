/**
 * Action Log Component
 * Displays real-time activity log showing what the app is doing
 */

import { useState, useEffect } from 'react';
import '../styles/ActionLog.css';

interface ActionLogProps {
  userId: number;
}

interface ActionLogEntry {
  id: number;
  action_type: string;
  action_description: string;
  status: string;
  success: boolean;
  error_message?: string;
  recommendation?: string;
  timestamp: string;
}

/**
 * Real-time action log display
 * Shows all actions performed by the app with status and recommendations
 */
function ActionLog({ userId }: ActionLogProps) {
  const [actions, setActions] = useState<ActionLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load actions on mount and set up auto-refresh
  useEffect(() => {
    loadActions();

    if (autoRefresh) {
      const interval = setInterval(loadActions, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [userId, autoRefresh]);

  /**
   * Load recent actions from database
   */
  const loadActions = async () => {
    try {
      const result = await window.electron.getRecentActions(userId, 100);
      if (result.success) {
        setActions(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load actions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format timestamp to readable format
   */
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  /**
   * Format date to readable format
   */
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string, success?: boolean) => {
    if (success === true) return 'success';
    if (success === false) return 'error';
    if (status === 'completed') return 'success';
    if (status === 'failed') return 'error';
    return 'in-progress';
  };

  /**
   * Get action icon based on type
   */
  const getActionIcon = (actionType: string) => {
    const icons: { [key: string]: string } = {
      linkedin_url_saved: '👤',
      preferences_saved: '🎯',
      ai_model_added: '🤖',
      ai_model_deleted: '🤖',
      email_config_saved: '📧',
      website_added: '🌐',
      company_monitoring_added: '👁️',
      job_search_started: '🔍',
      cv_generated: '📄',
      motivation_letter_generated: '✍️',
      application_submitted: '📤',
      error: '❌',
    };
    return icons[actionType] || '📋';
  };

  if (isLoading) {
    return (
      <div className="action-log">
        <div className="log-header">
          <h2>📊 Activity Log</h2>
          <p>Real-time activity and status updates</p>
        </div>
        <div className="loading">Loading activity log...</div>
      </div>
    );
  }

  return (
    <div className="action-log">
      <div className="log-header">
        <h2>📊 Activity Log</h2>
        <p>Real-time activity and status updates</p>
      </div>

      <div className="log-controls">
        <button className="btn btn-secondary btn-small" onClick={loadActions}>
          🔄 Refresh
        </button>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh every 5 seconds
        </label>
      </div>

      <div className="log-entries">
        {actions.length === 0 ? (
          <div className="empty-state">
            <p>No activity yet. Start configuring your settings to see actions here!</p>
          </div>
        ) : (
          actions.map((action) => (
            <div
              key={action.id}
              className={`log-entry log-entry-${getStatusColor(action.status, action.success)}`}
            >
              <div className="entry-icon">
                {getActionIcon(action.action_type)}
              </div>

              <div className="entry-content">
                <div className="entry-header">
                  <h4>{action.action_description}</h4>
                  <span className={`status-badge status-${getStatusColor(action.status, action.success)}`}>
                    {action.success === true && '✓ Success'}
                    {action.success === false && '✗ Failed'}
                    {action.success === null && action.status === 'in_progress' && '⏳ In Progress'}
                    {action.success === null && action.status === 'completed' && '✓ Completed'}
                  </span>
                </div>

                <div className="entry-meta">
                  <span className="time">{formatTime(action.timestamp)}</span>
                  <span className="date">{formatDate(action.timestamp)}</span>
                </div>

                {action.error_message && (
                  <div className="error-section">
                    <p className="error-label">Error:</p>
                    <p className="error-message">{action.error_message}</p>
                  </div>
                )}

                {action.recommendation && (
                  <div className="recommendation-section">
                    <p className="recommendation-label">💡 Recommendation:</p>
                    <p className="recommendation-message">{action.recommendation}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="log-footer">
        <p>Showing {actions.length} recent actions</p>
      </div>
    </div>
  );
}

export default ActionLog;
