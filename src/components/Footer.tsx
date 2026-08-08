import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-4 px-6 border-t border-[#c6c6cd]/60 bg-white flex flex-col sm:flex-row justify-between items-center text-[12px] text-[#45464d] font-medium z-30">
      <div>© 2024 CompanyBrain Engineering Intelligence</div>
      <div className="flex gap-4 mt-2 sm:mt-0">
        <a href="#privacy" onClick={(e) => e.preventDefault()} className="hover:text-[#000000] transition-colors">
          Privacy Policy
        </a>
        <a href="#terms" onClick={(e) => e.preventDefault()} className="hover:text-[#000000] transition-colors">
          Terms of Service
        </a>
        <a href="#security" onClick={(e) => e.preventDefault()} className="hover:text-[#000000] transition-colors">
          Security
        </a>
      </div>
    </footer>
  );
};
