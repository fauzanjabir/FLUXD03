import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { 
  Plus, 
  Minus,
  MoreVertical, 
  Pencil, 
  Palette, 
  Trash2, 
  Flame, 
  Check, 
  ChevronRight,
  Home,
  Calendar,
  User,
  X,
  Database,
  DollarSign,
  Zap,
  ArrowLeft,
  Search,
  Filter,
  PlusCircle,
  TrendingUp,
  Instagram,
  ExternalLink,
  BarChart3,
  Activity,
  Coffee,
  Layout,
  ArrowUpRight,
  MessageCircle,
  Eye,
  Heart,
  BarChart2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import confetti from 'canvas-confetti';
// @ts-ignore
import logoFlux from './logo-flux.png';
import { cn } from './lib/utils';
import { Habit } from './types';

const TODAY = new Date();
const TODAY_STR = TODAY.toISOString().split('T')[0];

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const ICONS = ['💪', '📚', '🧘', '💧', '🎯', '✍️', '🎨', '🏃', '🎵', '💤', '🥗', '🧠', '❤️', '⚡', '📱'];

const STREAK_MESSAGES = {
  zero: [
    "Ready to start?\nEvery journey begins here.",
    "Still showing up.\nThat's what matters!",
    "Today is a perfect day\nto start again."
  ],
  early: [ // 1-3 days
    "Good start!\nKeep the momentum.",
    "The first steps are\nthe hardest. Well done!",
    "Building blocks of\na better you."
  ],
  solid: [ // 4-6 days
    "You're building\na solid habit!",
    "Consistency is starting\nto pay off.",
    "Look at you go!\nStay focused."
  ],
  weekly: [ // 7-13 days
    "One week down!\nYou're on fire.",
    "Seven days of discipline.\nKeep it rolling!",
    "You're making this\nlook easy."
  ],
  elite: [ // 14-29 days
    "Two weeks! You're\nbecoming elite.",
    "Pure discipline.\nNothing can stop you.",
    "Mastery is within\nyour reach."
  ],
  legendary: [ // 30+ days
    "Legendary streak!\nPure inspiration.",
    "You are the 1%.\nUnstoppable.",
    "A monument to\nyour willpower."
  ]
};

export default function App() {
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('flux_habits');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'Workout', icon: '💪', completedDates: [], createdAt: Date.now() },
      { id: '2', name: 'Create Content', icon: '✍️', completedDates: [], createdAt: Date.now() }
    ];
  });

  const [activePage, setActivePage] = useState<'home' | 'tracker' | 'content-vault' | 'money-tracker' | 'engagement-tracker'>('home');
  const [contentIdeas, setContentIdeas] = useState<{ id: string, title: string, status: string, date: string }[]>(() => {
    const saved = localStorage.getItem('flux_content_ideas');
    return saved ? JSON.parse(saved) : [];
  });
  const [transactions, setTransactions] = useState<{ id: string, type: 'in' | 'out', amount: number, note: string, date: string }[]>(() => {
    const saved = localStorage.getItem('flux_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('💪');
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [globalPeriod, setGlobalPeriod] = useState(30);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (msg: string) => {
    setToast(msg);
  };

  useEffect(() => {
    localStorage.setItem('flux_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('flux_content_ideas', JSON.stringify(contentIdeas));
  }, [contentIdeas]);

  useEffect(() => {
    localStorage.setItem('flux_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const toggleDate = useCallback((habitId: string, dateStr: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const isCompleted = h.completedDates.includes(dateStr);
        const isSkipped = h.skippedDates?.includes(dateStr);

        if (!isCompleted && !isSkipped) {
          // Move to Completed
          if (dateStr === TODAY_STR) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#AEE928', '#FF6B6B', '#FFFFFF']
            });
            showToast('Habit hari ini selesai! 🎉');
          }
          return {
            ...h,
            completedDates: [...h.completedDates, dateStr],
            skippedDates: h.skippedDates?.filter(d => d !== dateStr) || []
          };
        } else if (isCompleted && h.allowRestDays) {
          // Move to Rest Day (only if allowed)
          showToast('Ditandai sebagai Rest Day ☕');
          return {
            ...h,
            completedDates: h.completedDates.filter(d => d !== dateStr),
            skippedDates: [...(h.skippedDates || []), dateStr]
          };
        } else {
          // Move to None
          return {
            ...h,
            completedDates: h.completedDates.filter(d => d !== dateStr),
            skippedDates: h.skippedDates?.filter(d => d !== dateStr) || []
          };
        }
      }
      return h;
    }));
  }, []);

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName,
      icon: selectedIcon,
      completedDates: [],
      skippedDates: [],
      allowRestDays: true,
      createdAt: Date.now()
    };
    setHabits(prev => [newHabit, ...prev]);
    setNewHabitName('');
    setIsAddingHabit(false);
    showToast('Habit berhasil ditambahkan!');
  };

  const deleteHabit = () => {
    if (habitToDelete) {
      setHabits(prev => prev.filter(h => h.id !== habitToDelete));
      setHabitToDelete(null);
      setIsDeleteModalOpen(false);
      showToast('Habit deleted');
    }
  };

  const updateHabitIcon = (icon: string) => {
    if (editingHabitId) {
      setHabits(prev => prev.map(h => h.id === editingHabitId ? { ...h, icon } : h));
      setEditingHabitId(null);
      setIsIconModalOpen(false);
    }
  };

  const toggleRestDays = (habitId: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const newState = !h.allowRestDays;
        showToast(newState ? 'Rest Day diaktifkan' : 'Rest Day dinonaktifkan');
        return { ...h, allowRestDays: newState };
      }
      return h;
    }));
  };

  const handleReorder = (newOrder: Habit[]) => {
    setHabits(newOrder);
  };

  return (
    <div className="flex justify-center min-h-screen bg-black font-sans">
      <div className="w-full max-w-[430px] bg-[#0a0a0a] min-h-screen relative pb-24 border-x border-white/5 overflow-hidden">
        
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="fixed top-6 left-1/2 z-[1000] bg-brand-green text-black px-5 py-3 rounded-xl text-[13px] font-bold shadow-2xl pointer-events-none whitespace-nowrap"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Pages */}
        <AnimatePresence mode="wait">
          {activePage === 'home' && (
            <HomePage 
              key="home" 
              setActivePage={setActivePage} 
              habits={habits}
              contentIdeas={contentIdeas}
              transactions={transactions}
            />
          )}
          {activePage === 'tracker' && (
            <TrackerPage 
              key="tracker"
              habits={habits}
              onReorder={handleReorder}
              toggleDate={toggleDate}
              isAddingHabit={isAddingHabit}
              setIsAddingHabit={setIsAddingHabit}
              newHabitName={newHabitName}
              setNewHabitName={setNewHabitName}
              selectedIcon={selectedIcon}
              setSelectedIcon={setSelectedIcon}
              addHabit={addHabit}
              openIconModal={(id) => { setEditingHabitId(id); setIsIconModalOpen(true); }}
              openDeleteModal={(id) => { setHabitToDelete(id); setIsDeleteModalOpen(true); }}
              globalPeriod={globalPeriod}
              setGlobalPeriod={setGlobalPeriod}
              toggleRestDays={toggleRestDays}
            />
          )}
          {activePage === 'content-vault' && (
            <ContentVaultPage 
              key="content-vault" 
              ideas={contentIdeas} 
              setIdeas={setContentIdeas} 
              onBack={() => setActivePage('home')} 
            />
          )}
          {activePage === 'money-tracker' && (
            <MoneyTrackerPage 
              key="money-tracker" 
              transactions={transactions} 
              setTransactions={setTransactions} 
              onBack={() => setActivePage('home')} 
            />
          )}
          {activePage === 'engagement-tracker' && (
            <EngagementTrackerPage 
              key="engagement-tracker" 
              onBack={() => setActivePage('home')} 
            />
          )}
        </AnimatePresence>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5 flex justify-around py-4 px-2 z-50">
          <NavButton active={activePage === 'home'} onClick={() => setActivePage('home')} icon={<Home size={20} />} label="Home" />
          <NavButton active={activePage === 'tracker'} onClick={() => setActivePage('tracker')} icon={<Calendar size={20} />} label="Tracker" />
          <NavButton active={false} onClick={() => {}} icon={<Plus size={20} />} label="Add" />
          <NavButton active={false} onClick={() => {}} icon={<User size={20} />} label="Profile" />
        </div>

        {/* Modals */}
        <Modal isOpen={isIconModalOpen} onClose={() => setIsIconModalOpen(false)} title="Change Icon">
          <div className="grid grid-cols-5 gap-3 mb-6">
            {ICONS.map(icon => (
              <button 
                key={icon}
                onClick={() => updateHabitIcon(icon)}
                className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl hover:bg-white/10 transition-colors"
              >
                {icon}
              </button>
            ))}
          </div>
        </Modal>

        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Habit">
          <p className="text-white/60 text-left mb-6 text-sm leading-relaxed">🗑️ Hapus habit ini? Semua data akan hilang permanen dan tidak bisa dikembalikan.</p>
          <div className="flex gap-3">
            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 font-semibold text-white/60">Cancel</button>
            <button onClick={deleteHabit} className="flex-1 py-3 rounded-xl bg-brand-red font-semibold text-white">Delete</button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="relative w-9 h-9 flex items-center justify-center">
      <img 
        src={logoFlux} 
        alt="FLUX Logo" 
        className="w-full h-full object-contain" 
        referrerPolicy="no-referrer" 
      />
    </div>
  );
}

