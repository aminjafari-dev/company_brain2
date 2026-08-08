import React from 'react';

interface DependencyGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DependencyGraphModal: React.FC<DependencyGraphModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#c6c6cd] rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-[#f2f4f6] px-4 py-3 border-b border-[#c6c6cd] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4648d4]">account_tree</span>
            <span className="text-[16px] font-semibold text-[#191c1e]">Technical Impact & Dependency Graph</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#76777d] hover:text-[#191c1e] p-1 rounded hover:bg-[#e0e3e5] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <p className="text-[14px] text-[#45464d]">
            Proposed changes to <strong className="text-[#191c1e]">Apple Pay Integration (REQ-1024)</strong> affect 4 core application modules. Downstream modules are automatically flagged for integration testing.
          </p>

          {/* Interactive Flow Diagram */}
          <div className="bg-[#f7f9fb] border border-[#c6c6cd] rounded-lg p-6 flex items-center justify-between overflow-x-auto gap-4">
            <div className="flex flex-col items-center gap-2 min-w-[120px]">
              <div className="w-14 h-14 bg-white rounded-lg border border-[#c6c6cd] flex items-center justify-center shadow-2xs">
                <span className="material-symbols-outlined text-[24px] text-[#191c1e]">smartphone</span>
              </div>
              <span className="text-[13px] font-medium text-center text-[#191c1e]">Checkout Screen</span>
              <span className="text-[11px] text-[#76777d]">checkout_screen.dart</span>
            </div>

            <span className="material-symbols-outlined text-[#76777d]">arrow_forward</span>

            <div className="flex flex-col items-center gap-2 min-w-[120px]">
              <div className="w-14 h-14 bg-[#e1e0ff] rounded-lg border border-[#6063ee] flex items-center justify-center relative shadow-2xs">
                <span className="material-symbols-outlined text-[24px] text-[#2f2ebe]">settings_applications</span>
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#4648d4] rounded-full border-2 border-white" />
              </div>
              <span className="text-[13px] font-semibold text-center text-[#4648d4]">Payment Controller</span>
              <span className="text-[11px] text-[#2f2ebe] font-medium">Modified</span>
            </div>

            <span className="material-symbols-outlined text-[#76777d]">arrow_forward</span>

            <div className="flex flex-col items-center gap-2 min-w-[120px]">
              <div className="w-14 h-14 bg-[#e1e0ff] rounded-lg border border-[#6063ee] flex items-center justify-center relative shadow-2xs">
                <span className="material-symbols-outlined text-[24px] text-[#2f2ebe]">api</span>
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#4648d4] rounded-full border-2 border-white" />
              </div>
              <span className="text-[13px] font-semibold text-center text-[#4648d4]">Payment Service</span>
              <span className="text-[11px] text-[#2f2ebe] font-medium">Modified</span>
            </div>

            <span className="material-symbols-outlined text-[#76777d]">arrow_forward</span>

            <div className="flex flex-col items-center gap-2 min-w-[120px]">
              <div className="w-14 h-14 bg-white rounded-lg border border-[#c6c6cd] flex items-center justify-center shadow-2xs">
                <span className="material-symbols-outlined text-[24px] text-[#191c1e]">cloud</span>
              </div>
              <span className="text-[13px] font-medium text-center text-[#191c1e]">Stripe SDK</span>
              <span className="text-[11px] text-[#76777d]">External API</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[14px] font-semibold text-[#191c1e]">Affected Modules Detailed Matrix</h4>
            <div className="border border-[#c6c6cd] rounded-lg divide-y divide-[#c6c6cd]/50 text-[13px]">
              <div className="p-3 bg-[#f2f4f6] font-medium text-[#45464d] grid grid-cols-12">
                <span className="col-span-5">Module / File</span>
                <span className="col-span-4">Risk Level</span>
                <span className="col-span-3">Action Required</span>
              </div>
              <div className="p-3 grid grid-cols-12 items-center bg-white">
                <span className="col-span-5 font-mono text-[#191c1e]">payment_service.dart</span>
                <span className="col-span-4 text-[#ba1a1a] font-medium">Medium</span>
                <span className="col-span-3 text-[#45464d]">Add token payload</span>
              </div>
              <div className="p-3 grid grid-cols-12 items-center bg-white">
                <span className="col-span-5 font-mono text-[#191c1e]">checkout_controller.dart</span>
                <span className="col-span-4 text-[#2f2ebe] font-medium">Low</span>
                <span className="col-span-3 text-[#45464d]">State machine update</span>
              </div>
              <div className="p-3 grid grid-cols-12 items-center bg-white">
                <span className="col-span-5 font-mono text-[#191c1e]">stripe_webhook.ts</span>
                <span className="col-span-4 text-[#2f2ebe] font-medium">Low</span>
                <span className="col-span-3 text-[#45464d]">Listen for payment_intent.succeeded</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-[#f2f4f6] border-t border-[#c6c6cd] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#000000] text-white text-[14px] hover:bg-[#2d3133] transition-colors cursor-pointer"
          >
            Close Graph
          </button>
        </div>
      </div>
    </div>
  );
};
