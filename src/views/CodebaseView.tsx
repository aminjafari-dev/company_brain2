import React from 'react';
import type { CodeFile, MatchedFile } from '../types';

interface CodebaseViewProps {
  files: CodeFile[];
  onViewFile: (file: MatchedFile) => void;
}

export const CodebaseView: React.FC<CodebaseViewProps> = ({ files, onViewFile }) => {
  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8 w-full animate-in fade-in duration-200">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-semibold text-[#191c1e] tracking-tight">
            Codebase Intelligence
          </h1>
          <p className="text-[15px] text-[#45464d] mt-1">
            Indexed source modules (persisted mock index for free MVP).
          </p>
        </div>
        <div className="text-[13px] text-[#45464d] bg-[#f2f4f6] border border-[#c6c6cd] px-3 py-1.5 rounded font-mono">
          {files.length} files indexed
        </div>
      </div>

      {files.length === 0 ? (
        <div className="bg-white border border-[#c6c6cd] rounded-lg p-8 text-center text-[#76777d]">
          No indexed files yet.
        </div>
      ) : (
        <div className="bg-white border border-[#c6c6cd] rounded-lg overflow-hidden shadow-2xs">
          <div className="bg-[#f7f9fb] border-b border-[#c6c6cd] px-4 py-3 flex justify-between items-center text-[12px] font-semibold text-[#76777d] uppercase tracking-wider">
            <span>File Path & Module</span>
            <span>Action</span>
          </div>
          <div className="divide-y divide-[#c6c6cd]/50">
            {files.map((file) => (
              <div
                key={file.id}
                className="p-4 hover:bg-[#f7f9fb] transition-colors flex items-center justify-between group"
              >
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#76777d] mt-0.5">code</span>
                  <div>
                    <div className="font-mono text-[14px] font-semibold text-[#191c1e]">
                      {file.path}
                    </div>
                    <div className="text-[13px] text-[#45464d] mt-0.5">
                      {file.module} · {file.language} · {file.lines} lines · analyzed{' '}
                      {file.lastAnalyzed}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    onViewFile({
                      path: file.path,
                      matchPercentage: 90,
                      description: `${file.module} module`,
                      contentSnippet: file.contentSnippet,
                    })
                  }
                  className="text-[13px] text-[#4648d4] font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Inspect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
