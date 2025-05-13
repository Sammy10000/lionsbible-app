'use client';

import { useEffect } from 'react';

export default function ScrollProgressBar() {
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrollProgress = (scrollTop / scrollHeight) * 100;
      const progressBar = document.getElementById('scroll-progress-bar');
      
      if (progressBar) {
        progressBar.style.width = `${100 - scrollProgress}%`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <aside 
      id="scroll-progress-container"
      role="presentation"
      aria-hidden="true"
      style={{
        position: 'relative',
        top: 0,
        left: 0,
        width: '100%',
        height: '4px',
        backgroundColor: 'transparent',        
      }}
    >
      <div
        id="scroll-progress-bar"
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: '#207788',
          transition: 'width 0.1s ease-out',
        }}
      />
    </aside>
  );
}