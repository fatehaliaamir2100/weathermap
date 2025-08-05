import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { QueryClient, QueryClientProvider } from "react-query";

// Enhanced error logging for React Query operations
const logQueryError = (error, context = {}) => {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    errorName: error?.name || 'Unknown',
    errorMessage: error?.message || 'No message',
    errorStack: error?.stack,
    context,
    userAgent: navigator.userAgent,
    connectionType: navigator.connection?.effectiveType || 'unknown',
    onlineStatus: navigator.onLine
  };

  console.error(`❌ React Query error:`, errorDetails);
  return errorDetails;
};

// Enhanced query client with comprehensive error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        console.log(`🔄 Query retry decision:`, {
          failureCount,
          maxRetries: 2,
          errorCode: error?.code,
          httpStatus: error?.response?.status,
          errorMessage: error?.message,
          shouldRetry: failureCount < 2
        });

        // Don't retry on client-side validation errors
        if (error?.message?.includes('Validation failed') || 
            error?.message?.includes('Invalid coordinates') ||
            (error?.message?.includes('Invalid') && error?.message?.includes('must be'))) {
          console.log(`❌ Skipping retry for validation error: ${error.message}`);
          return false;
        }

        // Don't retry on authentication errors
        if (error?.code?.startsWith('auth/')) {
          console.log(`❌ Skipping retry for auth error: ${error.code}`);
          return false;
        }

        // Don't retry on 4xx client errors (except 429 rate limit)
        if (error?.response?.status >= 400 && 
            error?.response?.status < 500 && 
            error?.response?.status !== 429) {
          console.log(`❌ Skipping retry for client error: ${error.response.status}`);
          return false;
        }

        // Retry on network errors, server errors, and rate limits
        const shouldRetry = failureCount < 2 && (
          error?.code === 'ECONNABORTED' || // Timeout
          error?.code === 'ENOTFOUND' || // DNS issues
          error?.code === 'ECONNRESET' || // Connection reset
          error?.response?.status >= 500 || // Server errors
          error?.response?.status === 429 // Rate limit
        );

        return shouldRetry;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff with jitter
        const baseDelay = Math.min(1000 * Math.pow(2, attemptIndex), 10000);
        const jitter = Math.random() * 0.1 * baseDelay; // Add up to 10% jitter
        const delay = Math.floor(baseDelay + jitter);
        
        console.log(`⏳ Query retry delay: ${delay}ms for attempt ${attemptIndex + 1}`);
        return delay;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      onError: (error) => {
        logQueryError(error, { 
          operation: 'query',
          queryType: 'default'
        });
      },
      onSuccess: (data) => {
        console.log(`✅ Query successful:`, {
          timestamp: new Date().toISOString(),
          hasData: !!data,
          dataType: typeof data,
          dataSize: data ? JSON.stringify(data).length : 0
        });
      }
    },
    mutations: {
      retry: (failureCount, error) => {
        console.log(`🔄 Mutation retry decision:`, {
          failureCount,
          maxRetries: 1,
          errorCode: error?.code,
          httpStatus: error?.response?.status,
          errorMessage: error?.message,
          shouldRetry: failureCount < 1
        });

        // Don't retry mutations on client-side validation errors
        if (error?.message?.includes('Validation failed') || 
            error?.message?.includes('Invalid coordinates') ||
            (error?.message?.includes('Invalid') && error?.message?.includes('must be'))) {
          console.log(`❌ Skipping mutation retry for validation error: ${error.message}`);
          return false;
        }

        // Don't retry on authentication errors
        if (error?.code?.startsWith('auth/')) {
          console.log(`❌ Skipping mutation retry for auth error: ${error.code}`);
          return false;
        }

        // Only retry mutations once and only for network/server errors
        const shouldRetry = failureCount < 1 && (
          error?.code === 'ECONNABORTED' || // Timeout
          error?.code === 'ENOTFOUND' || // DNS issues
          error?.code === 'ECONNRESET' || // Connection reset
          error?.response?.status >= 500 // Server errors only
        );

        return shouldRetry;
      },
      retryDelay: (attemptIndex) => {
        const delay = Math.min(2000 * Math.pow(2, attemptIndex), 5000); // Max 5s for mutations
        console.log(`⏳ Mutation retry delay: ${delay}ms for attempt ${attemptIndex + 1}`);
        return delay;
      },
      onError: (error, variables) => {
        logQueryError(error, { 
          operation: 'mutation',
          mutationType: 'default',
          hasVariables: !!variables,
          variablesType: typeof variables
        });
      },
      onSuccess: (data, variables) => {
        console.log(`✅ Mutation successful:`, {
          timestamp: new Date().toISOString(),
          hasData: !!data,
          hasVariables: !!variables,
          dataType: typeof data,
          variablesType: typeof variables
        });
      }
    },
  },
  logger: {
    log: (message, ...args) => {
      console.log(`📊 React Query:`, message, ...args);
    },
    warn: (message, ...args) => {
      console.warn(`⚠️ React Query Warning:`, message, ...args);
    },
    error: (message, ...args) => {
      console.error(`❌ React Query Error:`, message, ...args);
    },
  }
});

