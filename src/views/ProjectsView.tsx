import React from 'react';
import type { Project, TabType } from '../types';

interface ProjectsViewProps {
  projects: Project[];
  onNavigateTab: (tab: TabType) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, onNavigateTab }) => {
  return (
    <div className="max-w-[1280px] mx-auto px-8 py-8 w-full animate-in fade-in duration-200">
      <div className="mb-8">
        <h1 className="text-[32px] font-semibold text-[#191c1e] tracking-tight">Projects</h1>
        <p className="text-[15px] text-[#45464d] mt-1">
          JoshV client workspace — products, repos, and request volume.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border border-[#c6c6cd] rounded-lg p-8 text-center text-[#76777d]">
          No projects found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-[#c6c6cd] rounded-lg p-5 shadow-2xs hover:border-[#76777d] transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-[16px] font-semibold text-[#191c1e]">{project.name}</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#e1e0ff] text-[#2f2ebe]">
                  {project.status}
                </span>
              </div>
              <p className="text-[13px] font-mono text-[#4648d4] mb-3">{project.repo}</p>
              <div className="mb-3">
                <div className="flex justify-between text-[12px] text-[#76777d] mb-1">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="h-1.5 bg-[#eceef0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6063ee] rounded-full"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
              <div className="text-[13px] text-[#45464d] mb-3">
                Lead: {project.lead} · {project.requestsCount} requests
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {project.stack.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] px-2 py-0.5 rounded bg-[#f2f4f6] text-[#45464d]"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <button
                onClick={() => onNavigateTab('requests')}
                className="text-[13px] text-[#4648d4] font-medium hover:underline"
              >
                View requests
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
