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

// --- Mock Data ---
const INITIAL_PODCASTS: Podcast[] = [
  {
    id: '1',
    title: 'Nick and the Legendary Surfboard',
    topic: 'A story about surfing',
    words: ['surf', 'ocean', 'legendary'],
    
    // 🟢 STORAGE CONFIGURATION 🟢
    // 1. Go to Supabase > Storage > New Bucket (Make it Public!)
    // 2. Upload file -> Click "Get URL"
    // 3. Paste it here:
    
    audioUrl: 'https://xgitkcmskcqghwaiioue.supabase.co/storage/v1/object/public/podcasts/NickAndTheLegendarySurfboard_podcast_output.mp3',
    
    // 🧪 TEST LINK: This works 100%. If your link fails, try this one to prove the player works.
    // audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    
    transcript: "Nick paddled out into the cold ocean...",
    duration: '05:00',
    createdAt: new Date(),
  },
  {
    id: '2',
    title: "Bella's Bakery Dream",
    topic: 'A story about baking, community, and following dreams',
    words: ['bakery', 'dream', 'anchor', 'brutal', 'celebratory', 'indulge', 'prologue', 'mundane', 'circulate', 'inquiry', 'outcry'],
    audioUrl: 'https://xgitkcmskcqghwaiioue.supabase.co/storage/v1/object/public/podcasts/BellasBakeryDreamlachlanvoice_podcast_output.mp3', 
    transcript: "Main: Welcome to today's mini-story podcast!\n\nGuest: G'day everyone! I'm so excited to be here today — grab a cuppa and settle in!\n\nMain: Before we dive into today's yarn, let’s learn some cool new words together!\n\nMain: First word: anchor!\nGuest: Ah, like a ship’s anchor?\nMain: Yep! But it can also mean something that gives you stability or support. Like your family or a good mate can be your anchor in tough times.\nGuest: Oh nice — like when life gets hectic, my morning coffee is my anchor!\nMain: Anchor, anchor.\n\nGuest: What’s the next one?\nMain: Brutal! Means something harsh or really tough. Like a brutal workout or a brutal heatwave in the Aussie summer!\nGuest: Oof yeah, those brutal 40-degree days!\nMain: Brutal, brutal.\n\nMain: Next up: celebratory.\nGuest: Sounds happy! What's it mean?\nMain: Spot on — it’s something related to celebration. Like a celebratory dinner after you land a new job!\nGuest: Love it. Time to indulge in good food!\nMain: Celebratory, celebratory.\n\nMain: Now: indulge.\nGuest: That’s like treating yourself, yeah?\nMain: Exactly! It means allowing yourself to enjoy something nice — maybe a slice of cake or an extra hour in bed.\nGuest: Oh I love indulging in chocolate!\nMain: Indulge, indulge.\n\nMain: Next one: prologue.\nGuest: Bit of a bookish word?\nMain: Yep — a prologue is an introduction to a story. Think of it like the opening scene of a movie that sets things up.\nGuest: Got it — like a little teaser before the main event!\nMain: Prologue, prologue.\n\nMain: Next word: mundane.\nGuest: Hmm... sounds a bit dull?\nMain: Spot on! It means ordinary or boring. Like folding laundry — that’s a mundane chore.\nGuest: Totally — dishes too. So mundane!\nMain: Mundane, mundane.\n\nMain: On to circulate.\nGuest: That's like when things move around?\nMain: Exactly! It can mean moving through an area — like air circulating — or spreading news or ideas.\nGuest: Oh yep, gossip sure circulates quickly in a small town!\nMain: Circulate, circulate.\n\nMain: Next word: inquiry.\nGuest: Formal word for asking questions?\nMain: Bang on! An inquiry is an official question or investigation. Like a government inquiry into bushfires.\nGuest: Yep, lots of inquiries happening lately!\nMain: Inquiry, inquiry.\n\nMain: And the last one: outcry.\nGuest: That's like when everyone gets upset?\nMain: Exactly — a public expression of anger or protest. Like a big outcry over a new law or decision.\nGuest: Yeah, social media really fuels that kind of outcry these days!\nMain: Outcry, outcry.\n\nMain: Alright legends — let’s chuck these words into our story today about young Bella and her bakery dreams!\n\nMain: Bella was a twenty-three year old from a coastal Aussie town called Eden Bay. She’d always loved baking, learning from her nan since she was a kid.\nGuest: Aw that’s lovely — family traditions make the best recipes!\n\nMain: For years, opening a bakery had just been a dream — a prologue in her life story. But this year, she decided to turn that dream into reality. The town had lost its only bakery months earlier — a brutal blow for locals who loved their morning sourdough.\nGuest: Crikey, no bakery? That would cause an outcry in my town!\n\nMain: Bella saw the gap as an opportunity. She scraped together savings, took a small business loan, and leased an old corner shop. It needed work, but Bella had grit. Her family became her anchor during the brutal renovation months.\nGuest: Good on her — Aussie determination right there!\n\nMain: Word began to circulate about Bella’s plans. Locals were curious, popping in with friendly inquiries about opening day.\nGuest: I bet excitement was building!\n\nMain: Finally the big day came — Bella’s Bakery opened with a celebratory morning tea. People lined up out the door, eager to indulge in fresh pastries, sourdough, and her famous lamingtons.\nGuest: Now that’s an opening done right — Aussie treats and community vibes!\n\nMain: At first, Bella’s days were anything but mundane. There were early starts, sold-out shelves, and constant learning. A few teething problems too — a brutal batch of burnt croissants one day sparked some online outcry — but Bella took it in stride, learning as she went.\nGuest: Oh, gotta love those small biz growing pains!\n\nMain: Over time, Bella’s Bakery became an anchor for the town — a spot where locals gathered, stories circulated, and life felt a little sweeter.\nGuest: Such a feel-good story — love it!\n\nMain: Now let’s go through Bella’s story again together!\nGuest: I’ll help ask some questions too!\n\nMain: Bella was from Eden Bay and loved baking.\nGuest: Where was Bella from?\nMain: She was from Eden Bay.\n\nGuest: What did Bella love?\nMain: She loved baking!\n\nMain: Her dream of a bakery had been a prologue for years.\nGuest: What does prologue mean?\nMain: An introduction or beginning of a story!\n\nGuest: Was her dream already reality?\nMain: No, not yet — it had just been a dream until this year.\n\nMain: The town had no bakery — a brutal loss for locals.\nGuest: Why was it a brutal loss?\nMain: Because locals loved their bakery — and suddenly they had none!\n\nGuest: Was there an outcry?\nMain: Oh yes — people were upset!\n\nMain: Bella’s family became her anchor during renovations.\nGuest: What does anchor mean here?\nMain: It means her source of support and stability.\n\nMain: Word began to circulate about her bakery.\nGuest: What circulated?\nMain: News about Bella’s new bakery!\n\nMain: Locals made friendly inquiries about opening day.\nGuest: What’s an inquiry?\nMain: A question or request for information.\n\nMain: On opening day, locals indulged in fresh treats.\nGuest: What does indulge mean?\nMain: To enjoy something special or nice.\n\nMain: Now for our final part — let’s practice the Past Continuous tense together!\nGuest: Love it — grammar time!\n\nMain: The Past Continuous shows actions that were happening at a certain time in the past.\n\nMain: Bella was planning her bakery while working part-time.\nGuest: What was Bella doing?\nMain: She was planning her bakery!\n\nMain: Locals were circulating news about her opening day.\nGuest: What were the locals doing?\nMain: They were circulating news!\n\nMain: People were indulging in pastries during the celebratory event.\nGuest: What were people indulging in?\nMain: Fresh pastries!\n\nMain: And that’s a wrap on Bella’s bakery story!\nGuest: Hope you loved it — see ya next time, legends!",
    duration: '05:00', // Estimated based on word count
    createdAt: new Date(),
  },
  {
    id: '3',
    title: "Emily's Photo Journey",
    topic: 'A story about photography, integrity, and success in a mining town',
    words: ['accuse', 'acquire', 'bright', 'boot', 'coal', 'compose', 'composition', 'depict', 'deputy', 'elite'],
    audioUrl: 'https://xgitkcmskcqghwaiioue.supabase.co/storage/v1/object/public/podcasts/EmilysPhotoJourney_podcast_output.mp3',
    transcript: "Main: Welcome to today's mini-story podcast!\n\nGuest: Hi everyone! I'm Sarah, and I'm thrilled to be here!\n\nMain: Before we dive into our Australian adventure today, let's learn some cool new words!\n\nMain: First word: accuse!\nGuest: Ooh, that's a strong word! What does it mean?\nMain: To accuse someone means to say they did something wrong or illegal. Like if someone says, \"You stole my sandwich!\" — they’re accusing you!\nGuest: Hopefully not about sandwiches! Accuse, accuse.\n\nMain: Next word: acquire!\nGuest: Hmm, that sounds fancy. What's it about?\nMain: To acquire something means to get it, often by effort. Like, you acquire a new skill after lots of practice!\nGuest: Oh, so if I learn to surf, I acquire surfing skills!\nMain: Exactly! Acquire, acquire.\n\nMain: Now: bright!\nGuest: Easy one! It means lots of light, right?\nMain: Yes! And it can also mean smart — like a bright student!\nGuest: Or a bright sunny day in Australia!\nMain: Perfect! Bright, bright.\n\nMain: Next: boot!\nGuest: Oh! I know in Australia they call the car trunk the boot!\nMain: Exactly! And it's also a type of shoe — like hiking boots!\nGuest: Multi-purpose word! Boot, boot.\n\nMain: Now: coal!\nGuest: That’s the black rock people burn for energy, right?\nMain: Yes! Coal is used in power stations — but also for barbecues sometimes!\nGuest: Yum, coal-grilled food! Coal, coal.\n\nMain: Next word: compose!\nGuest: Is that like writing music?\nMain: Yes! You can compose music, emails, even yourself — like, compose yourself before a big speech!\nGuest: I better compose myself now!\n\nMain: And a related word: composition!\nGuest: So the thing you composed?\nMain: Exactly! A composition could be a piece of writing or music.\nGuest: My school essays were compositions!\nMain: Yes! Composition, composition.\n\nMain: Now: depict!\nGuest: Hmm, is that like showing something in art?\nMain: Yes! To depict means to show or represent something, in art or words!\nGuest: Cool! I love paintings that depict nature!\nMain: Great example! Depict, depict.\n\nMain: Now: deputy!\nGuest: Like a second-in-command, right?\nMain: Exactly! A deputy is someone who helps or replaces the leader.\nGuest: Like a deputy mayor!\nMain: Perfect! Deputy, deputy.\n\nMain: Last one: elite!\nGuest: Ooh, fancy! It means the best of the best, right?\nMain: Yes! Elite means the top group — like elite athletes!\nGuest: Or elite students!\nMain: Exactly! Elite, elite.\n\nMain: Awesome! Now, let’s dive into today’s story — set in sunny Queensland, Australia!\n\nMain: Our story today is about a young Australian named Emily, who lived in the small mining town of Blackwater, Queensland.\nGuest: Oh, mining town — lots of coal, right?\nMain: Exactly! Emily’s father worked in the coal mines, and her brother was training to be an elite rugby player!\n\nMain: Emily loved photography. One day, she decided to create a photo composition that would depict life in Blackwater — the bright blue skies, the dusty boots of miners, the trains carrying coal, and the friendly townsfolk.\nGuest: Sounds like a beautiful project!\n\nMain: But when she submitted her photos to a national competition, a rival photographer accused her of editing the images too much.\nGuest: Oh no! That must have been upsetting!\n\nMain: Emily decided to stay composed. She calmly explained how she had simply used natural lighting and careful composition, not heavy editing.\nGuest: Good for her! Stay classy, Emily!\n\nMain: The local deputy mayor heard about the issue and supported Emily, stating that her photos beautifully depicted the spirit of the town.\nGuest: Community support is so important!\n\nMain: In the end, Emily’s photo series won second place. But more importantly, she acquired national recognition — and an offer to intern with an elite photojournalist in Sydney!\nGuest: Wow! From Blackwater to Sydney — what an adventure!\n\nMain: Now let’s go through Emily’s story again — step by step!\nGuest: I’ll help ask some questions too!\n\nMain: Emily lived in the small mining town of Blackwater, Queensland.\nGuest: Where did Emily live?\nMain: Emily lived in Blackwater, a small mining town in Queensland.\n\nMain: Was Blackwater a city or a town?\nGuest: It was a town — a small mining town!\n\nGuest: What kind of mining was in Blackwater?\nMain: Coal mining — they mined lots of coal there.\n\nMain: Emily’s father worked in the coal mines, and her brother was training to be an elite rugby player.\nGuest: Where did Emily’s father work?\nMain: He worked in the coal mines.\n\nMain: What was her brother training to be?\nGuest: An elite rugby player!\n\nGuest: Do you think being an elite athlete is hard work?\nMain: Yes, it takes a lot of dedication and effort!\n\nMain: Emily loved photography. She decided to create a photo composition that would depict life in Blackwater.\nGuest: What did Emily love?\nMain: She loved photography.\n\nMain: What was her project about?\nGuest: She wanted to create a composition to depict life in Blackwater.\n\nGuest: What do you think she might have photographed?\nMain: Probably the bright skies, coal trains, miners’ boots, and local people.\n\nMain: She submitted her photos to a national competition, but a rival photographer accused her of editing them too much.\nGuest: What did the rival photographer do?\nMain: The rival accused her of editing the photos too much.\n\nMain: Was this accusation fair?\nGuest: No, it wasn’t — she used natural lighting and good composition!\n\nGuest: How would you feel if someone accused you unfairly?\nMain: I’d feel upset, but I’d try to stay calm like Emily.\n\nMain: Emily stayed composed and explained how she had used natural lighting, not heavy editing.\nGuest: Did Emily stay calm?\nMain: Yes, she stayed composed and explained clearly.\n\nMain: What does ‘compose’ mean here?\nGuest: It means she controlled her emotions — she didn’t get angry or upset.\n\nMain: The deputy mayor supported Emily, saying her photos beautifully depicted the town.\nGuest: Who supported Emily?\nMain: The deputy mayor!\n\nMain: What did the deputy mayor say about the photos?\nGuest: That they depicted the spirit of the town very well!\n\nMain: Emily’s photo series won second place, and she acquired national recognition — plus an internship offer with an elite photojournalist in Sydney!\nGuest: What place did Emily win?\nMain: Second place!\n\nMain: What did she acquire from this experience?\nGuest: She acquired national recognition — and an internship offer!\n\nGuest: Who offered her an internship?\nMain: An elite photojournalist in Sydney!\n\nGuest: Do you think she will enjoy working in Sydney?\nMain: I think so — it’s a great opportunity for her!\n\nMain: Now let’s practice a new tense by retelling parts of Emily’s story!\n\nMain: We’re going to use the Past Perfect tense — which shows that one past action happened before another past action.\n\nMain: For example: Emily had decided to enter the competition before she submitted her photos.\nGuest: What does the Past Perfect tense show?\nMain: It shows an action that happened before another past action.\n\nMain: How do we form the Past Perfect?\nGuest: We use ‘had’ plus the past participle — like ‘had decided’, ‘had submitted’.\n\nMain: Emily had loved photography for years before starting her project.\nGuest: Had Emily loved photography before her project?\nMain: Yes, she had loved photography for years!\n\nMain: Her brother had been training to be an elite rugby player long before Emily entered the contest.\nGuest: Had her brother started training after or before the contest?\nMain: Before — he had been training long before she entered!\n\nMain: The deputy mayor had already heard about Emily’s project when the accusations came.\nGuest: Had the deputy mayor known about the project already?\nMain: Yes — he had already heard about it!\n\nGuest: Why is it useful to use Past Perfect here?\nMain: Because it shows these things happened before the main events of the story!\n\nMain: And that’s the end of our story about Emily — and our Past Perfect practice!\nGuest: What a fantastic journey! Thanks for listening, everyone — see you next time!",
    duration: '05:00',
    createdAt: new Date(),
  },
  {
    id: '4',
    title: 'The Kangaroo Rescue (Senator Fatima Payman Voice)',
    topic: 'A story about kindness and wildlife rescue in the Outback',
    words: ['kangaroo', 'outback', 'rescue', 'joey', 'jeep', 'ranger', 'kindness'],
    audioUrl: 'https://xgitkcmskcqghwaiioue.supabase.co/storage/v1/object/public/podcasts/TheKangarooRescueSenatorFatimaPaymanVoice_podcast_output.mp3',
    transcript: "Main: Welcome back to another episode of “Easy English Adventures” — where stories aren't just told, they're lived. I’m your host, Jamie, and today we’re hopping into the wild heart of Australia!\n\nGuest: Hopping? I feel like I already know what this story’s about…\n\nMain: You might. But trust me, this one’s got surprises. So, sit back, relax, and let’s head down under.\n\nMain: The air was dry, the sun unforgiving, and the red dust swirled like mist around Tom’s boots. He was an American backpacker, traveling solo through the Australian outback, chasing adventures, selfies, and something... undefined.\n\nGuest: Classic backpacker. Did he bring enough water at least?\n\nMain: He did, but barely. His jeep had broken down miles from the nearest town. But he wasn't worried—yet. He had a map, a bottle of water, and optimism. Lots of it.\n\nGuest: Optimism is great until the dingoes show up.\n\nMain: Just as Tom was debating whether to walk east or west, he heard something—a strange, high-pitched sound. A cry. An animal’s cry!\n\nMain: He followed the sound, pushing through dry shrubs and thorny bushes. And there, tangled in a barbed wire fence, was a young kangaroo. Its fur was dusty, and its leg twisted awkwardly.\n\nGuest: No way. That must’ve been heartbreaking.\n\nMain: It was. Tom knelt down, whispering softly. The kangaroo’s eyes were wide with fear, but it didn’t move. Carefully, Tom took off his shirt, wrapped it around the animal’s leg, and began cutting the wire with his pocketknife.\n\nGuest: I’m impressed. He didn’t panic?\n\nMain: Not at all. He stayed calm. After a few tense minutes, the joey was free. It didn’t hop away, though. It limped. Badly.\n\nMain: Tom knew he had to help. He carried the kangaroo in his arms, all the way back to the jeep. He radioed a ranger station, and miraculously, someone responded—they were just 30 minutes away.\n\nGuest: Now that’s lucky!\n\nMain: He waited under the burning sun, holding the injured joey, whispering to it like an old friend. When the rangers arrived, they were stunned—not just by the rescue, but by how calm both the rescuer and rescued were.\n\nGuest: So, what happened to the kangaroo?\n\nMain: The joey recovered at a wildlife sanctuary. They named him Tom Jr. And our backpacker? He never forgot that day in the outback. Because sometimes, the real adventure… is in kindness.\n\nGuest: What a story. I’m feeling warm inside and sunburnt at the same time.\n\nMain: Let’s go deeper and make sure our listeners really understood the story. Ready for the Interactive Retelling?\n\nMain: So let’s retell the story in small parts—and ask you some questions along the way. Try to answer out loud!\n\nMain: Tom was an American backpacker traveling through the Australian outback. His jeep broke down in the middle of nowhere.\n\nQuestion: Where was Tom traveling?\nAnswer: He was in the Australian outback.\n\nQuestion: What happened to his jeep?\nAnswer: It broke down.\n\nQuestion: Do you think it’s smart to travel alone in the outback?\nAnswer: It depends—but it's risky without preparation.\n\nQuestion: Have you ever been somewhere remote like that?\n\nMain: While deciding which way to walk, Tom heard a strange animal cry. He followed the sound and found a young kangaroo caught in a barbed wire fence.\n\nQuestion: What sound did Tom hear?\nAnswer: An animal’s cry.\n\nQuestion: What was trapped in the fence?\nAnswer: A young kangaroo.\n\nQuestion: Why do you think Tom followed the sound?\nAnswer: Because he was curious or concerned.\n\nQuestion: Would you have followed it?\n\nMain: Tom wrapped his shirt around the joey’s leg and used a knife to free it from the wire. The kangaroo was hurt and couldn’t hop properly.\n\nQuestion: How did Tom help the kangaroo?\nAnswer: He wrapped its leg and cut the wire.\n\nQuestion: What tool did he use?\nAnswer: A pocketknife.\n\nQuestion: Why do you think the kangaroo didn’t run away?\nAnswer: It was injured and maybe scared.\n\nQuestion: Have you ever helped an animal?\n\nMain: Tom carried the joey back to his jeep and called a ranger station. The rangers arrived 30 minutes later and were impressed by Tom’s actions.\n\nQuestion: Who did Tom call?\nAnswer: A ranger station.\n\nQuestion: How long did they take to arrive?\nAnswer: Thirty minutes.\n\nQuestion: Why were the rangers surprised?\nAnswer: Because Tom stayed calm and helped the animal.\n\nQuestion: Would you have done the same?\n\nMain: The joey healed at a sanctuary and was named Tom Jr. It became a symbol of the kindness Tom showed in the outback.\n\nQuestion: Where did the joey recover?\nAnswer: At a wildlife sanctuary.\n\nQuestion: What was the kangaroo’s new name?\nAnswer: Tom Jr.\n\nQuestion: Why do you think they named it after him?\nAnswer: To honor what he did.\n\nQuestion: Do you believe small actions can create big change?\n\nMain: Nice work, everyone. Let’s shift gears and play with grammar in the Tense Transformation section!\n\nMain: Today, we’re practicing the Past Perfect tense. That’s when we talk about something that was already completed *before* something else in the past.\n\nGuest: Ah, like “He had walked ten miles before he saw the kangaroo.”\n\nMain: Exactly! Now let’s transform three key moments from the story into the past perfect.\n\nMain: Original: \"Tom’s jeep broke down in the outback.\"\n\nMain: Transformed: \"Tom’s jeep had broken down before he heard the animal’s cry.\"\n\nQuestion: Why do we use \"had broken down\" here?\nAnswer: Because it happened before the animal's cry.\n\nQuestion: Which happened first: the jeep breaking down or hearing the cry?\nAnswer: The jeep broke down first.\n\nMain: Original: \"He followed the sound and found the kangaroo.\"\n\nMain: Transformed: \"He had followed the sound before he found the kangaroo.\"\n\nQuestion: What two actions are being compared?\nAnswer: Following the sound and finding the kangaroo.\n\nQuestion: Which one happened first?\nAnswer: He followed the sound first.\n\nMain: Original: \"The rangers arrived 30 minutes later.\"\n\nMain: Transformed: \"The rangers had arrived by the time the sun began to set.\"\n\nQuestion: Why do we say \"had arrived\"?\nAnswer: Because their arrival happened before sunset.\n\nQuestion: Is this sentence showing a sequence of past events?\nAnswer: Yes, it shows what happened first in the past.\n\nMain: Great job practicing! The past perfect helps us create clear timelines in storytelling.\n\nGuest: I always feel like a time traveler when we use it!\n\nMain: That’s it for today’s episode of “Easy English Adventures.” Be kind, be brave, and keep listening.\n\nGuest: And maybe pack an extra water bottle… just in case you meet a kangaroo.\n\nMain: See you next time!",
    duration: '05:00',
    createdAt: new Date(),
}
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

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'generate' | 'library' | 'settings'>('generate');
  const [podcasts, setPodcasts] = useState<Podcast[]>(INITIAL_PODCASTS);
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(INITIAL_PODCASTS[0]); // Load the first one
  
  // Generator State
  const [topic, setTopic] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  
  // Settings (Now includes voice selections)
  const [settings, setSettings] = useState<AppSettings>({
    n8nWebhookUrl: 'https://chatbot.soranchi.me/webhook/generate-story',
    mainVoice: 'albo', 
    guestVoice: 'lachlan',
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
        body: JSON.stringify({ 
          topic: topic, 
          words: words,
          mainVoice: settings.mainVoice, // NEW
          guestVoice: settings.guestVoice // NEW
        })
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
        title: data.storyTitle || topic, // Use the title returned from Python
        topic: topic,
        words: [...words],
        transcript: data.transcript || "No transcript returned.",
        audioUrl: data.audioUrl, 
        duration: '00:00',
        createdAt: new Date(),
      };

      setPodcasts([newPodcast, ...podcasts]);
      setCurrentPodcast(newPodcast);
      setActiveTab('library');

    } catch (error) {
      alert("Failed to connect or generate! Check the n8n execution log.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- AUDIO LOGIC ---
  useEffect(() => {
    if (currentPodcast?.audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      
      const audio = new Audio(currentPodcast.audioUrl);
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;

      // Event Listeners
      const onLoadedMetadata = () => setDuration(audio.duration);
      const onTimeUpdate = () => setCurrentTime(audio.currentTime);
      const onEnded = () => setIsPlaying(false);
      const onError = (e: Event) => {
        console.error("Audio Load Error:", e, audio.error);
        alert(`Error: Audio file failed to load. Check that the Supabase link is valid and Public.`);
        setIsPlaying(false);
      };

      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      setIsPlaying(false);
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
    if (!audioRef.current || !currentPodcast?.audioUrl) return;
    
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
            <div className={`lg:col-span-4 space-y-4 ${currentPodcast && activeTab !== 'settings' ? 'hidden lg:block' : 'block'} ${activeTab === 'settings' ? 'hidden' : ''}`}>
              <h2 className="text-xl font-bold text-white mb-4">Your Library</h2>
              {podcasts.map((pod) => (
                <div key={pod.id} onClick={() => { setCurrentPodcast(pod); setActiveTab('library'); }} className={`p-4 rounded-xl border cursor-pointer hover:bg-slate-800 transition-all ${currentPodcast?.id === pod.id ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-900/50 border-slate-800'}`}>
                  <h3 className="font-semibold text-slate-200">{pod.title}</h3>
                  <p className="text-xs text-slate-500">{pod.topic}</p>
                </div>
              ))}
            </div>

            {/* Player View */}
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
                  {/* Voice settings are already in the Generator tab, removed from here for clarity */}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}