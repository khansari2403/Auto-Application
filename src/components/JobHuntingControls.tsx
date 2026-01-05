import { useState, useEffect } from 'react';

interface Props {
  userId: number;
  onSettingsChange?: () => void;
}

export function JobHuntingControls({ userId, onSettingsChange }: Props) {
  const [isActive, setIsActive] = useState(false);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('14:00');
  const [minCompatibility, setMinCompatibility] = useState<'yellow' | 'green' | 'gold'>('green');
  const [status, setStatus] = useState('idle');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const result = await (window as any).electron.invoke('settings:get', userId);
      if (result?.success && result.data) {
        // Only set active state from DB if it was explicitly enabled by user
        // On fresh load, always start with hunting disabled
        if (!isInitialized) {
          setIsActive(false);
          setIsInitialized(true);
          // Ensure scheduler is disabled on app start
          await (window as any).electron.invoke('scheduler:toggle', { active: false });
        } else {
          setIsActive(result.data.job_hunting_active === 1);
        }
        setAutoApplyEnabled(result.data.auto_apply === 1);
        setScheduleEnabled(result.data.schedule_enabled === 1);
        setStartTime(result.data.schedule_start || '09:00');
        setEndTime(result.data.schedule_end || '14:00');
        setMinCompatibility(result.data.min_compatibility || 'green');
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const saveSettings = async (updates: any) => {
    try {
      await (window as any).electron.invoke('settings:update', updates);
      onSettingsChange?.();
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ success: boolean; message?: string; jobsFound?: number } | null>(null);

  // Start Hunter search immediately (direct trigger)
  const startHunterSearch = async () => {
    setIsSearching(true);
    setSearchResult(null);
    try {
      const result = await (window as any).electron.invoke('hunter:start-search', userId);
      if (result?.success) {
        setSearchResult({ success: true, jobsFound: result.jobsFound || 0 });
      } else {
        setSearchResult({ success: false, message: result?.error || 'Search failed' });
      }
    } catch (e: any) {
      setSearchResult({ success: false, message: e.message });
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle scheduler (interval-based automatic hunting)
  const toggleScheduler = async () => {
    const newValue = !isActive;
    setIsActive(newValue);
    await saveSettings({ job_hunting_active: newValue ? 1 : 0 });
    await (window as any).electron.invoke('scheduler:toggle', { active: newValue });
  };

  const handleAutoApplyToggle = async () => {
    const newValue = !autoApplyEnabled;
    setAutoApplyEnabled(newValue);
    await saveSettings({ auto_apply: newValue ? 1 : 0 });
  };

  const handleScheduleToggle = async () => {
    const newValue = !scheduleEnabled;
    setScheduleEnabled(newValue);
    await saveSettings({ schedule_enabled: newValue ? 1 : 0 });
  };

  const handleTimeChange = async (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartTime(value);
      await saveSettings({ schedule_start: value });
    } else {
      setEndTime(value);
      await saveSettings({ schedule_end: value });
    }
  };

  const handleCompatibilityChange = async (value: 'yellow' | 'green' | 'gold') => {
    setMinCompatibility(value);
    await saveSettings({ min_compatibility: value });
  };

  const getCompatibilityColor = (level: string) => {
    switch (level) {
      case 'gold': return 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
      case 'green': return 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)';
      case 'yellow': return 'linear-gradient(135deg, #FFC107 0%, #FF9800 100%)';
      default: return '#ccc';
    }
  };

  return (
    <div style={{ 
      background: 'var(--card-bg)', 
      borderRadius: '16px', 
      padding: '24px', 
      marginBottom: '24px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-md)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🎯 Job Hunting Control Center
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
            Configure automated job search and application settings
          </p>
        </div>
        
        {/* Top Bar Controls - Start Job Hunting + Auto-Apply */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Auto-Apply Toggle */}
          <div 
            onClick={handleAutoApplyToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: autoApplyEnabled ? 'var(--success-light)' : 'var(--bg-tertiary)',
              border: `2px solid ${autoApplyEnabled ? 'var(--success)' : 'var(--border)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '14px' }}>🤖</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: autoApplyEnabled ? 'var(--success)' : 'var(--text-secondary)' }}>
              Auto-Apply
            </span>
            <div style={{
              width: '36px',
              height: '20px',
              borderRadius: '10px',
              background: autoApplyEnabled ? 'var(--success)' : 'var(--border)',
              position: 'relative',
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: '2px',
                left: autoApplyEnabled ? '18px' : '2px',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
          </div>

          {/* Direct Hunter Trigger Button */}
          <button
            onClick={startHunterSearch}
            disabled={isSearching}
            style={{
              padding: '14px 28px',
              borderRadius: '12px',
              border: 'none',
              background: isSearching 
                ? 'linear-gradient(135deg, #9E9E9E 0%, #757575 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isSearching ? 0.8 : 1
            }}
          >
            {isSearching ? '🔄 Searching...' : '🔍 Hunt Now'}
          </button>
        </div>
      </div>

      {/* Search Result Feedback */}
      {searchResult && (
        <div style={{ 
          marginBottom: '16px',
          padding: '12px 16px',
          background: searchResult.success 
            ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(46, 125, 50, 0.1) 100%)'
            : 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(198, 40, 40, 0.1) 100%)',
          borderRadius: '10px',
          border: `1px solid ${searchResult.success ? 'var(--success)' : 'var(--danger)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ 
            color: searchResult.success ? 'var(--success)' : 'var(--danger)', 
            fontWeight: 600, 
            fontSize: '14px' 
          }}>
            {searchResult.success 
              ? `✅ Hunt complete! Found ${searchResult.jobsFound} jobs.`
              : `❌ ${searchResult.message}`
            }
          </span>
          <button 
            onClick={() => setSearchResult(null)}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              fontSize: '16px',
              color: 'var(--text-secondary)'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Left: Scheduler Settings */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          padding: '20px', 
          borderRadius: '12px',
          border: `2px solid ${isActive ? 'var(--success)' : 'var(--border)'}`
        }}>
          {/* Scheduler Master Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔄 Auto-Scheduler
            </h4>
            <button
              onClick={toggleScheduler}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: isActive 
                  ? 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)'
                  : 'var(--bg-tertiary)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {isActive ? '✓ Running' : 'Start Scheduler'}
            </button>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 16px 0' }}>
            When enabled, Hunter runs automatically at set intervals based on website check frequency
          </p>

          {/* Time Window Settings */}
          <div style={{ 
            padding: '12px', 
            background: 'var(--card-bg)', 
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⏰ Time Window
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={scheduleEnabled} 
                  onChange={handleScheduleToggle}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Limit hours</span>
              </label>
            </div>

          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            alignItems: 'center',
            opacity: scheduleEnabled ? 1 : 0.5,
            pointerEvents: scheduleEnabled ? 'auto' : 'none'
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleTimeChange('start', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              />
            </div>
            
            <div style={{ 
              fontSize: '24px', 
              color: 'var(--text-tertiary)',
              paddingTop: '24px'
            }}>→</div>
            
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => handleTimeChange('end', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              />
            </div>
          </div>

          {scheduleEnabled && (
            <div style={{ 
              marginTop: '12px', 
              padding: '10px', 
              background: 'var(--info-light)', 
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--info)'
            }}>
              🕐 Hunter will be active from <strong>{startTime}</strong> to <strong>{endTime}</strong> daily
            </div>
          )}
        </div>

        {/* Right: Auto-Apply Criteria */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          padding: '20px', 
          borderRadius: '12px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🚀 Auto-Apply Criteria
            </h4>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 16px 0' }}>
            Only auto-apply to jobs that meet minimum compatibility score from HR AI
          </p>

          <div style={{ 
            opacity: autoApplyEnabled ? 1 : 0.5,
            pointerEvents: autoApplyEnabled ? 'auto' : 'none'
          }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-primary)' }}>
              Minimum Compatibility Score
            </label>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {/* Yellow */}
              <button
                onClick={() => handleCompatibilityChange('yellow')}
                style={{
                  flex: 1,
                  padding: '16px 12px',
                  borderRadius: '10px',
                  border: minCompatibility === 'yellow' ? '3px solid #FF9800' : '2px solid var(--border)',
                  background: minCompatibility === 'yellow' ? 'rgba(255, 193, 7, 0.15)' : 'var(--card-bg)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: getCompatibilityColor('yellow'),
                  margin: '0 auto 8px',
                  boxShadow: '0 4px 12px rgba(255, 193, 7, 0.4)'
                }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Yellow+</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Fair Match</div>
              </button>

              {/* Green */}
              <button
                onClick={() => handleCompatibilityChange('green')}
                style={{
                  flex: 1,
                  padding: '16px 12px',
                  borderRadius: '10px',
                  border: minCompatibility === 'green' ? '3px solid #4CAF50' : '2px solid var(--border)',
                  background: minCompatibility === 'green' ? 'rgba(76, 175, 80, 0.15)' : 'var(--card-bg)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: getCompatibilityColor('green'),
                  margin: '0 auto 8px',
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)'
                }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Green+</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Good Match</div>
              </button>

              {/* Gold */}
              <button
                onClick={() => handleCompatibilityChange('gold')}
                style={{
                  flex: 1,
                  padding: '16px 12px',
                  borderRadius: '10px',
                  border: minCompatibility === 'gold' ? '3px solid #FFD700' : '2px solid var(--border)',
                  background: minCompatibility === 'gold' ? 'rgba(255, 215, 0, 0.15)' : 'var(--card-bg)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: getCompatibilityColor('gold'),
                  margin: '0 auto 8px',
                  boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)'
                }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Gold Only</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Perfect Match</div>
              </button>
            </div>
          </div>

          {autoApplyEnabled && (
            <div style={{ 
              marginTop: '12px', 
              padding: '10px', 
              background: 'var(--success-light)', 
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--success)'
            }}>
              ✓ Auto-applying to jobs with <strong>{minCompatibility}</strong> or higher compatibility
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {isActive && (
        <div style={{ 
          marginTop: '16px',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(46, 125, 50, 0.1) 100%)',
          borderRadius: '10px',
          border: '1px solid var(--success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: '#4CAF50',
              animation: 'pulse 2s infinite'
            }} />
            <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '14px' }}>
              Hunter is actively searching for jobs...
            </span>
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            {scheduleEnabled ? `Scheduled: ${startTime} - ${endTime}` : 'Running continuously'}
          </span>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

export default JobHuntingControls;
