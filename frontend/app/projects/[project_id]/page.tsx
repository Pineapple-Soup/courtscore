"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import ProjectManagement from "@/components/ProjectManagement";
import { ChevronRight, Info, Settings } from "lucide-react";
import Link from "next/link";
import Panel from "@/components/Panel";
import ProjectInfo from "@/components/ProjectInfo";

enum ProjectTabs {
  INFO = "Info",
  MANAGE = "Manage",
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ project_id: string }>;
}) {
  const { project_id } = React.use(params);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const fetchProject = useProjectStore((s) => s.fetchProject);
  const currentProject = useProjectStore((s) => s.currentProject);

  const [activeTab, setActiveTab] = useState<ProjectTabs>(ProjectTabs.INFO);

  useEffect(() => {
    // Set project from URL if it's not already set or is different
    if (currentProject?.id !== project_id) {
      setCurrentProject(project_id);
    }
    fetchProject().catch(() => {});
  }, [project_id, currentProject?.id, setCurrentProject, fetchProject]);

  return (
    <div>
      <header className='border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-50'>
        <div className='flex items-center justify-between p-4 max-w-7xl mx-auto w-full'>
          <nav className='flex items-center text-sm text-muted-foreground'>
            <Link href='/dashboard' className='hover:text-primary'>
              Projects
            </Link>
            <ChevronRight size={18} />
            <span className='font-semibold text-secondary'>
              {currentProject?.name ?? "Loading..."}
            </span>
          </nav>
          <div className='flex p-1 bg-muted rounded-lg border border-border'>
            {Object.values(ProjectTabs).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as ProjectTabs)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                  activeTab === tab
                    ? "bg-secondary text-secondary-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className='flex-1 p-6 max-w-7xl mx-auto w-full'>
        <div className='bg-background rounded-xl border border-border shadow-main min-h-[60vh] overflow-hidden'>
          <div>
            {activeTab === ProjectTabs.INFO ? (
              <Panel icon={<Info size={20} />} title='Project Overview'>
                <ProjectInfo />
              </Panel>
            ) : (
              <Panel icon={<Settings size={20} />} title='Project Management'>
                <ProjectManagement />
              </Panel>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
