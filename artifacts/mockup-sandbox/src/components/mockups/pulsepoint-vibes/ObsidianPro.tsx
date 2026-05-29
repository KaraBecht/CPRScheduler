import React from 'react';
import { 
  HeartPulse, 
  LayoutDashboard, 
  CalendarDays, 
  Inbox, 
  Users, 
  Award,
  GraduationCap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const chartData = [
  { name: 'CPR/AED', count: 3 },
  { name: 'Stop the Bleed', count: 1 },
];

export function ObsidianPro() {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "sans-serif" }}>
      {/* HEADER */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-600">
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold leading-tight tracking-tight">PulsePoint</span>
            <span className="text-[10px] font-medium leading-none tracking-wider text-zinc-500">CPR TRAINING HUB</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-700 text-xs font-medium text-zinc-200">
            KB
          </div>
          <div className="hidden flex-col md:flex">
            <span className="text-xs font-medium leading-none text-zinc-200">Kara Becht</span>
            <span className="text-[10px] leading-none text-zinc-400 mt-0.5">Administrator</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="hidden w-56 flex-col border-r border-zinc-800 bg-zinc-900 md:flex">
          <nav className="flex-1 space-y-1 px-3 py-4 text-sm font-medium">
            <a href="#" className="flex items-center gap-3 rounded-md bg-violet-600/20 px-3 py-2 text-violet-300">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 rounded-md px-3 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
              <CalendarDays className="h-4 w-4" />
              Classes
            </a>
            <a href="#" className="flex items-center gap-3 rounded-md px-3 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
              <Inbox className="h-4 w-4" />
              Requests
            </a>
            <a href="#" className="flex items-center gap-3 rounded-md px-3 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
              <Users className="h-4 w-4" />
              People
            </a>
            <a href="#" className="flex items-center gap-3 rounded-md px-3 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
              <Award className="h-4 w-4" />
              Certificates
            </a>
          </nav>
          
          <div className="border-t border-zinc-700 p-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-zinc-500" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Saving Lives</p>
                <p className="text-xs text-zinc-500">One class at a time.</p>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
            
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Operations dashboard</h1>
              <p className="mt-1 text-sm text-zinc-500">Real-time view of classes, students, and incoming training requests.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="flex flex-col justify-between rounded-md border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Upcoming Classes</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-100 text-violet-600">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold tabular-nums text-zinc-950">2</div>
                  <div className="mt-1 text-xs text-zinc-500">3 total scheduled</div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-md border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Active Students</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-fuchsia-100 text-fuchsia-600">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold tabular-nums text-zinc-950">0</div>
                  <div className="mt-1 text-xs text-zinc-500">no class in session</div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-md border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Pending Requests</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 text-amber-600">
                    <Inbox className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold tabular-nums text-zinc-950">0</div>
                  <div className="mt-1 text-xs text-zinc-500">Awaiting scheduling</div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-md border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Certificates Issued</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                    <Award className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold tabular-nums text-zinc-950">0</div>
                  <div className="mt-1 text-xs text-zinc-500">0 enrollments this month</div>
                </div>
              </div>
            </div>

            {/* Middle Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="col-span-2 rounded-md border border-zinc-100 bg-white p-4 shadow-sm flex flex-col">
                <h3 className="text-sm font-semibold text-zinc-900 mb-4">Classes by certification</h3>
                <div className="h-[250px] w-full mt-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                      <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-span-1 rounded-md border border-zinc-100 bg-white p-4 shadow-sm flex flex-col">
                <h3 className="text-sm font-semibold text-zinc-700 mb-4">Live activity</h3>
                <div className="space-y-4 flex-1">
                  {[
                    "New class CPR-WFLD scheduled",
                    "New class CPR scheduled",
                    "New class Test scheduled",
                    "Test requested stop the bleed training"
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                      <div>
                        <p className="text-sm text-zinc-700">{text}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">2d ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Upcoming Schedule */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-900">Upcoming schedule</h2>
                <a href="#" className="text-sm font-medium text-violet-600 hover:text-violet-700">View all classes &rarr;</a>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                
                {/* Class Card 1 */}
                <div className="rounded-md border border-zinc-100 bg-white shadow-sm flex flex-col">
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <span className="rounded border border-zinc-300 px-2 py-0.5 text-[10px] font-medium text-zinc-600 uppercase tracking-wide">
                        CPR/AED
                      </span>
                      <span className="rounded bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 uppercase tracking-wide">
                        Scheduled
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 mb-2">CPR</h3>
                    <div className="space-y-1.5 text-sm text-zinc-500">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 shrink-0" />
                        <span>Wed Jun 3 2026, 9:00 AM</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0" />
                        <span>Instructor: Amy Abrams</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-zinc-100 bg-zinc-50/50 p-3 px-4 flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-900">Seattle</span>
                    <span className="text-zinc-500">0/10 enrolled</span>
                  </div>
                </div>

                {/* Class Card 2 */}
                <div className="rounded-md border border-zinc-100 bg-white shadow-sm flex flex-col">
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <span className="rounded border border-zinc-300 px-2 py-0.5 text-[10px] font-medium text-zinc-600 uppercase tracking-wide">
                        CPR/AED
                      </span>
                      <span className="rounded bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 uppercase tracking-wide">
                        Scheduled
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 mb-2">CPR-WFLD</h3>
                    <div className="space-y-1.5 text-sm text-zinc-500">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 shrink-0" />
                        <span>Wed Jun 10 2026, 9:00 AM</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0" />
                        <span>Instructor: Amy Abrams</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-zinc-100 bg-zinc-50/50 p-3 px-4 flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-900">Chicago</span>
                    <span className="text-zinc-500">0/10 enrolled</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Recent Training Requests */}
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Recent training requests</h2>
              <div className="rounded-md border border-zinc-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 p-4 hover:bg-zinc-50 transition-colors cursor-pointer">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-semibold text-zinc-800 truncate">Test — Stop the Bleed</h4>
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 uppercase tracking-wide shrink-0">
                        Rejected
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">5 attendees · preferred Wed. Jul 1, 2026</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
