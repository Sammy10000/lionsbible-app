'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { debounce } from 'lodash';

export default function Header() {
  const supabase = createClient();
  const router = useRouter();

  const [books, setBooks] = useState<string[]>([]);
  const [chapters, setChapters] = useState<{ [book: string]: number[] }>({});
  const [verses, setVerses] = useState<{ [key: string]: number[] }>({});
  const [openBook, setOpenBook] = useState('');
  const [openChapter, setOpenChapter] = useState('');
  const [openVerse, setOpenVerse] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
    const bookSlug = book.replace(/\s+/g, '-').toLowerCase();
    router.push(`/${bookSlug}/${chapter}/${verse}`);
    setIsDropdownOpen(false);
    setOpenBook('');
    setOpenChapter('');
    setOpenVerse('');
  };

  // Toggle functions
  const toggleBook = (book: string) => {
    setOpenBook((prev) => (prev === book ? '' : book));
    setOpenChapter('');
    setOpenVerse('');
  };

  const handleBookTouch = (e: React.TouchEvent, book: string) => {
    e.preventDefault();
    toggleBook(book);
  };

  const toggleChapter = (chapter: string) => {
    setOpenChapter((prev) => (prev === chapter ? '' : chapter));
    setOpenVerse('');
  };

  const handleChapterTouch = (e: React.TouchEvent, chapter: string) => {
    e.preventDefault();
    toggleChapter(chapter);
  };

  const toggleVerse = (verse: string) => {
    setOpenVerse((prev) => (prev === verse ? '' : verse));
  };

  const handleVerseTouch = (e: React.TouchEvent, verse: string) => {
    e.preventDefault();
    toggleVerse(verse);
  };

  const toggleMainDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
    setOpenBook('');
    setOpenChapter('');
    setOpenVerse('');
  };

  return (
    <header className="bg-white text-grey p-4 shadow-lg">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center">
        {/* Logo */}
        <a className="flex items-center mb-2 sm:mb-0" href="/" aria-label="Go to homepage">
          <Image src="/icon-light-512x512.png" alt="Lions Bible Logo" width={40} height={40} className="mr-2" />
        </a>

        {/* Nested Dropdown */}
        <div className="relative w-full sm:w-auto">
          <button
            onClick={toggleMainDropdown}
            onTouchStart={toggleMainDropdown}
            className="bg-white text-[#207788] px-5 py-3 my-2 w-full sm:w-auto rounded-lg font-black uppercase tracking-tight hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-blue-500 transition-all duration-500"
          >
            Select Book
          </button>

          {/* Main Dropdown */}
          <div
            className={`absolute left-0 right-0 mt-4 w-full sm:left-[-120px] sm:w-[500px] bg-white rounded-lg shadow-xl z-50 overflow-auto transition-all duration-300 sm:duration-600 ${
              isDropdownOpen ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0'
            }`}
          >
            {books.map((book) => (
              <div key={book}>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleBook(book); }}
                  onTouchStart={(e) => handleBookTouch(e, book)}
                  className="w-full text-left ml-2 px-5 py-4 my-2 text-gray-700 font-semibold hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-blue-500 transition-all duration-500"
                >
                  {book}
                </button>

                {/* Chapter Dropdown */}
                <div
                  className={`w-full bg-white rounded-lg overflow-hidden pl-6 transition-all duration-300 ${
                    openBook === book ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0'
                  }`}
                >
                  {chapters[book]?.map((chapter) => (
                    <div key={chapter}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleChapter(chapter.toString()); }}
                        onTouchStart={(e) => handleChapterTouch(e, chapter.toString())}
                        className="w-full text-left px-5 py-4 my-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-blue-500 transition-all duration-500"
                      >
                        Chapter {chapter}
                      </button>

                      {/* Verse Dropdown */}
                      <div
                        className={`w-full pr-3 bg-white rounded-lg overflow-hidden pl-6 transition-all duration-300 ${
                          openChapter === chapter.toString() ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0'
                        }`}
                      >
                        {verses[`${book}-${chapter}`]?.map((verse) => (
                          <button
                            key={verse}
                            onClick={() => handleNavigate(openBook, openChapter, verse.toString())}
                            onTouchStart={(e) => handleVerseTouch(e, verse.toString())}
                            className="w-full text-left px-5 py-4 my-1 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-blue-500 transition-all duration-500"
                          >
                            Verse {verse}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}