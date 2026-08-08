import React, { useEffect, useState } from 'react';
import { FeatureRequest, AcceptanceCriterion } from '../types';

interface PMReviewViewProps {
  request: FeatureRequest | null;
  requests?: FeatureRequest[];
  onSelectRequest?: (id: string) => void;
  onApprovePlan: (reqId: string) => void;
  onReject?: (reqId: string) => void;
  onRequestMoreInfo?: (reqId: string) => void;
  onCreateJiraTasks: (reqId: string) => void;
}

export const PMReviewView: React.FC<PMReviewViewProps> = ({
  request,
  requests = [],
  onSelectRequest,
  onApprovePlan,
  onReject,
  onRequestMoreInfo,
  onCreateJiraTasks,
}) => {
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [decision, setDecision] = useState<
    'Pending' | 'Approved' | 'Requested Info' | 'Rejected'
  >('Pending');
  const [jiraTasksCreated, setJiraTasksCreated] = useState(false);

  useEffect(() => {
    if (!request) return;
    setCriteria(request.acceptanceCriteria || []);
    setDecision(request.pmDecision || 'Pending');
    setJiraTasksCreated(request.devPlan?.some((t) => t.jiraCreated) || false);
  }, [request]);

  if (!request) {
    return (
      <div className="max-w-[1280px] mx-auto px-8 py-8 text-[#76777d]">
        No request selected.
      </div>
    );
  }

  const toggleCriterion = (id: string) => {
    setCriteria((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleApprove = () => {
    setDecision('Approved');
    onApprovePlan(request.id);
  };

  const handleCreateJira = () => {
    setJiraTasksCreated(true);
    onCreateJiraTasks(request.id);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8 w-full animate-in fade-in duration-200">
      {requests.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {requests.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRequest?.(r.id)}
              className={`text-[12px] px-2.5 py-1 rounded-full border ${
                r.id === request.id
                  ? 'bg-[#6063ee] text-white border-[#6063ee]'
                  : 'bg-white text-[#45464d] border-[#c6c6cd] hover:bg-[#f2f4f6]'
              }`}
            >
              {r.id}
            </button>
          ))}
        </div>
      )}
      {/* Title Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-[#dae2fd] text-[#131b2e] font-medium text-[12px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Feature Request
          </span>
          <span className="text-[#45464d] text-[12px] font-mono">{request.id}</span>
        </div>
        <h2 className="text-[32px] font-semibold text-[#191c1e] tracking-tight">
          {decision === 'Approved' ? 'Approved & Ready for Sprint' : 'Ready for PM Review'}
        </h2>
        <p className="text-[15px] text-[#45464d] mt-1">{request.subtitle || request.title}</p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Summary */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#c6c6cd] rounded-lg shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-[#c6c6cd] flex items-center gap-2 bg-[#f7f9fb]">
              <span className="material-symbols-outlined text-[18px] text-[#45464d]">description</span>
              <h3 className="text-[16px] font-semibold text-[#191c1e]">Summary</h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Business Requirements */}
              <div>
                <h4 className="text-[12px] font-semibold text-[#76777d] uppercase tracking-wider mb-2">
                  Business Requirements
                </h4>
                <p className="text-[14px] text-[#191c1e] leading-relaxed">
                  {request.businessRequirements ||
                    'Enable Apple Pay as a payment method in the checkout flow to reduce friction and improve conversion rates on iOS devices.'}
                </p>
              </div>

              {/* Acceptance Criteria */}
              <div>
                <h4 className="text-[12px] font-semibold text-[#76777d] uppercase tracking-wider mb-2">
                  Acceptance Criteria
                </h4>
                <ul className="space-y-2.5 text-[14px] text-[#191c1e]">
                  {criteria.map((item) => (
                    <li
                      key={item.id}
                      onClick={() => toggleCriterion(item.id)}
                      className="flex items-start gap-2.5 cursor-pointer group"
                    >
                      <span
                        className={`material-symbols-outlined text-[18px] mt-0.5 transition-colors ${
                          item.completed ? 'text-[#059669] filled' : 'text-[#76777d] group-hover:text-[#191c1e]'
                        }`}
                      >
                        {item.completed ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                      <span className={item.completed ? 'line-through text-[#76777d]' : ''}>
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Technical Impact Summary */}
              <div>
                <h4 className="text-[12px] font-semibold text-[#76777d] uppercase tracking-wider mb-2">
                  Technical Impact Summary
                </h4>
                <p className="text-[14px] text-[#191c1e] leading-relaxed">
                  {request.technicalImpactSummary ||
                    'Requires updates to Flutter frontend (payment sheet integration) and Node.js backend (Stripe payment intent configuration for Apple Pay). Low risk to existing payment flows.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Recommendation & PM Actions */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* AI Recommendation Card */}
          <div className="bg-[#e1e0ff]/30 border border-[#4648d4]/20 rounded-lg relative overflow-hidden shadow-2xs">
            <div className="px-4 py-3 border-b border-[#4648d4]/10 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#4648d4] filled">auto_awesome</span>
              <h3 className="text-[16px] font-semibold text-[#4648d4]">AI Recommendation</h3>
            </div>
            <div className="p-5">
              <p className="text-[15px] text-[#191c1e] font-semibold mb-2">
                {request.aiRecommendation?.title || 'Proceed with implementation'}
              </p>
              <p className="text-[14px] text-[#45464d] leading-relaxed">
                {request.aiRecommendation?.description ||
                  'The proposed scope aligns with the business requirements. Technical impact is localized to payment modules, and Stripe integration patterns are already established in the codebase. Estimated effort is moderate.'}
              </p>
            </div>
          </div>

          {/* PM Decision Card */}
          <div className="bg-white border border-[#c6c6cd] rounded-lg shadow-2xs">
            <div className="px-4 py-3 border-b border-[#c6c6cd] flex items-center gap-2 bg-[#f7f9fb]">
              <span className="material-symbols-outlined text-[18px] text-[#45464d]">how_to_reg</span>
              <h3 className="text-[16px] font-semibold text-[#191c1e]">PM Decision</h3>
            </div>

            <div className="p-5 flex flex-col gap-3">
              {decision === 'Approved' ? (
                <div className="p-3 bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] rounded text-[14px] font-medium flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px] filled">check_circle</span>
                  <span>Approved by PM — Development Plan Ready</span>
                </div>
              ) : (
                <button
                  onClick={handleApprove}
                  className="bg-[#000000] text-white text-[14px] font-medium rounded px-4 py-2.5 w-full flex items-center justify-center gap-2 hover:bg-[#2d3133] transition-colors cursor-pointer active:scale-98"
                >
                  <span className="material-symbols-outlined text-[18px]">done_all</span>
                  <span>Approve & Create Development Plan</span>
                </button>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDecision('Requested Info');
                    onRequestMoreInfo?.(request.id);
                  }}
                  className="flex-1 bg-[#f2f4f6] border border-[#c6c6cd] text-[#191c1e] text-[13px] font-medium rounded px-3 py-2 flex items-center justify-center gap-1.5 hover:bg-[#e6e8ea] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>Request Info</span>
                </button>

                <button
                  onClick={() => {
                    setDecision('Rejected');
                    onReject?.(request.id);
                  }}
                  className="flex-1 text-[#ba1a1a] border border-[#ffdad6] hover:bg-[#ffdad6]/40 text-[13px] font-medium rounded px-3 py-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  <span>Reject</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Development Plan Section */}
      <div className="mt-10 border-t border-[#c6c6cd] pt-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-[24px] text-[#4648d4]">account_tree</span>
          <h2 className="text-[20px] font-semibold text-[#191c1e]">Development Plan</h2>
          <span className="bg-[#e6e8ea] text-[#45464d] text-[12px] font-medium px-2 py-0.5 rounded ml-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px] text-[#4648d4] filled">auto_awesome</span>
            AI Generated Draft
          </span>
        </div>

        <div className="bg-white border border-[#c6c6cd] rounded-lg overflow-hidden shadow-2xs">
          <div className="grid grid-cols-12 gap-4 p-3 border-b border-[#c6c6cd] bg-[#f7f9fb] text-[12px] font-semibold text-[#76777d] uppercase tracking-wider">
            <div className="col-span-1">Seq</div>
            <div className="col-span-3">Component</div>
            <div className="col-span-6">Task</div>
            <div className="col-span-2">Est. Effort</div>
          </div>

          <div className="divide-y divide-[#c6c6cd]/50">
            {request.devPlan?.map((item) => (
              <div
                key={item.seq}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[#f7f9fb] transition-colors text-[14px]"
              >
                <div className="col-span-1 font-mono text-[#76777d]">{item.seq}</div>
                <div className="col-span-3 font-medium text-[#191c1e] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#76777d]">
                    {item.component.includes('Backend') ? 'dns' : item.component.includes('Frontend') ? 'smartphone' : 'fact_check'}
                  </span>
                  <span>{item.component}</span>
                </div>
                <div className="col-span-6 text-[#191c1e]">{item.task}</div>
                <div className="col-span-2">
                  <span
                    className={`px-2.5 py-1 rounded text-[12px] font-semibold ${
                      item.effort === 'High'
                        ? 'bg-[#ffdad6] text-[#93000a]'
                        : 'bg-[#f2f4f6] text-[#191c1e]'
                    }`}
                  >
                    {item.effort}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#f7f9fb] border-t border-[#c6c6cd] flex justify-end">
            <button
              onClick={handleCreateJira}
              disabled={jiraTasksCreated}
              className={`text-[13px] font-medium rounded px-4 py-2 flex items-center gap-2 transition-colors ${
                jiraTasksCreated
                  ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
                  : decision === 'Approved'
                  ? 'bg-[#000000] text-white hover:bg-[#2d3133] cursor-pointer'
                  : 'bg-[#f2f4f6] border border-[#c6c6cd] text-[#76777d] cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {jiraTasksCreated ? 'check' : 'add_task'}
              </span>
              <span>{jiraTasksCreated ? 'Jira Tasks Created (JIRA-285, JIRA-286)' : 'Create Jira Tasks'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
