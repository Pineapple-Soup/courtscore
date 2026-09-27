"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { sessionManager } from "@/lib/api";

/**
 * AuthProvider wraps all protected routes.
 *
 * Responsibilities:
 *  - Fetch the current user on mount via the session cookie
 *  - Show a loading spinner while the auth check is in-flight
 *  - Redirect to /login if the user is not authenticated
 *  - Start the proactive session-refresh timer on success
 *  - Stop the timer on unmount or auth failure
 *
 * Children are only rendered once auth succeeds, so downstream
 * components can safely assume `currentUser` is available.
 */
export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const fetchCurrentUser = useUserStore((s) => s.fetchCurrentUser);
  const currentUser = useUserStore((s) => s.currentUser);
  const loading = useUserStore((s) => s.loading);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetchCurrentUser()
      .then(() => {
        sessionManager.start();
      })
      .catch(() => {
        sessionManager.stop();
      })
      .finally(() => {
        setAuthChecked(true);
      });

    return () => {
      sessionManager.stop();
    };
  }, [fetchCurrentUser]);

  // Redirect to login once we know the user is not authenticated
  useEffect(() => {
    if (authChecked && !loading && !currentUser) {
      router.push("/login");
    }
  }, [authChecked, loading, currentUser, router]);

  // Still checking auth — show loading spinner
  if (!authChecked || loading) {
    return (
      <div className='flex items-center justify-center h-screen bg-background font-sans'>
        <div className='flex flex-col items-center gap-2'>
          <div className='h-8 w-8 border-4 border-t-primary border-muted rounded-full animate-spin' />
          <p className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  // Auth failed — render nothing while the redirect fires
  if (!currentUser) {
    return null;
  }

  return <>{children}</>;
}
