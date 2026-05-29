import React from "react";
import {
  HeartPulse,
  LayoutDashboard,
  CalendarDays,
  Inbox,
  Users,
  Award,
  GraduationCap,
  ArrowRight,
  Clock,
  MapPin,
  User as UserIcon,
  Circle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card } from "../../ui/card";
import { Badge } from "../../ui/badge";

const chartData = [
  { name: "CPR/AED", value: 3 },
  { name: "Stop the Bleed", value: 1 },
];

export function SlateSage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#f8f7f5", fontFamily: "sans-serif" }}
    >
      {/* HEADER */}
      <header className="sticky top-0 z-10 h-14 bg-stone-900 border-b border-stone-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#4a7c59] p-1.5 rounded text-white">
            <HeartPulse size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold leading-tight">PulsePoint</span>
            <span className="text-stone-400 text-[10px] uppercase tracking-wider font-semibold leading-tight">
              CPR Training Hub
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-white leading-tight">
              Kara Becht
            </span>
            <span className="text-xs text-stone-400 leading-tight">
              Administrator
            </span>
          </div>
          <div className="h-8 w-8 rounded-full bg-stone-700 flex items-center justify-center text-stone-300 text-sm font-medium">
            KB
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-56 hidden md:flex flex-col border-r border-stone-200 bg-stone-100">
          <div className="flex-1 py-4 px-3 space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-emerald-50 text-emerald-800 relative">
              <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-emerald-700 rounded-r-md"></div>
              <LayoutDashboard size={18} />
              <span className="font-medium text-sm">Dashboard</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-stone-600 hover:bg-stone-200 transition-colors">
              <CalendarDays size={18} />
              <span className="font-medium text-sm">Classes</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-stone-600 hover:bg-stone-200 transition-colors">
              <Inbox size={18} />
              <span className="font-medium text-sm">Requests</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-stone-600 hover:bg-stone-200 transition-colors">
              <Users size={18} />
              <span className="font-medium text-sm">People</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-stone-600 hover:bg-stone-200 transition-colors">
              <Award size={18} />
              <span className="font-medium text-sm">Certificates</span>
            </button>
          </div>
          <div className="p-4 border-t border-stone-200">
            <div className="flex items-center gap-2 text-stone-400 mb-1">
              <GraduationCap size={16} />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Saving Lives
              </span>
            </div>
            <p className="text-xs text-stone-400 pl-6">One class at a time.</p>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                Operations dashboard
              </h1>
              <p className="text-stone-500 mt-1">
                Real-time view of classes, students, and incoming training requests.
              </p>
            </div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white border-stone-200 p-5 rounded-xl shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-stone-500 uppercase text-xs font-semibold tracking-wider">
                      Upcoming Classes
                    </p>
                    <p className="text-3xl font-bold text-stone-900 mt-2">2</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CalendarDays size={20} />
                  </div>
                </div>
                <p className="text-sm text-stone-500 mt-4">3 total scheduled</p>
              </Card>

              <Card className="bg-white border-stone-200 p-5 rounded-xl shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-stone-500 uppercase text-xs font-semibold tracking-wider">
                      Active Students
                    </p>
                    <p className="text-3xl font-bold text-stone-900 mt-2">0</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
                    <Users size={20} />
                  </div>
                </div>
                <p className="text-sm text-stone-500 mt-4">no class in session</p>
              </Card>

              <Card className="bg-white border-stone-200 p-5 rounded-xl shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-stone-500 uppercase text-xs font-semibold tracking-wider">
                      Pending Requests
                    </p>
                    <p className="text-3xl font-bold text-stone-900 mt-2">0</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Inbox size={20} />
                  </div>
                </div>
                <p className="text-sm text-stone-500 mt-4">Awaiting scheduling</p>
              </Card>

              <Card className="bg-white border-stone-200 p-5 rounded-xl shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-stone-500 uppercase text-xs font-semibold tracking-wider">
                      Certificates Issued
                    </p>
                    <p className="text-3xl font-bold text-stone-900 mt-2">0</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
                    <Award size={20} />
                  </div>
                </div>
                <p className="text-sm text-stone-500 mt-4">0 enrollments this month</p>
              </Card>
            </div>

            {/* MIDDLE ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-white border-stone-200 p-6 rounded-xl shadow-sm">
                <h3 className="text-lg font-semibold text-stone-900 mb-6">
                  Classes by certification
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#78716c', fontSize: 12 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#78716c', fontSize: 12 }}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f5f5f4' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" fill="#4a7c59" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="bg-white border-stone-200 p-6 rounded-xl shadow-sm flex flex-col">
                <h3 className="text-lg font-semibold text-stone-900 mb-6">
                  Live activity
                </h3>
                <div className="space-y-6 flex-1">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Circle size={10} className="fill-emerald-600 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-stone-700">New class CPR-WFLD scheduled</p>
                      <p className="text-xs text-stone-400 mt-1">2d ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Circle size={10} className="fill-emerald-600 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-stone-700">New class CPR scheduled</p>
                      <p className="text-xs text-stone-400 mt-1">2d ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Circle size={10} className="fill-emerald-600 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-stone-700">New class Test scheduled</p>
                      <p className="text-xs text-stone-400 mt-1">2d ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Circle size={10} className="fill-emerald-600 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-stone-700">Test requested stop the bleed training</p>
                      <p className="text-xs text-stone-400 mt-1">2d ago</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* UPCOMING SCHEDULE */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-stone-900">Upcoming schedule</h3>
                <button className="text-sm font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                  View all classes <ArrowRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CLASS 1 */}
                <Card className="bg-white border-stone-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                  <div className="p-5 flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="text-stone-600 border-stone-200 font-medium">
                        CPR/AED
                      </Badge>
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-medium">
                        Scheduled
                      </Badge>
                    </div>
                    <h4 className="text-xl font-bold text-stone-900 mb-4">CPR</h4>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-stone-500">
                        <CalendarDays size={16} />
                        <span>Wed Jun 3 2026</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-stone-500">
                        <Clock size={16} />
                        <span>9:00 AM</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-stone-500">
                        <MapPin size={16} />
                        <span>Seattle</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-stone-500">
                        <UserIcon size={16} />
                        <span>Amy Abrams</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-stone-50 px-5 py-3 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-700">0 / 10 enrolled</span>
                    <button className="text-sm font-medium text-emerald-700">View roster</button>
                  </div>
                </Card>

                {/* CLASS 2 */}
                <Card className="bg-white border-stone-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                  <div className="p-5 flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="text-stone-600 border-stone-200 font-medium">
                        CPR/AED
                      </Badge>
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-medium">
                        Scheduled
                      </Badge>
                    </div>
                    <h4 className="text-xl font-bold text-stone-900 mb-4">CPR-WFLD</h4>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-stone-500">
                        <CalendarDays size={16} />
                        <span>Wed Jun 10 2026</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-stone-500">
                        <Clock size={16} />
                        <span>9:00 AM</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-stone-500">
                        <MapPin size={16} />
                        <span>Chicago</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-stone-500">
                        <UserIcon size={16} />
                        <span>Amy Abrams</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-stone-50 px-5 py-3 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-700">0 / 10 enrolled</span>
                    <button className="text-sm font-medium text-emerald-700">View roster</button>
                  </div>
                </Card>
              </div>
            </div>

            {/* RECENT REQUESTS */}
            <div>
              <h3 className="text-lg font-semibold text-stone-900 mb-4">Recent training requests</h3>
              <Card className="bg-white border-stone-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 flex-shrink-0">
                    <GraduationCap size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-none text-[10px] uppercase font-bold tracking-wider px-2 py-0">
                        Rejected
                      </Badge>
                      <h4 className="text-sm font-semibold text-stone-900 truncate">Test — Stop the Bleed</h4>
                    </div>
                    <p className="text-xs text-stone-500">5 attendees · preferred Wed. Jul 1, 2026</p>
                  </div>
                  <button className="text-stone-400 hover:text-stone-600 px-2">
                    <ArrowRight size={20} />
                  </button>
                </div>
              </Card>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
