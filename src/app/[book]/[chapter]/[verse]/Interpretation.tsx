'use client';
import { useState, useCallback } from 'react';
import { FaSortAmountUpAlt, FaFlag, FaTrash, FaUser, FaReply, FaChevronDown } from 'react-icons/fa';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-toastify';
import { Dialog, Transition } from '@headlessui/react';

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
}: Props) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<'spam' | 'blasphemy' | 'offensive' | ''>('');
  const [reportExplanation, setReportExplanation] = useState('');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentType, setCurrentType] = useState<'interpretation' | 'reply' | null>(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const supabase = createClient();

  const handleUpvoteClick = useCallback(async (id: string, type: 'interpretation' | 'reply') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (!toast.isActive(`upvote-auth-${id}`)) {
        toast.error('Please log in to upvote.', { id: `upvote-auth-${id}`, theme: 'light', autoClose: 3000 });
      }
      return;
    }

    if (type === 'interpretation') {
      const { data: existingUpvote, error: checkError } = await supabase
        .from('interpretation_upvotes')
        .select('id')
        .eq('interpretation_id', id)
        .eq('user_id', user.id)
        .single();

      if (existingUpvote) {
        if (!toast.isActive(`upvote-exists-${id}`)) {
          toast.info('You have already upvoted this interpretation.', { id: `upvote-exists-${id}`, theme: 'light', autoClose: 3000 });
        }
        return;
      }

      if (checkError && checkError.code !== 'PGRST116') {
        if (!toast.isActive(`upvote-check-${id}`)) {
          toast.error(`Failed to check upvote: ${checkError.message}`, { id: `upvote-check-${id}`, theme: 'light', autoClose: 5000 });
        }
        return;
      }

      const { error: upvoteError } = await supabase
        .from('interpretation_upvotes')
        .insert({ interpretation_id: id, user_id: user.id });

      if (upvoteError) {
        if (!toast.isActive(`upvote-insert-${id}`)) {
          toast.error(`Failed to record upvote: ${upvoteError.message}`, { id: `upvote-insert-${id}`, theme: 'light', autoClose: 5000 });
        }
        return;
      }

      const { error: countError } = await supabase
        .from('interpretation_counts')
        .upsert(
          {
            interpretation_id: id,
            reply_count: counts[id]?.reply_count || 0,
            upvote_count: (counts[id]?.upvote_count || 0) + 1,
            report_count: counts[id]?.report_count || 0,
          },
          { onConflict: 'interpretation_id' }
        );

      if (countError) {
        if (!toast.isActive(`upvote-count-${id}`)) {
          toast.error(`Failed to update upvote count: ${countError.message}`, { id: `upvote-count-${id}`, theme: 'light', autoClose: 5000 });
        }
        return;
      }

      setCounts((prev) => ({
        ...prev,
        [id]: {
          interpretation_id: id,
          reply_count: prev[id]?.reply_count || 0,
          upvote_count: (prev[id]?.upvote_count || 0) + 1,
          report_count: prev[id]?.report_count || 0,
        },
      }));
    } else {
      const { data: existingUpvote, error: checkError } = await supabase
        .from('reply_upvotes')
        .select('id')
        .eq('reply_id', id)
        .eq('user_id', user.id)
        .single();

      if (existingUpvote) {
        if (!toast.isActive(`upvote-exists-${id}`)) {
          toast.info('You have already upvoted this reply.', { id: `upvote-exists-${id}`, theme: 'light', autoClose: 3000 });
        }
        return;
      }

      if (checkError && checkError.code !== 'PGRST116') {
        if (!toast.isActive(`upvote-check-${id}`)) {
          toast.error(`Failed to check upvote: ${checkError.message}`, { id: `upvote-check-${id}`, theme: 'light', autoClose: 5000 });
        }
        return;
      }

      const { error: upvoteError } = await supabase
        .from('reply_upvotes')
        .insert({ reply_id: id, user_id: user.id });

      if (upvoteError) {
        if (!toast.isActive(`upvote-insert-${id}`)) {
          toast.error(`Failed to record upvote: ${upvoteError.message}`, { id: `upvote-insert-${id}`, theme: 'light', autoClose: 5000 });
        }
        return;
      }

      const { error: countError } = await supabase
        .from('reply_counts')
        .upsert(
          {
            reply_id: id,
            upvote_count: (replyCounts[id]?.upvote_count || 0) + 1,
            report_count: replyCounts[id]?.report_count || 0,
          },
          { onConflict: 'reply_id' }
        );

      if (countError) {
        if (!toast.isActive(`upvote-count-${id}`)) {
          toast.error(`Failed to update upvote count: ${countError.message}`, { id: `upvote-count-${id}`, theme: 'light', autoClose: 5000 });
        }
        return;
      }

      setReplyCounts((prev) => ({
        ...prev,
        [id]: {
          reply_id: id,
          upvote_count: (prev[id]?.upvote_count || 0) + 1,
          report_count: prev[id]?.report_count || 0,
        },
      }));
    }

    if (!toast.isActive(`upvote-success-${id}`)) {
      toast.success('Upvote submitted!', { id: `upvote-success-${id}`, theme: 'light', autoClose: 3000 });
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
    if (!user) {
      if (!toast.isActive('report-auth')) {
        toast.error('Please log in to report.', { id: 'report-auth', theme: 'light', autoClose: 3000 });
      }
      setIsReportModalOpen(false);
      return;
    }

    if (!reportReason) {
      if (!toast.isActive('report-reason')) {
        toast.error('Please select a reason.', { id: 'report-reason', theme: 'light', autoClose: 3000 });
      }
      return;
    }

    const words = reportExplanation.trim().split(/\s+/).filter((word) => word.length > 0);
    if (words.length > 20) {
      if (!toast.isActive('report-explanation')) {
        toast.error('Explanation cannot exceed 20 words.', { id: 'report-explanation', theme: 'light', autoClose: 3000 });
      }
      return;
    }

    if (!currentId || !currentType) {
      if (!toast.isActive('report-target')) {
        toast.error('Invalid report target.', { id: 'report-target', theme: 'light', autoClose: 3000 });
      }
      return;
    }

    const table = currentType === 'interpretation' ? 'interpretation_flags' : 'reply_flags';
    const idField = currentType === 'interpretation' ? 'interpretation_id' : 'reply_id';

    const { error: flagError } = await supabase
      .from(table)
      .insert({
        [idField]: currentId,
        flagged_by: user.id,
        reason: reportReason,
        explanation: reportExplanation || null,
      });

    if (flagError) {
      if (flagError.code === '23505') {
        if (!toast.isActive(`report-exists-${currentId}`)) {
          toast.info('You have already reported this item.', { id: `report-exists-${currentId}`, theme: 'light', autoClose: 3000 });
        }
      } else {
        if (!toast.isActive(`report-error-${currentId}`)) {
          toast.error(`Failed to submit report: ${flagError.message}`, { id: `report-error-${currentId}`, theme: 'light', autoClose: 5000 });
        }
      }
      setIsReportModalOpen(false);
      return;
    }

    let newReportCount: number;
    if (currentType === 'interpretation') {
      newReportCount = (counts[currentId]?.report_count || 0) + 1;
      const { error: countError } = await supabase
        .from('interpretation_counts')
        .upsert(
          {
            interpretation_id: currentId,
            reply_count: counts[currentId]?.reply_count || 0,
            upvote_count: counts[currentId]?.upvote_count || 0,
            report_count: newReportCount,
          },
          { onConflict: 'interpretation_id' }
        );

      if (countError) {
        if (!toast.isActive(`report-count-${currentId}`)) {
          toast.error(`Failed to update report count: ${countError.message}`, { id: `report-count-${currentId}`, theme: 'light', autoClose: 5000 });
        }
        setIsReportModalOpen(false);
        return;
      }

      setCounts((prev) => ({
        ...prev,
        [currentId]: {
          interpretation_id: currentId,
          reply_count: prev[currentId]?.reply_count || 0,
          upvote_count: prev[currentId]?.upvote_count || 0,
          report_count: newReportCount,
        },
      }));

      if (newReportCount >= 10) {
        const { error: hideError } = await supabase
          .from('interpretations')
          .update({ is_deleted: true })
          .eq('id', currentId);

        if (hideError) {
          if (!toast.isActive(`hide-${currentId}`)) {
            toast.error(`Failed to hide interpretation: ${hideError.message}`, { id: `hide-${currentId}`, theme: 'light', autoClose: 5000 });
          }
        } else {
          setInterpretations((prev) => prev.filter((int) => int.id !== currentId));
          if (!toast.isActive(`hide-success-${currentId}`)) {
            toast.success('Interpretation hidden due to reports.', { id: `hide-success-${currentId}`, theme: 'light', autoClose: 3000 });
          }
        }
      }
    } else {
      newReportCount = (replyCounts[currentId]?.report_count || 0) + 1;
      const { error: countError } = await supabase
        .from('reply_counts')
        .upsert(
          {
            reply_id: currentId,
            upvote_count: replyCounts[currentId]?.upvote_count || 0,
            report_count: newReportCount,
          },
          { onConflict: 'reply_id' }
        );

      if (countError) {
        if (!toast.isActive(`reply-report-${currentId}`)) {
          toast.error(`Failed to update reply report count: ${countError.message}`, { id: `reply-report-${currentId}`, theme: 'light', autoClose: 5000 });
        }
        setIsReportModalOpen(false);
        return;
      }

      setReplyCounts((prev) => ({
        ...prev,
        [currentId]: {
          reply_id: currentId,
          upvote_count: prev[currentId]?.upvote_count || 0,
          report_count: newReportCount,
        },
      }));

      if (newReportCount >= 5) {
        const { error: hideError } = await supabase
          .from('replies')
          .update({ is_deleted: true })
          .eq('id', currentId);

        if (hideError) {
          if (!toast.isActive(`reply-hide-${currentId}`)) {
            toast.error(`Failed to hide reply: ${hideError.message}`, { id: `reply-hide-${currentId}`, theme: 'light', autoClose: 5000 });
          }
        } else {
          setReplies((prev) => ({
            ...prev,
            [interpretation.id]: prev[interpretation.id]?.filter((reply) => reply.id !== currentId) || [],
          }));
          if (!toast.isActive(`reply-hidden-${currentId}`)) {
            toast.success('Reply hidden due to reports.', { id: `reply-hidden-${currentId}`, theme: 'light', autoClose: 3000 });
          }
        }
      }
    }

    setIsReportModalOpen(false);
    setReportReason('');
    setReportExplanation('');
    setCurrentId(null);
    setCurrentType(null);

    if (!toast.isActive(`report-success-${currentId || 'generic'}`)) {
      toast.success('Report submitted!', { id: `report-success-${currentId || 'generic'}`, theme: 'light', autoClose: 3000 });
    }
  }, [currentId, currentType, reportReason, reportExplanation, counts, replyCounts, setCounts, setReplyCounts, setInterpretations, setReplies, interpretation.id]);

  const handleDeleteInterpretation = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (!toast.isActive(`delete-auth-${interpretation.id}`)) {
        toast.error('Please log in to delete.', { id: `delete-auth-${interpretation.id}`, theme: 'light', autoClose: 3000 });
      }
      return;
    }

    if (user.id !== interpretation.user_id) {
      if (!toast.isActive(`delete-perm-${interpretation.id}`)) {
        toast.error('You can only delete your own interpretation.', { id: `delete-perm-${interpretation.id}`, theme: 'light', autoClose: 3000 });
      }
      return;
    }

    const { error } = await supabase
      .from('interpretations')
      .update({ is_deleted: true })
      .eq('id', interpretation.id)
      .eq('user_id', user.id);

    if (error) {
      if (!toast.isActive(`delete-error-${interpretation.id}`)) {
        toast.error(`Failed to delete: ${error.message}`, { id: `delete-error-${interpretation.id}`, theme: 'light', autoClose: 5000 });
      }
      return;
    }

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

    if (!toast.isActive(`delete-success-${interpretation.id}`)) {
      toast.success('Interpretation deleted.', { id: `delete-success-${interpretation.id}`, theme: 'light', autoClose: 3000 });
    }
  }, [interpretation.id, interpretation.user_id, setInterpretations, setReplies, setCounts]);

  const handleReplyClick = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (!toast.isActive('reply-auth')) {
        toast.error('Please log in to reply.', { id: 'reply-auth', theme: 'light', autoClose: 3000 });
      }
      return;
    }
    setIsReplyModalOpen(true);
  }, []);

  const handleReplySubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (!toast.isActive('reply-auth')) {
        toast.error('Please log in to reply.', { id: 'reply-auth', theme: 'light', autoClose: 3000 });
      }
      return;
    }

    if (!replyText.trim()) {
      if (!toast.isActive('reply-empty')) {
        toast.error('Reply cannot be empty.', { id: 'reply-empty', theme: 'light', autoClose: 3000 });
      }
      return;
    }

    let finalVerseId = verse_id;
    if (!finalVerseId) {
      const { data: interpretationData, error: fetchError } = await supabase
        .from('interpretations')
        .select('verse_id')
        .eq('id', interpretation.id)
        .single();

      if (fetchError || !interpretationData) {
        if (!toast.isActive('verse-fetch')) {
          toast.error('Failed to fetch verse ID.', { id: 'verse-fetch', theme: 'light', autoClose: 3000 });
        }
        return;
      }

      finalVerseId = interpretationData.verse_id;
    }

    const { data: replyData, error: replyError } = await supabase
      .from('replies')
      .insert({
        interpretation_id: interpretation.id,
        verse_id: finalVerseId,
        user_id: user.id,
        text: replyText,
        is_hidden: false,
      })
      .select('id, interpretation_id, text, user_id, created_at')
      .single();

    if (replyError) {
      if (!toast.isActive('reply-submit')) {
        toast.error(`Failed to submit reply: ${replyError.message}`, { id: 'reply-submit', theme: 'light', autoClose: 5000 });
      }
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar')
      .eq('id', user.id)
      .single();

    const newReply: Reply = {
      id: replyData.id,
      interpretation_id: replyData.interpretation_id,
      text: replyData.text,
      user_id: user.id,
      username: profile?.username || 'Anonymous',
      avatar: profile?.avatar || null,
      created_at: replyData.created_at,
    };

    setReplies((prev) => ({
      ...prev,
      [interpretation.id]: [...(prev[interpretation.id] || []), newReply].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }));

    const { error: countError } = await supabase
      .from('interpretation_counts')
      .upsert(
        {
          interpretation_id: interpretation.id,
          reply_count: (counts[interpretation.id]?.reply_count || 0) + 1,
          upvote_count: counts[interpretation.id]?.upvote_count || 0,
          report_count: counts[interpretation.id]?.report_count || 0,
        },
        { onConflict: 'interpretation_id' }
      );

    if (countError) {
      if (!toast.isActive('reply-count')) {
        toast.error(`Failed to update reply count: ${countError.message}`, { id: 'reply-count', theme: 'light', autoClose: 5000 });
      }
      return;
    }

    setCounts((prev) => ({
      ...prev,
      [interpretation.id]: {
        interpretation_id: interpretation.id,
        reply_count: (prev[interpretation.id]?.reply_count || 0) + 1,
        upvote_count: prev[interpretation.id]?.upvote_count || 0,
        report_count: prev[interpretation.id]?.report_count || 0,
      },
    }));

    setReplyText('');
    setIsReplyModalOpen(false);

    if (!toast.isActive(`reply-success-${replyData.id}`)) {
      toast.success('Reply submitted!', { id: `reply-success-${replyData.id}`, theme: 'light', autoClose: 3000 });
    }
  }, [verse_id, replyText, interpretation.id, counts, setReplies, setCounts]);

  const handleDeleteReply = useCallback(async (replyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (!toast.isActive(`delete-reply-auth-${replyId}`)) {
        toast.error('Please log in to delete.', { id: `delete-reply-auth-${replyId}`, theme: 'light', autoClose: 3000 });
      }
      return;
    }

    const reply = replies[interpretation.id]?.find((r) => r.id === replyId);
    if (!reply || user.id !== reply.user_id) {
      if (!toast.isActive(`delete-reply-perm-${replyId}`)) {
        toast.error('You can only delete your own reply.', { id: `delete-reply-perm-${replyId}`, theme: 'light', autoClose: 3000 });
      }
      return;
    }

    const { error } = await supabase
      .from('replies')
      .update({ is_deleted: true })
      .eq('id', replyId)
      .eq('user_id', user.id);

    if (error) {
      if (!toast.isActive(`delete-reply-${replyId}`)) {
        toast.error(`Failed to delete reply: ${error.message}`, { id: `delete-reply-${replyId}`, theme: 'light', autoClose: 5000 });
      }
      return;
    }

    setReplies((prev) => ({
      ...prev,
      [interpretation.id]: prev[interpretation.id]?.filter((r) => r.id !== replyId) || [],
    }));

    const { error: countError } = await supabase
      .from('interpretation_counts')
      .upsert(
        {
          interpretation_id: interpretation.id,
          reply_count: (counts[interpretation.id]?.reply_count || 1) - 1,
          upvote_count: counts[interpretation.id]?.upvote_count || 0,
          report_count: counts[interpretation.id]?.report_count || 0,
        },
        { onConflict: 'interpretation_id' }
      );

    if (countError) {
      if (!toast.isActive(`reply-count-${replyId}`)) {
        toast.error(`Failed to update reply count: ${countError.message}`, { id: `reply-count-${replyId}`, theme: 'light', autoClose: 5000 });
      }
      return;
    }

    setCounts((prev) => ({
      ...prev,
      [interpretation.id]: {
        interpretation_id: interpretation.id,
        reply_count: (prev[interpretation.id]?.reply_count || 1) - 1,
        upvote_count: prev[interpretation.id]?.upvote_count || 0,
        report_count: prev[interpretation.id]?.report_count || 0,
      },
    }));

    if (!toast.isActive(`delete-reply-success-${replyId}`)) {
      toast.success('Reply deleted.', { id: `delete-reply-success-${replyId}`, theme: 'light', autoClose: 3000 });
    }
  }, [interpretation.id, replies, counts, setReplies, setCounts]);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start space-x-0 sm:space-x-2 space-y-2 sm:space-y-0 max-w-full overflow-x-hidden">
        <div className="flex-shrink-0">
          {interpretation.avatar ? (
            <img
              src={interpretation.avatar}
              alt={`${interpretation.username || 'User'}'s avatar`}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-teal-500 object-cover max-w-full"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling!.style.display = 'flex';
              }}
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-teal-500 flex items-center justify-center bg-gray-200">
              <FaUser className="text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          )}
        </div>
        <div className="flex-1 w-full max-w-full overflow-x-hidden">
          <p className="font-semibold text-gray-800 text-sm sm:text-base break-words">{interpretation.username || 'Anonymous'}</p>
          <p className="text-gray-600 mb-2 sm:mb-4 text-sm sm:text-base break-words interpretation-text code-text max-w-full overflow-x-hidden">{renderInterpretationText(interpretation.interpretation_text)}</p>
          <div className="flex flex-col sm:flex-row sm:justify-between space-y-2 sm:space-y-0 max-w-full overflow-x-hidden">
            <div className="flex space-x-2 items-center flex-wrap">
              <div className="flex items-center">
                <button
                  onClick={() => handleUpvoteClick(interpretation.id, 'interpretation')}
                  className="text-gray-400 hover:text-teal-500"
                  aria-label="Upvote interpretation"
                  title="Upvote"
                >
                  <FaSortAmountUpAlt className="w-4 h-4 sm:w-5 sm:h-5" />
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
                  <FaReply className="w-4 h-4 sm:w-5 sm:h-5" />
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
                  <FaFlag className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <span className="ml-1 text-sm text-gray-600">{counts[interpretation.id]?.report_count || 0}</span>
              </div>
              {userProfile && userProfile.id === interpretation.user_id && (
                <div className="flex items-center">
                  <button
                    onClick={handleDeleteInterpretation}
                    className="text-gray-400 hover:text-red-500"
                    aria-label="Delete interpretation"
                    title="Delete"
                  >
                    <FaTrash className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
          {replies[interpretation.id]?.length > 0 && (
            <button
              onClick={() => setAccordionOpen((prev) => ({ ...prev, [interpretation.id]: !prev[interpretation.id] }))}
              className="flex items-center w-full text-left py-2 px-4 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold mt-2 max-w-full overflow-x-hidden"
              aria-expanded={accordionOpen[interpretation.id]}
              aria-controls={`replies-${interpretation.id}`}
            >
              <span>View Replies ({replies[interpretation.id].length})</span>
              <FaChevronDown
                className="ml-2 w-4 h-4 transition-transform duration-200"
              />
            </button>
          )}
          <button
            onClick={handleReplyClick}
            className="text-gray-400 hover:text-teal-500 mt-2 flex items-center text-sm max-w-full overflow-x-hidden"
            aria-label="Reply to interpretation"
            title="Reply"
          >
            <FaReply className="w-4 h-4 sm:w-5 sm:h-5 mr-1" /> Reply
          </button>
          {replies[interpretation.id]?.length > 0 && accordionOpen[interpretation.id] && (
            <ul id={`replies-${interpretation.id}`} className="ml-2 sm:ml-4 mt-2 sm:mt-4 space-y-2 max-w-full overflow-x-hidden">
              {replies[interpretation.id].map((reply) => (
                <li key={reply.id} className="flex items-start space-x-2 max-w-full overflow-x-hidden">
                  <div className="flex-shrink-0">
                    {reply.avatar ? (
                      <img
                        src={reply.avatar}
                        alt={`${reply.username || 'User'}'s avatar`}
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-md border-2 border-teal-500 object-cover max-w-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling!.style.display = 'flex';
                        }}
                      />
                    ) : (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md border-2 border-teal-500 flex items-center justify-center bg-gray-200">
                        <FaUser className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 max-w-full overflow-x-hidden">
                    <p className="font-semibold text-gray-800 text-sm break-words">{reply.username || 'Anonymous'}</p>
                    <p className="text-gray-600 text-sm break-words reply-text code-text max-w-full overflow-x-hidden">{reply.text}</p>
                    <div className="flex space-x-2 mt-2 items-center flex-wrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => handleUpvoteClick(reply.id, 'reply')}
                          className="text-gray-400 hover:text-teal-500"
                          aria-label="Upvote reply"
                          title="Upvote"
                        >
                          <FaSortAmountUpAlt className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <span className="ml-1 text-sm text-gray-600">{replyCounts[reply.id]?.upvote_count || 0}</span>
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={() => handleReportClick(reply.id, 'reply')}
                          className="text-gray-400 hover:text-red-500"
                          aria-label="Report reply"
                          title="Report"
                        >
                          <FaFlag className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <span className="ml-1 text-sm text-gray-600">{replyCounts[reply.id]?.report_count || 0}</span>
                      </div>
                      {userProfile && userProfile.id === reply.user_id && (
                        <div className="flex items-center">
                          <button
                            onClick={() => handleDeleteReply(reply.id)}
                            className="text-gray-400 hover:text-red-500"
                            aria-label="Delete reply"
                            title="Delete"
                          >
                            <FaTrash className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-x-hidden">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm mx-2 sm:max-w-md sm:mx-4 overflow-x-hidden">
            <h3 className="text-xl sm:text-2xl font-extrabold text-gray-800 mb-2 sm:mb-4">Report</h3>
            <form onSubmit={handleReportSubmit} className="space-y-2 sm:space-y-4 max-w-full overflow-x-hidden">
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
                        className="mr-1 sm:mr-2"
                        aria-label={`Report as ${reason}`}
                      />
                      {reason.charAt(0).toUpperCase() + reason.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="report-explanation" className="block text-gray-600 text-sm">
                  Explanation (optional, max 20 words)
                </label>
                <textarea
                  id="report-explanation"
                  value={reportExplanation}
                  onChange={(e) => setReportExplanation(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 max-w-full overflow-x-hidden break-words code-text"
                  rows={2}
                  aria-label="Report explanation"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                <button
                  type="submit"
                  className="bg-[#207788] text-white px-4 py-2 rounded-md hover:bg-[#1a5f6e] text-sm"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsReportModalOpen(false);
                    setReportReason('');
                    setReportExplanation('');
                    setCurrentId(null);
                    setCurrentType(null);
                  }}
                  className="bg-gray-300 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-400 text-sm"
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
            <div className="fixed inset-0 bg-black bg-opacity-50 overflow-x-hidden" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto overflow-x-hidden">
            <div className="flex min-h-full items-center justify-center p-2 sm:p-4 text-center">
              <Transition.Child
                as="div"
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-sm transform overflow-x-hidden rounded-lg bg-white p-5 sm:p-6 text-left align-middle shadow-xl transition-all sm:max-w-md">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Add Reply
                  </Dialog.Title>
                  <form onSubmit={handleReplySubmit} className="mt-2 sm:mt-4 space-y-3 sm:space-y-4 max-w-full overflow-x-hidden">
                    <div>
                      <label htmlFor="reply-text" className="block text-sm font-semibold text-gray-600">
                        Your Reply
                      </label>
                      <textarea
                        id="reply-text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="mt-1 w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-full overflow-x-hidden break-words code-text"
                        rows={4}
                        aria-label="Reply text"
                      />
                    </div>
                    <div className="flex space-x-2 sm:space-x-4 justify-end">
                      <button
                        type="submit"
                        className="bg-[#207788] text-white px-4 py-2 rounded-md hover:bg-[#1a5f6e] text-sm"
                      >
                        Submit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsReplyModalOpen(false);
                          setReplyText('');
                        }}
                        className="bg-gray-300 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-400 text-sm"
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
    </>
  );
}