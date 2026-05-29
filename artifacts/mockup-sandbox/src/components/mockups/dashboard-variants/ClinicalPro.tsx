import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X } from "lucide-react";

const kpis = { upcomingClasses:3, totalStudents:18, pendingRequests:2, certificatesIssued:14 };
const chartData = [{name:"CPR/AED",classes:5},{name:"Stop the Bleed",classes:2}];
const upcomingSchedule = [
  {id:1,name:"CPR — Seattle Fire Dept",date:"Jun 3",time:"9:00 AM",location:"Seattle"},
  {id:2,name:"CPR — WFLD",date:"Jun 10",time:"9:00 AM",location:"Chicago"},
  {id:3,name:"Stop the Bleed",date:"Jun 17",time:"1:00 PM",location:"Portland"}
];
const combinedFeed = [
  {type:"activity",id:1,msg:"New class CPR — WFLD scheduled",ago:"2h ago"},
  {type:"request",id:1,org:"Metro School District",cert:"Stop the Bleed",status:"pending",attendees:8,ago:"3h ago"},
  {type:"activity",id:2,msg:"Training request approved: City Hospital",ago:"3h ago"},
  {type:"request",id:2,org:"City Hospital",cert:"CPR / AED / First Aid",status:"approved",attendees:10,ago:"5h ago"},
  {type:"activity",id:3,msg:"14 students enrolled in CPR — Seattle",ago:"5h ago"},
  {type:"activity",id:4,msg:"Certificate issued: Jordan Kim",ago:"1d ago"},
  {type:"activity",id:5,msg:"New training request: Metro School District",ago:"1d ago"}
];

export function ClinicalPro() {
  return (
    <div className="min-h-screen flex w-full font-sans">
      {/* Left Column */}
      <div className="w-[320px] bg-slate-800 border-r border-slate-700 flex flex-col shrink-0 h-screen sticky top-0 text-slate-200">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <h1 className="font-mono font-bold text-lg text-white tracking-wide">OPERATIONS CONTROL</h1>
          </div>
          <p className="text-slate-400 font-mono text-xs">SYSTEM STATUS: NOMINAL</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            {/* KPIs */}
            <div className="space-y-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-slate-400">Key Metrics</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-slate-700 rounded-sm p-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-2">Upcoming</div>
                  <div className="font-mono text-2xl text-white tabular-nums">{kpis.upcomingClasses}</div>
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-sm p-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-2">Students</div>
                  <div className="font-mono text-2xl text-white tabular-nums">{kpis.totalStudents}</div>
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-sm p-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-2">Pending</div>
                  <div className="font-mono text-2xl text-sky-400 tabular-nums">{kpis.pendingRequests}</div>
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-sm p-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-2">Certs</div>
                  <div className="font-mono text-2xl text-white tabular-nums">{kpis.certificatesIssued}</div>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-700"></div>

            {/* Schedule */}
            <div className="space-y-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-slate-400">Upcoming Schedule</h2>
              <div className="space-y-2">
                {upcomingSchedule.map(item => (
                  <div key={item.id} className="bg-slate-900 border border-slate-700 rounded-sm p-3 hover:border-slate-500 transition-colors">
                    <div className="text-slate-200 text-sm font-medium mb-1 truncate">{item.name}</div>
                    <div className="font-mono text-[11px] text-slate-400">
                      {item.date} • {item.time} • {item.location}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-700"></div>

            {/* Chart */}
            <div className="space-y-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-slate-400">Cert Breakdown</h2>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#334155' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '2px', color: '#f8fafc', fontSize: '12px' }} />
                    <Bar dataKey="classes" radius={[2, 2, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'CPR/AED' ? '#0ea5e9' : '#475569'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Right Column */}
      <div className="flex-1 bg-white flex flex-col min-h-screen relative">
        <div className="sticky top-0 z-10 bg-white border-b-2 border-slate-200 p-6">
          <h2 className="text-slate-900 font-semibold text-xl mb-1">Operations Feed</h2>
          <p className="text-slate-500 text-xs font-mono">ACTIVITY & REQUESTS</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-8">
            <div className="relative border-l border-slate-200 ml-3 space-y-8 pb-12">
              {combinedFeed.map((item, idx) => {
                const isRequest = item.type === 'request';
                const isPending = isRequest && item.status === 'pending';
                const isApproved = isRequest && item.status === 'approved';
                
                let dotColorClass = "bg-slate-300";
                if (isPending) dotColorClass = "bg-sky-500";
                if (isApproved) dotColorClass = "bg-emerald-500";

                return (
                  <div key={`${item.type}-${item.id}-${idx}`} className="relative pl-8">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-sm ${dotColorClass}`}></div>
                    
                    <div className="mb-2">
                      <span className="font-mono text-xs text-slate-400">{item.ago}</span>
                    </div>

                    {isRequest ? (
                      <div className="bg-white border border-slate-200 rounded-sm relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isPending ? 'bg-sky-400' : 'bg-emerald-500'}`}></div>
                        <div className="p-4 pl-5">
                          <h3 className="text-slate-900 font-semibold text-base mb-1">{item.org}</h3>
                          <div className="font-mono text-xs text-slate-500 mb-4">
                            {item.cert} • {item.attendees} ATTENDEES
                          </div>
                          
                          {isPending && (
                            <div className="flex gap-2">
                              <button className="bg-sky-600 text-white rounded-sm px-4 py-1.5 text-xs font-medium tracking-wide flex items-center gap-1 hover:bg-sky-700 transition-colors">
                                <Check className="w-3.5 h-3.5" /> APPROVE
                              </button>
                              <button className="bg-white border border-slate-300 text-slate-600 rounded-sm px-4 py-1.5 text-xs font-medium flex items-center gap-1 hover:bg-slate-50 transition-colors">
                                <X className="w-3.5 h-3.5" /> DECLINE
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-sm relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-slate-300"></div>
                        <div className="p-3 pl-4">
                          <p className="text-slate-700 font-medium text-sm">{item.msg}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
