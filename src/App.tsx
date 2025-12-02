import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  X, 
  Settings, 
  Headphones, 
  BookOpen, 
  Mic2,
  Loader2,
  CheckCircle2,
  Repeat,
  ListMusic,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';

// Initialize Supabase client
const supabaseUrl = 'https://xgitkcmskcqghwaiioue.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Types ---
interface Podcast {
  id?: string;
  title: string;
  topic?: string;
  words?: string[];
  audio_url?: string; 
  transcript: string | { start: number; end: number; text: string }[]; // Can be string (old) or JSON array (new)
  created_at?: string;
}

interface AppSettings {
  n8nWebhookUrl: string;
  mainVoice: string; // New state field
  guestVoice: string; // New state field
}

// --- VOICE OPTIONS (Example voices from your script context: albo, lachlan) ---
const VOICE_OPTIONS = [
  { id: 'albo', name: 'Albo (Speaker A)' },
  { id: 'lachlan', name: 'Lachlan (Speaker B)' },
  { id: 'custom_m', name: 'Narrator Male' },
  { id: 'custom_f', name: 'Narrator Female' },
];



// --- Components (omitted for brevity, assume they are present and correct) ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon }: any) => {
  const baseStyle = "flex items-center justify-center px-4 py-2 rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}>
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </button>
  );
};

