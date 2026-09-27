"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileVideo,
  FolderOpen,
  LogOut,
  Settings2,
  Users,
  Videotape,
} from "lucide-react";
import { useAssignmentStore } from "@/store/useAssignmentStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useUserStore, Tabs } from "@/store/useUserStore";
import AssignmentList from "@/components/AssignmentList";
import Panel from "@/components/Panel";
import ProjectCreate from "@/components/ProjectCreate";
import ProjectList from "@/components/ProjectList";
import UserList from "@/components/UserList";
import VideoCreate from "@/components/VideoCreate";
import VideoList from "@/components/VideoList";
import api from "@/lib/api";

const Dashboard = () => {
  const router = useRouter();

  const currentUser = useUserStore((s) => s.currentUser);
  const isAdmin = useUserStore((s) => s.isAdmin);
  const activeTab = useUserStore((s) => s.activeTab);
  const clearUser = useUserStore((s) => s.clearUser);
  const setActiveTab = useUserStore((s) => s.setActiveTab);

  const resetCurrentAssignment = useAssignmentStore(
    (s) => s.actions.resetCurrent,
  );
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  useEffect(() => {
    setCurrentProject(null);
    resetCurrentAssignment();
  }, [setCurrentProject, resetCurrentAssignment]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      clearUser();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className='flex flex-col min-h-screen bg-background text-foreground'>
      <header className='border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-50'>
        <div className='flex items-center justify-between p-4 max-w-7xl mx-auto w-full'>
          <div className='space-y-1'>
            <h1 className='text-3xl text-secondary font-bold tracking-tighter uppercase'>
              S<span className='text-primary'>.</span>C
              <span className='text-primary'>.</span>O
              <span className='text-primary'>.</span>R
              <span className='text-primary'>.</span>E
            </h1>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-mono text-muted-foreground uppercase'>
                Welcome, {currentUser?.name}
              </span>
              <span className='px-2 py-1 rounded bg-secondary/10 text-secondary text-xs font-bold border border-secondary/20 uppercase'>
                {currentUser?.role}
              </span>
            </div>
          </div>

          <div className='flex gap-4 items-center'>
            {isAdmin && (
              <div className='flex gap-4 items-center'>
                <div className='hidden md:flex p-1 bg-muted rounded-lg border border-border'>
                  {Object.values(Tabs).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as Tabs)}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                        activeTab === tab
                          ? "bg-secondary text-secondary-foreground shadow-sm border border-border/50"
                          : "text-muted-foreground hover:text-foreground"
                      }`}>
                      {tab}
                    </button>
                  ))}
                </div>
                <div className='h-8 w-0.5 bg-border mx-2 hidden md:block' />
                <button
                  onClick={() => router.push("/settings")}
                  className='flex items-center gap-2 px-3 py-2 border border-border text-foreground rounded-lg text-xs font-bold uppercase cursor-pointer hover:bg-muted transition-all'>
                  <Settings2 size={14} />
                  <span className='hidden sm:inline'>Settings</span>
                </button>
              </div>
            )}

            <button
              onClick={handleLogout}
              className='flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-xs font-bold uppercase cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-all'>
              <LogOut size={14} />
              <span className='hidden sm:inline'>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className='flex-1 p-6 max-w-7xl mx-auto w-full'>
        <div className='bg-background rounded-xl border border-border shadow-main min-h-[60vh] overflow-hidden'>
          {isAdmin ? (
            <div>
              {activeTab === Tabs.VIDEOS ? (
                <Panel
                  icon={<Videotape size={20} />}
                  title='Video Library'
                  button={<VideoCreate />}>
                  <VideoList />
                </Panel>
              ) : activeTab === Tabs.PROJECTS ? (
                <Panel
                  icon={<FolderOpen size={20} />}
                  title='Project Library'
                  button={<ProjectCreate />}>
                  <ProjectList />
                </Panel>
              ) : (
                <Panel icon={<Users size={20} />} title='Platform Users'>
                  <UserList />
                </Panel>
              )}
            </div>
          ) : (
            <Panel icon={<FileVideo size={20} />} title='Your Assignments'>
              <AssignmentList />
            </Panel>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
