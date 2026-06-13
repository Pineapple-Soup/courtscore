export default function StyleGuide() {
  return (
    <div className='p-4 md:p-8 space-y-16 bg-background text-foreground min-h-screen font-sans'>
      {/* --- SYSTEM HEADER --- */}
      <header className='space-y-4 border-b pb-8 border-border'>
        <div className='flex justify-between items-end'>
          <div>
            <h1 className='text-4xl font-bold tracking-tighter text-foreground uppercase'>
              System V2
            </h1>
            <p className='text-muted-foreground font-mono text-sm tracking-tight'>
              BRICK-TEAL-MONO // REF: 264.6645
            </p>
          </div>
          <div className='flex gap-2'>
            <span className='h-3 w-3 rounded-full bg-primary animate-pulse' />
            <span className='h-3 w-3 rounded-full bg-secondary' />
            <span className='h-3 w-3 rounded-full bg-border' />
          </div>
        </div>
      </header>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-12'>
        {/* --- LEFT COLUMN: NAVIGATION & ELEMENTS --- */}
        <div className='lg:col-span-4 space-y-12'>
          {/* SIDEBAR TEMPLATE */}
          <section className='space-y-4'>
            <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
              Sidebar Pattern
            </h2>
            <nav className='flex flex-col gap-1 p-2 bg-muted/30 border rounded-lg shadow-sm'>
              <div className='flex items-center gap-3 px-3 py-2 bg-secondary text-secondary-foreground rounded-md shadow-sm'>
                <span className='text-lg'>▣</span>
                <span className='text-sm font-bold uppercase tracking-wider'>
                  Dashboard
                </span>
              </div>
              <div className='flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all cursor-pointer'>
                <span className='text-lg'>▤</span>
                <span className='text-sm font-medium'>Projects</span>
              </div>
              <div className='flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all cursor-pointer'>
                <span className='text-lg'>▥</span>
                <span className='text-sm font-medium'>Analytics</span>
              </div>
            </nav>
          </section>

          {/* TAB SELECTOR */}
          <section className='space-y-4'>
            <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
              Tab System
            </h2>
            <div className='inline-flex p-1 bg-muted rounded-lg border border-border w-full'>
              <button className='flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-background text-foreground rounded-md shadow-sm border border-border/50'>
                Data
              </button>
              <button className='flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors'>
                Logs
              </button>
            </div>
          </section>

          {/* BADGE GALLERY */}
          <section className='space-y-4'>
            <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
              Status Badges
            </h2>
            <div className='flex flex-wrap gap-2'>
              <span className='px-2 py-0.5 rounded-full text-xxs font-bold uppercase bg-primary text-primary-foreground'>
                Active
              </span>
              <span className='px-2 py-0.5 rounded-full text-xxs font-bold uppercase bg-secondary text-secondary-foreground'>
                Stable
              </span>
              <span className='px-2 py-0.5 rounded-full text-xxs font-bold uppercase bg-muted text-muted-foreground border border-border'>
                Pending
              </span>
              <span className='px-2 py-0.5 rounded-full text-xxs font-bold uppercase border border-primary text-primary'>
                Alert
              </span>
            </div>
          </section>
        </div>

        {/* --- RIGHT COLUMN: DATA & FEEDBACK --- */}
        <div className='lg:col-span-8 space-y-12'>
          {/* DATA TABLE TEMPLATE */}
          <section className='space-y-4'>
            <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
              Data Grid
            </h2>
            <div className='border rounded-lg overflow-hidden bg-background shadow-main'>
              <table className='w-full text-left text-sm border-collapse'>
                <thead className='bg-muted/50 border-b'>
                  <tr>
                    <th className='p-4 font-bold uppercase text-[11px] tracking-widest text-muted-foreground'>
                      Node ID
                    </th>
                    <th className='p-4 font-bold uppercase text-[11px] tracking-widest text-muted-foreground'>
                      Status
                    </th>
                    <th className='p-4 font-bold uppercase text-[11px] tracking-widest text-muted-foreground'>
                      Uptime
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y border-border'>
                  <tr className='hover:bg-muted/30 transition-colors'>
                    <td className='p-4 font-mono text-secondary'>#NX-9042</td>
                    <td className='p-4 text-xs font-bold'>
                      <span className='text-primary'>●</span> OPERATIONAL
                    </td>
                    <td className='p-4 text-muted-foreground'>99.8%</td>
                  </tr>
                  <tr className='hover:bg-muted/30 transition-colors'>
                    <td className='p-4 font-mono text-secondary'>#NX-8812</td>
                    <td className='p-4 text-xs font-bold'>
                      <span className='text-secondary'>●</span> STANDBY
                    </td>
                    <td className='p-4 text-muted-foreground'>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* EMPTY STATE / MODAL PREVIEW */}
          <section className='space-y-4'>
            <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
              Empty State / Overlay
            </h2>
            <div className='flex flex-col items-center justify-center p-12 rounded-lg border border-dashed border-border bg-muted/10 text-center space-y-4'>
              <div className='h-16 w-16 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-2xl border border-border'>
                ∅
              </div>
              <div className='space-y-1'>
                <h3 className='font-bold uppercase tracking-tight'>
                  No Active Deployments
                </h3>
                <p className='text-sm text-muted-foreground max-w-xs mx-auto'>
                  Initialize your first technical node to begin data collection.
                </p>
              </div>
              <button className='px-6 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold uppercase tracking-widest shadow-main hover:brightness-110 transition-all'>
                Create Node
              </button>
            </div>
          </section>
          {/* --- FORM CONTROLS --- */}
          <section className='space-y-4'>
            <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
              Command Inputs
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-lg bg-muted/20'>
              <div className='space-y-2'>
                <label className='text-xxs font-bold uppercase'>
                  Node Identifier
                </label>
                <input
                  type='text'
                  placeholder='e.g. NX-001'
                  className='w-full px-3 py-2 bg-background border border-input rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all'
                />
              </div>
              <div className='space-y-2'>
                <label className='text-xxs font-bold uppercase'>
                  Access Level
                </label>
                <select className='w-full px-3 py-2 bg-background border border-input rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring'>
                  <option>Level 01 (Read Only)</option>
                  <option>Level 02 (Read/Write)</option>
                  <option>Level 99 (Root)</option>
                </select>
              </div>
            </div>
          </section>
          {/* --- SYSTEM ALERTS --- */}
          <section className='space-y-4'>
            <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
              Incident Logs
            </h2>
            <div className='space-y-2'>
              <div className='flex items-center gap-4 p-3 border-l-4 border-l-destructive bg-destructive/10 rounded-r-md'>
                <span className='font-mono text-xs font-bold text-destructive uppercase tracking-widest'>
                  Critical:
                </span>
                <span className='text-sm font-medium'>
                  Core temperature exceeded safe threshold (Node #NX-9042)
                </span>
              </div>
              <div className='flex items-center gap-4 p-3 border-l-4 border-l-secondary bg-secondary/10 rounded-r-md'>
                <span className='font-mono text-xs font-bold text-secondary uppercase tracking-widest'>
                  Update:
                </span>
                <span className='text-sm font-medium'>
                  Security patch applied successfully to all instances.
                </span>
              </div>
            </div>
          </section>
          {/* --- TELEMETRY / METRIC CARDS --- */}
          <section className='space-y-4'>
            <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
              System Telemetry
            </h2>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
              {[
                { label: "CPU Load", value: "42.08%", status: "nominal" },
                { label: "Memory", value: "12.4GB", status: "nominal" },
                { label: "Latency", value: "14ms", status: "alert" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className='p-4 border rounded-lg bg-background shadow-main group hover:border-primary transition-colors'>
                  <div className='flex justify-between items-start'>
                    <span className='text-xxs font-bold uppercase text-muted-foreground'>
                      {stat.label}
                    </span>
                    <div
                      className={`h-2 w-2 rounded-full ${stat.status === "alert" ? "bg-destructive animate-pulse" : "bg-secondary"}`}
                    />
                  </div>
                  <div className='mt-2 flex items-baseline gap-2'>
                    <span className='text-2xl font-mono font-bold tracking-tighter'>
                      {stat.value}
                    </span>
                    <span className='text-xxs text-muted-foreground font-mono'>
                      0.002s_ref
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className='space-y-4'>
            <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
              Module Containers
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {/* Standard Module */}
              <div className='border rounded-xl bg-background shadow-main overflow-hidden'>
                <div className='px-4 py-2 border-b bg-muted/30 flex justify-between items-center'>
                  <span className='text-xxs font-bold uppercase tracking-wider'>
                    Storage Unit A
                  </span>
                  <span className='h-2 w-2 rounded-full bg-primary' />
                </div>
                <div className='p-6 space-y-4'>
                  <div className='flex justify-between items-end'>
                    <p className='text-3xl font-mono font-bold italic text-secondary'>
                      88%
                    </p>
                    <p className='text-xxs text-muted-foreground'>
                      VOL: 4.2TB / 5.0TB
                    </p>
                  </div>
                  <div className='w-full h-1 bg-muted rounded-full overflow-hidden'>
                    <div className='h-full bg-primary w-[88%]' />
                  </div>
                </div>
              </div>

              {/* Interactive/Hover Module */}
              <div className='group border border-border rounded-xl p-6 hover:border-secondary hover:bg-secondary/5 transition-all cursor-pointer relative overflow-hidden'>
                <div className='absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity'>
                  <span className='text-xl'>↗</span>
                </div>
                <h3 className='font-bold uppercase tracking-tight group-hover:text-secondary transition-colors'>
                  Network Protocols
                </h3>
                <p className='text-sm text-muted-foreground mt-2 leading-relaxed'>
                  Configure automated handshakes and encryption layers for
                  external node communication.
                </p>
                <div className='mt-4 flex gap-2'>
                  <div className='h-1 w-8 bg-secondary/30 rounded-full' />
                  <div className='h-1 w-8 bg-secondary/30 rounded-full' />
                  <div className='h-1 w-4 bg-secondary rounded-full' />
                </div>
              </div>
            </div>
          </section>
          <section className='space-y-4'>
            <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
              Command Units (Buttons)
            </h2>
            <div className='flex flex-wrap gap-4 items-center p-6 border rounded-lg bg-muted/5'>
              {/* Primary - Action */}
              <button className='px-5 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded shadow-main hover:brightness-110 active:scale-95 transition-all'>
                Execute Task
              </button>

              {/* Secondary - Neutral */}
              <button className='px-5 py-2 bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-widest rounded shadow-main hover:opacity-90 transition-all'>
                Sync Data
              </button>

              {/* Outline - Subtle */}
              <button className='px-5 py-2 border-2 border-border bg-transparent text-foreground text-xs font-bold uppercase tracking-widest rounded hover:bg-muted transition-all'>
                Bypass
              </button>

              {/* Ghost - Tertiary */}
              <button className='px-3 py-2 text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-widest transition-colors'>
                Cancel
              </button>

              {/* Destructive */}
              <button className='px-5 py-2 bg-destructive/10 border border-destructive/50 text-destructive text-xs font-bold uppercase tracking-widest rounded hover:bg-destructive hover:text-destructive-foreground transition-all'>
                Terminate
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
