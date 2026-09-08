import { useEffect, useRef, useState } from "react";
import { useQueueState, useQueueNext, useQueuePrev, useQueueReset, useQueueSet } from "@/hooks/use-queue";
import { Layout } from "@/components/Layout";
import { NeonButton } from "@/components/NeonButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Settings2, 
  Volume2,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Barber() {
  // Poll every 2 seconds
  const { data: queueState } = useQueueState(2000);
  
  const next = useQueueNext();
  const prev = useQueuePrev();
  const reset = useQueueReset();
  const setQueue = useQueueSet();
  
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [setDialogOpen, setSetDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  // Audio handling
  const lastNumberRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (queueState && lastNumberRef.current !== null && queueState.servingNumber !== lastNumberRef.current) {
      // Number changed, play ding
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
      audio.play().catch(e => console.log("Audio play failed", e));
    }
    if (queueState) {
      lastNumberRef.current = queueState.servingNumber;
    }
  }, [queueState?.servingNumber]);

  const handleReset = () => {
    const val = parseInt(inputValue);
    reset.mutate(isNaN(val) ? 0 : val, {
      onSuccess: () => {
        setResetDialogOpen(false);
        setInputValue("");
      }
    });
  };

  const handleSet = () => {
    const val = parseInt(inputValue);
    if (!isNaN(val)) {
      setQueue.mutate(val, {
        onSuccess: () => {
          setSetDialogOpen(false);
          setInputValue("");
        }
      });
    }
  };

  return (
    <Layout>
      <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-black">
        
        {/* Left Panel - Queue Display */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative border-r border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-black to-black opacity-50" />
          
          <h2 className="text-2xl md:text-3xl text-white/40 font-display tracking-[0.2em] mb-8 relative z-10">
            NOW SERVING
          </h2>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={queueState?.servingNumber || 0}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative z-10"
            >
              <div className="text-[12rem] md:text-[20rem] leading-none font-black text-white font-mono text-neon drop-shadow-2xl">
                {queueState?.servingNumber ?? 0}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-12 flex items-center gap-4 text-primary/60">
            <Volume2 className="animate-pulse" />
            <span className="text-sm uppercase tracking-wider">Audio Enabled</span>
          </div>
          
          {/* Current Ticket Info Placeholder - could be expanded to show service name if linked */}
          <div className="absolute bottom-8 left-8 right-8 text-center">
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
               <Users className="w-4 h-4 text-primary" />
               <span className="text-sm text-white/40">Waiting: <span className="text-white font-bold">{(queueState?.currentNumber || 0) - (queueState?.servingNumber || 0)}</span> people</span>
             </div>
          </div>
        </div>

        {/* Right Panel - Controls */}
        <div className="h-64 md:h-full md:w-[400px] bg-zinc-950/80 backdrop-blur-md p-6 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-white/10">
          
          <div className="flex-1 flex flex-col justify-center gap-6">
            <NeonButton 
              onClick={() => next.mutate()} 
              disabled={next.isPending}
              className="h-32 text-2xl w-full"
            >
              NEXT TICKET <ChevronRight className="ml-2 w-8 h-8" />
            </NeonButton>

            <NeonButton 
              variant="secondary"
              onClick={() => prev.mutate()} 
              disabled={prev.isPending}
              className="h-20 text-xl w-full"
            >
              <ChevronLeft className="mr-2 w-6 h-6" /> PREVIOUS
            </NeonButton>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-auto">
            <NeonButton 
              variant="ghost" 
              onClick={() => setSetDialogOpen(true)}
              className="border border-white/10 hover:border-primary/50"
            >
              <Settings2 className="mr-2 w-4 h-4" /> Set To
            </NeonButton>
            
            <NeonButton 
              variant="danger" 
              onClick={() => setResetDialogOpen(true)}
              className="opacity-80 hover:opacity-100"
            >
              <RotateCcw className="mr-2 w-4 h-4" /> Reset
            </NeonButton>
          </div>
        </div>
      </div>

      {/* Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Reset Queue</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Start from number (optional)</Label>
              <Input 
                type="number" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="0"
                className="bg-black border-white/20 focus:border-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <NeonButton variant="ghost" onClick={() => setResetDialogOpen(false)}>Cancel</NeonButton>
            <NeonButton variant="danger" onClick={handleReset}>Confirm Reset</NeonButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Number Dialog */}
      <Dialog open={setDialogOpen} onOpenChange={setSetDialogOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Jump to Number</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Enter Ticket Number</Label>
              <Input 
                type="number" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="10"
                className="bg-black border-white/20 focus:border-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <NeonButton variant="ghost" onClick={() => setSetDialogOpen(false)}>Cancel</NeonButton>
            <NeonButton onClick={handleSet}>Update Queue</NeonButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
