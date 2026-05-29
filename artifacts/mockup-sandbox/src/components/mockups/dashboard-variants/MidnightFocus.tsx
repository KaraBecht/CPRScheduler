import React from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { 
  Activity, Users, FileText, Award, Calendar, MapPin, Clock, CheckCircle, Clock3, Search, Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

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

export function MidnightFocus() {
  return (
    <div className="min-h-screen flex w-full font-sans" style={{background:"#0d0d1f",color:"#e0e0ff"}}>
      {/* Left panel */}
      <div className="w-[320px] flex flex-col shrink-0 border-r" style={{background:"#0f0f23", borderColor: "#3730a3"}}>
        {/* Header */}
        <div className="p-6 border-b" style={{borderColor: "#3730a3"}}>
          <h1 className="text-xl font-bold text-white flex items-center">
            <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 6px #22c55e",marginRight:8}} />
            Operations Control
          </h1>
          <p className="text-sm mt-1" style={{color: "#818cf8"}}>Night-shift monitoring active</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            {/* KPIs */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{color: "#818cf8"}}>Live Metrics</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border" style={{background: "#1a1a3e", borderColor: "#4338ca"}}>
                  <div className="flex items-center gap-2 mb-2" style={{color: "#818cf8"}}>
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Classes</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{kpis.upcomingClasses}</div>
                </div>
                <div className="p-3 rounded-lg border" style={{background: "#1a1a3e", borderColor: "#4338ca"}}>
                  <div className="flex items-center gap-2 mb-2" style={{color: "#818cf8"}}>
                    <Users className="w-4 h-4" />
                    <span className="text-xs">Students</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{kpis.totalStudents}</div>
                </div>
                <div className="p-3 rounded-lg border" style={{background: "#1a1a3e", borderColor: "#4338ca"}}>
                  <div className="flex items-center gap-2 mb-2" style={{color: "#818cf8"}}>
                    <FileText className="w-4 h-4" />
                    <span className="text-xs">Pending Req</span>
                  </div>
                  <div className="text-2xl font-bold" style={{color: "#c084fc"}}>{kpis.pendingRequests}</div>
                </div>
                <div className="p-3 rounded-lg border" style={{background: "#1a1a3e", borderColor: "#4338ca"}}>
                  <div className="flex items-center gap-2 mb-2" style={{color: "#818cf8"}}>
                    <Award className="w-4 h-4" />
                    <span className="text-xs">Certs Issued</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{kpis.certificatesIssued}</div>
                </div>
              </div>
            </div>

            <div className="h-px w-full" style={{background: "#3730a3"}} />

            {/* Schedule */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{color: "#818cf8"}}>Upcoming Schedule</h2>
              <div className="space-y-3">
                {upcomingSchedule.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg border transition-colors group hover:border-violet-500/50" style={{background: "#1a1a3e", borderColor: "#3730a3"}}>
                    <div className="font-medium mb-2 group-hover:text-violet-300 transition-colors" style={{color: "#e0e7ff"}}>{item.name}</div>
                    <div className="flex items-center gap-3 text-xs" style={{color: "#818cf8"}}>
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3"/>{item.date}</div>
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3"/>{item.time}</div>
                      <div className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{item.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px w-full" style={{background: "#3730a3"}} />

            {/* Chart */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{color: "#818cf8"}}>Cert Type Breakdown</h2>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{top:0,right:0,left:-20,bottom:0}}>
                    <XAxis dataKey="name" stroke="#818cf8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#818cf8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: '#3730a3', opacity: 0.4}}
                      contentStyle={{backgroundColor: '#1a1a3e', borderColor: '#4338ca', color: '#e0e7ff', fontSize: '12px'}}
                    />
                    <Bar dataKey="classes" radius={[2,2,0,0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === "CPR/AED" ? "#8b5cf6" : "#4338ca"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0" style={{background: "#13132a"}}>
        <div className="p-6 border-b flex justify-between items-center sticky top-0 z-10" style={{background: "#0d0d1f", borderColor: "#3730a3"}}>
          <div>
            <h1 className="text-xl font-bold text-white">Operations Feed</h1>
            <p className="text-sm mt-1" style={{color: "#818cf8"}}>Real-time system events</p>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="outline" className="border-indigo-800 bg-indigo-950/50 hover:bg-indigo-900 text-indigo-300">
              <Search className="w-4 h-4" />
            </Button>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white" style={{boxShadow: "0 0 10px rgba(139,92,246,0.3)"}}>
              <Plus className="w-4 h-4 mr-2" /> New Request
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto relative pl-8 pb-10">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-4 bottom-0 w-px" style={{background: "#3730a3"}} />

            <div className="space-y-6">
              {combinedFeed.map((item, idx) => {
                if (item.type === "activity") {
                  return (
                    <div key={`act-${item.id}-${idx}`} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[30px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 z-10" 
                           style={{background: "#13132a", borderColor: "#3730a3"}}>
                        <Activity className="w-3 h-3" style={{color: "#818cf8"}} />
                      </div>
                      
                      <div className="mb-1 text-xs" style={{color: "#6366f1"}}>{item.ago}</div>
                      <div className="p-4 rounded-lg border relative overflow-hidden" style={{background: "#1a1a3e", borderColor: "#3730a3"}}>
                        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-indigo-950 to-transparent pointer-events-none" />
                        <div className="relative text-sm" style={{color: "#c7d2fe"}}>{item.msg}</div>
                      </div>
                    </div>
                  );
                } else {
                  // Request card
                  const isPending = item.status === "pending";
                  const dotColor = isPending ? "#8b5cf6" : "#10b981";
                  const dotShadow = isPending ? "0 0 8px #8b5cf6" : "0 0 8px #10b981";
                  const borderColor = isPending ? "#8b5cf6" : "#10b981";
                  
                  return (
                    <div key={`req-${item.id}-${idx}`} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[30px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 z-10" 
                           style={{background: "#13132a", borderColor: dotColor, boxShadow: dotShadow}}>
                        {isPending ? <Clock3 className="w-3 h-3 text-white" /> : <CheckCircle className="w-3 h-3 text-white" />}
                      </div>

                      <div className="mb-1 text-xs" style={{color: "#6366f1"}}>{item.ago}</div>
                      <div className="p-5 rounded-lg border" style={{background: "#1a1a3e", borderColor: "#4338ca", borderLeft: `2px solid ${borderColor}`}}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="text-lg font-semibold text-white">{item.org}</div>
                            <div className="text-sm mt-1 flex items-center gap-4" style={{color: "#818cf8"}}>
                              <span className="flex items-center gap-1"><Award className="w-3 h-3"/> {item.cert}</span>
                              <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {item.attendees} attendees</span>
                            </div>
                          </div>
                          <Badge variant="outline" className={isPending ? "bg-violet-900/40 text-violet-300 border-violet-800" : "bg-emerald-900/40 text-emerald-300 border-emerald-800"}>
                            {item.status}
                          </Badge>
                        </div>

                        {isPending && (
                          <div className="flex gap-3 mt-4 pt-4 border-t" style={{borderColor: "#3730a3"}}>
                            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" style={{boxShadow: "0 0 8px rgba(139,92,246,0.4)"}}>
                              Approve Request
                            </Button>
                            <Button size="sm" variant="outline" className="bg-transparent border-indigo-600 hover:bg-indigo-900/30 text-indigo-300">
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
