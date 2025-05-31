// src/components/InterpretationSection.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import InterpretationForm from './InterpretationForm';
import Interpretation from './Interpretation';
import { BsChatDots } from 'react-icons/bs';
import { FaTimes } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { InterpretationType, Reply, Counts, ReplyCounts } from '@/types';

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

// Corrected function declaration
export default function InterpretationSection({
  verseId,
  userProfile,
  onSuccess,
}: InterpretationSectionProps) {
  const [interpretations, setInterpretations] = useState<InterpretationType[]>([]);
  const [replies, setReplies] = useState<{ [key: string]: Reply[] }>({});
  const [counts, setCounts] = useState<{ [key: string]: Counts }>({});
  const [replyCounts, setReplyCounts] = useState<{ [key: string]: ReplyCounts }>({});
  const [accordionOpen, setAccordionOpen] = useState<{ [key: string]: boolean }>({});
  const [books, setBooks] = useState<string[]>([]);
  const [chapters, setChapters] = useState<{ [book: string]: number[] }>({});
  const [verses, setVerses] = useState<{ [key: string]: number[] }>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Modal-specific state
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Modal logic: Handle user session and auth state changes
  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (mounted) {
        setUser(user);
      }
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_OUT') {
          setIsSignUp(true);
          setIsModalOpen(false);
          setEmail('');
          setPassword('');
          setUsername('');
        } else if (event === 'SIGNED_IN') {
          fetchUser();
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setIsModalOpen]);

  // Modal logic: Check if username is unique
  const checkUsernameUnique = async (inputUsername: string) => {
    try {
      const normalizedUsername = inputUsername.trim().toLowerCase();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .ilike('username', normalizedUsername)
        .maybeSingle();
      if (error) {
        console.error('Error checking username:', error.message);
        toast.error('Error checking username availability.', { toastId: 'username-check-error', theme: 'light', autoClose: 3000 });
        return false;
      }
      return !data;
    } catch (err) {
      console.error('Unexpected error checking username:', err);
      toast.error('Unexpected error checking username.', { toastId: 'username-unexpected-error', theme: 'light', autoClose: 3000 });
      return false;
    }
  };

  // Modal logic: Handle sign-up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!username) {
      toast.error('Username is required.', { toastId: 'username-required-error', theme: 'light', autoClose: 3000 });
      setLoading(false);
      return;
    }

    const normalizedUsername = username.trim().toLowerCase();
    const isUnique = await checkUsernameUnique(normalizedUsername);
    if (!isUnique) {
      toast.error('Username already taken.', { toastId: 'username-taken-error', theme: 'light', autoClose: 3000 });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        console.error('Signup error:', error.message);
        toast.error(error.message, { toastId: 'signup-error', theme: 'light', autoClose: 3000 });
        setLoading(false);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: data.user.id,
            username: normalizedUsername,
            is_verified: false,
          });
        if (profileError) {
          toast.error(`Failed to set profile: ${profileError.message}`, { toastId: 'profile-error', theme: 'light', autoClose: 3000 });
          setLoading(false);
          return;
        }

        setEmail('');
        setPassword('');
        setUsername('');
        toast.success('Account created successfully! Please log in.', { toastId: 'signup-success', theme: 'light', autoClose: 3000 });
        setIsSignUp(false);
        setLoading(false);
      }
    } catch (err) {
      console.error('Unexpected signup error:', err);
      toast.error('Unexpected error during signup.', { toastId: 'signup-unexpected-error', theme: 'light', autoClose: 3000 });
      setLoading(false);
    }
  };

  // Modal logic: Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error(error.message, { toastId: 'login-error', theme: 'light', autoClose: 3000 });
      } else {
        setEmail('');
        setPassword('');
        toast.success('Logged in successfully!', { toastId: 'login-success', theme: 'light', autoClose: 3000 });
        setIsModalOpen(false);
      }
    } catch (err) {
      toast.error('Unexpected error during login.', { toastId: 'login-unexpected-error', theme: 'light', autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };

  // Existing InterpretationSection logic
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
      try {
        const { data: interpretationsData, error } = await supabase
          .from('interpretations')
          .select('id, text, user_id')
          .eq('verse_id', verseId)
          .eq('is_hidden', false);

        if (error) {
          console.error('Error fetching interpretations:', error);
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
            let replyCountsData: ReplyCounts[] = [];
            if (replyIds.length > 0) {
              const { data } = await supabase
                .from('reply_counts')
                .select('reply_id, upvote_count, report_count')
                .in('reply_id', replyIds);
              replyCountsData = data || [];
            }

            const repliesByInterpretation: { [key: string]: Reply[] } = {};
            repliesData.forEach((reply) => {
              const profile = replyProfilesData.find((p) => p.user_id === reply.user_id);
              const formattedReply: Reply = {
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
      } catch (error) {
        console.error('Error in fetchInterpretations:', error);
        toast.error('Failed to load interpretations', {
          toastId: 'interpretations-fetch-error',
          theme: 'light',
          autoClose: 5000,
        });
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
      {/* Embedded Modal */}
      {isModalOpen && !user && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg py-5 px-5 sm:p-6 w-[90%] max-w-md md:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="relative top-1 right-1 text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
            >
              <FaTimes className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-center">
                {isSignUp ? 'Sign Up' : 'Log In'}
              </h2>
              <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
                {isSignUp && (
                  <div className="mb-4">
                    <label htmlFor="username" className="block text-gray-800 mb-1">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Username"
                      aria-describedby="username-help"
                    />
                    <p id="username-help" className="text-sm text-gray-800 mt-1">
                      Choose a unique username
                    </p>
                  </div>
                )}
                <div className="mb-4">
                  <label htmlFor="email" className="block text-gray-800 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Email"
                    aria-describedby="email-help"
                  />
                  <p id="email-help" className="text-sm text-gray-800 mt-1">
                    Enter your email address
                  </p>
                </div>
                <div className="mb-6">
                  <label htmlFor="password" className="block text-gray-800 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Password"
                    aria-describedby="password-help"
                  />
                  <p id="password-help" className="text-sm text-gray-800 mt-1">
                    Enter your password
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#207788] border border-[#9CA3AF] text-white px-4 py-2 rounded-md hover:bg-teal-600 disabled:opacity-50"
                  aria-label={isSignUp ? 'Sign up' : 'Log in'}
                >
                  {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}
                </button>
              </form>
              <p className="mt-4 text-center">
                {isSignUp ? 'Already have an account?' : 'Need an account?'}
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="ml-1 underline underline-offset-4"
                  aria-label={isSignUp ? 'Switch to login' : 'Switch to sign up'}
                >
                  {isSignUp ? 'Log In' : 'Sign Up'}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
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
            setIsModalOpen={setIsModalOpen}
          />
          {interpretations.length > 0 && (
            <div className="mt-6 sm:mt-8 max-w-full">
              <h3 className="w-full text-left text-white flex py-4 px-6 bg-gradient-to-r from-teal-50 to-gray-100 dark:from-teal-900 dark:to-gray-800 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-800 transition-colors duration-200">
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
                      setIsModalOpen={setIsModalOpen}
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