const TagInput = ({ words, setWords }: { words: string[], setWords: (w: string[]) => void }) => {
  const [input, setInput] = useState('');
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !words.includes(trimmed)) {
        setWords([...words, trimmed]);
        setInput('');
      }
    }
  };
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2">
        {words.map((word) => (
          <span key={word} className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-sm flex items-center border border-indigo-500/30">
            {word} <button onClick={() => setWords(words.filter(w => w !== word))} className="ml-2 hover:text-white"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type word & Enter..."
        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      />
    </div>
  );
};

const TimedTranscriptDisplay = ({ 
  transcript, 
  currentTime 
}: { 
  transcript: { start: number; end: number; text: string }[], 
  currentTime: number 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIndex = transcript.findIndex(
    (line) => currentTime >= line.start && currentTime <= line.end
  );

  useEffect(() => {
    if (activeIndex !== -1 && scrollRef.current) {
      const activeElement = scrollRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-6 space-y-4">
      {transcript.map((line, index) => {
        const isActive = index === activeIndex;
        return (
          <div 
            key={index} 
            className={`transition-all duration-300 ${
              isActive 
                ? 'bg-indigo-500/20 border-l-4 border-indigo-500 pl-4 py-2 rounded-r-lg' 
                : 'text-slate-400 hover:text-slate-300 pl-4 border-l-4 border-transparent'
            }`}
          >
            <p className={`text-lg leading-relaxed ${isActive ? 'text-white font-medium' : ''}`}>
              {line.text}
            </p>
          </div>
        );
      })}
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'generate' | 'library' | 'settings'>('generate');
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Generator State
  const [topic, setTopic] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [duration, setDuration] = useState(5); // Default 5 minutes
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  
  // Settings (Now includes voice selections)
  const [settings, setSettings] = useState<AppSettings>({
    n8nWebhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://chatbot.soranchi.me/webhook/generate-story',
    mainVoice: 'albo', 
    guestVoice: 'lachlan',
  });

  // --- AUDIO PLAYER STATE ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // UI State
  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);
  const [playMode, setPlayMode] = useState<'single' | 'loop' | 'playlist'>('playlist');
  const [showWebhook, setShowWebhook] = useState(false);
  
  // Settings Security
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  // Refs for Event Handlers (to avoid stale closures in audio effect)
  const playModeRef = useRef(playMode);
  const podcastsRef = useRef(podcasts);
  const autoPlayRef = useRef(false);

  useEffect(() => { playModeRef.current = playMode; }, [playMode]);
  useEffect(() => { podcastsRef.current = podcasts; }, [podcasts]);

  // Fetch episodes from database
  useEffect(() => {
    fetchEpisodes();
  }, []);

  const fetchEpisodes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPodcasts(data || []);
      if (data && data.length > 0) {
        setCurrentPodcast(data[0]);
      }
    } catch (error) {
      console.error('Error fetching episodes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic || words.length === 0) return;
    setIsGenerating(true);
    setProgressStep(0);
    setStatusMsg("Connecting to Server...");
    
    try {
      const response = await fetch(settings.n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic: topic, 
          words: words,
          mainVoice: settings.mainVoice, 
          guestVoice: settings.guestVoice,
          duration: duration // Send duration to backend
        })
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      setStatusMsg("Synthesizing Audio...");
      setProgressStep(2);

      const data = await response.json();
      setStatusMsg("Finalizing...");
      setProgressStep(4);
      await new Promise(r => setTimeout(r, 500));

      // Refresh episodes from database
      await fetchEpisodes();
      
      // Find and set the newly created episode
      const { data: newEpisode } = await supabase
        .from('episodes')
        .select('*')
        .eq('title', data.storyTitle)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (newEpisode) {
        setCurrentPodcast(newEpisode);
      }
      
      setActiveTab('library');
      
      // Clear form
      setTopic('');
      setWords([]);

    } catch (error) {
      alert("Failed to connect or generate! Check the n8n execution log.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- AUDIO LOGIC ---
  useEffect(() => {
    if (currentPodcast?.audio_url) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      
      const audio = new Audio(currentPodcast.audio_url);
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;

      // Event Listeners
      const onLoadedMetadata = () => {
        setAudioDuration(audio.duration);
        if (autoPlayRef.current) {
            audio.play().catch(e => console.error("Autoplay failed", e));
            setIsPlaying(true);
            autoPlayRef.current = false;
        }
      };
      const onTimeUpdate = () => setCurrentTime(audio.currentTime);
      
      const onEnded = () => {
        const mode = playModeRef.current;
        if (mode === 'loop') {
            audio.currentTime = 0;
            audio.play();
        } else if (mode === 'playlist') {
            const list = podcastsRef.current;
            // Find current index. Note: podcasts might be sorted differently than display? 
            // Assuming podcastsRef matches the display order.
            const idx = list.findIndex(p => p.id === currentPodcast.id);
            // Play NEXT (index - 1 if sorted desc? No, list is usually 0..N)
            // If list is ordered by created_at desc, then index 0 is newest.
            // "Next" usually means "Older" in a podcast feed, or "Newer"?
            // Let's assume standard playlist behavior: Next in the array.
            if (idx !== -1 && idx < list.length - 1) {
                autoPlayRef.current = true;
                setCurrentPodcast(list[idx + 1]);
            } else {
                setIsPlaying(false);
            }
        } else {
            setIsPlaying(false);
        }
      };

      const onError = (e: Event) => {
        console.error("Audio Load Error:", e, audio.error);
        setIsPlaying(false);
      };

      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      if (!autoPlayRef.current) {
          setIsPlaying(false);
      }
      setCurrentTime(0);

      return () => {
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        audio.pause();
      };
    }
  }, [currentPodcast]);

  // Handle Play/Pause Toggle
  const togglePlay = () => {
    if (!audioRef.current || !currentPodcast?.audio_url) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Playback failed:", error);
          alert("Browser blocked autoplay. Please interact with the page first.");
        });
      }
    }
    setIsPlaying(!isPlaying);
  };

  // Handle Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time < 0) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleUnlockSettings = () => {
    const correctPasscode = import.meta.env.VITE_SETTINGS_PASSCODE || '2295';
    if (passcodeInput === correctPasscode) {
        setIsSettingsUnlocked(true);
        setPasscodeError(false);
        setPasscodeInput('');
    } else {
        setPasscodeError(true);
        setPasscodeInput('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('generate')}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">LingoCast<span className="text-indigo-500">.ai</span></span>
          </div>
          <div className="flex items-center bg-slate-900/50 rounded-full p-1 border border-slate-800">
            <button onClick={() => setActiveTab('generate')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'generate' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>Generate</button>
            <button onClick={() => setActiveTab('library')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'library' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>Library</button>
            <button onClick={() => setActiveTab('settings')} className={`w-8 h-8 flex items-center justify-center rounded-full ${activeTab === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}><Settings className="w-4 h-4" /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* GENERATOR */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Mic2 className="w-6 h-6 text-indigo-500" /> Create New Episode</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Topic</label>
                    <textarea value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 h-32" placeholder="E.g., A mystery set in a futuristic coffee shop..." />
                  </div>
                  
                  {/* VOICE SELECTION CONTROLS (NEW) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Main Speaker (A)</label>
                        <select 
                            value={settings.mainVoice}
                            onChange={(e) => setSettings({...settings, mainVoice: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-slate-200"
                        >
                            {VOICE_OPTIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Guest Speaker (B)</label>
                        <select 
                            value={settings.guestVoice}
                            onChange={(e) => setSettings({...settings, guestVoice: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-slate-200"
                        >
                            {VOICE_OPTIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                     </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Target Vocabulary</label>
                    <TagInput words={words} setWords={setWords} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Target Duration: <span className="text-indigo-400">{duration} minutes</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="15" 
                      step="1"
                      value={duration} 
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-xs text-slate-600 mt-1 font-mono">
                      <span>1 min</span>
                      <span>15 mins</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    {!isGenerating ? (
                      <Button onClick={handleGenerate} className="w-full py-4 text-lg" icon={BookOpen} disabled={!topic || words.length === 0}>Generate Podcast</Button>
                    ) : (
                      <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <p className="font-medium text-white">{statusMsg}</p>
                        <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-indigo-500 transition-all duration-500 ease-out" style={{ width: `${((progressStep + 1) / 5) * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 space-y-6">
               {/* Instructions Card */}
               <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                 <h3 className="text-lg font-semibold text-white mb-4">How it works</h3>
                 <p className="text-slate-400 text-sm">1. Enter a topic and vocabulary.<br/>2. AI writes a story.<br/>3. Python generates audio.<br/>4. Listen and learn!</p>
               </div>
            </div>
          </div>
        )}

        {/* LIBRARY & PLAYER (omitted for brevity, remains the same) */}
        {(activeTab === 'library' || activeTab === 'settings') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* List */}
            <div className={`lg:col-span-4 space-y-4 ${activeTab === 'settings' ? 'hidden' : (isMobilePlayerOpen && currentPodcast ? 'hidden lg:block' : 'block')}`}>
              <h2 className="text-xl font-bold text-white mb-4">Your Library</h2>
              {isLoading ? (
                <div className="text-center text-slate-500 py-8">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>Loading episodes...</p>
                </div>
              ) : podcasts.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <p>No episodes yet. Generate your first one!</p>
                </div>
              ) : (
                podcasts.map((pod) => (
                <div key={pod.id} onClick={() => { setCurrentPodcast(pod); setActiveTab('library'); setIsMobilePlayerOpen(true); }} className={`p-4 rounded-xl border cursor-pointer hover:bg-slate-800 transition-all ${currentPodcast?.id === pod.id ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-900/50 border-slate-800'}`}>
                  <h3 className="font-semibold text-slate-200">{pod.title}</h3>
                  <p className="text-xs text-slate-500">{pod.topic || 'No topic'}</p>
                </div>
              ))
              )}
            </div>

            {/* Player View */}
            <div className={`lg:col-span-8 ${activeTab === 'settings' ? 'hidden' : ''} ${isMobilePlayerOpen && currentPodcast ? 'block' : 'hidden lg:block'} ${!currentPodcast ? 'lg:flex lg:items-center lg:justify-center' : ''}`}>
              {currentPodcast ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-indigo-950/30">
                    <button onClick={() => setIsMobilePlayerOpen(false)} className="lg:hidden mb-4 flex items-center text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Library
                    </button>
                    <h2 className="text-2xl font-bold text-white">{currentPodcast.title}</h2>
                    <div className="flex items-center gap-2 text-sm text-indigo-300 mt-1"><CheckCircle2 className="w-4 h-4" /> Synced</div>
                  </div>
                  
                  <div className="h-[350px] bg-slate-950/50">
                    {Array.isArray(currentPodcast.transcript) ? (
                      <TimedTranscriptDisplay 
                        transcript={currentPodcast.transcript} 
                        currentTime={currentTime} 
                      />
                    ) : (
                      <div className="p-8 h-full overflow-y-auto leading-relaxed text-lg text-slate-300">
                        {typeof currentPodcast.transcript === 'string' ? (
                          currentPodcast.transcript.split('\n').map((para, i) => <p key={i} className="mb-4">{para}</p>)
                        ) : (
                          <p>Invalid transcript format</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* REAL AUDIO CONTROLS */}
                  <div className="p-6 bg-slate-900 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(audioDuration)}</span>
                    </div>
                    
                    <input 
                      type="range" 
                      min={0} 
                      max={audioDuration || 100} 
                      value={currentTime} 
                      onChange={handleSeek}
                      className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500 mb-6"
                    />
                    
                    <div className="flex items-center justify-center gap-8">
                      <button onClick={() => {if(audioRef.current) audioRef.current.currentTime -= 10}} className="text-slate-400 hover:text-white"><SkipBack className="w-6 h-6" /></button>
                      <button onClick={togglePlay} className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg">
                        {isPlaying ? <Pause className="w-6 h-6 text-slate-900 fill-slate-900" /> : <Play className="w-6 h-6 text-slate-900 fill-slate-900 ml-1" />}
                      </button>
                      <button onClick={() => {if(audioRef.current) audioRef.current.currentTime += 10}} className="text-slate-400 hover:text-white"><SkipForward className="w-6 h-6" /></button>
                    </div>

                    <div className="flex items-center justify-center gap-6 mt-8 border-t border-slate-800/50 pt-6">
                        <button 
                            onClick={() => setPlayMode(playMode === 'loop' ? 'single' : 'loop')} 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${playMode === 'loop' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`} 
                            title="Loop Single"
                        >
                            <Repeat className="w-4 h-4" /> Loop
                        </button>
                        <button 
                            onClick={() => setPlayMode(playMode === 'playlist' ? 'single' : 'playlist')} 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${playMode === 'playlist' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`} 
                            title="Play All"
                        >
                            <ListMusic className="w-4 h-4" /> Autoplay
                        </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500"><Headphones className="w-16 h-16 mx-auto mb-4 opacity-20" /><p>Select a podcast</p></div>
              )}
            </div>

            {/* SETTINGS VIEW */}
            {activeTab === 'settings' && (
              <div className="lg:col-span-12 max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500 w-full">
                {!isSettingsUnlocked ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center space-y-6 text-center">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                            <Lock className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Restricted Access</h2>
                            <p className="text-slate-400">Please enter the passcode to access settings.</p>
                        </div>
                        <div className="w-full max-w-xs space-y-4">
                            <input 
                                type="password" 
                                value={passcodeInput}
                                onChange={(e) => { setPasscodeInput(e.target.value); setPasscodeError(false); }}
                                onKeyDown={(e) => e.key === 'Enter' && handleUnlockSettings()}
                                placeholder="Enter Passcode"
                                className={`w-full bg-slate-950 border ${passcodeError ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-700 focus:ring-indigo-500/50'} rounded-xl px-4 py-3 text-slate-200 text-center tracking-widest focus:outline-none focus:ring-2 transition-all`}
                                autoFocus
                            />
                            {passcodeError && <p className="text-red-400 text-sm font-medium">Incorrect passcode. Please try again.</p>}
                            <Button onClick={handleUnlockSettings} className="w-full" icon={Unlock}>Unlock Settings</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-white mb-6">Backend Configuration</h2>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-400">n8n Webhook URL</label>
                                <button onClick={() => setShowWebhook(!showWebhook)} className="text-slate-500 hover:text-slate-300">
                                    {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {showWebhook ? (
                                <input type="text" value={settings.n8nWebhookUrl} onChange={(e) => setSettings({...settings, n8nWebhookUrl: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-slate-200" />
                            ) : (
                                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-600 italic">
                                    Hidden for security
                                </div>
                            )}
                        </div>
                        {/* Voice settings are already in the Generator tab, removed from here for clarity */}
                        </div>
                    </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}