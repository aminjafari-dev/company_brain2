import React from 'react';
import { MatchedFile } from '../../types';

interface CodeViewerModalProps {
  file: MatchedFile | null;
  onClose: () => void;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#c6c6cd] rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#f2f4f6] px-4 py-3 border-b border-[#c6c6cd] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4648d4]">code</span>
            <span className="font-mono text-[14px] font-semibold text-[#191c1e]">{file.path}</span>
            <span className="bg-[#e1e0ff] text-[#2f2ebe] text-[11px] font-semibold px-2 py-0.5 rounded">
              {file.matchPercentage}% Match
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#76777d] hover:text-[#191c1e] p-1 rounded hover:bg-[#e0e3e5] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Info */}
        <div className="p-4 border-b border-[#c6c6cd] bg-[#f7f9fb]">
          <div className="text-[12px] font-medium uppercase tracking-wider text-[#76777d] mb-1">
            AI Code Analysis Rationale
          </div>
          <p className="text-[14px] text-[#191c1e]">{file.description}</p>
        </div>

        {/* Code Content */}
        <div className="p-4 flex-1 overflow-y-auto bg-[#131b2e] text-[#bec6e0] font-mono text-[13px] leading-relaxed">
          <pre className="whitespace-pre-wrap">
            {file.contentSnippet || `// ${file.path}\n// System analyzed this file for Apple Pay requirements\n\nimport 'package:flutter/material.dart';\nimport 'package:flutter_stripe/flutter_stripe.dart';\n\nclass PaymentManager {\n  static Future<void> initializeApplePay() async {\n    // Checking for Apple Pay capability\n    final isSupported = await Stripe.instance.isApplePaySupported();\n    if (isSupported) {\n      print('Apple Pay is enabled');\n    }\n  }\n}`}
          </pre>
        </div>

        {/* Actions */}
        <div className="p-3 bg-[#f2f4f6] border-t border-[#c6c6cd] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded border border-[#c6c6cd] text-[14px] text-[#191c1e] hover:bg-[#e0e3e5] transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => {
              alert(`Code snippet copied for ${file.path}`);
              onClose();
            }}
            className="px-4 py-1.5 rounded bg-[#000000] text-white text-[14px] hover:bg-[#2d3133] transition-colors cursor-pointer"
          >
            Copy Snippet
          </button>
        </div>
      </div>
    </div>
  );
};
