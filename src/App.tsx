import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2
} from 'lucide-react';

// --- Types ---
interface Podcast {
  id: string;
  title: string;
  topic: string;
  words: string[];
  audioUrl?: string; 
  transcript: string;
  duration: string;
  createdAt: Date;
}

interface AppSettings {
  n8nWebhookUrl: string;
  voiceId: string;
}

// --- Mock Data ---
const INITIAL_PODCASTS: Podcast[] = [
  {
    id: '1',
    title: 'Nick and the Legendary Surfboard',
    topic: 'A story about surfing',
    words: ['surf', 'ocean', 'legendary'],
    // 🔴 IMPORTANT: PASTE YOUR REAL GOOGLE DRIVE LINK BELOW 🔴
    // It must look like: https://drive.google.com/uc?export=download&id=YOUR_FILE_ID
    audioUrl: 'https://drive.google.com/uc?export=download&id=1UVZrbhck2Tmjg77rOyOszN1fS9mNtbpt', 
    transcript: "Nick paddled out into the cold ocean...",
    duration: '05:00',
    createdAt: new Date(),
  }
];

// --- Components ---
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'generate' | 'library' | 'settings'>('generate');
  const [podcasts, setPodcasts] = useState<Podcast[]>(INITIAL_PODCASTS);
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  
  // Generator State
  const [topic, setTopic] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  
  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    n8nWebhookUrl: 'https://chatbot.soranchi.me/webhook/generate-story',
    voiceId: 'en-US-Standard-C'
  });

  // --- AUDIO PLAYER STATE ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!topic || words.length === 0) return;
    setIsGenerating(true);
    setProgressStep(0);
    setStatusMsg("Connecting to Server...");
    
    try {
      const response = await fetch(settings.n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, words })
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      setStatusMsg("Synthesizing Audio...");
      setProgressStep(2);

      const data = await response.json();
      setStatusMsg("Finalizing...");
      setProgressStep(4);
      await new Promise(r => setTimeout(r, 500));

      const newPodcast: Podcast = {
        id: Date.now().toString(),
        title: topic,
        topic: topic,
        words: [...words],
        transcript: data.transcript || "No transcript returned.",
        audioUrl: data.audioUrl, 
        duration: '00:00', // Will be updated on load
        createdAt: new Date(),
      };

      setPodcasts([newPodcast, ...podcasts]);
      setCurrentPodcast(newPodcast);
      setActiveTab('library');

    } catch (error) {
      alert("Failed to connect! Check n8n server.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- AUDIO LOGIC ---
  useEffect(() => {
    if (currentPodcast?.audioUrl) {
      // Create new audio object
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      const audio = new Audio(currentPodcast.audioUrl);
      audioRef.current = audio;

      // Event Listeners
      audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
      audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
      audio.addEventListener('ended', () => setIsPlaying(false));
      audio.addEventListener('error', (e) => {
        console.error("Audio Error:", e);
        alert("Error playing audio. The Google Drive link might be restricted or invalid.");
        setIsPlaying(false);
      });

      // Reset state
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [currentPodcast]);

  // Handle Play/Pause Toggle
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Playback failed:", error);
          setIsPlaying(false);
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
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Target Vocabulary</label>
                    <TagInput words={words} setWords={setWords} />
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

        {/* LIBRARY & PLAYER */}
        {(activeTab === 'library' || activeTab === 'settings') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            <div className={`lg:col-span-4 space-y-4 ${currentPodcast && activeTab !== 'settings' ? 'hidden lg:block' : 'block'} ${activeTab === 'settings' ? 'hidden' : ''}`}>
              <h2 className="text-xl font-bold text-white mb-4">Your Library</h2>
              {podcasts.map((pod) => (
                <div key={pod.id} onClick={() => { setCurrentPodcast(pod); setActiveTab('library'); }} className={`p-4 rounded-xl border cursor-pointer hover:bg-slate-800 transition-all ${currentPodcast?.id === pod.id ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-900/50 border-slate-800'}`}>
                  <h3 className="font-semibold text-slate-200">{pod.title}</h3>
                  <p className="text-xs text-slate-500">{pod.topic}</p>
                </div>
              ))}
            </div>

            <div className={`lg:col-span-8 ${activeTab === 'settings' ? 'hidden' : (!currentPodcast ? 'hidden lg:flex items-center justify-center' : 'block')}`}>
              {currentPodcast ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-indigo-950/30">
                    <h2 className="text-2xl font-bold text-white">{currentPodcast.title}</h2>
                    <div className="flex items-center gap-2 text-sm text-indigo-300 mt-1"><CheckCircle2 className="w-4 h-4" /> Synced</div>
                  </div>
                  
                  <div className="p-8 h-[350px] overflow-y-auto bg-slate-950/50 leading-relaxed text-lg text-slate-300">
                     {currentPodcast.transcript.split('\n').map((para, i) => <p key={i} className="mb-4">{para}</p>)}
                  </div>

                  {/* REAL AUDIO CONTROLS */}
                  <div className="p-6 bg-slate-900 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    
                    <input 
                      type="range" 
                      min={0} 
                      max={duration || 100} 
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
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500"><Headphones className="w-16 h-16 mx-auto mb-4 opacity-20" /><p>Select a podcast</p></div>
              )}
            </div>

            {/* SETTINGS VIEW */}
            {activeTab === 'settings' && (
              <div className="lg:col-span-12 max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500 w-full">
                <h2 className="text-2xl font-bold text-white mb-6">Backend Configuration</h2>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">n8n Webhook URL</label>
                    <input type="text" value={settings.n8nWebhookUrl} onChange={(e) => setSettings({...settings, n8nWebhookUrl: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-slate-200" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}