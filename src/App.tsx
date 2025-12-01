import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Plus, 
  X, 
  Settings, 
  Database, 
  Headphones, 
  BookOpen, 
  Mic2,
  Server,
  Loader2,
  CheckCircle2,
  AlertCircle
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

// --- Mock Data for Initial State ---
const INITIAL_PODCASTS: Podcast[] = [
  {
    id: '1',
    title: 'The Baker of Veridia',
    topic: 'A baker who solves problems',
    words: ['meticulous', 'scrutinize', 'peculiar', 'alleviate', 'unprecedented', 'ubiquitous'],
    transcript: "In the bustling city of Veridia, there lived a young baker named Leo. Leo was known for his **meticulous** attention to detail. Every morning, he would **scrutinize** the flour, ensuring it was of the finest quality. One day, a **peculiar** customer arrived, asking for a loaf that could **alleviate** sadness. Leo accepted the challenge, mixing ingredients with **unprecedented** care. The result was a pastry so delightful it became **ubiquitous** throughout the town, bringing joy to everyone who tasted it.",
    duration: '02:14',
    createdAt: new Date(Date.now() - 86400000),
  }
];

// --- Reusable Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon }: any) => {
  const baseStyle = "flex items-center justify-center px-4 py-2 rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}
    >
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

  const removeWord = (wordToRemove: string) => {
    setWords(words.filter(w => w !== wordToRemove));
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2">
        {words.map((word) => (
          <span key={word} className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-sm flex items-center border border-indigo-500/30">
            {word}
            <button onClick={() => removeWord(word)} className="ml-2 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a word and press Enter..."
        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
      />
    </div>
  );
};

// --- Main App Component ---

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
  
  // Settings State - Pre-filled with your likely tunnel URL
  const [settings, setSettings] = useState<AppSettings>({
    n8nWebhookUrl: 'https://chatbot.soranchi.me/webhook/generate-story',
    voiceId: 'en-US-Standard-C'
  });

  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const steps = [
    "Connecting to Ubuntu Server...",
    "AI Generating Story Context...",
    "Synthesizing Audio...",
    "Uploading to Google Drive...",
    "Finalizing..."
  ];

  // --- The Real Connection Logic ---
  const handleGenerate = async () => {
    if (!topic || words.length === 0) return;
    
    setIsGenerating(true);
    setProgressStep(0);
    setStatusMsg(steps[0]);
    
    try {
      // 1. Send data to n8n
      const response = await fetch(settings.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          topic: topic, 
          words: words 
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      setStatusMsg(steps[2]); // "Synthesizing..."
      setProgressStep(2);

      // 2. Wait for JSON response { "transcript": "...", "audioUrl": "..." }
      const data = await response.json();

      setStatusMsg(steps[4]); // "Finalizing..."
      setProgressStep(4);
      await new Promise(r => setTimeout(r, 500)); // Small pause for UX

      // 3. Create the new podcast entry
      const newPodcast: Podcast = {
        id: Date.now().toString(),
        title: topic,
        topic: topic,
        words: [...words],
        transcript: data.transcript || "No transcript returned from server.",
        audioUrl: data.audioUrl, 
        duration: '03:45', // Placeholder duration
        createdAt: new Date(),
      };

      setPodcasts([newPodcast, ...podcasts]);
      setCurrentPodcast(newPodcast);
      setActiveTab('library');
      setIsGenerating(false);

    } catch (error) {
      console.error("Generation failed:", error);
      setStatusMsg("Error: Failed to connect to server.");
      alert("Failed to connect! Check if your n8n server is running and the Webhook URL in settings is correct.");
      setIsGenerating(false);
    }
  };

  // Handle Audio Playback
  useEffect(() => {
    if (currentPodcast?.audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(currentPodcast.audioUrl);
      } else {
        audioRef.current.src = currentPodcast.audioUrl;
      }
      
      audioRef.current.onended = () => setIsPlaying(false);
    }
  }, [currentPodcast]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play();
      else audioRef.current.pause();
    }
  }, [isPlaying]);


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
            <button 
              onClick={() => setActiveTab('generate')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'generate' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Generate
            </button>
            <button 
              onClick={() => setActiveTab('library')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'library' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Library
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${activeTab === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        
        {/* VIEW: GENERATOR */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Input Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Mic2 className="w-6 h-6 text-indigo-500" />
                  Create New Episode
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Topic Description</label>
                    <textarea 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none h-32"
                      placeholder="E.g., A mystery set in a futuristic coffee shop where robots serve latte art..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Target Vocabulary</label>
                    <TagInput words={words} setWords={setWords} />
                    <p className="text-xs text-slate-500 mt-2">Press Enter to add a word. The AI will weave these naturally into the story.</p>
                  </div>

                  <div className="pt-4">
                    {!isGenerating ? (
                      <Button 
                        onClick={handleGenerate} 
                        className="w-full py-4 text-lg" 
                        icon={BookOpen}
                        disabled={!topic || words.length === 0}
                      >
                        Generate Podcast
                      </Button>
                    ) : (
                      <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <div className="text-center space-y-1">
                          <p className="font-medium text-white">{statusMsg}</p>
                          <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                            <div 
                              className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                              style={{ width: `${((progressStep + 1) / steps.length) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tips Card */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-950/30 border border-emerald-500/20 p-5 rounded-2xl">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <Database className="w-4 h-4" />
                    <span className="font-medium text-sm">Google Drive</span>
                  </div>
                  <p className="text-sm text-emerald-200/60">Episodes are automatically synced to your cloud storage.</p>
                </div>
                <div className="bg-indigo-950/30 border border-indigo-500/20 p-5 rounded-2xl">
                  <div className="flex items-center gap-2 text-indigo-400 mb-2">
                    <Server className="w-4 h-4" />
                    <span className="font-medium text-sm">Ubuntu Server</span>
                  </div>
                  <p className="text-sm text-indigo-200/60">Powered by your local n8n + LLM infrastructure.</p>
                </div>
              </div>
            </div>

            {/* Preview/Info Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-full flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none" />
                
                <h3 className="text-lg font-semibold text-white mb-4">How it works</h3>
                <div className="space-y-6 relative z-10">
                  {[
                    { title: 'Topic Analysis', desc: 'The AI analyzes your topic and selects a genre.' },
                    { title: 'Story Weaving', desc: 'A narrative is constructed incorporating your target words.' },
                    { title: 'Audio Synthesis', desc: 'Python script generates natural speech (Effortless English style).' },
                    { title: 'Cloud Sync', desc: 'MP3 and Transcript are uploaded to Google Drive.' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium text-indigo-400">
                          {idx + 1}
                        </div>
                        {idx !== 3 && <div className="w-0.5 h-full bg-slate-800 my-1" />}
                      </div>
                      <div>
                        <h4 className="text-slate-200 text-sm font-medium">{item.title}</h4>
                        <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: LIBRARY / PLAYER */}
        {(activeTab === 'library' || activeTab === 'player') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
             {/* List */}
            <div className={`lg:col-span-4 space-y-4 ${currentPodcast ? 'hidden lg:block' : 'block'}`}>
              <h2 className="text-xl font-bold text-white mb-4">Your Library</h2>
              {podcasts.map((pod) => (
                <div 
                  key={pod.id}
                  onClick={() => {
                    setCurrentPodcast(pod);
                    setIsPlaying(false);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${
                    currentPodcast?.id === pod.id 
                    ? 'bg-indigo-900/20 border-indigo-500/50 shadow-lg shadow-indigo-900/20' 
                    : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-200 line-clamp-1">{pod.title}</h3>
                    <span className="text-xs font-mono text-slate-500">{pod.duration}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{pod.topic}</p>
                  <div className="flex flex-wrap gap-1">
                    {pod.words.slice(0, 3).map(w => (
                      <span key={w} className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                        {w}
                      </span>
                    ))}
                    {pod.words.length > 3 && <span className="text-[10px] text-slate-500">+{pod.words.length - 3}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Player View */}
            <div className={`lg:col-span-8 ${!currentPodcast ? 'hidden lg:flex items-center justify-center' : 'block'}`}>
              {currentPodcast ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Header */}
                  <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-indigo-950/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{currentPodcast.title}</h2>
                        <div className="flex items-center gap-2 text-sm text-indigo-300">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Synced to Drive</span>
                        </div>
                      </div>
                      <button 
                         onClick={() => setActiveTab('settings')}
                         className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <Settings className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  {/* Transcript Area */}
                  <div className="p-8 h-[400px] overflow-y-auto bg-slate-950/50 leading-relaxed text-lg text-slate-300 space-y-4">
                     {currentPodcast.transcript.split('\n').map((para, idx) => (
                       <p key={idx}>
                         {para.split(' ').map((word, wIdx) => {
                           const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
                           const isTarget = currentPodcast.words.includes(cleanWord);
                           return (
                             <span key={wIdx} className={isTarget ? "text-indigo-400 font-bold bg-indigo-500/10 px-0.5 rounded" : ""}>
                               {word}{' '}
                             </span>
                           );
                         })}
                       </p>
                     ))}
                  </div>

                  {/* Controls */}
                  <div className="p-6 bg-slate-900 border-t border-slate-800">
                    {/* Progress Bar Mockup */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full mb-6 cursor-pointer group">
                      <div className="w-1/3 h-full bg-indigo-500 rounded-full group-hover:bg-indigo-400 relative">
                        <div className="w-3 h-3 bg-white rounded-full absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 shadow-lg" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-8">
                      <button className="text-slate-400 hover:text-white transition-colors"><SkipBack className="w-6 h-6" /></button>
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        disabled={!currentPodcast.audioUrl}
                        className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPlaying ? <Pause className="w-6 h-6 text-slate-900 fill-slate-900" /> : <Play className="w-6 h-6 text-slate-900 fill-slate-900 ml-1" />}
                      </button>
                      <button className="text-slate-400 hover:text-white transition-colors"><SkipForward className="w-6 h-6" /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500">
                  <Headphones className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Select a podcast to start learning</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <h2 className="text-2xl font-bold text-white mb-6">Backend Configuration</h2>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">n8n Webhook URL</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={settings.n8nWebhookUrl}
                    onChange={(e) => setSettings({...settings, n8nWebhookUrl: e.target.value})}
                    placeholder="https://your-n8n-instance.com/webhook/..." 
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-slate-200"
                  />
                  <Button variant="secondary">Test</Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">The endpoint that receives {`{ "topic": "...", "words": [...] }`}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Voice Model</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-slate-200"
                  value={settings.voiceId}
                  onChange={(e) => setSettings({...settings, voiceId: e.target.value})}
                >
                  <option value="en-US-Standard-C">English (US) - Female (Neural)</option>
                  <option value="en-US-Standard-D">English (US) - Male (Neural)</option>
                  <option value="en-GB-Standard-A">English (UK) - Female</option>
                </select>
              </div>

              <div className="bg-amber-900/20 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-200">Self-Hosted Infrastructure</p>
                  <p className="text-xs text-amber-200/60">Ensure your n8n instance allows CORS from this domain, or set up a reverse proxy. The simulated mode works without configuration.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
