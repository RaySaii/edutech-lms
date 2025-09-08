'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * ScrollToTop Component
 * 
 * Automatically scrolls the page to the top when navigating between routes.
 * This improves user experience by ensuring each new page starts at the top.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Small delay to ensure the new page content has loaded
    const timer = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth' // Smooth scrolling animation
      });
    }, 100); // 100ms delay

    return () => clearTimeout(timer);
  }, [pathname]);

  return null; // This component doesn't render anything
}

/**
 * Alternative implementation with instant scroll (no animation)
 * Uncomment this if you prefer instant scrolling
 */
export function ScrollToTopInstant() {
  const pathname = usePathname();

  useEffect(() => {
    // Instant scroll to top
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

/**
 * Advanced ScrollToTop with customizable behavior
 */
interface ScrollToTopAdvancedProps {
  behavior?: 'smooth' | 'instant';
  excludeRoutes?: string[]; // Routes to exclude from auto-scroll
  delay?: number; // Delay in milliseconds before scrolling
}

export function ScrollToTopAdvanced({ 
  behavior = 'smooth',
  excludeRoutes = [],
  delay = 0
}: ScrollToTopAdvancedProps = {}) {
  const pathname = usePathname();

  useEffect(() => {
    // Check if current route should be excluded
    const shouldExclude = excludeRoutes.some(route => pathname.startsWith(route));
    if (shouldExclude) return;

    const scrollToTop = () => {
      if (behavior === 'smooth') {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
      } else {
        window.scrollTo(0, 0);
      }
    };

    if (delay > 0) {
      const timeoutId = setTimeout(scrollToTop, delay);
      return () => clearTimeout(timeoutId);
    } else {
      scrollToTop();
    }
  }, [pathname, behavior, excludeRoutes, delay]);

  return null;
}