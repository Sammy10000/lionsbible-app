'use client';
import { useState, useCallback } from 'react';
import { FaSortAmountUpAlt, FaFlag, FaTrash, FaUser, FaReply, FaChevronDown } from 'react-icons/fa';
import { createClient } from '@/utils/supabase/client';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-toastify';
import sanitizeHtml from 'sanitize-html';
import Replies from './Replies';

interface Reply {
  id: string;
  interpretation_id: string;
  text: string;
  user_id: string;
  username: string | null;
  avatar: string | null;
  created_at: string;
}

interface ReplyCounts {
  reply_id: string;
  upvote_count: number;
  report_count: number;
}

interface InterpretationType {
  id: string;
  interpretation_text: string;
  user_id: string;
  username: string | null;
  avatar: string | null;
}

interface Counts {
  interpretation_id: string;
  reply_count: number;
  upvote_count: number;
  report_count: number;
}

interface Props {
  interpretation: InterpretationType;
  replies: { [key: string]: Reply[] };
  counts: { [key: string]: Counts };
  replyCounts: { [key: string]: ReplyCounts };
  userProfile: { id: string; username: string | null; avatar: string | null } | null;
  verse_id?: string;
  accordionOpen: { [key: string]: boolean };
  setAccordionOpen: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
  setReplies: (fn: (prev: { [key: string]: Reply[] }) => { [key: string]: Reply[] }) => void;
  setCounts: (fn: (prev: { [key: string]: Counts }) => { [key: string]: Counts }) => void;
  setReplyCounts: (fn: (prev: { [key: string]: ReplyCounts }) => { [key: string]: ReplyCounts }) => void;
  setInterpretations: (fn: (prev: InterpretationType[]) => InterpretationType[]) => void;
  renderInterpretationText: (text: string) => (React.ReactElement | string)[];
  className?: string;
}

