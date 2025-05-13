'use client';

import { FaEnvelope } from 'react-icons/fa';

interface FeedbackHubProps {
  onClick: () => void;
}

export default function FeedbackHub({ onClick }: FeedbackHubProps) {
  return (
    <button
      title="FeedBack Hub"
      aria-label="Profile or sign in"
      className="flex flex-col items-center text-gray-500 hover:text-teal-500 p-2 rounded-md lg:flex-row lg:justify-center lg:hover:bg-transparent"
      onClick={onClick}
    >
      <FaEnvelope className="w-10 h-10 lg:w-6 lg:h-6" />
      <span className="lg:hidden text-sm text-center mt-2">FeedBack Hub</span>
    </button>
  );
}