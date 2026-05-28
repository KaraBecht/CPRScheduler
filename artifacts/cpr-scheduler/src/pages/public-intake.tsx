import { useState } from "react";
import { TrainingRequestForm } from "@/components/TrainingRequestForm";
import { HeartPulse, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function IntakePage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
          <HeartPulse className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="font-bold text-base tracking-tight">PulsePoint</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            CPR Training Hub
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {submitted ? (
            <Card>
              <CardContent className="pt-10 pb-10 flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-1">Request received!</h2>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Thank you for reaching out. Our team has been notified and
                    will follow up with you shortly to confirm trainer
                    availability.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">
                  Request CPR training
                </h1>
                <p className="text-muted-foreground mt-1">
                  Tell us where you'd like CPR training and when works best.
                  We'll route this to our team.
                </p>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <TrainingRequestForm onSuccess={() => setSubmitted(true)} />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function PublicIntake() {
  return <IntakePage />;
}
