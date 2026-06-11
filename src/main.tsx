import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import App from './App';
import './styles.css';

// Initialize useAuth listener at the top level
import { useAuth } from './hooks/useAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 minutes
      gcTime: 1000 * 60 * 10,          // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Root() {
  // Bootstrap auth listener — must be inside the component tree
  useAuth();
  return <App />;
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '13px',
          },
          classNames: {
            toast: 'border border-line shadow-md',
            success: 'bg-paper text-espresso border-sage/30',
            error: 'bg-paper text-danger border-danger/30',
            info: 'bg-paper text-espresso border-caramel/30',
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
