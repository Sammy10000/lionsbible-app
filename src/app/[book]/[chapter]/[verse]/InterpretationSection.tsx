'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import InterpretationForm from './InterpretationForm';
import Interpretation from './Interpretation';
import { BsChatDots } from "react-icons/bs";

function debounce(func: (...args: any[]) => void, wait: number): ((...args: any[]) => void) & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  const debounced = (...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
  };
  return debounced as any;
}

interface InterpretationSectionProps {
  verseId: string;
  userProfile: { id: string; username: string | null; avatar: string | null } | null;
  onSuccess?: () => void;
}

interface Counts {
  interpretation_id: string;
  reply_count: number;
  upvote_count: number;
  report_count: number;
}

export default function InterpretationSection({
  verseId,
  userProfile,
  onSuccess,
}: InterpretationSectionProps) {
  const [interpretations, setInterpretations] = useState<InterpretationForm.Interpretation[]>([]);
  const [replies, setReplies] = useState<{ [key: string]: Replies.Reply[] }>({});
  const [counts, setCounts] = useState<{ [key: string]: Counts }>({});
  const [replyCounts, setReplyCounts] = useState<{ [key: string]: Replies.ReplyCounts }>({});
  const [accordionOpen, setAccordionOpen] = useState<{ [key: string]: boolean }>({});
  const [books, setBooks] = useState<string[]>([]);
  const [chapters, setChapters] = useState<{ [book: string]: number[] }>({});
  const [verses, setVerses] = useState<{ [key: string]: number[] }>({});
  const supabase = createClient();

  useEffect(() => {
    const fetchBooks = async () => {
      const { data, error } = await supabase
        .from('verses')
        .select('book')
        .order('book', { ascending: true });
      if (error) {
        toast.error(`Failed to load books: ${error.message}`, {
          toastId: 'books-fetch-error',
          theme: 'light',
          autoClose: 5000,
        });
        return;
      }
      setBooks([...new Set(data?.map((item) => item.book))].sort());
    };
    fetchBooks();
  }, [supabase]);

  const fetchChapters = useCallback(
    debounce(async (book: string) => {
      if (!book) return;
      const { data, error } = await supabase
        .from('verses')
        .select('chapter')
        .eq('book', book)
        .order('chapter', { ascending: true });
      if (error) {
        toast.error(`Failed to load chapters: ${error.message}`, {
          toastId: 'chapters-fetch-error',
          theme: 'light',
          autoClose: 5000,
        });
        return;
      }
      setChapters((prev) => ({
        ...prev,
        [book]: [...new Set(data?.map((item) => item.chapter))].sort((a, b) => a - b),
      }));
    }, 300),
    [supabase]
  );

  const fetchVerses = useCallback(
    debounce(async (book: string, chapter: number) => {
      if (!book || !chapter) return;
      const { data, error } = await supabase
        .from('verses')
        .select('verse')
        .eq('book', book)
        .eq('chapter', chapter)
        .order('verse', { ascending: true });
      if (error) {
        toast.error(`Failed to load verses: ${error.message}`, {
          toastId: 'verses-fetch-error',
          theme: 'light',
          autoClose: 5000,
        });
        return;
      }
      setVerses((prev) => ({
        ...prev,
        [`${book}-${chapter}`]: [...new Set(data?.map((item) => item.verse))].sort((a, b) => a - b),
      }));
    }, 300),
    [supabase]
  );

  useEffect(() => {
    const fetchInterpretations = async () => {
      const { data: interpretationsData, error } = await supabase
        .from('interpretations')
        .select('id, text, user_id')
        .eq('verse_id', verseId)
        .eq('is_hidden', false);

      if (error) {
        setInterpretations([]);
        return;
      }

      const userIds = [...new Set(interpretationsData?.map((item) => item.user_id).filter((id) => id))];
      let profilesData = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('user_profiles')
          .select('user_id, username, avatar')
          .in('user_id', userIds);
        profilesData = data || [];
      }

      const formattedData = interpretationsData?.map((item) => {
        const profile = profilesData.find((p) => p.user_id === item.user_id);
        return {
          id: item.id,
          interpretation_text: item.text,
          user_id: item.user_id,
          username: profile?.username || 'Anonymous',
          avatar: profile?.avatar || null,
        };
      }) || [];

      setInterpretations(formattedData);

      if (formattedData.length > 0) {
        const interpretationIds = formattedData.map((item) => item.id);
        const { data: countsData } = await supabase
          .from('interpretation_counts')
          .select('interpretation_id, reply_count, upvote_count, report_count')
          .in('interpretation_id', interpretationIds);

        if (countsData) {
          setCounts(countsData.reduce((acc, count) => ({ ...acc, [count.interpretation_id]: count }), {}));
        }

        const { data: repliesData } = await supabase
          .from('replies')
          .select('id, interpretation_id, text, user_id, created_at')
          .in('interpretation_id', interpretationIds)
          .eq('is_hidden', false)
          .order('created_at', { ascending: true });

        if (repliesData) {
          const replyUserIds = [...new Set(repliesData.map((item) => item.user_id).filter((id) => id))];
          let replyProfilesData = [];
          if (replyUserIds.length > 0) {
            const { data } = await supabase
              .from('user_profiles')
              .select('user_id, username, avatar')
              .in('user_id', replyUserIds);
            replyProfilesData = data || [];
          }

          const replyIds = repliesData.map((reply) => reply.id);
          let replyCountsData: Replies.ReplyCounts[] = [];
          if (replyIds.length > 0) {
            const { data } = await supabase
              .from('reply_counts')
              .select('reply_id, upvote_count, report_count')
              .in('reply_id', replyIds);
            replyCountsData = data || [];
          }

          const repliesByInterpretation: { [key: string]: Replies.Reply[] } = {};
          repliesData.forEach((reply) => {
            const profile = replyProfilesData.find((p) => p.user_id === reply.user_id);
            const formattedReply: Replies.Reply = {
              id: reply.id,
              interpretation_id: reply.interpretation_id,
              text: reply.text,
              user_id: reply.user_id,
              username: profile?.username || 'Anonymous',
              avatar: profile?.avatar || null,
              created_at: reply.created_at,
            };
            repliesByInterpretation[reply.interpretation_id] = [
              ...(repliesByInterpretation[reply.interpretation_id] || []),
              formattedReply,
            ];
          });
          setReplies(repliesByInterpretation);
          setReplyCounts(replyCountsData.reduce((acc, count) => ({ ...acc, [count.reply_id]: count }), {}));
        }
      }
    };
    fetchInterpretations();
  }, [verseId, supabase]);

  const renderInterpretationText = (text: string) => {
    const parts = text.split(/(\[.*?\]\s*\(.*?\))/);
    return parts.map((part, index) => {
      const match = part.match(/\[([^\]]+)\]\s*\(([^)]+)\)/);
      if (match) {
        const [book, chapterVerse] = match[1].split(' ');
        let url: string;
        if (chapterVerse.includes('-')) {
          const [chapter, verseRange] = chapterVerse.split(':');
          url = `/verses/${book.replace(/\s+/g, '-').toLowerCase()}/${chapter}/${verseRange}`;
        } else {
          const [chapter, verse] = chapterVerse.split(':');
          url = `/verses/${book.replace(/\s+/g, '-')?.toLowerCase() || ''}/${chapter}/${verse}`;
        }
        return (
          <span key={index}>
            <a
              href={url}
              className="text-teal-500 hover:underline text-sm font-semibold break-words reference-link"
              aria-label={`Link to ${match[1]}`}
            >
              {match[1]}
            </a>{' '}
            ({match[2]})
          </span>
        );
      }
      return part;
    });
  };

  return (
    <>
  <ToastContainer limit={1} />
  <article className="bg-white p-4 sm:p-8 rounded-lg shadow-md mb-6 sm:mb-12 w-full mx-auto max-w-4xl overflow-x-hidden m-0 sm:m-0">
    <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800 mb-4">Share your Insight</h2>
    <div className="text-gray-600 max-w-full overflow-x-hidden">
      <InterpretationForm
        verseId={verseId}
        userProfile={userProfile}
        onSuccess={onSuccess}
        setInterpretations={setInterpretations}
        counts={counts}
        setCounts={setCounts}
        books={books}
        chapters={chapters}
        verses={verses}
        fetchChapters={fetchChapters}
        fetchVerses={fetchVerses}
        className="max-w-full"
      />
      {interpretations.length > 0 && (
        <div className="mt-6 sm:mt-8 max-w-full">
          
          <h3 className="w-full text-left text-white flex py-4 px-6 bg-gradient-to-r from-teal-50 to-gray-50 dark:from-teal-900 dark:to-gray-800 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-800 transition-colors duration-200">
              <BsChatDots className="mr-2 text-teal-500" aria-hidden="true" />
              Community Insights
              <span className="ml-2 text-sm sm:text-base md:text-lg text-teal-500 dark:text-teal-400">
                {interpretations.length}
              </span>
          </h3>
          <ul className="space-y-6 max-w-full overflow-x-hidden m-2 sm:m-4">
            {interpretations.map((interpretation, index) => (
              <li key={interpretation.id} className="max-w-full overflow-x-hidden">
                <Interpretation
                  interpretation={interpretation}
                  replies={replies}
                  counts={counts}
                  replyCounts={replyCounts}
                  userProfile={userProfile}
                  accordionOpen={accordionOpen}
                  setAccordionOpen={setAccordionOpen}
                  setReplies={setReplies}
                  setCounts={setCounts}
                  setReplyCounts={setReplyCounts}
                  setInterpretations={setInterpretations}
                  renderInterpretationText={renderInterpretationText}
                  className="max-w-full overflow-x-hidden"
                />
                {index < interpretations.length - 1 && <hr className="my-4 sm:my-6 border-t border-gray-200 w-full" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </article>
</>
  );
}