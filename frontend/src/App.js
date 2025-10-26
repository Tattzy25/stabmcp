import React, { useState, useEffect } from 'react';

const App = () => {
  const [serverStatus, setServerStatus] = useState('checking');
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  const checkServerHealth = async () => {
    try {
      // Your FastMCP server runs on port 8080
      const response = await fetch('http://localhost:8080/sse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'health-check',
            arguments: {}
          },
          id: 1
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          setServerStatus('online');
          setMetrics(data.result);
        } else {
          setServerStatus('error');
          setError(data.error?.message || 'Unknown error');
        }
      } else {
        setServerStatus('offline');
        setError('Server not responding');
      }
    } catch (err) {
      setServerStatus('offline');
      setError(err.message);
    }
  };

  useEffect(() => {
    checkServerHealth();
    // Check every 30 seconds
    const interval = setInterval(checkServerHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (serverStatus) {
      case 'online': return '#10B981';
      case 'checking': return '#F59E0B';
      case 'offline': return '#EF4444';
      case 'error': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getStatusText = () => {
    switch (serverStatus) {
      case 'online': return 'Online';
      case 'checking': return 'Checking...';
      case 'offline': return 'Offline';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>FastMCP Dashboard</h1>
        <div style={styles.statusContainer}>
          <div 
            style={{...styles.statusIndicator, backgroundColor: getStatusColor()}}
          />
          <span style={styles.statusText}>
            Server Status: {getStatusText()}
          </span>
        </div>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <h3>Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {metrics && (
        <div style={styles.metricsContainer}>
          <h2>Server Metrics</h2>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <h3>Uptime</h3>
              <p style={styles.metricValue}>{metrics.uptime}</p>
            </div>
            <div style={styles.metricCard}>
              <h3>Memory Usage</h3>
              <p style={styles.metricValue}>
                {Math.round(metrics.memoryUsage / 1024 / 1024)}MB
              </p>
            </div>
            <div style={styles.metricCard}>
              <h3>CPU Usage</h3>
              <p style={styles.metricValue}>
                {metrics.cpuUsage}%
              </p>
            </div>
            <div style={styles.metricCard}>
              <h3>Node Version</h3>
              <p style={styles.metricValue}>{metrics.nodeVersion}</p>
            </div>
          </div>
          
          <div style={styles.details}>
            <h3>Server Details</h3>
            <pre style={styles.detailsPre}>
              {JSON.stringify(metrics, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div style={styles.actions}>
        <button 
          onClick={checkServerHealth}
          style={styles.refreshButton}
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    padding: '2rem',
    color: 'white',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2.5rem',
    margin: '0 0 1rem 0',
    fontWeight: 'bold',
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  statusIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },
  statusText: {
    fontSize: '1.1rem',
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid #EF4444',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '2rem',
    textAlign: 'center',
  },
  metricsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '2rem',
    borderRadius: '12px',
    marginBottom: '2rem',
    backdropFilter: 'blur(10px)',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  metricCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: '1.5rem',
    borderRadius: '8px',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: '0.5rem 0 0 0',
  },
  details: {
    marginTop: '2rem',
  },
  detailsPre: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: '1rem',
    borderRadius: '8px',
    overflow: 'auto',
    maxHeight: '300px',
    fontSize: '0.9rem',
  },
  actions: {
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

export default App;