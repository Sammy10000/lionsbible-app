'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FaLink, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { Disclosure, Transition } from '@headlessui/react';
import { useThemeStore } from '@/stores/themeStore';
import clsx from 'clsx';

interface Reference {
  id: string;
  source_verse_id: string;
  reference_text: string;
  source_book: string;
  source_chapter: number;
  source_verse: number;
}

interface InboundReferencesProps {
  verseId: string;
}

export default function InboundReferences({ verseId }: InboundReferencesProps) {
  const [references, setReferences] = useState<Reference[]>([]);
  const [displayedReferences, setDisplayedReferences] = useState<Reference[]>([]);
  const [showAll, setShowAll] = useState(false);
  const supabase = createClient();
  const initialDisplayCount = 3;
  const { isDarkMode } = useThemeStore();

  useEffect(() => {
    const fetchReferences = async () => {
      const { data, error } = await supabase
        .from('verse_references')
        .select(`
          id,
          source_verse_id,
          reference_text,
          verses!verse_references_source_verse_id_fkey (book, chapter, verse)
        `)
        .eq('target_verse_id', verseId)
        .eq('is_hidden', false);

      if (error) {
        console.error('Error fetching references:', error.message);
        return;
      }

      const formattedData = data?.map((item) => ({
        id: item.id,
        source_verse_id: item.source_verse_id,
        reference_text: item.reference_text,
        source_book: item.verses?.book || 'Unknown',
        source_chapter: item.verses?.chapter || 0,
        source_verse: item.verses?.verse || 0,
      })) || [];

      setReferences(formattedData);
      setDisplayedReferences(formattedData.slice(0, initialDisplayCount));
    };
    fetchReferences();
  }, [verseId, supabase]);

  const handleToggleView = () => {
    if (showAll) {
      setDisplayedReferences(references.slice(0, initialDisplayCount));
    } else {
      setDisplayedReferences(references);
    }
    setShowAll(!showAll);
  };

  useEffect(() => {
    console.log('InboundReferences - isDarkMode:', isDarkMode, 'HTML class:', document.documentElement.className);
  }, [isDarkMode]);

  return (
    <article className="p-6 rounded-xl shadow-md mb-12 bg-white">
      <Disclosure defaultOpen={true}>
        {({ open }) => (
          <div>
            <Disclosure.Button
              className="w-full text-left flex items-center justify-between py-4 px-6 bg-gradient-to-r from-teal-50 to-gray-50 dark:from-teal-900 dark:to-gray-800 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
              aria-label="Toggle inbound references"
            >
              <div>
                <h2 className="text-xl sm:text-xl md:text-2xl font-extrabold text-gray-800 dark:text-gray-100 flex items-center font-comfortaa">
                  <FaLink className="mr-2 text-teal-500 dark:text-teal-400" aria-hidden="true" />
                  Inbound References
                  <span className="ml-2 text-sm sm:text-base md:text-lg text-teal-500 dark:text-teal-400">
                    {references.length}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1 ml-8 font-comfortaa">
                  [Related verses that reference this page]
                </p>
              </div>
              <span className="text-[#E5E7EB]">
                {open ? (
                  <FaChevronUp className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <FaChevronDown className="w-5 h-5" aria-hidden="true" />
                )}
              </span>
            </Disclosure.Button>
            <Transition
              show={open}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 -translate-y-2"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 -translate-y-2"
            >
              <Disclosure.Panel className="px-6 py-4">
                {references.length > 0 ? (
                  <div>
                    <ul className="space-y-4">
                      {displayedReferences.map((ref) => (
                        <li
                          key={ref.id}
                          className="flex items-start space-x-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-150"
                        >
                          <div className="flex-shrink-0">
                            <FaLink
                              className="w-6 h-6 text-teal-500 dark:text-teal-400"
                              aria-hidden="true"
                            />
                          </div>
                          <div>
                            <a
                              href={`/verses/${ref.source_book.replace(/\s+/g, '-').toLowerCase()}/${
                                ref.source_chapter
                              }/${ref.source_verse}`}
                              className={clsx(
                                'text-lg font-semibold hover:underline font-comfortaa',
                                isDarkMode ? 'text-teal-400' : 'text-teal-500'
                              )}
                              aria-label={`Link to ${ref.source_book} ${ref.source_chapter}:${ref.source_verse}`}
                            >
                              {ref.source_book} {ref.source_chapter}:{ref.source_verse}
                            </a>
                            <p
                              className={clsx(
                                'mt-1 font-comfortaa',
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              )}
                            >
                              {ref.reference_text}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {references.length > initialDisplayCount && (
                      <div className="mt-6 text-center">
                        <button
                          type="button"
                          onClick={handleToggleView}
                          className={clsx(
                            'inline-flex items-center px-4 py-2 bg-teal-500 dark:bg-teal-600 rounded-full hover:bg-teal-600 dark:hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 transition-colors duration-200 font-comfortaa',
                            isDarkMode ? 'text-white' : 'text-white'
                          )}
                        >
                          {showAll
                            ? 'View Less'
                            : `View More (${references.length - initialDisplayCount} more)`}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p
                    className={clsx(
                      'text-center font-comfortaa',
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    )}
                  >
                    Be the first to reference this verse!
                  </p>
                )}
              </Disclosure.Panel>
            </Transition>
          </div>
        )}
      </Disclosure>
    </article>
  );
}