import React from "react";
import { 
  CalendarDays, 
  Users, 
  Inbox, 
  Award, 
  Dot, 
  MapPin, 
  Clock 
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Badge } from "@/components/ui/badge";

const chartData = [
  { name: "CPR/AED", classes: 5 },
  { name: "Stop the Bleed", classes: 2 }
];

const upcomingSchedule = [
  { id: 1, name: "CPR — Seattle Fire Dept", cert: "CPR/AED", date: "Jun 3", time: "9:00 AM", location: "Seattle", enrolled: 4, capacity: 10 },
  { id: 2, name: "CPR — WFLD", cert: "CPR/AED", date: "Jun 10", time: "9:00 AM", location: "Chicago", enrolled: 2, capacity: 10 },
  { id: 3, name: "Stop the Bleed", cert: "STB", date: "Jun 17", time: "1:00 PM", location: "Portland", enrolled: 7, capacity: 10 },
  { id: 4, name: "CPR — Austin EMS", cert: "CPR/AED", date: "Jun 24", time: "8:00 AM", location: "Austin", enrolled: 0, capacity: 10 }
];

const activityFeed = [
  { id: 1, msg: "CPR — WFLD class created", ago: "2h" },
  { id: 2, msg: "City Hospital request approved", ago: "3h" },
  { id: 3, msg: "14 enrolled: CPR — Seattle", ago: "5h" },
  { id: 4, msg: "Certificate: Jordan Kim", ago: "1d" },
  { id: 5, msg: "New request: Metro Schools", ago: "1d" },
  { id: 6, msg: "Class CPR — Austin EMS scheduled", ago: "2d" }
];

const recentRequests = [
  { id: 1, org: "City Hospital", cert: "CPR/AED", status: "approved", attendees: 10, date: "Jun 5" },
  { id: 2, org: "Metro School District", cert: "STB", status: "pending", attendees: 8, date: "Jun 20" },
  { id: 3, org: "Fire Station 7", cert: "CPR/AED", status: "pending", attendees: 6, date: "Jul 1" }
];

export function DenseOps() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 flex flex-col gap-3 font-mono text-sm overflow-hidden">
      {/* Header & KPI Ribbon */}
      <div className="border border-zinc-800 rounded bg-zinc-900/50 p-2 flex items-center justify-between">
        <div className="flex items-center gap-2 pr-6 border-r border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-zinc-300 tracking-wider">OPS_TERM</span>
        </div>
        
        <div className="flex items-center flex-1 justify-around px-4">
          <div className="flex flex-col items-center">
            <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Upcoming</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-zinc-100">3</span>
              <span className="text-zinc-600 text-xs">/7</span>
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          
          <div className="flex flex-col items-center">
            <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Students</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-blue-400">18</span>
              <span className="text-zinc-600 text-xs">+6</span>
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          
          <div className="flex flex-col items-center">
            <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Pending</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-amber-400">2</span>
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          
          <div className="flex flex-col items-center">
            <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Certificates</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-emerald-400">14</span>
            </div>
          </div>
        </div>
        
        <div className="pl-6 border-l border-zinc-800 text-right">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">System</div>
          <div className="text-xs text-zinc-300">ONLINE</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
        
        {/* Left Column: Schedule */}
        <div className="border border-zinc-800 rounded bg-zinc-900/30 flex flex-col min-h-0">
          <div className="border-b border-zinc-800 p-2 bg-zinc-900/80 text-xs text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5" /> Upcoming Schedule
          </div>
          <div className="p-2 overflow-y-auto flex-1 space-y-2">
            {upcomingSchedule.map((item) => (
              <div key={item.id} className="border border-zinc-800/60 bg-zinc-900/40 p-2 rounded hover:border-zinc-700 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-semibold text-zinc-200 text-xs truncate pr-2">{item.name}</div>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-zinc-950/50 text-blue-400 border-blue-900/50 rounded-sm">
                    {item.cert}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-zinc-500 mt-2">
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-zinc-600" />
                    <span>{item.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-600" />
                    <span>{item.time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-zinc-600" />
                    <span className="truncate">{item.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-zinc-600" />
                    <span>{item.enrolled}/{item.capacity}</span>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="mt-2 h-1 bg-zinc-950 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.enrolled === item.capacity ? 'bg-emerald-500' : 'bg-blue-500/70'}`}
                    style={{ width: `${(item.enrolled / item.capacity) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Column: Charts & Requests */}
        <div className="flex flex-col gap-3 min-h-0">
          
          <div className="border border-zinc-800 rounded bg-zinc-900/30 flex-1 flex flex-col min-h-0">
            <div className="border-b border-zinc-800 p-2 bg-zinc-900/80 text-xs text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Award className="w-3.5 h-3.5" /> Certification Mix
            </div>
            <div className="p-4 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#27272a', opacity: 0.4}}
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '12px' }}
                  />
                  <Bar dataKey="classes" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-zinc-800 rounded bg-zinc-900/30 flex-1 flex flex-col min-h-0">
            <div className="border-b border-zinc-800 p-2 bg-zinc-900/80 text-xs text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Inbox className="w-3.5 h-3.5" /> Recent Requests
            </div>
            <div className="p-2 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800/50">
                    <th className="font-normal pb-2 px-1">Org</th>
                    <th className="font-normal pb-2 px-1 text-center">Status</th>
                    <th className="font-normal pb-2 px-1 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {recentRequests.map(req => (
                    <tr key={req.id} className="hover:bg-zinc-800/20">
                      <td className="py-2 px-1">
                        <div className="text-zinc-300 truncate max-w-[120px]">{req.org}</div>
                        <div className="text-[9px] text-zinc-600 mt-0.5">{req.cert} • {req.attendees} pax</div>
                      </td>
                      <td className="py-2 px-1 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                          req.status === 'approved' ? 'bg-emerald-950/50 text-emerald-400' : 'bg-amber-950/50 text-amber-400'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-right text-zinc-500 text-[10px]">
                        {req.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Activity Feed */}
        <div className="border border-zinc-800 rounded bg-zinc-900/30 flex flex-col min-h-0">
          <div className="border-b border-zinc-800 p-2 bg-zinc-900/80 text-xs text-zinc-400 uppercase tracking-widest flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Dot className="w-5 h-5 text-emerald-500 -ml-1" /> Activity
            </div>
            <span className="text-[9px] text-zinc-600">LIVE</span>
          </div>
          <div className="p-0 overflow-y-auto flex-1">
            <div className="relative pl-6 pt-4 pb-4 border-l border-zinc-800/50 ml-4 space-y-6">
              {activityFeed.map((event, idx) => (
                <div key={event.id} className="relative">
                  <div className="absolute -left-[31px] top-1 w-2 h-2 rounded-full bg-zinc-700 border-2 border-zinc-950" />
                  <div className="text-[10px] text-zinc-500 mb-0.5">{event.ago}</div>
                  <div className="text-xs text-zinc-300 pr-4">{event.msg}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