function HomePage({ 
  setActivePage, 
  habits, 
  contentIdeas, 
  transactions 
}: { 
  setActivePage: (page: any) => void, 
  habits: Habit[],
  contentIdeas: any[],
  transactions: any[],
  key?: React.Key
}) {
  const TODAY_STR = new Date().toISOString().split('T')[0];
  
  const habitsDoneToday = habits.filter(h => h.completedDates.includes(TODAY_STR)).length;
  const totalHabits = habits.length;
  
  const totalBalance = transactions.reduce((acc, t) => t.type === 'in' ? acc + t.amount : acc - t.amount, 0);
  const lastTransaction = transactions[transactions.length - 1];

  const latestIdea = contentIdeas[contentIdeas.length - 1];
  const completionRate = totalHabits > 0 ? Math.round((habitsDoneToday / totalHabits) * 100) : 0;
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-6 pb-24"
    >
      <header className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <div className="text-[13px] font-bold text-white/80 tracking-wide uppercase">FLUX</div>
            <div className="text-[10px] text-white/40 font-medium">Dashboard</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium text-brand-green tracking-tight">{dateStr}</div>
          <div className="text-[9px] text-white/20 font-medium">Command Center</div>
        </div>
      </header>

      <div className="mb-8 flex items-end justify-between px-1">
        <div>
          <h1 className="text-[32px] font-black leading-none tracking-tighter text-white">
            Keep the <span className="text-brand-green">Flux</span>.
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Habit Widget - Large */}
        <DashboardWidget 
          className="col-span-2"
          title="Habit Tracker"
          icon={<Flame size={18} className="text-orange-500" />}
          onClick={() => setActivePage('tracker')}
        >
          <div className="flex items-end justify-between mt-2">
            <div>
              <div className="text-3xl font-black text-white tracking-tighter">
                {habitsDoneToday}<span className="text-white/20">/{totalHabits}</span>
              </div>
            </div>
            <div className="flex gap-1 mb-1">
              {habits.slice(0, 5).map(h => (
                <div 
                  key={h.id} 
                  className={cn(
                    "w-2 h-2 rounded-full",
                    h.completedDates.includes(TODAY_STR) ? "bg-brand-green" : "bg-white/10"
                  )} 
                />
              ))}
            </div>
          </div>
        </DashboardWidget>

        {/* Money Widget */}
        <DashboardWidget 
          title="Finance"
          icon={<DollarSign size={18} className="text-brand-green" />}
          onClick={() => setActivePage('money-tracker')}
        >
          <div className="mt-3">
            <div className="text-[10px] font-medium text-white/40 mb-1">
              {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="text-xl font-black text-white tracking-tighter leading-tight break-words">
              {totalBalance >= 0 ? '+ ' : '- '}Rp {Math.abs(totalBalance).toLocaleString()}
            </div>
          </div>
        </DashboardWidget>

        {/* Content Widget */}
        <DashboardWidget 
          title="Vault"
          icon={<Layout size={18} className="text-blue-400" />}
          onClick={() => setActivePage('content-vault')}
        >
          <div className="mt-2">
            <div className="text-xl font-black text-white tracking-tight">
              {contentIdeas.length}
            </div>
          </div>
        </DashboardWidget>

        {/* Engagement Widget */}
        <DashboardWidget 
          className="col-span-2"
          title="Engagement Tracker"
          icon={<TrendingUp size={18} className="text-purple-400" />}
          onClick={() => setActivePage('engagement-tracker')}
        >
          <div className="flex items-center justify-between mt-2">
            <div>
              <div className="text-xl font-black text-white tracking-tight">Analytics</div>
            </div>
            <div className="flex items-end gap-1 h-8">
              {[4, 7, 5, 9, 6, 8, 10].map((h, i) => (
                <div key={i} className="w-1.5 bg-brand-green/20 rounded-t-sm" style={{ height: `${h * 10}%` }} />
              ))}
            </div>
          </div>
        </DashboardWidget>
      </div>
    </motion.div>
  );
}

