'use client';

import { FaBell } from 'react-icons/fa';

interface NotificationsProps {
  onClick: () => void;
}

export default function Notifications({ onClick }: NotificationsProps) {
  return (
    <button
      title="Manage notifications"
      aria-label="Manage notifications"
      className="flex flex-col items-center text-gray-500 hover:text-teal-500 p-2 rounded-md lg:flex-row lg:justify-center lg:hover:bg-transparent"
      onClick={onClick}
    >
      <FaBell className="w-10 h-10 lg:w-6 lg:h-6" />
      <span className="lg:hidden text-sm text-center mt-2">Notifications</span>
    </button>
  );
}