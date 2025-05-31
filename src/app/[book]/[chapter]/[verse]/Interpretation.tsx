// src/components/Interpretation.tsx
'use client';
import { useState, useCallback, useEffect } from 'react';
import { FaSortAmountUpAlt, FaFlag, FaTrash, FaUser, FaReply } from 'react-icons/fa';
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
  setIsModalOpen: (open: boolean) => void;
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
  setIsModalOpen,
}: Props) {
  if (!interpretation || !interpretation.id) {
    console.error('Invalid or missing interpretation prop:', interpretation);
    return <div>Error: Missing interpretation data</div>;
  }
  if (!replies || !counts || !replyCounts || !setReplies || !setCounts || !setReplyCounts || !setInterpretations || !renderInterpretationText) {
    console.error('Missing required props:', { replies, counts, replyCounts, setReplies, setCounts, setReplyCounts, setInterpretations, renderInterpretationText });
    return <div>Error: Missing required props</div>;
  }

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<'spam' | 'blasphemy' | 'offensive' | ''>('');
  const [reportExplanation, setReportExplanation] = useState('');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentType, setCurrentType] = useState<'interpretation' | 'reply' | null>(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [canDeleteInterpretation, setCanDeleteInterpretation] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkOwnership = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const canDelete = user && interpretation.user_id && user.id === interpretation.user_id;
      setCanDeleteInterpretation(canDelete);
      console.log('Interpretation ownership check:', {
        userId: user?.id,
        interpretationId: interpretation.id,
        interpretationUserId: interpretation.user_id,
        canDelete,
      });
    };
    checkOwnership();
  }, [interpretation.user_id, interpretation.id, supabase]);

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
    const codePattern = /(<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|\b(function|eval|alert|script|SELECT|INSERT|DELETE|DROP|UNION|EXEC|DECLARE|CREATE|ALTER)\b)/i;
    return !codePattern.test(input);
  };

  const handleUpvoteClick = useCallback(async (id: string, type: 'interpretation' | 'reply') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsModalOpen(true);
        toast.info('Please log in to upvote', { toastId: 'upvote-login', theme: 'light', autoClose: 3000 });
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
    } catch (error) {
      console.error('Error in handleUpvoteClick:', error);
      toast.error('Failed to upvote', { toastId: 'upvote-error', theme: 'light', autoClose: 5000 });
    }
  }, [counts, replyCounts, setCounts, setReplyCounts, supabase, setIsModalOpen]);

  const handleReportClick = useCallback((id: string, type: 'interpretation' | 'reply') => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsModalOpen(true);
        toast.info('Please log in to report', { toastId: 'report-login', theme: 'light', autoClose: 3000 });
        return;
      }
      setCurrentId(id);
      setCurrentType(type);
      setIsReportModalOpen(true);
    };
    checkUser();
  }, [setIsModalOpen, supabase]);

  const handleReportSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
            .update({ is_hidden: true })
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
    } catch (error) {
      console.error('Error in handleReportSubmit:', error);
      toast.error('Failed to submit report', { toastId: 'report-fail-error', theme: 'light', autoClose: 5000 });
    }
  }, [currentId, currentType, reportReason, reportExplanation, counts, replyCounts, setCounts, setReplyCounts, setInterpretations, setReplies, interpretation.id, supabase]);

  const handleDeleteInterpretation = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setIsModalOpen(true);
        toast.info('Please log in to delete this interpretation', { toastId: 'delete-interpretation-login', theme: 'light', autoClose: 3000 });
        return;
      }

      if (user.id !== interpretation.user_id) {
        toast.error('You are not authorized to delete this interpretation', {
          toastId: 'delete-interpretation-auth-error',
          theme: 'light',
          autoClose: 5000,
        });
        return;
      }

      if (!window.confirm('Are you sure you want to delete this interpretation?')) {
        return;
      }

      const { error } = await supabase
        .from('interpretations')
        .update({ is_hidden: true })
        .eq('id', interpretation.id)
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to delete interpretation', {
          toastId: 'delete-interpretation-fail-error',
          theme: 'light',
          autoClose: 5000,
        });
        console.error('Delete interpretation error:', error);
        return;
      }

      setInterpretations((prev) => prev.filter((item) => item.id !== interpretation.id));

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

      setReplyCounts((prev) => {
        const newReplyCounts = { ...prev };
        replies[interpretation.id]?.forEach((reply) => {
          delete newReplyCounts[reply.id];
        });
        return newReplyCounts;
      });

      toast.success('Interpretation deleted', {
        toastId: 'delete-interpretation-success',
        theme: 'light',
        autoClose: 5000,
      });
    } catch (error) {
      console.error('Error in handleDeleteInterpretation:', error);
      toast.error('Failed to delete interpretation', { toastId: 'delete-interpretation-error', theme: 'light', autoClose: 5000 });
      setIsModalOpen(true);
    }
  }, [interpretation, setInterpretations, setReplies, setCounts, setReplyCounts, replies, supabase, setIsModalOpen]);

  const handleReplyClick = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsModalOpen(true);
        toast.info('Please log in to reply', { toastId: 'reply-login', theme: 'light', autoClose: 3000 });
        return;
      }
      setIsReplyModalOpen(true);
    } catch (error) {
      console.error('Error in handleReplyClick:', error);
      toast.error('Failed to open reply modal', { toastId: 'reply-modal-error', theme: 'light', autoClose: 5000 });
    }
  }, [supabase, setIsModalOpen]);

  const handleReplySubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !replyText.trim()) {
        if (!user) {
          setIsModalOpen(true);
          toast.info('Please log in to submit a reply', { toastId: 'reply-submit-login', theme: 'light', autoClose: 3000 });
          return;
        }
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
      toast.success('Reply submitted', { toastId: 'reply-submit-success', theme: 'light', autoClose: 5000 });
    } catch (error) {
      console.error('Error in handleReplySubmit:', error);
      toast.error('Failed to submit reply', { toastId: 'reply-submit-error', theme: 'light', autoClose: 5000 });
    }
  }, [verse_id, replyText, interpretation.id, counts, setReplies, setCounts, userProfile, supabase, setIsModalOpen]);

  // Remove handleInterpretationSubmit as it's not used
  // const handleInterpretationSubmit = ... (commented out or removed)

  return (
    <div className={`flex flex-col sm:flex-row items-start space-x-0 sm:space-x-2 space-y-2 sm:space-y-0 max-w-full ${className || ''}`}>
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
            {canDeleteInterpretation && (
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
        {replies[interpretation.id] && (
          <Replies
            interpretationId={interpretation.id}
            replies={replies[interpretation.id] || []}
            replyCounts={replyCounts}
            userProfile={userProfile}
            accordionOpen={accordionOpen} // Pass full object
            setAccordionOpen={setAccordionOpen} // Pass setter
            handleUpvoteClick={handleUpvoteClick}
            handleReportClick={handleReportClick}
            setReplies={setReplies}
            setCounts={setCounts}
            counts={counts}
            setIsModalOpen={setIsModalOpen}
          />
        )}
        <button
          onClick={handleReplyClick}
          className="text-white hover:text-white mt-5 flex items-center bg-teal-700 p-2 rounded text-sm"
          aria-label="Reply to this interpretation"
          title="Reply"
        >
          <FaReply className="w-4 h-4 sm:w-5 sm:h-5 mr-1" /> Reply
        </button>
      </div>
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-full sm:max-w-md sm:mx-4">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Report</h3>
            <form onSubmit={handleReportSubmit} className="space-y-4 sm:space-y-4">
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
                enter="ease-in-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md mx-auto bg-white p-6 rounded-lg shadow-xl">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">Add Reply</Dialog.Title>
                  <form onSubmit={handleReplySubmit} className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="reply-text" className="block text-sm font-semibold text-gray-600">Your Reply</label>
                      <textarea
                        id="reply-text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full p-2 mt-1 border rounded-md text-sm"
                        rows={4}
                        aria-label="Reply text"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-md text-sm">Submit</button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsReplyModalOpen(false);
                          setReplyText('');
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-600 rounded-md text-sm"
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