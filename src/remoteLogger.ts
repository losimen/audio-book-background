export function initRemoteLogger(port: number = 8000) {
  // Use the database location/hostname to guess the server IP (usually same as dev server)
  const host = window.location.hostname;
  const endpoint = `http://${host}:${port}`;

  console.log(`[RemoteLogger] Initializing... sending logs to ${endpoint}`);

  const sendLog = (level: string, args: any[]) => {
      try {
          // specific serialization to handle circular references or complex objects if needed, 
          // but basic JSON.stringify is usually enough for debug.
          const message = args.map(arg => {
              if (arg instanceof Error) {
                  return `Error: ${arg.message}\n${arg.stack}`;
              }
              if (typeof arg === 'object') {
                  try {
                      return JSON.stringify(arg);
                  } catch (e) {
                      return '[Circular/Complex Object]';
                  }
              }
              return String(arg);
          }).join(' ');

          fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: `[${level}] ${message}`
          }).catch(err => {
              // Create a silent failure to avoid infinite loop of logging errors about logging
          });
      } catch (e) {
          // Silent fail
      }
  };

  // Override Console Methods
  const originalLog = console.log;
  console.log = (...args) => {
      originalLog.apply(console, args);
      sendLog('INFO', args);
  };

  const originalWarn = console.warn;
  console.warn = (...args) => {
      originalWarn.apply(console, args);
      sendLog('WARN', args);
  };

  const originalError = console.error;
  console.error = (...args) => {
      originalError.apply(console, args);
      sendLog('ERROR', args);
  };
  
  // Catch global errors
  window.addEventListener('error', (event) => {
      sendLog('CRITICAL', [`Uncaught Exception: ${event.message}`, event.filename, event.lineno, event.colno, event.error]);
  });
  
  window.addEventListener('unhandledrejection', (event) => {
      sendLog('CRITICAL', [`Unhandled Rejection:`, event.reason]);
  });
}
