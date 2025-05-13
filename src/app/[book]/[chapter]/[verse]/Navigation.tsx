'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface NavigationProps {
  prevVerse: { book: string; chapter: number; verse: number } | null;
  nextVerse: { book: string; chapter: number; verse: number } | null;
  currentBook: string;
}

export default function Navigation({ prevVerse, nextVerse, currentBook }: NavigationProps) {
  const [isPrevLoading, setIsPrevLoading] = useState(false);
  const [isNextLoading, setIsNextLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check for dark mode and manage classes
  useEffect(() => {
    const container = document.querySelector('.bg-container');
    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');

    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
      if (container) {
        container.classList.toggle('bg-gray-100', !isDark);
        container.classList.toggle('bg-black', isDark);
      }
      if (prevButton) {
        prevButton.classList.toggle('text-[#484848]', !isDark);
        prevButton.classList.toggle('text-white', isDark);
      }
      if (nextButton) {
        prevButton.classList.toggle('text-[#484848]', !isDark);
        prevButton.classList.toggle('text-white', isDark);
      }
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Reset loading state when pathname changes
  useEffect(() => {
    setIsPrevLoading(false);
    setIsNextLoading(false);
  }, [pathname]);

  // Handle navigation
  const handleNavigate = (book: string, chapter: number, verse: number, isPrev: boolean) => {
    if (isPrev) {
      setIsPrevLoading(true);
    } else {
      setIsNextLoading(true);
    }

    const bookSlug = book.replace(/\s+/g, '-').toLowerCase();
    router.push(`/${bookSlug}/${chapter}/${verse}`);
  };

  return (
    <div className="grid col-span-full gap-4 grid-cols-2 mt-8 bg-container">
      {/* Previous Page Button */}
      <button
        onClick={() =>
          prevVerse &&
          handleNavigate(prevVerse.book, prevVerse.chapter, prevVerse.verse, true)
        }
        className={`prev-button flex items-center justify-start p-4 bg-white border border-gray-300 rounded-lg text-base sm:text-lg font-semibold hover:bg-gray-100 transition-all duration-200 col-span-1 ${
          !prevVerse || isPrevLoading ? 'pointer-events-none opacity-50' : ''
        }`}
        disabled={!prevVerse || isPrevLoading}
      >
        {isPrevLoading ? (
          <div className="w-7 h-7 border-2 border-t-2 border-gray-200 border-t-green-700 rounded-full animate-spin mx-auto"></div>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="w-6 h-6 mr-3 sm:mr-4"
            >
              <path d="M8.83 6a30.23 30.23 0 0 0-5.62 5.406A.949.949 0 0 0 3 12m5.83 6a30.233 30.233 0 0 1-5.62-5.406A.949.949 0 0 1 3 12m0 0h18"></path>
            </svg>
            Prev-page
          </>
        )}
      </button>

      {/* Next Page Button */}
      <button
        onClick={() =>
          nextVerse &&
          handleNavigate(nextVerse.book, nextVerse.chapter, nextVerse.verse, false)
        }
        className={`next-button flex items-center justify-end p-4 bg-white border border-gray-300 rounded-lg text-base sm:text-lg font-semibold hover:bg-gray-100 transition-all duration-200 col-span-1 text-right ${
          !nextVerse || isNextLoading ? 'pointer-events-none opacity-50' : ''
        }`}
        disabled={!nextVerse || isNextLoading}
      >
        {isNextLoading ? (
          <div className="w-7 h-7 border-2 border-t-2 border-gray-200 border-t-green-700 rounded-full animate-spin mx-auto"></div>
        ) : (
          <>
            Next-page
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="w-6 h-6 ml-3 sm:ml-4"
            >
              <path d="M15.17 6a30.23 30.23 0 0 1 5.62 5.406c.14.174.21.384.21.594m-5.83 6a30.232 30.232 0 0 0 5.62-5.406A.949.949 0 0 0 21 12m0 0H3"></path>
            </svg>
          </>
        )}
      </button>
    </div>
  );
}