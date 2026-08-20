import React from "react";
import { Badge } from "../../ui/badge";
import { ScrollArea } from "../../ui/scroll-area";
import { BarChart, Bar, Cell, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, Users, FileText, Award, MapPin, Clock, Check, X, ShieldAlert, CheckCircle2, Activity } from "lucide-react";

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

export function WarmPro() {
  return (
    <div className="min-h-screen flex w-full font-sans" style={{background:"#fafaf9"}}>
      {/* Left Column */}
      <div className="w-[320px] shrink-0 h-screen sticky top-0 flex flex-col bg-stone-900 text-stone-300 border-r border-stone-800">
        <div className="p-6 shrink-0">
          <h1 className="text-2xl font-serif text-amber-100 font-medium tracking-wide">Operations Control</h1>
          <p className="text-stone-400 text-sm mt-1">Command dashboard</p>
        </div>
        
        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-amber-950/40 border border-amber-900/50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <Calendar className="w-5 h-5 text-amber-500 mb-2 opacity-80" />
              <div className="text-2xl font-semibold text-amber-100">{kpis.upcomingClasses}</div>
              <div className="text-xs text-amber-600/80 font-medium uppercase tracking-wider mt-1">Classes</div>
            </div>
            <div className="bg-amber-950/40 border border-amber-900/50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <Users className="w-5 h-5 text-amber-500 mb-2 opacity-80" />
              <div className="text-2xl font-semibold text-amber-100">{kpis.totalStudents}</div>
              <div className="text-xs text-amber-600/80 font-medium uppercase tracking-wider mt-1">Students</div>
            </div>
            <div className="bg-amber-950/40 border border-amber-900/50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <FileText className="w-5 h-5 text-amber-500 mb-2 opacity-80" />
              <div className="text-2xl font-semibold text-amber-400">{kpis.pendingRequests}</div>
              <div className="text-xs text-amber-600/80 font-medium uppercase tracking-wider mt-1">Pending Req</div>
            </div>
            <div className="bg-amber-950/40 border border-amber-900/50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <Award className="w-5 h-5 text-amber-500 mb-2 opacity-80" />
              <div className="text-2xl font-semibold text-amber-100">{kpis.certificatesIssued}</div>
              <div className="text-xs text-amber-600/80 font-medium uppercase tracking-wider mt-1">Certs Issued</div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">Upcoming Schedule</h2>
            <div className="space-y-3">
              {upcomingSchedule.map(item => (
                <div key={item.id} className="group bg-stone-800/40 hover:bg-stone-800 rounded-lg p-3 transition-colors border border-transparent hover:border-stone-700">
                  <div className="font-medium text-amber-100/90 group-hover:text-amber-300 transition-colors text-sm truncate mb-1.5">{item.name}</div>
                  <div className="flex items-center text-xs text-stone-400 gap-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-800 pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">Cert Type Breakdown</h2>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#78716c', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c', borderRadius: '6px', color: '#f5f5f4', fontSize: '12px' }} />
                  <Bar dataKey="classes" radius={[4, 4, 0, 0]}>
                    {
                      chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#57534e'} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Right Column */}
      <div className="flex-1 h-screen flex flex-col bg-stone-50">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-stone-200 px-8 py-6">
          <h2 className="text-xl font-semibold text-stone-800">Operations Feed</h2>
          <p className="text-sm text-stone-500 mt-1">Timeline of activities and requests</p>
        </div>

        <ScrollArea className="flex-1 px-8 py-6">
          <div className="relative pl-6 before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-stone-300 max-w-3xl">
            {combinedFeed.map((item, i) => (
              <div key={i} className="relative mb-8 last:mb-0">
                {/* Timeline Dot */}
                <div className={`absolute -left-6 mt-1.5 w-2.5 h-2.5 rounded-full border-2 border-stone-50 z-10 ${
                  item.type === 'activity' ? 'bg-stone-300' :
                  item.status === 'pending' ? 'bg-amber-400' : 'bg-emerald-500'
                }`} style={{ transform: 'translateX(-2px)' }} />
                
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs font-medium text-stone-400">{item.ago}</span>
                </div>

                {item.type === 'activity' ? (
                  <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm shadow-stone-200/50">
                    <div className="text-sm text-stone-700 font-medium flex items-start gap-2">
                      <Activity className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
                      <span>{item.msg}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm shadow-stone-200/50">
                    <div className="p-5 border-b border-stone-100">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-base font-semibold text-stone-900">{item.org}</h3>
                          <div className="text-sm text-stone-500 mt-1 flex items-center gap-4">
                            <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {item.cert}</span>
                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {item.attendees} attendees</span>
                          </div>
                        </div>
                        {item.status === 'pending' ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs py-0.5"><ShieldAlert className="w-3 h-3 mr-1" /> Pending</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs py-0.5"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>
                        )}
                      </div>
                    </div>
                    {item.status === 'pending' && (
                      <div className="bg-stone-50/50 p-4 flex justify-end gap-3">
                        <button className="px-4 py-1.5 text-sm font-medium text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-1.5">
                          <X className="w-4 h-4" /> Decline
                        </button>
                        <button className="px-4 py-1.5 text-sm font-medium text-white bg-amber-600 border border-amber-700 rounded-lg hover:bg-amber-700 transition-colors shadow-sm flex items-center gap-1.5">
                          <Check className="w-4 h-4" /> Approve
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
