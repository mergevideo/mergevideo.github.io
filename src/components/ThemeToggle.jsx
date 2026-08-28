import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ label = 'Toggle Theme' }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    setIsDark(isCurrentlyDark);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);

    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 rounded-lg text-[#192a3e] dark:text-[#F2EFE7] bg-white/80 dark:bg-[#131f2d]/80 border border-[#C8DFDB] dark:border-[#20364d] hover:bg-[#F2EFE7] dark:hover:bg-[#1c2c3d] transition-all focus:outline-none shadow-sm"
      aria-label={label}
      title={label}
    >
      {mounted && isDark ? (
        <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
      ) : (
        <Moon className="w-4 h-4 text-[#3368A0] dark:text-[#66A3BF]" />
      )}
    </button>
  );
}