export default function Interpretation({
  interpretation,
  replies,
  counts,
  replyCounts,
  userProfile,
  verse_id,
  accordionOpen,
  setAccordionOpen,
  setReplies,
  setCounts,
  setReplyCounts,
  setInterpretations,
  renderInterpretationText,
  className,
}: Props) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<'spam' | 'blasphemy' | 'offensive' | ''>('');
  const [reportExplanation, setReportExplanation] = useState('');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentType, setCurrentType] = useState<'interpretation' | 'reply' | null>(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const supabase = createClient();

  const sanitizeInput = (input: string): string => {
    return sanitizeHtml(input, {
      allowedTags: [],
      allowedAttributes: {},
      allowedClasses: {},
      textFilter: (text) => text,
      disallowedTagsMode: 'discard',
    }).trim();
  };

  const isValidText = (input: string): boolean => {
    const codePattern = /[<>{};`'"\\\/]|(\b(function|eval|alert|script|SELECT|INSERT|DELETE|DROP|UNION|EXEC|DECLARE|CREATE|ALTER)\b)/i;
    return !codePattern.test(input);
  };

  const handleUpvoteClick = useCallback(async (id: string, type: 'interpretation' | 'reply') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please log in to upvote', { toastId: 'upvote-login-error', theme: 'light', autoClose: 5000 });
      return;
    }

    if (type === 'interpretation') {
      const { data: existingUpvote } = await supabase
        .from('interpretation_upvotes')
        .select('id')
        .eq('interpretation_id', id)
        .eq('user_id', user.id)
        .single();

      if (existingUpvote) {
        toast.error('You have already upvoted this interpretation', { toastId: 'upvote-duplicate-error', theme: 'light', autoClose: 5000 });
        return;
      }

      await supabase
        .from('interpretation_upvotes')
        .insert({ interpretation_id: id, user_id: user.id });

      const { data: currentCount } = await supabase
        .from('interpretation_counts')
        .select('upvote_count, reply_count, report_count')
        .eq('interpretation_id', id)
        .single();

      const newUpvoteCount = (currentCount?.upvote_count || 0) + 1;
      await supabase
        .from('interpretation_counts')
        .upsert(
          {
            interpretation_id: id,
            upvote_count: newUpvoteCount,
            reply_count: currentCount?.reply_count || 0,
            report_count: currentCount?.report_count || 0,
          },
          { onConflict: 'interpretation_id' }
        );

      setCounts((prev) => ({
        ...prev,
        [id]: {
          interpretation_id: id,
          upvote_count: newUpvoteCount,
          reply_count: prev[id]?.reply_count || 0,
          report_count: prev[id]?.report_count || 0,
        },
      }));
    } else {
      const { data: existingUpvote } = await supabase
        .from('reply_upvotes')
        .select('id')
        .eq('reply_id', id)
        .eq('user_id', user.id)
        .single();

      if (existingUpvote) {
        toast.error('You have already upvoted this reply', { toastId: 'reply-upvote-duplicate-error', theme: 'light', autoClose: 5000 });
        return;
      }

      await supabase
        .from('reply_upvotes')
        .insert({ reply_id: id, user_id: user.id });

      await supabase
        .from('reply_counts')
        .upsert(
          {
            reply_id: id,
            upvote_count: (replyCounts[id]?.upvote_count || 0) + 1,
            report_count: replyCounts[id]?.report_count || 0,
          },
          { onConflict: 'reply_id' }
        );

      setReplyCounts((prev) => ({
        ...prev,
        [id]: {
          reply_id: id,
          upvote_count: (prev[id]?.upvote_count || 0) + 1,
          report_count: prev[id]?.report_count || 0,
        },
      }));
    }
  }, [counts, replyCounts, setCounts, setReplyCounts]);

  const handleReportClick = useCallback((id: string, type: 'interpretation' | 'reply') => {
    setCurrentId(id);
    setCurrentType(type);
    setIsReportModalOpen(true);
  }, []);

  const handleReportSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !reportReason || !currentId || !currentType) {
      toast.error('Please select a report reason', { toastId: 'report-error', theme: 'light', autoClose: 5000 });
      setIsReportModalOpen(false);
      return;
    }

    const sanitizedExplanation = sanitizeInput(reportExplanation);
    if (!isValidText(sanitizedExplanation)) {
      toast.error('Report explanation contains invalid characters or code.', { toastId: 'report-code-error', theme: 'light', autoClose: 5000 });
      return;
    }

    const words = sanitizedExplanation.trim().split(/\s+/).filter((word) => word.length > 0);
    if (words.length > 20) {
      toast.error('Report explanation must be 20 words or less', { toastId: 'report-length-error', theme: 'light', autoClose: 5000 });
      return;
    }

    const table = currentType === 'interpretation' ? 'interpretation_flags' : 'reply_flags';
    const idField = currentType === 'interpretation' ? 'interpretation_id' : 'reply_id';
    const countTable = currentType === 'interpretation' ? 'interpretation_counts' : 'reply_counts';
    const countIdField = currentType === 'interpretation' ? 'interpretation_id' : 'reply_id';

    const { data: existingFlag } = await supabase
      .from(table)
      .select('id')
      .eq(idField, currentId)
      .eq('flagged_by', user.id)
      .single();

    if (existingFlag) {
      toast.error(`You have already reported this ${currentType}`, { toastId: 'report-duplicate-error', theme: 'light', autoClose: 5000 });
      setIsReportModalOpen(false);
      setReportReason('');
      setReportExplanation('');
      setCurrentId(null);
      setCurrentType(null);
      return;
    }

    await supabase
      .from(table)
      .insert({
        [idField]: currentId,
        flagged_by: user.id,
        reason: reportReason,
        explanation: sanitizedExplanation || null,
      });

    if (currentType === 'interpretation') {
      const { data: currentCount } = await supabase
        .from('interpretation_counts')
        .select('report_count, reply_count, upvote_count')
        .eq('interpretation_id', currentId)
        .single();

      const newReportCount = (currentCount?.report_count || 0) + 1;
      await supabase
        .from('interpretation_counts')
        .upsert(
          {
            interpretation_id: currentId,
            report_count: newReportCount,
            reply_count: currentCount?.reply_count || 0,
            upvote_count: currentCount?.upvote_count || 0,
          },
          { onConflict: 'interpretation_id' }
        );

      setCounts((prev) => ({
        ...prev,
        [currentId]: {
          interpretation_id: currentId,
          report_count: newReportCount,
          reply_count: prev[currentId]?.reply_count || 0,
          upvote_count: prev[currentId]?.upvote_count || 0,
        },
      }));

      if (newReportCount >= 10) {
        await supabase
          .from('interpretations')
          .update({ is_deleted: true })
          .eq('id', currentId);

        setInterpretations((prev) => prev.filter((int) => int.id !== currentId));
      }
    } else {
      const { data: currentCount } = await supabase
        .from('reply_counts')
        .select('report_count, upvote_count')
        .eq('reply_id', currentId)
        .single();

      const newReportCount = (currentCount?.report_count || 0) + 1;
      await supabase
        .from('reply_counts')
        .upsert(
          {
            reply_id: currentId,
            report_count: newReportCount,
            upvote_count: currentCount?.upvote_count || 0,
          },
          { onConflict: 'reply_id' }
        );

      setReplyCounts((prev) => ({
        ...prev,
        [currentId]: {
          reply_id: currentId,
          report_count: newReportCount,
          upvote_count: prev[currentId]?.upvote_count || 0,
        },
      }));

      if (newReportCount >= 5) {
        await supabase
          .from('replies')
          .update({ is_hidden: true })
          .eq('id', currentId);

        setReplies((prev) => ({
          ...prev,
          [interpretation.id]: prev[interpretation.id]?.filter((reply) => reply.id !== currentId) || [],
        }));
      }
    }

    setIsReportModalOpen(false);
    setReportReason('');
    setReportExplanation('');
    setCurrentId(null);
    setCurrentType(null);
  }, [currentId, currentType, reportReason, reportExplanation, counts, replyCounts, setCounts, setReplyCounts, setInterpretations, setReplies, interpretation.id]);

  const handleDeleteInterpretation = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== interpretation.user_id) {
      toast.error('You are not authorized to delete this interpretation', { toastId: 'delete-auth-error', theme: 'light', autoClose: 5000 });
      return;
    }

    await supabase
      .from('interpretations')
      .update({ is_deleted: true })
      .eq('id', interpretation.id)
      .eq('user_id', user.id);

    setInterpretations((prev) => prev.filter((int) => int.id !== interpretation.id));
    setReplies((prev) => {
      const newReplies = { ...prev };
      delete newReplies[interpretation.id];
      return newReplies;
    });
    setCounts((prev) => {
      const newCounts = { ...prev };
      delete newCounts[interpretation.id];
      return newCounts;
    });
  }, [interpretation.id, interpretation.user_id, setInterpretations, setReplies, setCounts]);

  const handleReplyClick = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please log in to reply', { toastId: 'reply-login-error', theme: 'light', autoClose: 5000 });
      return;
    }
    setIsReplyModalOpen(true);
  }, []);

  const handleReplySubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !replyText.trim()) {
      toast.error('Reply cannot be empty', { toastId: 'reply-empty-error', theme: 'light', autoClose: 5000 });
      return;
    }

    const sanitizedReplyText = sanitizeInput(replyText);
    if (!isValidText(sanitizedReplyText)) {
      toast.error('Reply contains invalid characters or code.', { toastId: 'reply-code-error', theme: 'light', autoClose: 5000 });
      return;
    }

    let finalVerseId = verse_id;
    if (!finalVerseId) {
      const { data: interpretationData } = await supabase
        .from('interpretations')
        .select('verse_id')
        .eq('id', interpretation.id)
        .single();

      if (!interpretationData) {
        toast.error('Failed to submit reply', { toastId: 'reply-fail-error', theme: 'light', autoClose: 5000 });
        return;
      }
      finalVerseId = interpretationData.verse_id;
    }

    const { data: replyData } = await supabase
      .from('replies')
      .insert({
        interpretation_id: interpretation.id,
        verse_id: finalVerseId,
        user_id: user.id,
        text: sanitizedReplyText,
        is_hidden: false,
      })
      .select('id, interpretation_id, text, user_id, created_at')
      .single();

    if (replyData) {
      const newReply: Reply = {
        id: replyData.id,
        interpretation_id: replyData.interpretation_id,
        text: sanitizedReplyText,
        user_id: user.id,
        username: userProfile?.username || 'Anonymous',
        avatar: userProfile?.avatar || null,
        created_at: replyData.created_at,
      };

      setReplies((prev) => ({
        ...prev,
        [interpretation.id]: [...(prev[interpretation.id] || []), newReply].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      }));

      const { data: currentCount } = await supabase
        .from('interpretation_counts')
        .select('reply_count, upvote_count, report_count')
        .eq('interpretation_id', interpretation.id)
        .single();

      const newReplyCount = (currentCount?.reply_count || 0) + 1;
      await supabase
        .from('interpretation_counts')
        .upsert(
          {
            interpretation_id: interpretation.id,
            reply_count: newReplyCount,
            upvote_count: currentCount?.upvote_count || 0,
            report_count: currentCount?.report_count || 0,
          },
          { onConflict: 'interpretation_id' }
        );

      setCounts((prev) => ({
        ...prev,
        [interpretation.id]: {
          interpretation_id: interpretation.id,
          reply_count: newReplyCount,
          upvote_count: prev[interpretation.id]?.upvote_count || 0,
          report_count: prev[interpretation.id]?.report_count || 0,
        },
      }));
    }

    setReplyText('');
    setIsReplyModalOpen(false);
  }, [verse_id, replyText, interpretation.id, counts, setReplies, setCounts, userProfile]);

  return (
    <div className={`flex flex-col sm:flex-row items-start space-x-0 sm:space-x-2 space-y-2 sm:space-y-0 max-w-full ${className}`}>
      <div className="flex-shrink-0">
        {interpretation.avatar ? (
          <img
            src={interpretation.avatar}
            alt={`${interpretation.username || 'User'}'s avatar`}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-teal-500 object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling!.style.display = 'flex';
            }}
          />
        ) : (
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-teal-500 flex items-center justify-center bg-gray-200">
            <FaUser className="text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
      </div>
      <div className="flex-1 w-full max-w-full">
        <p className="font-semibold text-gray-800 text-sm sm:text-base break-words">{interpretation.username || 'Anonymous'}</p>
        <p className="text-gray-600 mb-2 sm:mb-4 text-sm sm:text-base break-words">{renderInterpretationText(interpretation.interpretation_text)}</p>
        <div className="flex flex-col sm:flex-row sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex space-x-2 items-center flex-wrap">
            <div className="flex items-center">
              <button
                onClick={() => handleUpvoteClick(interpretation.id, 'interpretation')}
                className="text-gray-400 hover:text-teal-500"
                aria-label="Upvote interpretation"
                title="Upvote"
              >
                <FaSortAmountUpAlt className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <span className="ml-1 text-sm text-gray-600">{counts[interpretation.id]?.upvote_count || 0}</span>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleReplyClick}
                className="text-gray-400 hover:text-teal-500"
                aria-label="Reply to interpretation"
                title="Reply"
              >
                <FaReply className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <span className="ml-1 text-sm text-gray-600">{counts[interpretation.id]?.reply_count || 0}</span>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => handleReportClick(interpretation.id, 'interpretation')}
                className="text-gray-400 hover:text-red-500"
                aria-label="Report interpretation"
                title="Report"
              >
                <FaFlag className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <span className="ml-1 text-sm text-gray-600">{counts[interpretation.id]?.report_count || 0}</span>
            </div>
            {userProfile?.id === interpretation.user_id && (
              <div className="flex items-center">
                <button
                  onClick={handleDeleteInterpretation}
                  className="text-gray-400 hover:text-red-500"
                  aria-label="Delete interpretation"
                  title="Delete"
                >
                  <FaTrash className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            )}
          </div>
        </div>
        <Replies
          interpretationId={interpretation.id}
          replies={replies[interpretation.id] || []}
          replyCounts={replyCounts}
          userProfile={userProfile}
          accordionOpen={accordionOpen[interpretation.id] || false}
          setAccordionOpen={(id, open) => setAccordionOpen((prev) => ({ ...prev, [id]: open }))}
          handleUpvoteClick={handleUpvoteClick}
          handleReportClick={handleReportClick}
          setReplies={setReplies}
          setCounts={setCounts}
          counts={counts}
        />
        <button
          onClick={handleReplyClick}
          className="text-gray-400 hover:text-teal-500 mt-2 flex items-center text-sm"
          aria-label="Reply this interpretation"
          title="Reply"
        >
          <FaReply className="w-4 h-4 sm:w-5 sm:h-5 mr-1" /> Reply
        </button>
      </div>
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm mx-2 sm:max-w-md sm:mx-4">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Report</h3>
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-600 text-sm">Reason</label>
                <div className="space-y-2">
                  {['spam', 'blasphemy', 'offensive'].map((reason) => (
                    <label key={reason} className="flex items-center text-sm">
                      <input
                        type="radio"
                        name="report-reason"
                        value={reason}
                        checked={reportReason === reason}
                        onChange={(e) => setReportReason(e.target.value as 'spam' | 'blasphemy' | 'offensive')}
                        className="mr-2"
                        aria-label={`Report as ${reason}`}
                      />
                      {reason.charAt(0).toUpperCase() + reason.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="report-explanation" className="block text-gray-600 text-sm">Explanation (optional, max 20 words)</label>
                <textarea
                  id="report-explanation"
                  value={reportExplanation}
                  onChange={(e) => setReportExplanation(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  rows={2}
                  aria-label="Report explanation"
                />
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="bg-teal-600 text-white px-4 py-2 rounded-md text-sm">Submit</button>
                <button
                  type="button"
                  onClick={() => {
                    setIsReportModalOpen(false);
                    setReportReason('');
                    setReportExplanation('');
                    setCurrentId(null);
                    setCurrentType(null);
                  }}
                  className="bg-gray-300 text-gray-600 px-4 py-2 rounded-md text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Transition appear show={isReplyModalOpen} as="div">
        <Dialog as="div" className="relative z-50" onClose={() => setIsReplyModalOpen(false)}>
          <Transition.Child
            as="div"
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as="div"
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
               <Dialog.Panel className="w-[100%] bg-white p-6 rounded-lg shadow-xl">
                <Dialog.Title as="h3" className="text-lg font-bold text-gray-900">Add Reply</Dialog.Title>
                <form onSubmit={handleReplySubmit} className="mt-4 space-y-4">
                    <div>
                    <label htmlFor="reply-text" className="block text-sm font-semibold text-gray-600">Your Reply</label>
                    <textarea
                        id="reply-text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="mt-1 w-full p-2 border rounded-md text-sm"
                        rows={4}
                        aria-label="Reply text"
                    />
                    </div>
                    <div className="flex space-x-4 justify-end">
                    <button type="submit" className="bg-teal-600 text-white px-4 py-2 rounded-md text-sm">Submit</button>
                    <button
                        type="button"
                        onClick={() => {
                        setIsReplyModalOpen(false);
                        setReplyText('');
                        }}
                        className="bg-gray-300 text-gray-600 px-4 py-2 rounded-md text-sm"
                    >
                        Cancel
                    </button>
                    </div>
                </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}