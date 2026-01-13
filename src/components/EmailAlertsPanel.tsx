import { useState, useEffect } from 'react';

interface EmailAlert {
  id: number;
  alertType: string;
  alertTitle: string;
  alertMessage: string;
  isRead: boolean;
  createdAt: string;
}

interface EmailAlertsPanelProps {
  userId: number;
}

export function EmailAlertsPanel({ userId }: EmailAlertsPanelProps) {
  const [alerts, setAlerts] = useState<EmailAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load alerts when component mounts
    loadAlerts();
    
    // Refresh alerts every 5 minutes
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadAlerts = async () => {
    try {
      const result = await (window as any).electron.getEmailAlerts?.(userId);
      if (result?.success && result.data) {
        setAlerts(result.data);
        const unread = result.data.filter((a: EmailAlert) => !a.isRead).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const handleMarkAsRead = async (alertId: number) => {
    try {
      await (window as any).electron.markAlertAsRead?.(alertId);
      loadAlerts();
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'rejection':
        return '❌';
      case 'interview':
        return '📅';
      case 'offer':
        return '🎉';
      case 'info_needed':
        return '❓';
      default:
        return '📧';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'rejection':
        return '#ffebee';
      case 'interview':
        return '#e3f2fd';
      case 'offer':
        return '#e8f5e9';
      case 'info_needed':
        return '#fff3e0';
      default:
        return '#f5f5f5';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📬 Email Alerts</h2>
        {unreadCount > 0 && (
          <span style={{
            backgroundColor: '#d32f2f',
            color: 'white',
            borderRadius: '50%',
            padding: '5px 10px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {unreadCount} unread
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          color: '#999'
        }}>
          <p>No alerts yet</p>
          <p style={{ fontSize: '12px' }}>Start email monitoring to receive alerts from employers</p>
        </div>
      ) : (
        <div>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: '15px',
                marginBottom: '10px',
                backgroundColor: getAlertColor(alert.alertType),
                borderRadius: '8px',
                borderLeft: `4px solid ${alert.isRead ? '#ccc' : '#2196F3'}`,
                opacity: alert.isRead ? 0.7 : 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                    {getAlertIcon(alert.alertType)} {alert.alertTitle}
                  </p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>
                    {alert.alertMessage}
                  </p>
                  <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                {!alert.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(alert.id)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      marginLeft: '10px'
                    }}
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmailAlertsPanel;