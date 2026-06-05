"use client";
import { useEffect, useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { useUserStore } from "@/store/useUserStore";
import { User } from "@/types/user";
import SystemError from "@/components/SystemError";

const MemberLinker = ({ locked }: { locked: boolean }) => {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = useUserStore((s) => s.searchUsers);

  const currentProject = useProjectStore((s) => s.currentProject);
  const addProjectMember = useProjectStore((s) => s.addProjectMember);
  const removeProjectMember = useProjectStore((s) => s.removeProjectMember);
  const fetchProject = useProjectStore((s) => s.fetchProject);

  useEffect(() => {
    if (!currentProject) return;
    let cancelled = false;
    const controller = new AbortController();
    const handler = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await searchUsers(query, {
          limit: 10,
          excludeProjectId: currentProject?.id,
          excludeAdmin: true,
          signal: controller.signal,
        });
        if (cancelled) return;
        setUsers(res.items);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        console.error(err);
        setError("Failed to search users");
        setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(handler);
    };
  }, [query, searchUsers, currentProject]);

  const handleAdd = async (user: User) => {
    if (locked) {
      alert("Project is locked. Cannot add members.");
      return;
    }
    try {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      await addProjectMember(user.id);
      await fetchProject();
      setQuery("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to add member");
    }
  };

  const handleRemove = async (user: User) => {
    if (locked) {
      alert("Project is locked. Cannot remove members.");
      return;
    }
    try {
      setUsers((prev) => [...prev, user]);
      await removeProjectMember(user.id);
      await fetchProject();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  return (
    <div className='space-y-4'>
      <div className='relative'>
        <input
          placeholder='Search users by name or email'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className='w-full px-3 py-2 rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring'
        />
        {loading && (
          <Loader2 className='animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground' />
        )}
      </div>

      {error && <SystemError message={error} />}

      {users.length > 0 && (
        <div className='border rounded-md max-h-64 overflow-y-auto'>
          {users.map((user) => (
            <div
              key={user.id}
              className='flex items-center justify-between p-3 border-b last:border-b-0'>
              <div>
                <p className='font-semibold'>{user.name}</p>
                <p className='text-sm text-muted-foreground'>{user.email}</p>
              </div>
              <button
                onClick={() => handleAdd(user)}
                className='p-2 rounded-full bg-primary text-primary-foreground cursor-pointer hover:brightness-125 transition-all'>
                <Plus size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className='space-y-2'>
        <h3 className='text-lg font-medium'>Current Members</h3>
        {currentProject?.projectMembers?.length === 0 ? (
          <p className='text-muted-foreground text-sm'>No members yet.</p>
        ) : (
          <div className='border rounded-md'>
            {currentProject?.projectMembers?.map((projectMember) => (
              <div
                key={projectMember.id}
                className='flex items-center justify-between p-3 border-b last:border-b-0'>
                <div>
                  <p className='font-semibold'>{projectMember.user.name}</p>
                  <p className='text-sm text-muted-foreground'>
                    {projectMember.user.email}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(projectMember.user)}
                  className='p-1.5 rounded-full text-muted-foreground cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-all'>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberLinker;
