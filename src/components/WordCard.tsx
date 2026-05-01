import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, ChevronRight, ChevronLeft, RefreshCw, BookOpen } from "lucide-react";
import { Word } from "../types";
import { cn } from "../lib/utils";

interface WordCardProps {
  word: Word;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
  currentIndex: number;
}

export function WordCard({ word, onNext, onPrevious, isFirst, isLast, currentIndex }: WordCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const useNativeFallback = () => {
    try {
      console.log("Using native speech synthesis fallback");
      window.speechSynthesis.cancel(); // Clear any pending speech
      
      const utterance = new SpeechSynthesisUtterance(word.word);
      const voices = window.speechSynthesis.getVoices();
      
      // Try to find a high-quality English voice (Google voices usually sound better)
      const engVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || 
                        voices.find(v => v.lang.startsWith('en') && v.name.includes('Premium')) ||
                        voices.find(v => v.lang.startsWith('en-US')) ||
                        voices.find(v => v.lang.startsWith('en'));
      
      if (engVoice) utterance.voice = engVoice;
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Native fallback failed:", e);
      setIsPlaying(false);
    }
  };

  const playAudio = async () => {
    if (isPlaying) return;
    setIsPlaying(true);

    try {
      console.log("Attempting to play audio for:", word.word);
      // 1. Try ElevenLabs via our server proxy
      const response = await fetch(`/api/pronounce?text=${encodeURIComponent(word.word)}`);
      
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size < 100) throw new Error("Audio blob too small");
        
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        audio.oncanplaythrough = () => {
          audio.play().catch(e => {
            console.error("Playback interrupted, falling back:", e);
            useNativeFallback();
          });
        };

        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
        };

        audio.onerror = () => {
          console.error("Audio element error");
          URL.revokeObjectURL(url);
          useNativeFallback();
        };

        // If audio doesn't trigger oncanplaythrough quickly, force play or fallback
        setTimeout(() => {
          if (audio.paused && isPlaying) {
             audio.play().catch(() => useNativeFallback());
          }
        }, 1000);

      } else {
        console.warn(`ElevenLabs proxy returned ${response.status}. Using native fallback.`);
        useNativeFallback();
      }
    } catch (error) {
      console.error("Primary audio path failed:", error);
      useNativeFallback();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
      transition={{ duration: 0.5, ease: [0.215, 0.610, 0.355, 1.000] }}
      className="w-full max-w-md mx-auto bg-[#121212] rounded-[48px] p-10 border border-[#2A2A2A] flex flex-col min-h-[520px] relative overflow-hidden shadow-2xl"
    >
      {/* Top Meta */}
      <div className="flex justify-between items-center mb-10">
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#7A7A7A]">
          VoxDaily &bull; Daily
        </span>
        <div className="flex gap-1.5 flex-1 max-w-[120px] ml-4">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-500",
                i <= currentIndex ? "bg-[#F5F2ED]" : "bg-[#2A2A2A]"
              )}
            />
          ))}
        </div>
      </div>

      {/* Word and Audio */}
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mb-8 flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-5xl font-serif font-light text-[#F5F2ED] mb-2 leading-tight">
            {word.word}
          </h1>
          <p className="text-[#7A7A7A] italic font-serif text-lg">
            {word.part_of_speech} {word.pronunciation && `• [${word.pronunciation}]`}
          </p>
        </div>
        <button 
          onClick={playAudio}
          disabled={isPlaying}
          className={cn(
            "p-3 rounded-full border border-[#2A2A2A] text-[#F5F2ED] transition-all active:scale-95 mt-1",
            isPlaying ? "opacity-50 cursor-not-allowed bg-[#2A2A2A]" : "hover:bg-[#1A1A1A]"
          )}
          id="audio-btn"
        >
          <Volume2 size={20} className={cn(isPlaying && "animate-pulse")} />
        </button>
      </motion.div>

      {/* Content Section */}
      <div className="space-y-10 flex-grow">
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2, duration: 0.4 }}
        >
          <h3 className="text-[#7A7A7A] text-[10px] uppercase tracking-[0.2em] mb-4 font-semibold">Definition</h3>
          <p className="text-[#D1D1D1] text-lg leading-relaxed font-light serif text-balance">
            {word.definition}
          </p>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3, duration: 0.4 }}
        >
          <h3 className="text-[#7A7A7A] text-[10px] uppercase tracking-[0.2em] mb-4 font-semibold">Example</h3>
          <p className="text-[#F5F2ED] text-lg leading-relaxed italic border-l-2 border-[#2A2A2A] pl-5 serif">
            &ldquo;{word.example}&rdquo;
          </p>
        </motion.div>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center mt-12">
        <button
          onClick={onPrevious}
          disabled={isFirst}
          className={cn(
            "flex items-center gap-2 text-sm font-medium transition-colors",
            isFirst ? "text-[#2A2A2A] cursor-not-allowed" : "text-[#7A7A7A] hover:text-white"
          )}
          id="prev-btn"
        >
          <ChevronLeft size={18} />
          Back
        </button>

        <button
          onClick={onNext}
          className={cn(
            "flex items-center gap-2 px-8 py-4 rounded-full text-sm font-bold transition-all active:scale-95 shadow-lg",
            "bg-[#F5F2ED] text-[#0A0A0A] hover:bg-white shadow-white/5"
          )}
          id="next-btn"
        >
          {isLast && currentIndex !== -1 ? (
            <>Finish <RefreshCw size={16} /></>
          ) : (
            <>Next Word <ChevronRight size={18} /></>
          )}
        </button>
      </div>
      
      {/* Subtle bottom bar decorator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/5 rounded-full" />
    </motion.div>
  );
}
