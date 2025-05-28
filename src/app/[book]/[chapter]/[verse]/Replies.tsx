'use client';
import { FaUser, FaSortAmountUpAlt, FaFlag, FaTrash, FaChevronDown } from 'react-icons/fa';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-toastify';
import { Counts } from './InterpretationSection';

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

interface Props {
  interpretationId: string;
  replies: Reply[];
  replyCounts: { [key: string]: ReplyCounts };
  userProfile: { id: string; username: string | null; avatar: string | null } | null;
  accordionOpen: boolean;
  setAccordionOpen: (id: string, open: boolean) => void;
  handleUpvoteClick: (id: string, type: 'interpretation' | 'reply') => void;
  handleReportClick: (id: string, type: 'interpretation' | 'reply') => void;
  setReplies: (fn: (prev: { [key: string]: Reply[] }) => { [key: string]: Reply[] }) => void;
  setCounts: (fn: (prev: { [key: string]: Counts }) => { [key: string]: Counts }) => void;
  counts: { [key: string]: Counts };
}

export default function Replies({
  interpretationId,
  replies,
  replyCounts,
  userProfile,
  accordionOpen,
  setAccordionOpen,
  handleUpvoteClick,
  handleReportClick,
  setReplies,
  setCounts,
  counts,
}: Props) {
  const supabase = createClient();

  const handleDeleteReply = async (replyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please log in to delete', { toastId: 'delete-reply-login-error', theme: 'light', autoClose: 5000 });
      return;
    }

    const reply = replies.find((r) => r.id === replyId);
    if (!reply || user.id !== reply.user_id) {
      toast.error('You are not authorized to delete this reply', { toastId: 'delete-reply-auth-error', theme: 'light', autoClose: 5000 });
      return;
    }

    await supabase
      .from('replies')
      .update({ is_hidden: true })
      .eq('id', replyId)
      .eq('user_id', user.id);

    setReplies((prev) => ({
      ...prev,
      [interpretationId]: prev[interpretationId]?.filter((reply) => reply.id !== replyId) || [],
    }));

    const newReplyCount = (counts[interpretationId]?.reply_count || 1) - 1;
    await supabase
      .from('interpretation_counts')
      .upsert(
        {
          interpretation_id: interpretationId,
          reply_count: newReplyCount,
          upvote_count: counts[interpretationId]?.upvote_count || 0,
          report_count: counts[interpretationId]?.report_count || 0,
        },
        { onConflict: 'interpretation_id' }
      );

    setCounts((prev) => ({
      ...prev,
      [interpretationId]: {
        interpretation_id: interpretationId,
        reply_count: newReplyCount,
        upvote_count: prev[interpretationId]?.upvote_count || 0,
        report_count: prev[interpretationId]?.report_count || 0,
      },
    }));
  };

  return (
    <div className="mt-4 w-full">
      {replies.length > 0 && (
        <button
          onClick={() => setAccordionOpen(interpretationId, !accordionOpen)}
          className="flex items-center w-[97%] text-left text-white py-2 px-4 rounded bg-gradient-to-r from-teal-50 to-gray-50 dark:from-teal-900 dark:to-gray-800 text-gray-600 text-sm font-semibold mt-2"
          aria-expanded={accordionOpen}
          aria-controls={`replies-${interpretationId}`}
        >
          <span className="flex-1 mr-4">View Replies ({replies.length})</span>
          <FaChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${accordionOpen ? 'rotate-180' : 'rotate-0'}`}
            aria-hidden="true"
          />
        </button>
      )}
      {replies.length > 0 && accordionOpen && (
        <ul id={`replies-${interpretationId}`} className="ml-0 mt-4 space-y-4 w-full">
          {replies.map((reply) => (
            <li key={reply.id} className="flex items-start w-full">
              <div className="mr-3" style={{ minWidth: '32px' }}>
                {reply.avatar ? (
                  <img
                    src={reply.avatar}
                    alt={`${reply.username || 'User'}'s avatar`}
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-md border-2 border-teal-500 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling!.style.display = 'flex';
                    }}
                  />
                ) : (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md border-2 border-teal-500 flex items-center justify-center bg-white">
                    <FaUser className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">{reply.username || 'Anonymous'}</p>
                <p className="text-gray-600 text-sm break-words mt-1">{reply.text}</p>
                <div className="flex mt-2" style={{ gap: '16px' }}>
                  <div className="flex items-center">
                    <button
                      onClick={() => handleUpvoteClick(reply.id, 'reply')}
                      className="text-gray-400 hover:text-teal-500"
                      aria-label="Upvote reply"
                      title="Upvote"
                    >
                      <FaSortAmountUpAlt className="w-5 h-5" />
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
                      <FaFlag className="w-5 h-5" />
                    </button>
                    <span className="ml-1 text-sm text-gray-600">{replyCounts[reply.id]?.report_count || 0}</span>
                  </div>
                  {userProfile?.id === reply.user_id && (
                    <div className="flex items-center">
                      <button
                        onClick={() => handleDeleteReply(reply.id)}
                        className="text-gray-400 hover:text-red-500"
                        aria-label="Delete reply"
                        title="Delete"
                      >
                        <FaTrash className="w-5 h-5" />
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
  );
}