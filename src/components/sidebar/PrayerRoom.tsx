'use client';

import { FaPray } from 'react-icons/fa';

interface PrayerRoomProps {
  onClick: () => void;
}

export default function PrayerRoom({ onClick }: PrayerRoomProps) {
  return (
    <a
      href="/prayer-room"
      title="Go to Prayer Room"
      aria-label="Go to Prayer Room"
      className="flex flex-col items-center text-gray-500 hover:text-teal-500 p-2 rounded-md lg:flex-row lg:justify-center lg:hover:bg-transparent"
      onClick={onClick}
    >
      <FaPray className="w-10 h-10 lg:w-6 lg:h-6" />
      <span className="lg:hidden text-sm text-center mt-2">Prayer Room</span>
    </a>
  );
}