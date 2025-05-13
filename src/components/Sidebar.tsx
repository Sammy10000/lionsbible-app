'use client';

import { FaArrowLeft } from 'react-icons/fa';
import PrayerRoom from './sidebar/PrayerRoom';
import ThemeToggle from './sidebar/ThemeToggle';
import Audio from './sidebar/Audio';
import Video from './sidebar/Video';
import Share from './sidebar/Share';
import Search from './sidebar/Search';
import InstallApp from './sidebar/InstallApp';
import SaveVerse from './sidebar/SaveVerse';
import Notifications from './sidebar/Notifications';
import FeedbackHub from './sidebar/FeedbackHub';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  return (
    <div
      className={`fixed left-0 h-[calc(100vh-4rem)] bg-white shadow-lg z-50 transition-transform duration-300 ease-in-out top-16 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:w-16 w-full lg:flex lg:flex-col lg:items-center`}
    >
      <div className="lg:hidden flex items-center justify-between p-4 border-b">
        <FaArrowLeft className="w-6 h-6" onClick={toggleSidebar} />
        <button
          onClick={toggleSidebar}
          className="text-gray-500 hover:text-gray-800 focus:outline-none"
          aria-label="Close sidebar"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="flex flex-col p-4 lg:p-2 space-y-4 lg:space-y-6 w-full lg:w-auto">
        <div className="grid grid-cols-2 gap-4 lg:flex lg:flex-col lg:gap-0 lg:space-y-6">
          <PrayerRoom onClick={handleLinkClick} />
          <ThemeToggle onClick={handleLinkClick} />
          <Audio onClick={handleLinkClick} />
          <Video onClick={handleLinkClick} />
          <Share onClick={handleLinkClick} />
          <Search onClick={handleLinkClick} />
          <InstallApp onClick={handleLinkClick} />
          <SaveVerse onClick={handleLinkClick} />
          <Notifications onClick={handleLinkClick} />
          <FeedbackHub onClick={handleLinkClick} />
        </div>
      </nav>
    </div>
  );
}