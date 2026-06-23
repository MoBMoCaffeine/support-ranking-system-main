import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import {  Sun, Moon, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminPage = location.pathname.startsWith('/admin');
  const isAdminAllowed = sessionStorage.getItem('adminAllowed') === 'true';


  const handleLogout = () => {
    sessionStorage.removeItem('adminAllowed');
    navigate('/')
    window.location.reload();
  }

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50 isolate">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={isDark ? '/white-version-png.png' : '/black-version-png.png'}
              alt="CP Rankings"
              className="h-10 w-auto transition-transform group-hover:scale-105 border-none"
            />
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* <Link
              to="/"
              className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              All Tracks
            </Link> */}

            {isAdminPage && isAdminAllowed && (
              <Button variant='ghost'
                size='sm' 
                onClick={handleLogout}
                className='gap-2 text-destructive hover:text-destructive hover:bg-destructive/10'>
                  <LogOut className='w-4 h-4'/>
                  Logout
                </Button>
            )}

            <Link
              to="/admin"
              className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <Settings className="w-4 h-4" />
              Admin
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-lg"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
