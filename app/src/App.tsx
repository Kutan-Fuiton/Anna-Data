import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeProvider';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { router } from './router';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

