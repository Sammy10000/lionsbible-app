'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { debounce } from 'lodash';
import { FaBook } from 'react-icons/fa';
import ScrollProgressBar from '@/components/ScrollProgressBar';
import Sidebar from '@/components/Sidebar';
import UserProfile from '@/components/UserProfile';

export default function Header() {
  const supabase = createClient();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dotColor, setDotColor] = useState('#6A7282');
  const [buttonColor, setButtonColor] = useState('#6A7282');
  const [logoSrc, setLogoSrc] = useState('/icon-light-512x512.png');

  // Initialize sidebar as closed for SSR consistency
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [books, setBooks] = useState<string[]>([]);
  const [chapters, setChapters] = useState<{ [book: string]: number[] }>({});
  const [verses, setVerses] = useState<{ [key: string]: number[] }>({});
  const [openBook, setOpenBook] = useState('');
  const [openChapter, setOpenChapter] = useState('');
  const [openVerse, setOpenVerse] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTouchButton, setActiveTouchButton] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Set sidebar state on client-side after mount and manage logo switching
  useEffect(() => {
    const isLargeScreen = window.innerWidth >= 1024; // lg breakpoint
    setIsSidebarOpen(isLargeScreen);

    const htmlElement = document.documentElement;
    const updateColors = () => {
      const isDark = htmlElement.classList.contains('dark');
      setDotColor(isDark ? '#9CA3AF' : '#6A7282');
      setButtonColor(isDark ? '#9CA3AF' : '#6A7282');
      setLogoSrc(isDark ? '/icon-dark-512x512.png' : '/icon-light-512x512.png');
    };

    updateColors();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateColors();
        }
      });
    });

    observer.observe(htmlElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // Fetch books
  useEffect(() => {
    const fetchBooks = async () => {
      const { data } = await supabase.from('verses').select('book').order('book', { ascending: true });
      setBooks([...new Set(data?.map((item) => item.book))]);
    };
    fetchBooks();
  }, []);

  // Fetch chapters
  const fetchChapters = debounce(async () => {
    if (!openBook) return;
    const { data } = await supabase.from('verses').select('chapter').eq('book', openBook).order('chapter', { ascending: true });
    setChapters((prev) => ({ ...prev, [openBook]: [...new Set(data?.map((item) => item.chapter))] }));
  }, 300);

  useEffect(() => {
    fetchChapters();
    return () => fetchChapters.cancel();
  }, [openBook]);

  // Fetch verses
  const fetchVerses = debounce(async () => {
    if (!openBook || !openChapter) return;
    const { data } = await supabase.from('verses').select('verse').eq('book', openBook).eq('chapter', openChapter).order('verse', { ascending: true });
    setVerses((prev) => ({ ...prev, [`${openBook}-${openChapter}`]: [...new Set(data?.map((item) => item.verse))] }));
  }, 300);

  useEffect(() => {
    fetchVerses();
    return () => fetchVerses.cancel();
  }, [openBook, openChapter]);

  // Handle navigation
  const handleNavigate = (book: string, chapter: string, verse: string) => {
    setIsNavigating(true);
    const bookSlug = book.replace(/\s+/g, '-').toLowerCase();
    router.push(`/${bookSlug}/${chapter}/${verse}`);
    setIsDropdownOpen(false);
    setOpenBook('');
    setOpenChapter('');
    setOpenVerse('');
    setTimeout(() => {
      setIsNavigating(false);
    }, 1000);
  };

  // Mobile touch handlers
  const handleTouchStart = (buttonId: string) => {
    setActiveTouchButton(buttonId);
  };

  const handleTouchEnd = (buttonId: string, e: React.TouchEvent) => {
    e.preventDefault();
    if (activeTouchButton === buttonId) {
      if (buttonId === 'main-dropdown') {
        setIsDropdownOpen((prev) => !prev);
        setOpenBook('');
        setOpenChapter('');
        setOpenVerse('');
      } else if (buttonId.startsWith('book-')) {
        const book = buttonId.replace('book-', '');
        setOpenBook((prev) => (prev === book ? '' : book));
        setOpenChapter('');
        setOpenVerse('');
      } else if (buttonId.startsWith('chapter-')) {
        const chapter = buttonId.replace('chapter-', '');
        setOpenChapter((prev) => (prev === chapter ? '' : chapter));
        setOpenVerse('');
      } else if (buttonId.startsWith('verse-')) {
        const verse = buttonId.replace('verse-', '');
        if (openBook && openChapter) {
          handleNavigate(openBook, openChapter, verse);
        }
      }
    }
    setActiveTouchButton(null);
  };

  // Click handlers (for desktop)
  const handleClick = (type: 'main' | 'book' | 'chapter' | 'verse', id: string = '') => {
    if (type === 'main') {
      setIsDropdownOpen((prev) => !prev);
      setOpenBook('');
      setOpenChapter('');
      setOpenVerse('');
    } else if (type === 'book') {
      setOpenBook((prev) => (prev === id ? '' : id));
      setOpenChapter('');
      setOpenVerse('');
    } else if (type === 'chapter') {
      setOpenChapter((prev) => (prev === id ? '' : id));
      setOpenVerse('');
    } else if (type === 'verse' && openBook && openChapter) {
      handleNavigate(openBook, openChapter, id);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setOpenBook('');
        setOpenChapter('');
        setOpenVerse('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <>
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <header
        className="sticky top-0 z-40 bg-white text-grey shadow-lg w-full h-16"
        style={{ willChange: 'transform' }}
      >
        <div className="container mx-auto h-full flex items-center justify-between px-4">
          {/* Logo */}
          <a
            className="flex items-center p-1 rounded-lg hover:bg-gray-100 focus:ring-4"
            href="/"
            aria-label="Go to homepage"
            title="Go to homepage"
          >
            <Image src={logoSrc} alt="Lions Bible Logo" width={40} height={40} className="mr-2" />
          </a>

          {/* Nested Dropdown */}
          <div className="relative">
            <button
              onClick={() => handleClick('main')}
              onTouchStart={() => handleTouchStart('main-dropdown')}
              onTouchEnd={(e) => handleTouchEnd('main-dropdown', e)}
              aria-label="Select book, chapter, and verse"
              title="Select Bible Verse"
              className="bg-white p-3 rounded-lg hover:bg-gray-100 focus:ring-4 focus:ring-blue-500"
              style={{ color: buttonColor }}
            >
              <FaBook className="w-7 h-7" />
            </button>

            {/* Main Dropdown */}
            <div
              className={`absolute left-1/2 transform -translate-x-1/2 mt-4 w-[90vw] md:w-[25vw] min-w-[300px] bg-white rounded-lg shadow-xl z-50 overflow-y-auto ${
                isDropdownOpen ? 'max-h-[600px]' : 'max-h-0'
              }`}
            >
              <div className="px-4 py-3">
                {books.map((book) => (
                  <div key={book} className="mb-2">
                    <button
                      onClick={() => handleClick('book', book)}
                      onTouchStart={() => handleTouchStart(`book-${book}`)}
                      onTouchEnd={(e) => handleTouchEnd(`book-${book}`, e)}
                      className="w-full text-center px-5 py-3 text-gray-700 font-semibold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md"
                    >
                      {book}
                    </button>

                    {/* Chapter Dropdown */}
                    <div
                      className={`ml-4 bg-gray-50 rounded-lg overflow-y-auto transition-all ${
                        openBook === book ? 'max-h-[500px] mt-2' : 'max-h-0'
                      }`}
                    >
                      <div className="px-3 py-2">
                        {chapters[book]?.map((chapter) => (
                          <div key={chapter} className="mb-2">
                            <button
                              onClick={() => handleClick('chapter', chapter.toString())}
                              onTouchStart={() => handleTouchStart(`chapter-${chapter}`)}
                              onTouchEnd={(e) => handleTouchEnd(`chapter-${chapter}`, e)}
                              className="w-full text-center px-5 py-3 text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md"
                            >
                              Chapter {chapter}
                            </button>

                            {/* Verse Dropdown */}
                            <div
                              className={`ml-4 bg-gray-100 rounded-lg overflow-y-auto transition-all ${
                                openChapter === chapter.toString() ? 'max-h-[400px] mt-2' : 'max-h-0'
                              }`}
                            >
                              <div className="px-3 py-2">
                                {verses[`${book}-${chapter}`]?.map((verse) => (
                                  <button
                                    key={verse}
                                    onClick={() => handleClick('verse', verse.toString())}
                                    onTouchStart={() => handleTouchStart(`verse-${verse}`)}
                                    onTouchEnd={(e) => handleTouchEnd(`verse-${verse}`, e)}
                                    className="w-full text-center px-5 py-2 text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md"
                                  >
                                    Verse {verse}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Profile + 3x3 Dots Menu */}
          <div className="flex flex-row">
            <UserProfile />
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-8 h-8 focus:outline-none m-3 rounded-lg hover:bg-gray-100 focus:ring-4"
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
            >
              <div className="grid grid-cols-3 gap-1">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                ))}
              </div>
            </button>
          </div>
        </div>
        <ScrollProgressBar />
      </header>

      {/* Loader Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="loader">
            <div className="wrapper">
              <div className="circle" />
              <div className="line-1" />
              <div className="line-2" />
              <div className="line-3" />
              <div className="line-4" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}