"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Inbox, Mail, Search, Shield, Trash } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import SystemError from "@/components/SystemError";
import SystemLoading from "@/components/SystemLoading";

const UserList = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const users = useUserStore((s) => s.users);
  const loading = useUserStore((s) => s.loading);
  const error = useUserStore((s) => s.error);
  const fetchUsers = useUserStore((s) => s.fetchUsers);
  const promoteUser = useUserStore((s) => s.promoteUser);
  const deleteUser = useUserStore((s) => s.deleteUser);
  const currentUser = useUserStore((s) => s.currentUser);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onPromote = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to promote ${name || "this user"} to Admin?`,
      )
    ) {
      return;
    }
    try {
      await promoteUser(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to promote user");
    }
  };

  const onDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete user ${name || "this user"}?`,
      )
    ) {
      return;
    }
    try {
      await deleteUser(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  if (loading && !users) {
    return SystemLoading({ message: "Retrieving platform users..." });
  }

  if (error) {
    return SystemError({ message: error });
  }

  const filteredUsers = (users || []).filter((user) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const name = (user.name || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    const id = (user.id || "").toLowerCase();
    return name.includes(query) || email.includes(query) || id.includes(query);
  });

  return (
    <div className='space-y-6 p-6'>
      {/* Search Bar & Header Controls */}
      <div className='flex flex-col sm:flex-row gap-4 items-center justify-between border-b pb-4 border-border'>
        <div className='space-y-1 w-full sm:w-auto'>
          <h3 className='text-sm font-bold uppercase tracking-widest text-muted-foreground'>
            Search Directory
          </h3>
          <p className='text-xxs text-muted-foreground font-mono'>
            Total Registry: {users?.length ?? 0} Nodes
          </p>
        </div>

        <div className='relative w-full sm:w-72'>
          <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/60 pointer-events-none'>
            <Search size={14} />
          </span>
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground/30'
            placeholder='Filter by name, email, ID...'
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-lg bg-muted/10 text-muted-foreground'>
          <Inbox size={40} strokeWidth={1} />
          <p className='mt-4 text-xs font-bold uppercase tracking-widest'>
            No matching nodes found
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {filteredUsers.map((user) => {
            const isSelf = user.id === currentUser?.id;
            const isAdmin = user.role === "admin";
            const projectCount = user.projectCount ?? 0;
            const canDelete = projectCount === 0 && !isSelf;

            return (
              <div
                key={user.id}
                className='flex flex-col bg-background border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-main transition-all duration-300'>
                <div className='p-4 flex-1 flex flex-col justify-between space-y-4'>
                  {/* Top: Badges & Info */}
                  <div className='flex items-start justify-between gap-4'>
                    <div className='space-y-1 min-w-0'>
                      <h4 className='text-sm font-bold truncate tracking-tight text-foreground uppercase'>
                        {user.name || "UNNAMED_IDENTITY"}
                      </h4>
                      <p className='text-xs font-mono text-muted-foreground truncate flex items-center gap-1.5'>
                        <Mail size={12} className='shrink-0' />
                        {user.email}
                      </p>
                      <p className='text-[10px] font-mono text-muted-foreground/50 truncate'>
                        REF: {user.id}
                      </p>
                    </div>

                    {/* Role Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-xxs font-bold uppercase tracking-wider shrink-0 shadow-sm border ${
                        isAdmin
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                      {user.role}
                    </span>
                  </div>

                  {/* Middle: Project Links Telemetry */}
                  {projectCount > 0 ? (
                    <div className='flex items-center gap-2 py-1.5 px-2.5 rounded bg-muted/40 border border-border/55 w-fit'>
                      <FolderOpen size={13} className='text-primary' />
                      <span className='font-mono text-xxs font-bold text-primary uppercase'>
                        {projectCount}{" "}
                        {projectCount === 1 ? "Project Link" : "Project Links"}
                      </span>
                    </div>
                  ) : (
                    <div className='flex items-center gap-2 py-1.5 px-2.5 rounded bg-muted/20 border border-border/40 w-fit'>
                      <FolderOpen size={13} className='text-secondary' />
                      <span className='font-mono text-xxs font-bold text-secondary uppercase'>
                        No Active Links
                      </span>
                    </div>
                  )}

                  {/* Bottom: Action Buttons */}
                  <div className='flex items-center justify-between gap-2 pt-3 border-t border-border/50'>
                    {/* Promote Button */}
                    {!isAdmin ? (
                      <button
                        disabled={projectCount > 0}
                        onClick={() => onPromote(user.id, user.name)}
                        title={
                          projectCount > 0
                            ? "Cannot promote user linked to active projects"
                            : "Promote user to Administrator"
                        }
                        className={`px-3 py-1.5 text-xxs font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1 ${
                          projectCount > 0
                            ? "border border-border bg-muted/50 text-muted-foreground/40 cursor-not-allowed"
                            : "border border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground active:scale-95 cursor-pointer"
                        }`}>
                        <Shield size={12} />
                        <span>Promote</span>
                      </button>
                    ) : (
                      <span className='text-[10px] font-mono text-muted-foreground italic flex items-center gap-1'>
                        <Shield size={12} className='text-primary' />
                        Admin Privileges Active
                      </span>
                    )}

                    {/* Delete Button */}
                    {!isSelf && (
                      <button
                        disabled={!canDelete}
                        onClick={() => onDelete(user.id, user.name)}
                        title={
                          projectCount > 0
                            ? "Cannot remove user linked to active projects"
                            : "Remove user from platform"
                        }
                        className={`inline-flex items-center justify-center gap-1 rounded px-3 py-1.5 text-xxs font-bold uppercase tracking-wider shadow-sm transition-all duration-200 ${
                          canDelete
                            ? "border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground active:scale-95 cursor-pointer"
                            : "border border-border bg-muted/50 text-muted-foreground/40 cursor-not-allowed"
                        }`}>
                        <Trash size={12} />
                        <span>Delete</span>
                      </button>
                    )}

                    {isSelf && (
                      <span className='text-[9px] font-mono text-muted-foreground/60 italic'>
                        Current Session
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserList;
