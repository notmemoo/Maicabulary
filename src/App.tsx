import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, AlertCircle, Loader2, Sparkles, CheckCircle2, Shuffle, Calendar } from "lucide-react";
import { Word } from "./types";
import { generateDailyWords, generateRandomWord } from "./services/geminiService";
import { WordCard } from "./components/WordCard";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { cn } from "./lib/utils";

export default function App() {
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [mode, setMode] = useState<"daily" | "random">("daily");

  const fetchWords = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCompleted(false);
    setCurrentIndex(0);
    
    try {
      if (mode === "random") {
        const randomWord = await generateRandomWord();
        setWords([randomWord]);
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      
      // 1. Try Supabase if configured
      if (isSupabaseConfigured && supabase) {
        const { data, error: sbError } = await supabase
          .from('daily_words')
          .select('*')
          .eq('date_shown', today);
          
        if (data && data.length >= 5) {
          setWords(data);
          setLoading(false);
          return;
        }
        
        if (sbError) console.error("Supabase error:", sbError);
      }

      // 2. Try Gemini (or fallback) if Supabase is empty/unconfigured
      const saved = localStorage.getItem(`voxdaily_${today}`);
      if (saved) {
        setWords(JSON.parse(saved));
      } else {
        const generated = await generateDailyWords();
        setWords(generated);
        localStorage.setItem(`voxdaily_${today}`, JSON.stringify(generated));
        
        if (isSupabaseConfigured && supabase) {
          await supabase.from('daily_words').insert(generated);
        }
      }
    } catch (err) {
      setError("Failed to fetch words. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  useEffect(() => {
    if (mode === "random") return;

    // Reset index if day changes while app is open
    const timer = setInterval(() => {
      const savedDate = localStorage.getItem('voxdaily_date');
      const today = new Date().toISOString().split('T')[0];
      if (savedDate !== today) {
        fetchWords();
        localStorage.setItem('voxdaily_date', today);
      }
    }, 60000);
    
    return () => clearInterval(timer);
  }, [fetchWords, mode]);

  const handleNext = async () => {
    if (mode === "random") {
      setLoading(true);
      try {
        const nextRandom = await generateRandomWord();
        setWords([nextRandom]);
      } catch (err) {
        console.error("Failed to get next random word", err);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCompleted(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const restart = () => {
    setCurrentIndex(0);
    setCompleted(false);
  };

  const switchMode = (newMode: "daily" | "random") => {
    if (mode === newMode) return;
    setMode(newMode);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0A0A0A]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-[#F5F2ED] mb-4 opacity-50"
        >
          <Loader2 size={32} />
        </motion.div>
        <p className="text-[#7A7A7A] font-medium serif italic tracking-wide">
          {mode === "daily" ? "Gathering tonight's lexicon..." : "Summoning a random curiosity..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0A0A0A] text-center">
        <AlertCircle size={40} className="text-[#7A7A7A] mb-4 opacity-50" />
        <h2 className="text-[#F5F2ED] text-xl font-serif mb-2">Service Interrupted</h2>
        <p className="text-[#7A7A7A] mb-8 font-light italic">{error}</p>
        <button
          onClick={fetchWords}
          className="bg-[#F5F2ED] text-[#0A0A0A] px-10 py-4 rounded-full font-bold hover:bg-white transition-all active:scale-95 shadow-lg"
        >
          Re-establish Connection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-stretch bg-[#0A0A0A] font-sans text-[#F5F2ED] overflow-hidden">
      {/* Header */}
      <header className="px-8 pt-10 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#121212] border border-[#2A2A2A] flex items-center justify-center rounded-xl shadow-inner">
            <BookOpen size={20} className="text-[#F5F2ED]" />
          </div>
          <div>
            <span className="block text-lg font-serif font-bold tracking-tight text-[#F5F2ED]">
              VoxDaily
            </span>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="bg-[#121212] p-1 rounded-full border border-[#2A2A2A] flex gap-1">
          <button 
            onClick={() => switchMode("daily")}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
              mode === "daily" ? "bg-[#F5F2ED] text-[#0A0A0A]" : "text-[#7A7A7A] hover:text-[#F5F2ED]"
            )}
          >
            <Calendar size={12} /> Daily
          </button>
          <button 
            onClick={() => switchMode("random")}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
              mode === "random" ? "bg-[#F5F2ED] text-[#0A0A0A]" : "text-[#7A7A7A] hover:text-[#F5F2ED]"
            )}
          >
            <Shuffle size={12} /> Random
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow px-6 flex flex-col justify-center pb-12 relative">
        <AnimatePresence mode="wait">
          {!completed ? (
            <WordCard
              key={words[currentIndex]?.word || 'loading'}
              word={words[currentIndex]}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirst={mode === "random" || currentIndex === 0}
              isLast={mode === "random" || currentIndex === words.length - 1}
              currentIndex={mode === "random" ? -1 : currentIndex}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-md mx-auto bg-[#121212] text-[#F5F2ED] rounded-[48px] p-12 border border-[#2A2A2A] text-center flex flex-col items-center justify-center min-h-[480px] shadow-2xl relative overflow-hidden"
            >
              <div className="w-24 h-24 bg-white/[0.03] border border-white/[0.05] rounded-full flex items-center justify-center mb-10">
                <CheckCircle2 size={48} className="text-[#F5F2ED] opacity-80" />
              </div>
              <h2 className="text-4xl font-serif font-light mb-4 text-balance leading-tight">Wisdom Acquired</h2>
              <p className="text-[#7A7A7A] mb-12 max-w-[280px] mx-auto leading-relaxed italic font-serif text-lg">
                Your vocabulary expanded by 5 powerful words today. Masterful consistency.
              </p>
              
              <div className="grid grid-cols-2 gap-5 w-full">
                <button
                  onClick={restart}
                  className="bg-transparent hover:bg-white/[0.05] border border-[#2A2A2A] py-5 rounded-2xl font-semibold text-[#7A7A7A] hover:text-[#F5F2ED] transition-all active:scale-95"
                >
                  Review Session
                </button>
                <button
                  onClick={() => switchMode("random")}
                  className="bg-[#F5F2ED] text-[#0A0A0A] py-5 rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  <Shuffle size={16} /> Keep Exploring
                </button>
              </div>

              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5F2ED] opacity-[0.02] rounded-full -mr-16 -mt-16 pointer-events-none" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimal Progress Background Indicator (only for daily mode) */}
        {mode === "daily" && (
          <div className="absolute bottom-6 left-12 right-12 h-[2px] bg-[#2A2A2A] rounded-full overflow-hidden pointer-events-none opacity-50">
            <motion.div 
              className="h-full bg-[#7A7A7A]"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + (completed ? 1 : 0)) / 5) * 100}%` }}
              transition={{ type: "spring", stiffness: 50 }}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-8 py-6 flex flex-col items-center gap-4 text-[#4A4A4A]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#2A2A2A]" />
        <p className="text-[9px] uppercase tracking-[0.25em] font-bold">
          Lexical Engine v1.1 &bull; 2026
        </p>
      </footer>
    </div>
  );
}