// Enhanced error boundary for the query client
queryClient.setMutationDefaults(['geocode'], {
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
  onError: (error, variables) => {
    logQueryError(error, { 
      operation: 'geocode-mutation',
      address: typeof variables === 'string' ? variables.substring(0, 50) : variables
    });
  }
});

queryClient.setMutationDefaults(['route'], {
  retry: 1,
  retryDelay: 3000,
  onError: (error, variables) => {
    logQueryError(error, { 
      operation: 'route-mutation',
      start: variables?.start,
      end: variables?.end,
      profile: variables?.profile
    });
  }
});

queryClient.setQueryDefaults(['weather'], {
  staleTime: 10 * 60 * 1000, // 10 minutes for weather data
  cacheTime: 30 * 60 * 1000, // 30 minutes cache
  retry: 2,
  onError: (error) => {
    logQueryError(error, { operation: 'weather-query' });
  }
});

queryClient.setQueryDefaults(['forecast'], {
  staleTime: 30 * 60 * 1000, // 30 minutes for forecast data
  cacheTime: 60 * 60 * 1000, // 1 hour cache
  retry: 2,
  onError: (error) => {
    logQueryError(error, { operation: 'forecast-query' });
  }
});

// Log query client initialization
console.log('🚀 React Query client initialized:', {
  timestamp: new Date().toISOString(),
  defaultRetries: 2,
  defaultStaleTime: '5 minutes',
  defaultCacheTime: '10 minutes',
  hasLogger: true,
  mutationDefaults: ['geocode', 'route'],
  queryDefaults: ['weather', 'forecast']
});

// Enhanced root element initialization with error handling
const initializeApp = () => {
  try {
    const rootElement = document.getElementById("root");
    
    if (!rootElement) {
      throw new Error('Root element not found in DOM');
    }

    console.log('🎯 Root element found, initializing React app');

    const root = ReactDOM.createRoot(rootElement);
    
    console.log('⚛️ React root created successfully');

    root.render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </React.StrictMode>
    );

    console.log('✅ React app rendered successfully:', {
      timestamp: new Date().toISOString(),
      strictMode: true,
      hasQueryClient: true,
      nodeEnv: process.env.NODE_ENV || 'unknown'
    });

  } catch (error) {
    const errorDetails = {
      timestamp: new Date().toISOString(),
      errorName: error?.name || 'Unknown',
      errorMessage: error?.message || 'No message',
      errorStack: error?.stack,
      location: 'App initialization',
      hasRootElement: !!document.getElementById("root"),
      documentReadyState: document.readyState,
      userAgent: navigator.userAgent
    };

    console.error('❌ Failed to initialize React app:', errorDetails);

    // Try to show error message to user
    try {
      const rootElement = document.getElementById("root");
      if (rootElement) {
        rootElement.innerHTML = `
          <div style="
            padding: 20px; 
            margin: 20px; 
            border: 2px solid #dc2626; 
            border-radius: 8px; 
            background-color: #fef2f2; 
            color: #991b1b;
            font-family: system-ui, -apple-system, sans-serif;
          ">
            <h2 style="margin-top: 0;">Application Failed to Load</h2>
            <p><strong>Error:</strong> ${error.message}</p>
            <p>Please refresh the page or contact support if the problem persists.</p>
            <details style="margin-top: 10px;">
              <summary style="cursor: pointer;">Technical Details</summary>
              <pre style="
                background: #f5f5f5; 
                padding: 10px; 
                border-radius: 4px; 
                overflow: auto; 
                font-size: 12px;
                margin-top: 10px;
              ">${JSON.stringify(errorDetails, null, 2)}</pre>
            </details>
          </div>
        `;
      }
    } catch (fallbackError) {
      console.error('❌ Failed to show error message to user:', fallbackError);
    }

    // Re-throw the error for any global error handlers
    throw error;
  }
};

// Global error handlers for unhandled errors
window.addEventListener('error', (event) => {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack || 'No stack trace',
    type: 'javascript-error'
  };

  console.error('❌ Global JavaScript error:', errorDetails);
});

window.addEventListener('unhandledrejection', (event) => {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    reason: event.reason,
    promise: event.promise,
    type: 'unhandled-promise-rejection'
  };

  console.error('❌ Unhandled promise rejection:', errorDetails);
  
  // Prevent the default browser behavior (logging to console)
  event.preventDefault();
});

// Log app startup
console.log('🌟 Weather Your Route app starting:', {
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'unknown',
  version: process.env.REACT_APP_VERSION || 'unknown',
  userAgent: navigator.userAgent,
  location: window.location.href,
  onlineStatus: navigator.onLine,
  connectionType: navigator.connection?.effectiveType || 'unknown'
});

// Initialize the app
initializeApp();
