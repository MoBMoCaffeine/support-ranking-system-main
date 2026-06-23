import { useTheme } from '@/lib/theme-context';

export function Footer() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src={isDark ? '/white-version-png.png' : '/black-version-png.png'}
              alt="CP Rankings"
              className="h-12 w-auto"
            />
          </div>
          {/* <div className="flex items-center gap-6">
            <a href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              All Tracks
            </a>
          </div> */}
          <p className="text-sm text-muted-foreground">
            2026 Support Community. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
