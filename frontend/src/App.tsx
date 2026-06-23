import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/lib/theme-context';
import { Toaster } from '@/components/ui/sonner';

// Pages
import { LandingPage } from '@/pages/landing-page';
import { TrackDashboard } from '@/pages/track-dashboard';
import { AdminPage } from '@/pages/admin';
import { AdminTrackPage } from './pages/admin-tracks';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/track/:trackId" element={<TrackDashboard />} />
          <Route path="/admin/track/:slug" element={<AdminTrackPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </Router>
    </ThemeProvider>
  );
}

export default App;
