import React from "react";
import { 
  HeartPulse, 
  LayoutDashboard, 
  CalendarDays, 
  Inbox, 
  Users, 
  Award, 
  GraduationCap,
  MapPin,
  Clock,
  User,
  ChevronRight
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";

const chartData = [
  { name: "CPR/AED", value: 3 },
  { name: "Stop the Bleed", value: 1 },
];

export function SoftMedical() {
  return (
    <div className="min-h-screen flex flex-col" style={{background:"#f8fafc",fontFamily:"sans-serif"}}>
      {/* HEADER */}
      <header className="sticky top-0 z-10 h-14 bg-white border-b border-teal-100 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
            <HeartPulse size={18} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-800 font-bold leading-tight">PulsePoint</span>
            <span className="text-teal-400 uppercase tracking-widest text-[9px] font-semibold leading-tight">CPR Training Hub</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 px-2 py-1 bg-teal-50 border border-teal-200 rounded-full">
          <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">
            KB
          </div>
          <div className="flex flex-col pr-2">
            <span className="text-teal-900 text-[10px] font-semibold leading-none">Kara Becht</span>
            <span className="text-teal-700 text-[9px] leading-none mt-0.5">Administrator</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="hidden md:flex w-56 bg-white border-r border-slate-100 flex-col py-4 px-3">
          <nav className="flex-1 space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-teal-700 bg-teal-50 rounded-md font-medium text-sm">
              <LayoutDashboard size={18} />
              Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-md font-medium text-sm transition-colors">
              <CalendarDays size={18} />
              Classes
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-md font-medium text-sm transition-colors">
              <Inbox size={18} />
              Requests
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-md font-medium text-sm transition-colors">
              <Users size={18} />
              People
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-md font-medium text-sm transition-colors">
              <Award size={18} />
              Certificates
            </a>
          </nav>
          
          <div className="mt-auto pt-4 border-t border-slate-300 flex items-start gap-2">
            <GraduationCap size={16} className="text-teal-300 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">Saving Lives</span>
              <span className="text-slate-400 text-[10px]">One class at a time.</span>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-[1400px] mx-auto space-y-8">
            
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Operations dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">Real-time view of classes, students, and incoming training requests.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="rounded-xl bg-white border-slate-100 shadow-sm border-t-0" style={{ borderTop: "4px solid #0d9488" }}>
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 text-[11px] uppercase tracking-widest font-medium">Upcoming Classes</span>
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <CalendarDays size={16} />
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-800 text-3xl font-bold tabular-nums">2</div>
                    <div className="text-slate-400 text-xs mt-1">3 total scheduled</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-white border-slate-100 shadow-sm border-t-0" style={{ borderTop: "4px solid #d946ef" }}>
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 text-[11px] uppercase tracking-widest font-medium">Active Students</span>
                    <div className="w-8 h-8 rounded-lg bg-fuchsia-50 text-fuchsia-500 flex items-center justify-center">
                      <Users size={16} />
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-800 text-3xl font-bold tabular-nums">0</div>
                    <div className="text-slate-400 text-xs mt-1">no class in session</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-white border-slate-100 shadow-sm border-t-0" style={{ borderTop: "4px solid #f59e0b" }}>
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 text-[11px] uppercase tracking-widest font-medium">Pending Requests</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                      <Inbox size={16} />
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-800 text-3xl font-bold tabular-nums">0</div>
                    <div className="text-slate-400 text-xs mt-1">Awaiting scheduling</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-white border-slate-100 shadow-sm border-t-0" style={{ borderTop: "4px solid #059669" }}>
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 text-[11px] uppercase tracking-widest font-medium">Certificates Issued</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Award size={16} />
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-800 text-3xl font-bold tabular-nums">0</div>
                    <div className="text-slate-400 text-xs mt-1">0 enrollments this month</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Middle Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <Card className="rounded-xl bg-white border-slate-100 shadow-sm col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-700 text-sm font-semibold">Classes by certification</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#94a3b8' }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#94a3b8' }}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="#0d9488" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Live Activity */}
              <Card className="rounded-xl bg-white border-slate-100 shadow-sm col-span-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-slate-600 text-sm font-medium">Live activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      "New class CPR-WFLD scheduled",
                      "New class CPR scheduled",
                      "New class Test scheduled",
                      "Test requested stop the bleed training"
                    ].map((activity, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-slate-600 text-sm leading-snug">{activity}</span>
                          <span className="text-slate-400 text-xs mt-0.5">2d ago</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Schedule */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-700 text-lg font-semibold">Upcoming schedule</h2>
                <a href="#" className="text-teal-600 text-sm font-medium flex items-center hover:text-teal-700 transition-colors">
                  View all classes <ChevronRight size={14} className="ml-1" />
                </a>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "CPR", date: "Wed Jun 3 2026", location: "Seattle" },
                  { title: "CPR-WFLD", date: "Wed Jun 10 2026", location: "Chicago" }
                ].map((cls, i) => (
                  <Card key={i} className="rounded-xl bg-white border-slate-100 shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="border-teal-200 text-teal-700 bg-teal-50 text-[10px] uppercase font-semibold tracking-wider rounded-md px-2 py-0.5">
                            CPR/AED
                          </Badge>
                          <Badge className="bg-teal-600 text-white hover:bg-teal-700 text-[10px] uppercase font-semibold tracking-wider rounded-md px-2 py-0.5 border-none">
                            SCHEDULED
                          </Badge>
                        </div>
                        
                        <h3 className="text-slate-800 font-semibold text-lg mb-4">{cls.title}</h3>
                        
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                          <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <CalendarDays size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate">{cls.date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <Clock size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate">9:00 AM</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <MapPin size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate">{cls.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <User size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate">Amy Abrams</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 border-t border-slate-100 p-3 px-5 text-xs text-slate-500 flex items-center justify-between">
                        <span>0 / 10 enrolled</span>
                        <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-400 w-0"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recent Requests */}
            <div>
              <h2 className="text-slate-700 text-lg font-semibold mb-4">Recent training requests</h2>
              <Card className="rounded-xl bg-white border-slate-100 shadow-sm">
                <CardContent className="p-0 divide-y divide-slate-100">
                  <div className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                      <GraduationCap size={18} className="text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="border-rose-100 text-rose-700 bg-rose-50 text-[10px] uppercase font-semibold tracking-wider rounded-md px-2 py-0.5">
                          REJECTED
                        </Badge>
                        <h4 className="text-slate-700 font-medium text-sm truncate">Test — Stop the Bleed</h4>
                      </div>
                      <div className="text-slate-400 text-xs">
                        5 attendees · preferred Wed. Jul 1, 2026
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}
