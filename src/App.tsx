import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>?? Job Application Automation</h1>
        <p>Automate your job search and application process</p>
      </header>
      <main className="app-main">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Welcome to Auto-Application!</h2>
          <p>The app is loading...</p>
          <p style={{ marginTop: '20px', color: '#666' }}>
            ? Electron window is working<br/>
            ? React app is loaded<br/>
            ? Ready for Phase 2 implementation
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
