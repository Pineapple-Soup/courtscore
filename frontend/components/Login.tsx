"use client";

import { useState } from "react";
import { Mail, Lock, User, ShieldAlert } from "lucide-react";
import api, { ApiError } from "@/lib/api";

type LoginType = "login" | "register";

const Login = () => {
  const [loginType, setLoginType] = useState<LoginType>("login");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const clearForm = () => {
    setName("");
    setEmail("");
    setPassword("");
  };

  const googleLogin = () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    window.location.href = `${baseUrl}/auth/google/login`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const endpoint = loginType == "login" ? "/auth/login" : "/auth/signup";

      const body =
        loginType == "login" ? { email, password } : { name, email, password };

      await api.post(endpoint, body, { skipAuthRedirect: true });

      clearForm();
      window.location.href = "/dashboard";
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422) {
          const detailArray = err.data as { detail?: Array<{ msg: string }> };
          const validationMsg = detailArray?.detail?.[0]?.msg;

          if (validationMsg && validationMsg.includes(",")) {
            setError(validationMsg.split(",")[1].trim());
          } else {
            setError(validationMsg || "Validation error occurred.");
          }
          return;
        }

        // Fallback for standard 400/401/500 API errors
        setError(err.message || "Authentication failed");
      } else {
        // Non-API exceptions
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex flex-col min-h-screen bg-background text-foreground font-sans relative overflow-hidden items-center justify-center p-4 md:p-8'>
      <div className='w-full max-w-md space-y-8 relative z-10'>
        {/* Brand & System Header */}
        <div className='space-y-4 text-center'>
          <h1 className='text-4xl font-bold tracking-tighter text-foreground uppercase'>
            S<span className='text-primary'>.</span>C
            <span className='text-primary'>.</span>O
            <span className='text-primary'>.</span>R
            <span className='text-primary'>.</span>E
          </h1>
          <p className='text-muted-foreground font-mono text-xxs tracking-widest uppercase mt-1'>
            SCORE Coordinates Observational Research Experiments
          </p>
        </div>

        {/* Main Auth Container */}
        <div className='border rounded-xl bg-background shadow-main overflow-hidden border-border/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/30'>
          {/* Container Header */}
          <div className='px-4 py-3 border-b bg-muted/30 flex justify-between items-center font-mono text-xxs tracking-widest text-muted-foreground uppercase'>
            <span>Auth Portal</span>
            <div className='flex gap-1.5'>
              <span className='h-2 w-2 rounded-full bg-primary animate-pulse' />
              <span className='h-2 w-2 rounded-full bg-secondary' />
              <span className='h-2 w-2 rounded-full bg-border' />
            </div>
          </div>

          <div className='p-6 space-y-6'>
            {/* Tab Selector Pattern */}
            <div className='inline-flex p-1 bg-muted rounded-lg border border-border w-full'>
              <button
                type='button'
                onClick={() => {
                  setLoginType("login");
                  clearForm();
                  setError("");
                }}
                className={`flex-1 px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all cursor-pointer ${
                  loginType === "login"
                    ? "bg-background text-foreground shadow-sm border border-border/50 font-bold"
                    : "text-muted-foreground hover:text-foreground font-medium"
                }`}>
                Sign In
              </button>
              <button
                type='button'
                onClick={() => {
                  setLoginType("register");
                  clearForm();
                  setError("");
                }}
                className={`flex-1 px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all cursor-pointer ${
                  loginType === "register"
                    ? "bg-background text-foreground shadow-sm border border-border/50 font-bold"
                    : "text-muted-foreground hover:text-foreground font-medium"
                }`}>
                Create Account
              </button>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className='space-y-4'>
              {loginType === "register" && (
                <div className='space-y-1.5'>
                  <label
                    htmlFor='name'
                    className='text-xxs font-bold uppercase tracking-widest text-muted-foreground'>
                    Name
                  </label>
                  <div className='relative'>
                    <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/60 pointer-events-none'>
                      <User size={14} />
                    </span>
                    <input
                      id='name'
                      type='text'
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className='w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground/30'
                      placeholder='Enter username'
                      autoComplete='name'
                    />
                  </div>
                </div>
              )}

              <div className='space-y-1.5'>
                <label
                  htmlFor='email'
                  className='text-xxs font-bold uppercase tracking-widest text-muted-foreground'>
                  Email Address
                </label>
                <div className='relative'>
                  <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/60 pointer-events-none'>
                    <Mail size={14} />
                  </span>
                  <input
                    id='email'
                    type='email'
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className='w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground/30'
                    placeholder='example@score.com'
                    autoComplete='email'
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <label
                  htmlFor='password'
                  className='text-xxs font-bold uppercase tracking-widest text-muted-foreground'>
                  Password
                </label>
                <div className='relative'>
                  <span className='absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/60 pointer-events-none'>
                    <Lock size={14} />
                  </span>
                  <input
                    id='password'
                    type='password'
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground/30'
                    placeholder={
                      loginType === "login"
                        ? "Enter your passphrase"
                        : "At least 8 characters"
                    }
                    minLength={loginType === "login" ? undefined : 8}
                    autoComplete={
                      loginType === "login"
                        ? "current-password"
                        : "new-password"
                    }
                  />
                </div>
              </div>

              {error && (
                <div
                  className={`flex items-start gap-3 p-3 border-l-4 rounded-r-md transition-all duration-300 ${
                    error.toLowerCase().includes("success") ||
                    error.toLowerCase().includes("successful")
                      ? "border-l-secondary bg-secondary/10 text-secondary"
                      : "border-l-destructive bg-destructive/10 text-destructive"
                  }`}>
                  <span className='mt-0.5 shrink-0'>
                    <ShieldAlert size={14} />
                  </span>
                  <div className='space-y-0.5'>
                    <p className='font-mono text-[9px] font-bold uppercase tracking-widest'>
                      {error.toLowerCase().includes("success") ||
                      error.toLowerCase().includes("successful")
                        ? "Info OK"
                        : "Security incident"}
                    </p>
                    <p className='text-xs leading-normal font-medium'>
                      {error}
                    </p>
                  </div>
                </div>
              )}

              <button
                type='submit'
                disabled={isLoading}
                className='w-full mt-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded shadow-main hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'>
                {isLoading ? (
                  <>
                    <span className='h-3.5 w-3.5 border-2 border-t-transparent border-primary-foreground rounded-full animate-spin' />
                    Verifying Identity...
                  </>
                ) : loginType === "login" ? (
                  "Log In"
                ) : (
                  "Register User"
                )}
              </button>
            </form>

            {/* Divider Pattern */}
            <div className='relative flex items-center py-2'>
              <div className='grow border-t border-border'></div>
              <span className='mx-3 shrink font-mono text-[9px] text-muted-foreground uppercase tracking-widest'>
                or connect with
              </span>
              <div className='grow border-t border-border'></div>
            </div>

            {/* Google OAuth Button */}
            <button
              type='button'
              onClick={googleLogin}
              className='w-full px-5 py-2.5 border border-border bg-transparent hover:bg-muted text-foreground text-xs font-bold uppercase tracking-widest rounded transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-[0.98] shadow-sm'
              aria-label='Sign in with Google'>
              <svg className='w-4 h-4 shrink-0' viewBox='0 0 24 24'>
                <path
                  fill='#4285F4'
                  d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                />
                <path
                  fill='#34A853'
                  d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                />
                <path
                  fill='#FBBC05'
                  d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                />
                <path
                  fill='#EA4335'
                  d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                />
              </svg>
              Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