function DashboardWidget({ 
  title, 
  icon, 
  children, 
  onClick, 
  className 
}: { 
  title: string, 
  icon: React.ReactNode, 
  children: React.ReactNode, 
  onClick?: () => void,
  className?: string
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "bg-[#151515] border border-white/5 rounded-[24px] p-5 text-left hover:border-brand-green/20 transition-all active:scale-[0.98] group relative overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white/5 rounded-xl group-hover:bg-brand-green/10 transition-colors">
            {icon}
          </div>
          <span className="text-[12px] font-bold text-white/60 group-hover:text-white transition-colors tracking-tight">{title}</span>
        </div>
        <ArrowUpRight size={14} className="text-white/10 group-hover:text-brand-green transition-colors" />
      </div>
      {children}
    </button>
  );
}

function TrackerPage({ 
  habits, 
  onReorder, 
  toggleDate,
  isAddingHabit,
  setIsAddingHabit,
  newHabitName,
  setNewHabitName,
  selectedIcon,
  setSelectedIcon,
  addHabit,
  openIconModal,
  openDeleteModal,
  globalPeriod,
  setGlobalPeriod,
  toggleRestDays
}: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-6"
    >
      <header className="flex items-center gap-3 mb-8">
        <Logo />
        <div>
          <div className="text-[13px] font-bold text-white/80 tracking-wide">FLUX</div>
          <div className="text-[11px] text-white/40 font-medium">Dashboard</div>
        </div>
      </header>

      <h1 className="text-[42px] font-extrabold leading-[1.1] tracking-tighter mb-8">
        You <span className="text-brand-green">become</span><br />What you <span className="text-brand-green">repeat</span>.
      </h1>

      <SectionLabel label="Your Habit Tracker" />

      {/* Add Habit Section */}
      <div className="bg-[#151515] border border-white/5 rounded-[18px] p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-white/80">Add New Habit</div>
            <div className="text-[11px] font-medium text-white/20">Start tracking something new</div>
          </div>
          <button 
            onClick={() => setIsAddingHabit(!isAddingHabit)}
            className="bg-brand-green text-black px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
          >
            {isAddingHabit ? 'Cancel' : '+ Add Habit'}
          </button>
        </div>

        <AnimatePresence>
          {isAddingHabit && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <input 
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="e.g., Read 30 minutes"
                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm mb-4 outline-none focus:border-brand-green/40 transition-colors"
              />
              <div className="flex flex-wrap gap-2 mb-4">
                {ICONS.slice(0, 10).map(icon => (
                  <button 
                    key={icon}
                    onClick={() => setSelectedIcon(icon)}
                    className={cn(
                      "w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-lg border-2 transition-all",
                      selectedIcon === icon ? "border-brand-green bg-brand-green/10" : "border-transparent"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsAddingHabit(false)}
                  className="flex-1 bg-white/5 text-white/40 py-3 rounded-xl font-bold text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={addHabit}
                  className="flex-1 bg-brand-green text-black py-3 rounded-xl font-bold text-sm"
                >
                  Add Habit
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* View Period Selector */}
      <div className="bg-[#151515] border border-white/5 rounded-[14px] p-4 mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-white/40">View Period</span>
        <div className="flex gap-1.5">
          {[14, 30, 90].map(p => (
            <button 
              key={p}
              onClick={() => setGlobalPeriod(p)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all",
                globalPeriod === p ? "bg-brand-green/20 text-brand-green" : "bg-white/5 text-white/20"
              )}
            >
              {p}D
            </button>
          ))}
        </div>
      </div>

      {/* Habit Cards List */}
      <Reorder.Group axis="y" values={habits} onReorder={onReorder} className="space-y-4">
        {habits.map((habit: Habit) => (
          <HabitCard 
            key={habit.id} 
            habit={habit} 
            toggleDate={toggleDate} 
            openIconModal={openIconModal}
            openDeleteModal={openDeleteModal}
            period={globalPeriod}
            toggleRestDays={toggleRestDays}
          />
        ))}
      </Reorder.Group>
    </motion.div>
  );
}

function HabitCard({ habit, toggleDate, openIconModal, openDeleteModal, period, toggleRestDays, key }: { habit: Habit, toggleDate: (id: string, date: string) => void, openIconModal: (id: string) => void, openDeleteModal: (id: string) => void, period: number, toggleRestDays: (id: string) => void, key?: React.Key }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState(habit.name);

  const streak = useMemo(() => {
    let count = 0;
    const checkDate = new Date(TODAY);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const isCompleted = habit.completedDates.includes(dateStr);
      const isSkipped = habit.skippedDates?.includes(dateStr);

      if (isCompleted || isSkipped) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [habit.completedDates, habit.skippedDates]);

  const stats = useMemo(() => {
    const completedInRange = habit.completedDates.filter(d => {
      const date = new Date(d);
      const diff = (TODAY.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return diff < period;
    }).length;
    return {
      done: completedInRange,
      total: period,
      consistency: Math.round((completedInRange / period) * 100)
    };
  }, [habit.completedDates, period]);

  const quote = useMemo(() => {
    const habitSeed = parseInt(habit.id.slice(-1)) || 0;
    
    let category: keyof typeof STREAK_MESSAGES;
    if (streak === 0) category = 'zero';
    else if (streak < 4) category = 'early';
    else if (streak < 7) category = 'solid';
    else if (streak < 14) category = 'weekly';
    else if (streak < 30) category = 'elite';
    else category = 'legendary';

    const messages = STREAK_MESSAGES[category];
    return messages[habitSeed % messages.length];
  }, [habit.id, streak]);

  return (
    <Reorder.Item 
      value={habit}
      className="bg-[#151515] border border-white/5 rounded-[20px] p-5 relative"
    >
      <div className="flex items-center justify-between mb-4 pr-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-base">{habit.icon}</div>
          {isRenaming ? (
            <input 
              autoFocus
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={() => { setIsRenaming(false); /* Logic to save name would go here if needed */ }}
              onKeyDown={(e) => { if (e.key === 'Enter') setIsRenaming(false); }}
              className="bg-black/40 border border-brand-green/30 rounded-lg px-2 py-1 text-sm font-bold text-white outline-none w-32"
            />
          ) : (
            <span className="text-base font-bold text-white/90">{habit.name}</span>
          )}
        </div>
      </div>

      {/* Drag Handle & Menu */}
      <div className="absolute top-5 right-5 flex gap-2">
        <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 cursor-grab active:cursor-grabbing">
          <MoreVertical size={14} />
        </button>
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20"
          >
            <MoreVertical size={14} />
          </button>
          
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-10 right-0 w-44 bg-[#1e1e1e] border border-white/10 rounded-xl p-1.5 z-20 shadow-2xl"
              >
                <MenuButton icon={<Pencil size={14} />} label="Rename Habit" onClick={() => { setIsRenaming(true); setIsMenuOpen(false); }} />
                <MenuButton icon={<Palette size={14} />} label="Change Icon" onClick={() => { openIconModal(habit.id); setIsMenuOpen(false); }} />
                <MenuButton 
                  icon={<Coffee size={14} className={habit.allowRestDays ? "text-orange-500" : ""} />} 
                  label={habit.allowRestDays ? "Disable Rest Days" : "Enable Rest Days"} 
                  onClick={() => { toggleRestDays(habit.id); setIsMenuOpen(false); }} 
                />
                <div className="h-px bg-white/5 my-1" />
                <MenuButton icon={<Trash2 size={14} />} label="Delete Habit" danger onClick={() => { openDeleteModal(habit.id); setIsMenuOpen(false); }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="text-[11px] font-medium text-white/20 mb-3">
        {MONTH_NAMES[TODAY.getMonth()]} {TODAY.getFullYear()}
      </div>

      {/* Calendar Grid */}
      <CalendarGrid habit={habit} period={period} onToggle={(date) => toggleDate(habit.id, date)} />

      {/* Stats Bar (New Layout) */}
      <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-3">
        <div className="flex items-center">
          <div className="flex-1 text-center">
            <div className="text-xl font-extrabold text-brand-green leading-none mb-1">{stats.total}</div>
            <div className="text-[10px] font-medium text-white/20">Total Days</div>
          </div>
          <div className="w-px h-8 bg-white/5" />
          <div className="flex-1 text-center">
            <div className="text-xl font-extrabold text-brand-green leading-none mb-1">{stats.done}</div>
            <div className="text-[10px] font-medium text-white/20">Days Done</div>
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/20">Consistency</span>
            <span className="text-[13px] font-extrabold text-brand-green">{stats.consistency}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${stats.consistency}%` }}
              transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
              className="h-full bg-brand-green rounded-full stat-bar-fill"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
        <div className="text-[13px] text-white/40 leading-tight whitespace-pre-line">
          {quote}
        </div>
        <motion.div 
          key={streak}
          initial={{ scale: 0.9, opacity: 0.5 }}
          animate={{ 
            scale: [0.9, 1.1, 1],
            opacity: 1,
            boxShadow: streak > 0 ? [
              "0 0 0px rgba(249, 115, 22, 0)",
              "0 0 15px rgba(249, 115, 22, 0.4)",
              "0 0 5px rgba(249, 115, 22, 0.2)"
            ] : "none"
          }}
          transition={{ duration: 0.5 }}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors",
            streak > 0 ? "bg-orange-500/10 border border-orange-500/20" : "bg-white/5 border border-white/5"
          )}
        >
          <Flame 
            size={13} 
            className={cn(
              "transition-colors",
              streak > 0 ? "text-orange-500" : "text-white/20"
            )} 
          />
          <span className={cn(
            "text-xs font-bold transition-colors",
            streak > 0 ? "text-orange-500" : "text-white/20"
          )}>
            {streak} Days Streak!
          </span>
        </motion.div>
      </div>
    </Reorder.Item>
  );
}

function CalendarGrid({ habit, period, onToggle }: { habit: Habit, period: number, onToggle: (date: string) => void }) {
  const datesByMonth = useMemo(() => {
    const result: { name: string, year: number, dates: string[] }[] = [];
    let currentMonth: { name: string, year: number, dates: string[] } | null = null;

    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(TODAY);
      d.setDate(d.getDate() - i);
      const monthIndex = d.getMonth();
      const year = d.getFullYear();
      const dateStr = d.toISOString().split('T')[0];

      if (!currentMonth || currentMonth.name !== MONTH_NAMES[monthIndex] || currentMonth.year !== year) {
        currentMonth = {
          name: MONTH_NAMES[monthIndex],
          year: year,
          dates: []
        };
        result.push(currentMonth);
      }
      currentMonth.dates.push(dateStr);
    }
    return result;
  }, [period]);

  // Consistent sizing for all periods
  const gridGap = 'gap-1.5';
  const dotSize = 'w-full aspect-square rounded-lg';
  const fontSize = 'text-[10px]';
  const checkSize = 12;
  const monthMargin = 'space-y-3';

  return (
    <div className={cn("space-y-3 flex flex-col items-center")}>
      <div className="grid grid-cols-7 gap-1.5 mb-1 w-full">
        {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((d, i) => (
          <div key={i} className={cn("text-[10px] font-bold text-white/20 text-center py-1", i === 6 && "text-brand-red/60")}>{d}</div>
        ))}
      </div>
      
      <div className="w-full space-y-5">
        {datesByMonth.map((month) => {
          const firstDate = new Date(month.dates[0]);
          const jsDay = firstDate.getDay();
          const startOffset = jsDay === 0 ? 6 : jsDay - 1;

          return (
            <div key={`${month.name}-${month.year}`} className={monthMargin}>
              <div className="flex items-center gap-2 py-1">
                <span className="text-[10px] font-bold text-white/20 whitespace-nowrap tracking-wider uppercase">
                  {month.name} {month.year}
                </span>
                <div className="h-px bg-white/5 flex-1" />
              </div>
              
              <div className={cn("grid grid-cols-7", gridGap)}>
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {month.dates.map(dateStr => {
                  const date = new Date(dateStr);
                  const isCompleted = habit.completedDates.includes(dateStr);
                  const isSkipped = habit.skippedDates?.includes(dateStr);
                  const isToday = dateStr === TODAY_STR;
                  
                  return (
                    <button 
                      key={dateStr}
                      onClick={() => onToggle(dateStr)}
                      className={cn(
                        "flex flex-col items-center justify-center transition-all active:scale-90",
                        dotSize,
                        isCompleted ? "bg-brand-green shadow-[0_0_8px_rgba(174,233,40,0.2)]" : 
                        isSkipped ? "bg-orange-500/20 border border-orange-500/30" : "bg-white/5",
                        isToday && !isCompleted && !isSkipped && "border border-brand-green/40"
                      )}
                    >
                      <span className={cn(fontSize, "font-bold", isCompleted ? "text-black/40" : isSkipped ? "text-orange-500/40" : "text-white/20")}>
                        {date.getDate()}
                      </span>
                      {isCompleted && <Check size={checkSize} className="text-black/50" />}
                      {isSkipped && <Coffee size={checkSize - 2} className="text-orange-500/60" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-xs bg-[#151515] border border-white/10 rounded-[24px] p-6 shadow-2xl"
          >
            <div className="text-base font-bold text-white/80 text-center mb-6">{title}</div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
        active ? "text-brand-green" : "text-white/20"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-bold text-white/40 mb-4 tracking-wide">
      <div className="w-1.5 h-1.5 rounded-full bg-brand-green" />
      {label}
    </div>
  );
}

function QuickAction({ sphereClass, label, onClick }: { sphereClass: string, label: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-2.5 group"
    >
      <div className={cn("w-12 h-12 rounded-full transition-transform group-hover:scale-110", sphereClass)} />
      <span className="text-[10px] font-medium text-white/40 text-center leading-tight">{label}</span>
    </button>
  );
}

function AccessCard({ label, onClick }: { label: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-[#151515] border border-white/5 rounded-[18px] p-5 h-40 flex items-end text-left hover:border-brand-green/20 transition-all group"
    >
      <div className="text-sm font-bold text-white/60 group-hover:text-white transition-colors leading-tight">
        {label.split(' ').map((word, i) => (
          <React.Fragment key={i}>{word}<br /></React.Fragment>
        ))}
      </div>
    </button>
  );
}

function StatItem({ value, label }: { value: string | number, label: string }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-xl font-extrabold text-brand-green leading-none mb-1">{value}</div>
      <div className="text-[10px] font-medium text-white/20">{label}</div>
    </div>
  );
}

function MenuButton({ icon, label, onClick, danger }: { icon: React.ReactNode, label: string, onClick: () => void, danger?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
        danger ? "text-brand-red hover:bg-brand-red/10" : "text-white/60 hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ContentVaultPage({ ideas, setIdeas, onBack }: any) {
  const [newIdea, setNewIdea] = useState('');

  const addIdea = () => {
    if (!newIdea.trim()) return;
    const idea = {
      id: Date.now().toString(),
      title: newIdea,
      status: 'Idea',
      date: new Date().toLocaleDateString()
    };
    setIdeas([idea, ...ideas]);
    setNewIdea('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 mb-8 hover:text-white transition-colors">
        <ArrowLeft size={18} />
        <span className="text-sm font-bold">Back to Dashboard</span>
      </button>

      <h1 className="text-[42px] font-extrabold leading-[1.1] tracking-tighter mb-8">
        Content <span className="text-brand-green">Vault</span>.
      </h1>

      <div className="bg-[#151515] border border-white/5 rounded-[24px] p-6 mb-8">
        <div className="flex gap-3 mb-4">
          <input 
            type="text"
            value={newIdea}
            onChange={(e) => setNewIdea(e.target.value)}
            placeholder="Capture your next viral idea..."
            className="flex-1 bg-black/40 border border-white/5 rounded-xl p-4 text-sm outline-none focus:border-brand-green/40 transition-colors"
          />
          <button 
            onClick={addIdea}
            className="w-14 h-14 bg-brand-green text-black rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Plus size={24} />
          </button>
        </div>
        <p className="text-[11px] text-white/20 font-medium italic">
          * Ideas are currently stored locally. Notion integration coming soon.
        </p>
      </div>

      <SectionLabel label="Your Ideas" />
      <div className="space-y-3">
        {ideas.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-[24px]">
            <Database size={32} className="mx-auto text-white/10 mb-3" />
            <p className="text-sm text-white/20">No ideas yet. Start capturing!</p>
          </div>
        ) : (
          ideas.map((idea: any) => (
            <div key={idea.id} className="bg-[#151515] border border-white/5 rounded-[18px] p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white/80 mb-1">{idea.title}</div>
                <div className="text-[10px] text-white/20 font-medium">{idea.date}</div>
              </div>
              <div className="px-3 py-1 bg-brand-green/10 border border-brand-green/20 rounded-full text-[10px] font-bold text-brand-green uppercase tracking-wider">
                {idea.status}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function MoneyTrackerPage({ transactions, setTransactions, onBack }: any) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<'in' | 'out'>('out');
  const [category, setCategory] = useState('General');
  const [range, setRange] = useState(7);

  const [showSuccess, setShowSuccess] = useState(false);

  const categories = type === 'out' 
    ? ['🍔 Food', '🚗 Transport', '🛍️ Shopping', '🧾 Bills', '🎬 Entertainment', '📦 General']
    : ['💰 Salary', '👨‍💻 Freelance', '📈 Investment', '🎁 Gift', '📦 General'];

  const addTransaction = () => {
    if (!amount || isNaN(Number(amount))) return;
    const tx = {
      id: Date.now().toString(),
      type,
      category,
      amount: Number(amount),
      note: note || category,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now()
    };
    setTransactions([tx, ...transactions]);
    setAmount('');
    setNote('');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter((t: any) => t.id !== id));
  };

  // Group transactions by day for the chart
  const lastDays = Array.from({ length: range }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (range - 1 - i));
    return d;
  });

  const chartData = lastDays.map(d => {
    const dateStr = d.toLocaleDateString();
    const dayTransactions = transactions.filter((t: any) => t.date === dateStr);
    
    const income = dayTransactions
      .filter((t: any) => t.type === 'in')
      .reduce((acc: number, t: any) => acc + t.amount, 0);
      
    const expense = dayTransactions
      .filter((t: any) => t.type === 'out')
      .reduce((acc: number, t: any) => acc + t.amount, 0);

    return { 
      fullDate: dateStr,
      displayDate: d.getDate().toString(), 
      income,
      expense
    };
  });

  const startDate = lastDays[0].toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const endDate = lastDays[lastDays.length - 1].toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-24"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 mb-8 hover:text-white transition-colors">
        <ArrowLeft size={18} />
        <span className="text-sm font-bold">Back</span>
      </button>

      <h1 className="text-[42px] font-extrabold leading-[1.1] tracking-tighter mb-8">
        Cash <span className="text-brand-green">Flow</span>.
      </h1>

      {/* Expense Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#151515] border border-white/5 rounded-[24px] p-6 mb-8"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-[10px] font-bold text-white/20 tracking-tight leading-none">Cash Flow Overview</div>
            <div className="text-[9px] text-white/10 tracking-tight mt-1">{startDate} - {endDate}</div>
          </div>
          <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
            {[7, 14, 30].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-2 py-1 rounded-md text-[9px] font-bold transition-all",
                  range === r ? "bg-brand-green text-black" : "text-white/40 hover:text-white"
                )}
              >
                {r}D
              </button>
            ))}
          </div>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="displayDate" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700 }}
                dy={10}
              />
              <Bar 
                dataKey="income" 
                fill="#AEE928" 
                radius={[4, 4, 0, 0]}
                barSize={range > 14 ? 4 : 8}
              />
              <Bar 
                dataKey="expense" 
                fill="#F87171" 
                radius={[4, 4, 0, 0]}
                barSize={range > 14 ? 4 : 8}
              />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-black border border-white/10 p-3 rounded-xl shadow-2xl">
                        <div className="text-[9px] font-bold text-white/40 mb-2 uppercase tracking-widest">{payload[0].payload.fullDate}</div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-bold text-white/60">Income</span>
                            <span className="text-[10px] font-black text-brand-green">Rp {payload[0].value?.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-bold text-white/60">Expense</span>
                            <span className="text-[10px] font-black text-brand-red">Rp {payload[1].value?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#151515] border border-white/5 rounded-[24px] p-6 mb-8"
      >
        <div className="flex gap-2 mb-6">
          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={() => { setType('in'); setCategory('General'); }}
            className={cn(
              "flex-1 py-3 rounded-xl text-[11px] font-bold transition-all",
              type === 'in' ? "bg-brand-green/20 text-brand-green border border-brand-green/30" : "bg-white/5 text-white/20 border border-transparent"
            )}
          >
            Income
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={() => { setType('out'); setCategory('General'); }}
            className={cn(
              "flex-1 py-3 rounded-xl text-[11px] font-bold transition-all",
              type === 'out' ? "bg-brand-red/20 text-brand-red border border-brand-red/30" : "bg-white/5 text-white/20 border border-transparent"
            )}
          >
            Expense
          </motion.button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-white/20 tracking-tight mb-2 block ml-1">Amount</label>
            <input 
              type="text"
              inputMode="numeric"
              value={amount ? Number(amount).toLocaleString('id-ID') : ''}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setAmount(val);
              }}
              placeholder="0"
              className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-xl font-black text-white outline-none focus:border-brand-green/40 transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-white/20 tracking-tight mb-2 block ml-1">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <motion.button
                  key={cat}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                    category === cat 
                      ? "bg-brand-green/10 border-brand-green/40 text-brand-green" 
                      : "bg-white/5 border-transparent text-white/40"
                  )}
                >
                  {cat}
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-white/20 tracking-tight mb-2 block ml-1">Note</label>
            <input 
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What is this for?"
              className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-sm outline-none focus:border-brand-green/40 transition-colors"
            />
          </div>

          <motion.button 
            whileTap={{ scale: 0.98 }}
            whileHover={{ 
              boxShadow: "0 0 20px rgba(174, 233, 40, 0.2)",
              borderColor: "rgba(174, 233, 40, 0.4)"
            }}
            onClick={addTransaction}
            className="w-full bg-brand-green/10 text-brand-green border border-brand-green/20 py-4 rounded-xl font-bold text-xs tracking-tight hover:bg-brand-green/20 transition-all active:scale-[0.98] mt-4 relative overflow-hidden"
          >
            Confirm Transaction
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-6 right-6 z-50 pointer-events-none flex justify-center"
          >
            <div className="bg-brand-green text-black px-6 py-3 rounded-2xl font-bold text-xs shadow-[0_10px_40px_rgba(174,233,40,0.3)] flex items-center gap-2">
              <Check size={16} strokeWidth={3} />
              Transaction Recorded Successfully
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SectionLabel label="History" />
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {transactions.map((tx: any, index: number) => (
            <motion.div 
              key={tx.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: Math.min(index * 0.05, 0.3) }}
              className="bg-[#151515] border border-white/5 rounded-[18px] p-4 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn(
                  "w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center",
                  tx.type === 'in' ? "bg-brand-green/10 text-brand-green" : "bg-brand-red/10 text-brand-red"
                )}>
                  {tx.type === 'in' ? <Plus size={18} /> : <Minus size={18} />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white/80 truncate">{tx.note}</div>
                  <div className="text-[9px] text-white/20 font-medium truncate">{tx.category} • {tx.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                <div className={cn(
                  "text-sm font-black tracking-tight",
                  tx.type === 'in' ? "text-brand-green" : "text-brand-red"
                )}>
                  {tx.type === 'in' ? '+' : '-'}Rp {tx.amount.toLocaleString()}
                </div>
                <button 
                  onClick={() => deleteTransaction(tx.id)}
                  className="p-2 text-white/10 hover:text-brand-red transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function EngagementTrackerPage({ onBack }: any) {
  const [profileRange, setProfileRange] = useState(7);
  const [metric, setMetric] = useState<'views' | 'likes' | 'comments'>('views');
  const [globalRange, setGlobalRange] = useState(7);
  const [isLoading, setIsLoading] = useState(false);
  const [configStatus, setConfigStatus] = useState({ 
    hasNotion: true, 
    hasNotionDbProfile: true,
    hasNotionDbContents: true,
    hasNotionDbSnapshots: true
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [engagementError, setEngagementError] = useState('');
  
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [profileData, setProfileData] = useState({
    followers: 99000,
    following: 0,
    growthToday: 24,
    bio: "— Creative Storyteller ⚡️ Documenting life, Creativity, Content Creation & Strategy 📸 Contact & LUTs ↓",
    profilePic: "",
    history: Array.from({ length: 30 }, (_, i) => ({
      date: `Apr ${i + 1}`,
      delta: Math.floor(Math.random() * 200) + 50
    }))
  });

  useEffect(() => {
    checkConfig();
    fetchData();
    fetchProfile();
  }, []);

  const checkConfig = async () => {
    try {
      const res = await axios.get('/api/config-status');
      setConfigStatus(res.data);
      if (!res.data.hasNotion || !res.data.hasNotionDbProfile || !res.data.hasNotionDbContents || !res.data.hasNotionDbSnapshots) {
        setShowConfigModal(true);
      }
    } catch (error) {
      console.error("Config check error:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get('/api/profile');
      if (res.data) {
        setProfileData(res.data);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
    }
  };

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/engagement');
      if (res.data.items) {
        setContentItems(res.data.items);
        setEngagementError('');
      }
    } catch (error) {
      console.error("Fetch error:", error);
      const message = axios.isAxiosError(error) ? error.response?.data?.error : "";
      setEngagementError(message ? `Notion data belum kebaca: ${message}` : "Notion data belum kebaca. Cek env Vercel dan permission integration ke 3 database.");
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchData(), fetchProfile()]);
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const globalStats = {
    contentTracked: contentItems.length,
    comments: contentItems.reduce((acc, item) => acc + item.comments, 0),
    likes: contentItems.reduce((acc, item) => acc + item.likes, 0),
    views: contentItems.reduce((acc, item) => acc + item.views, 0),
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 mb-8 hover:text-white transition-colors">
        <ArrowLeft size={18} />
        <span className="text-sm font-bold">Back to Dashboard</span>
      </button>

      <div className="flex items-center gap-6 mb-8 overflow-x-auto pb-2 no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-5 h-5 bg-white/5 rounded flex items-center justify-center">
            <Instagram size={10} className="text-white/40" />
          </div>
          <span className="text-[10px] font-bold text-white/60"><span className="text-white">{globalStats.contentTracked}</span> content tracked</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MessageCircle size={14} className="text-brand-green" />
          <span className="text-[10px] font-bold text-white/60"><span className="text-white">+{globalStats.comments}</span> comments</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Heart size={14} className="text-brand-red" />
          <span className="text-[10px] font-bold text-white/60"><span className="text-white">+{globalStats.likes.toLocaleString()}</span> likes</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Eye size={14} className="text-brand-green" />
          <span className="text-[10px] font-bold text-white/60"><span className="text-white">+{globalStats.views > 1000 ? (globalStats.views/1000).toFixed(1) + 'K' : globalStats.views}</span> views</span>
        </div>
      </div>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-[42px] font-extrabold leading-[1.1] tracking-tighter">
            Growth <span className="text-brand-green">Monitor</span>.
          </h1>
          <p className="text-sm text-white/40 mt-1">Tracking daily engagement delta · {contentItems.length} content active</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-[#151515] border border-white/5 rounded-[24px] p-5 mb-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-brand-green p-1 bg-black shrink-0">
              <img src={profileData.profilePic || "https://picsum.photos/seed/profile/200/200"} alt="Profile" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-bold text-white truncate">Fauzan Jabir</span>
                <Check size={14} className="text-brand-green fill-brand-green shrink-0" />
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed mb-4 line-clamp-2">{profileData.bio}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-brand-green">{profileData.followers.toLocaleString()}</span>
                  <span className="text-[8px] font-bold text-white/20 tracking-tight">Followers</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-brand-green">{profileData.following.toLocaleString()}</span>
                  <span className="text-[8px] font-bold text-white/20 tracking-tight">Following</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-brand-green">+{profileData.growthToday}</span>
                  <span className="text-[8px] font-bold text-white/20 tracking-tight">Growth</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="h-32 w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold text-white/20 tracking-tight">Follower Growth</span>
              <div className="flex gap-1">
                {[7, 14, 30].map(r => (
                  <button 
                    key={r}
                    onClick={() => setProfileRange(r)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[9px] font-bold transition-all",
                      profileRange === r ? "bg-brand-green/20 text-brand-green" : "bg-white/5 text-white/20"
                    )}
                  >
                    {r}D
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profileData.history.slice(-profileRange)}>
                <defs>
                  <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#AEE928" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#AEE928" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="delta" stroke="#AEE928" strokeWidth={2} fillOpacity={1} fill="url(#growthGradient)" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#AEE928' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between gap-3 mb-8 bg-[#151515] border border-white/5 rounded-2xl p-4"
      >
        <div>
          <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Source</div>
          <div className="text-sm font-bold text-white/70">Notion snapshots from scheduled scrapers</div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.98 }}
          whileHover={{ boxShadow: "0 0 15px rgba(174, 233, 40, 0.4)" }}
          disabled={isLoading}
          type="button" 
          onClick={handleRefresh}
          className="bg-brand-green text-black px-8 py-4 rounded-xl text-sm font-black hover:opacity-90 transition-all whitespace-nowrap disabled:opacity-50"
        >
          {isLoading ? "Refreshing..." : "Refresh Data"}
        </motion.button>
      </motion.div>

      {engagementError && (
        <div className="mb-8 rounded-2xl border border-brand-red/30 bg-brand-red/10 p-4 text-xs font-bold text-brand-red">
          {engagementError}
        </div>
      )}

      {/* Metric & Range Selectors */}
      <div className="flex items-center justify-between mb-8 bg-[#151515] border border-white/5 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Metric:</span>
          <div className="flex gap-2">
            {[
              { id: 'views', icon: <Eye size={12} />, label: 'Views' },
              { id: 'likes', icon: <Heart size={12} />, label: 'Likes' },
              { id: 'comments', icon: <MessageCircle size={12} />, label: 'Comments' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id as any)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                  metric === m.id 
                    ? "bg-brand-green/10 border-brand-green/40 text-brand-green" 
                    : "bg-white/5 border-transparent text-white/40"
                )}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Range:</span>
          <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
            {[7, 14, 30].map(r => (
              <button
                key={r}
                onClick={() => setGlobalRange(r)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all",
                  globalRange === r ? "bg-brand-green text-black" : "text-white/40 hover:text-white"
                )}
              >
                {r}D
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {contentItems.map((item, index) => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[#151515] border border-white/5 rounded-[24px] overflow-hidden group"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 h-6 bg-brand-red rounded-lg flex items-center justify-center shrink-0">
                      <Instagram size={14} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-white/90 truncate">{item.url}</div>
                      <div className="text-[9px] text-white/20 font-medium">Added: {item.addedAt} · 1 days tracked</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.a 
                      whileTap={{ scale: 0.9 }}
                      href={item.url?.startsWith('http') ? item.url : `https://${item.url}`} 
                      target="_blank" 
                      rel="noopener" 
                      className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-brand-green transition-colors shrink-0"
                    >
                      <ExternalLink size={12} />
                    </motion.a>
                    <button className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
                      <MoreVertical size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Eye size={12} className="text-white/20" />
                    <span className="text-[11px] font-bold text-white/60">{item.views.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Heart size={12} className="text-brand-red" />
                    <span className="text-[11px] font-bold text-white/60">{item.likes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle size={12} className="text-white/20" />
                    <span className="text-[11px] font-bold text-white/60">{item.comments.toLocaleString()}</span>
                  </div>
                </div>

                <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/5 mb-6">
                  <img src={item.thumbnail} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-4 h-4 bg-brand-green/20 rounded flex items-center justify-center">
                        <BarChart2 size={10} className="text-brand-green" />
                      </div>
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Total</span>
                    </div>
                    <div className="h-24 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={item.history}>
                          <Bar dataKey={metric} fill="#AEE928" radius={[2, 2, 0, 0]} />
                          <RechartsTooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '9px' }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-4 h-4 bg-brand-green/20 rounded flex items-center justify-center">
                        <TrendingUp size={10} className="text-brand-green" />
                      </div>
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Growth Data</span>
                    </div>
                    <div className="h-16 w-full opacity-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={item.history}>
                          <Area type="monotone" dataKey={metric} stroke="#AEE928" strokeWidth={1} fill="#AEE928" fillOpacity={0.1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfigModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#151515] border border-white/10 rounded-[32px] p-8 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center mb-6">
                  <Database size={32} className="text-brand-green" />
                </div>
                <h2 className="text-2xl font-black tracking-tight mb-2">Configuration Required</h2>
                <p className="text-sm text-white/40 mb-8 leading-relaxed">
                  To connect with real data, you need to set up your API keys in the platform settings.
                </p>

                <div className="w-full space-y-3 mb-8">
                  {[
                    { label: 'Notion API Key', status: configStatus.hasNotion },
                    { label: 'Notion DB Profile ID', status: configStatus.hasNotionDbProfile },
                    { label: 'Notion DB Contents ID', status: configStatus.hasNotionDbContents },
                    { label: 'Notion DB Snapshots ID', status: configStatus.hasNotionDbSnapshots }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                      <span className="text-xs font-bold text-white/60">{item.label}</span>
                      {item.status ? (
                        <div className="flex items-center gap-1.5 text-brand-green">
                          <Check size={12} strokeWidth={3} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Connected</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-brand-red">
                          <X size={12} strokeWidth={3} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Missing</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowConfigModal(false)}
                  className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm hover:bg-white/90 transition-colors"
                >
                  I've updated the settings
                </motion.button>
                <p className="text-[10px] text-white/20 mt-4 font-bold uppercase tracking-widest">
                  Click the gear icon (Settings) in the bottom right
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
