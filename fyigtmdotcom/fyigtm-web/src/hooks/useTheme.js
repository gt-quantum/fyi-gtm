import { useState, useEffect, useCallback } from 'react';
import { theme } from '../lib/theme';

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize theme from localStorage
  useEffect(() => {
    const initTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      const currentTheme = document.documentElement.getAttribute('data-theme');

      // Use saved theme or default to dark
      const effectiveTheme = savedTheme || 'dark';
      const shouldBeDark = effectiveTheme === 'dark';

      // Apply theme if different from current
      if (shouldBeDark) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }

      setIsDarkMode(shouldBeDark);
    };

    initTheme();

    // Listen for Astro page transitions
    document.addEventListener('astro:after-swap', initTheme);
    document.addEventListener('astro:page-load', initTheme);

    // Also observe attribute changes
    const observer = new MutationObserver(() => {
      const dataTheme = document.documentElement.getAttribute('data-theme');
      setIsDarkMode(dataTheme !== 'light');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => {
      document.removeEventListener('astro:after-swap', initTheme);
      document.removeEventListener('astro:page-load', initTheme);
      observer.disconnect();
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const newIsDark = !isDarkMode;
    const newTheme = newIsDark ? 'dark' : 'light';

    if (newIsDark) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }

    localStorage.setItem('theme', newTheme);
    setIsDarkMode(newIsDark);
  }, [isDarkMode]);

  return {
    isDarkMode,
    currentTheme: isDarkMode ? theme.dark : theme.light,
    toggleTheme,
  };
}
