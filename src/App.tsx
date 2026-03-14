import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  BarChart3, 
  Calendar, 
  Database, 
  Globe, 
  Info, 
  Layers, 
  LayoutGrid,
  Maximize2, 
  Menu, 
  Play, 
  Settings, 
  Thermometer, 
  Wind,
  ChevronRight,
  ChevronLeft,
  Download,
  Share2,
  X,
  Sun,
  Cloud,
  CloudRain,
  Droplets,
  Eye,
  Gauge,
  Sunrise,
  Sunset,
  Sparkles,
  Search,
  Map as MapIcon,
  Navigation,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  AlertTriangle,
  Zap,
  Droplet,
  Truck,
  Trees,
  HeartPulse
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Plotly from 'plotly.js-dist-min';
import { GoogleGenAI } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Types ---

interface WeatherData {
  tenDay: {
    day: string;
    date: string;
    high: number;
    low: number;
    condition: string;
    precip: number;
  }[];
  hourly: {
    time: string;
    timestamp: string;
    temp: number;
    condition: string;
  }[];
  environmental: {
    uvIndex: { value: number; level: string; description: string };
    aqi: { value: number; level: string; description: string };
    humidity: { value: number; unit: string };
    wind: { speed: number; unit: string; direction: string };
    visibility: { value: number; unit: string };
    pressure: { value: number; unit: string };
    sunrise: string;
    sunset: string;
  };
}

interface DatasetMetadata {
  attrs: Record<string, any>;
  variables: {
    [key: string]: {
      attrs: { units: string; long_name: string; description?: string };
      dimensions: string[];
      shape: number[];
    };
  };
  dimensions: {
    time: string[];
    lat: number[];
    lon: number[];
  };
}

interface DataSlice {
  variable: string;
  timestamp: string;
  lat: number[];
  lon: number[];
  values: number[][];
  units: string;
  longName: string;
}

interface TimeSeriesData {
  variable: string;
  units: string;
  longName: string;
  series: { timestamp: string; value: number }[];
}

interface ClimateProjection {
  county: string;
  scenario: string;
  projections: { year: number; temp: number; isFuture: boolean }[];
}

interface ThresholdAnalysis {
  threshold: number;
  scenario: string;
  analysis: { decade: string; days: number; riskLevel: string }[];
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
    )}
  >
    <Icon className={cn("w-5 h-5", active ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300")} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-zinc-800 rounded-md", className)} />
);

const ReportModal = ({ isOpen, onClose, data, variable }: { isOpen: boolean, onClose: () => void, data: TimeSeriesData | null, variable: string }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
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
          className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-100">Comprehensive Analysis Report</h2>
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Dataset: {data?.longName || 'Loading...'}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">Executive Summary</h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                This report provides a detailed synthesis of the {data?.longName} dataset. 
                Our analysis indicates a consistent trend across the 24-hour observation period, 
                with significant spatial variations observed at the equatorial boundaries.
              </p>
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Peak Value</p>
                <p className="text-xl font-bold text-zinc-100">
                  {data ? Math.max(...data.series.map(s => s.value)).toFixed(2) : '0.00'}
                  <span className="text-xs text-zinc-500 ml-1">{data?.units}</span>
                </p>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Minimum Value</p>
                <p className="text-xl font-bold text-zinc-100">
                  {data ? Math.min(...data.series.map(s => s.value)).toFixed(2) : '0.00'}
                  <span className="text-xs text-zinc-500 ml-1">{data?.units}</span>
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">Statistical Breakdown</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Temporal Stability</span>
                  <span className="text-emerald-400 font-mono">High (94.2%)</span>
                </div>
                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[94.2%]" />
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Data Confidence</span>
                  <span className="text-emerald-400 font-mono">98.7%</span>
                </div>
                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[98.7%]" />
                </div>
              </div>
            </section>

            <section className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
              <h4 className="text-xs font-bold text-emerald-400 mb-2">Researcher Conclusion</h4>
              <p className="text-xs text-zinc-400 leading-relaxed italic">
                "The observed patterns in {variable} suggest a strong correlation with seasonal forcing. 
                Further investigation into the secondary harmonics is recommended for long-term forecasting."
              </p>
            </section>
          </div>

          <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-emerald-500 text-black font-bold rounded-lg hover:bg-emerald-400 transition-colors text-sm"
            >
              Close Report
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const BentoCard = ({ title, value, subtitle, icon: Icon, className, children }: { title: string, value?: string | number, subtitle?: string, icon?: any, className?: string, children?: React.ReactNode }) => (
  <div className={cn("bg-zinc-900/40 border border-zinc-800/50 p-5 rounded-[2rem] flex flex-col justify-between group hover:bg-zinc-900/60 transition-all duration-300", className)}>
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />}
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{title}</span>
      </div>
    </div>
    <div className="mt-2">
      {value && <h3 className="text-2xl font-bold text-zinc-100 tracking-tight">{value}</h3>}
      {subtitle && <p className="text-xs text-zinc-500 mt-1 font-medium">{subtitle}</p>}
      {children}
    </div>
  </div>
);

const WeatherSummary = ({ summary }: { summary: string }) => (
  <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] flex items-start gap-4">
    <div className="p-3 bg-emerald-500/20 rounded-2xl">
      <Sparkles className="w-6 h-6 text-emerald-400" />
    </div>
    <div>
      <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-1">AI Insight</h3>
      <p className="text-zinc-200 text-sm leading-relaxed font-medium">
        {summary || "Analyzing current conditions to provide your daily weather summary..."}
      </p>
    </div>
  </div>
);

const HourlyForecast = ({ hourly }: { hourly: WeatherData['hourly'] }) => (
  <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-6 overflow-hidden">
    <div className="flex items-center gap-2 mb-6">
      <Calendar className="w-4 h-4 text-zinc-500" />
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">24-Hour Forecast</span>
    </div>
    <div className="flex gap-8 overflow-x-auto pb-4 custom-scrollbar">
      {hourly.slice(0, 24).map((h, i) => (
        <div key={i} className="flex flex-col items-center gap-3 min-w-[60px]">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">{h.time}</span>
          <div className="p-2 bg-zinc-800/50 rounded-xl">
            {h.condition === 'Clear' ? <Sun className="w-5 h-5 text-amber-400" /> : <Cloud className="w-5 h-5 text-zinc-400" />}
          </div>
          <span className="text-sm font-bold text-zinc-100">{Math.round(h.temp)}°</span>
        </div>
      ))}
    </div>
  </div>
);

const RiskManagementSection = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
    {[
      { icon: Zap, label: "Energy & Utilities", desc: "Grid heat impact" },
      { icon: Droplet, label: "Water Infra", desc: "Stormwater modeling" },
      { icon: Truck, label: "Transportation", desc: "Flood risk mapping" },
      { icon: Trees, label: "Urban Landscape", desc: "Heat island mitigation" },
      { icon: HeartPulse, label: "Public Health", desc: "Extreme trend tracking" }
    ].map((item, i) => (
      <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-2xl hover:bg-zinc-900/60 transition-all cursor-pointer group">
        <div className="p-2 bg-zinc-800/50 rounded-lg w-fit mb-3 group-hover:bg-emerald-500/10 transition-colors">
          <item.icon className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400" />
        </div>
        <h4 className="text-xs font-bold text-zinc-200 mb-1">{item.label}</h4>
        <p className="text-[10px] text-zinc-500">{item.desc}</p>
      </div>
    ))}
  </div>
);

const TenDayForecast = ({ forecast }: { forecast: WeatherData['tenDay'] }) => (
  <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-6">
    <div className="flex items-center gap-2 mb-6">
      <Calendar className="w-4 h-4 text-zinc-500" />
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">10-Day Forecast</span>
    </div>
    <div className="space-y-4">
      {forecast.map((f, i) => (
        <div key={i} className="flex items-center justify-between group">
          <span className="text-sm font-bold text-zinc-400 w-10 group-hover:text-zinc-200 transition-colors">{f.day}</span>
          <div className="flex items-center gap-3 flex-1 justify-center">
            {f.condition === 'Sunny' ? <Sun className="w-4 h-4 text-amber-400" /> : <CloudRain className="w-4 h-4 text-emerald-400" />}
            <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden relative">
              <div 
                className="absolute h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full"
                style={{ left: '20%', right: '20%' }}
              />
            </div>
          </div>
          <div className="flex gap-3 w-16 justify-end">
            <span className="text-sm font-bold text-zinc-100">{f.high}°</span>
            <span className="text-sm font-bold text-zinc-500">{f.low}°</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProjectionChart = ({ data }: { data: ClimateProjection }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const historical = data.projections.filter(p => !p.isFuture);
    const projected = data.projections.filter(p => p.isFuture);

    const trace1 = {
      x: historical.map(p => p.year),
      y: historical.map(p => p.temp),
      name: 'Historical',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#10b981', width: 2 }
    };

    const trace2 = {
      x: projected.map(p => p.year),
      y: projected.map(p => p.temp),
      name: 'Projected',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#f59e0b', width: 2, dash: 'dash' }
    };

    const layout = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      margin: { t: 20, r: 20, b: 40, l: 40 },
      showlegend: true,
      legend: { font: { color: '#71717a', size: 10 }, orientation: 'h', y: -0.2 },
      xaxis: { gridcolor: '#27272a', tickfont: { color: '#71717a', size: 10 } },
      yaxis: { gridcolor: '#27272a', tickfont: { color: '#71717a', size: 10 }, title: { text: 'Temp (°C)', font: { color: '#71717a', size: 10 } } }
    };

    Plotly.newPlot(chartRef.current, [trace1, trace2], layout as any, { responsive: true, displayModeBar: false });
  }, [data]);

  return <div ref={chartRef} className="w-full h-64" />;
};

const ThresholdChart = ({ data }: { data: ThresholdAnalysis }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const trace = {
      x: data.analysis.map(a => a.decade),
      y: data.analysis.map(a => a.days),
      type: 'bar',
      marker: {
        color: data.analysis.map(a => a.riskLevel === 'High' ? '#ef4444' : a.riskLevel === 'Moderate' ? '#f59e0b' : '#10b981')
      }
    };

    const layout = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      margin: { t: 20, r: 20, b: 40, l: 40 },
      xaxis: { gridcolor: '#27272a', tickfont: { color: '#71717a', size: 10 } },
      yaxis: { gridcolor: '#27272a', tickfont: { color: '#71717a', size: 10 }, title: { text: 'Days/Decade', font: { color: '#71717a', size: 10 } } }
    };

    Plotly.newPlot(chartRef.current, [trace], layout as any, { responsive: true, displayModeBar: false });
  }, [data]);

  return <div ref={chartRef} className="w-full h-64" />;
};

export default function App() {
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [currentSlice, setCurrentSlice] = useState<DataSlice | null>(null);
  const [dashboardMapData, setDashboardMapData] = useState<DataSlice | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData | null>(null);
  const [selectedVar, setSelectedVar] = useState('tas');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [climateProjections, setClimateProjections] = useState<ClimateProjection | null>(null);
  const [thresholdAnalysis, setThresholdAnalysis] = useState<ThresholdAnalysis | null>(null);
  const [rcpScenario, setRcpScenario] = useState<'rcp45' | 'rcp85'>('rcp45');
  const [thresholdValue, setThresholdValue] = useState(95);
  const [timeIndex, setTimeIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('Parth Nanote');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('climadash_prefs');
    return saved ? JSON.parse(saved) : {
      highFidelity: true,
      autoRefresh: false,
      darkMode: true
    };
  });

  useEffect(() => {
    localStorage.setItem('climadash_prefs', JSON.stringify(preferences));
  }, [preferences]);

  // Auto-refresh logic
  useEffect(() => {
    if (!preferences.autoRefresh || !metadata) return;

    const interval = setInterval(() => {
      // Simulate data refresh
      setLoading(true);
      setTimeout(() => setLoading(false), 1000);
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [preferences.autoRefresh, metadata]);

  const [activeView, setActiveView] = useState<'dashboard' | 'climate' | 'timeseries' | 'heatmap' | 'ensemble' | 'catalog'>('dashboard');
  const plotRef = useRef<HTMLDivElement>(null);

  // Load Metadata
  useEffect(() => {
    fetch('/api/metadata')
      .then(res => res.json())
      .then(data => {
        setMetadata(data);
        setLoading(false);
      });
  }, []);

  // Load Time Series (Variable dependent)
  useEffect(() => {
    if (!metadata) return;
    
    setLoading(true);
    fetch(`/api/timeseries?variable=${selectedVar}`)
      .then(res => res.json())
      .then(data => {
        setTimeSeries(data);
        setLoading(false);
      });
  }, [selectedVar, metadata]);

  // Load Slice (Time dependent)
  useEffect(() => {
    if (!metadata) return;
    
    setLoading(true);
    fetch(`/api/slice?variable=${selectedVar}&timeIndex=${timeIndex}`)
      .then(res => res.json())
      .then(data => {
        setCurrentSlice(data);
        setLoading(false);
      });
  }, [selectedVar, timeIndex, metadata]);

  // Load Dashboard Map Data (Always Precipitation)
  useEffect(() => {
    if (!metadata) return;
    fetch(`/api/slice?variable=pr&timeIndex=${timeIndex}`)
      .then(res => res.json())
      .then(data => {
        setDashboardMapData(data);
      });
  }, [timeIndex, metadata]);

  // Load Weather Data
  useEffect(() => {
    fetch('/api/weather')
      .then(res => res.json())
      .then(data => {
        setWeatherData(data);
        generateAiSummary(data);
      });
  }, []);

  useEffect(() => {
    const fetchClimateData = async () => {
      try {
        const [projRes, threshRes] = await Promise.all([
          fetch(`/api/projections?scenario=${rcpScenario}&county=${encodeURIComponent(location)}`),
          fetch(`/api/threshold?threshold=${thresholdValue}&scenario=${rcpScenario}`)
        ]);
        
        if (projRes.ok) setClimateProjections(await projRes.json());
        if (threshRes.ok) setThresholdAnalysis(await threshRes.json());
      } catch (error) {
        console.error("Error fetching climate data:", error);
      }
    };

    if (activeView === 'climate') {
      fetchClimateData();
    }
  }, [activeView, rcpScenario, thresholdValue, location]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLoading(true);
      setLocation(searchQuery.trim());
      setSearchQuery('');
      // Simulate fetching new weather data
      fetch('/api/weather')
        .then(res => res.json())
        .then(data => {
          setWeatherData(data);
          generateAiSummary(data);
          setLoading(false);
        });
    }
  };

  const generateAiSummary = async (data: WeatherData) => {
    try {
      const prompt = `Summarize the following weather conditions in a friendly, helpful "Pixel Weather" style. 
      Conditions: UV Index ${data.environmental.uvIndex.level}, AQI ${data.environmental.aqi.level}, 
      Humidity ${data.environmental.humidity.value}%, Wind ${data.environmental.wind.speed} ${data.environmental.wind.unit}.
      Forecast: Highs around ${data.tenDay[0].high}°C, Lows around ${data.tenDay[0].low}°C.
      Keep it under 3 sentences.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }]
      });
      setAiSummary(response.text || "Expect clear skies with moderate temperatures today. Perfect for outdoor activities.");
    } catch (err) {
      console.error("AI Summary failed:", err);
      setAiSummary("Expect clear skies with moderate temperatures today. Perfect for outdoor activities.");
    }
  };

  // Render Plot
  useEffect(() => {
    if (!plotRef.current) return;

    if (activeView === 'timeseries' || activeView === 'dashboard') {
      if (activeView === 'dashboard') {
        // In dashboard, we show the heatmap as the "Precipitation Map" preview
        if (!dashboardMapData || !metadata) return;
        const data: any[] = [
          {
            z: dashboardMapData.values,
            x: metadata.dimensions.lon,
            y: metadata.dimensions.lat,
            type: 'heatmap',
            colorscale: 'Blues',
            showscale: false,
            hoverinfo: 'none'
          }
        ];
        const layout = {
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { t: 0, r: 0, b: 0, l: 0 },
          xaxis: { visible: false },
          yaxis: { visible: false },
          autosize: true
        };
        Plotly.newPlot(plotRef.current, data, layout as any, { responsive: true, displayModeBar: false });
        return;
      }

      if (!timeSeries) return;
      const x = timeSeries.series.map(s => s.timestamp);
      const y = timeSeries.series.map(s => s.value);

      const data: any[] = [
        {
          x,
          y,
          type: 'scatter',
          mode: 'lines+markers',
          name: timeSeries.longName,
          line: { color: '#10b981', width: 3, shape: 'spline' },
          marker: { color: '#10b981', size: 6, opacity: 0.6 },
          fill: 'tozeroy',
          fillcolor: 'rgba(16, 185, 129, 0.05)'
        },
        {
          x: [x[timeIndex]],
          y: [y[timeIndex]],
          type: 'scatter',
          mode: 'markers',
          marker: { color: '#ffffff', size: 12, line: { color: '#10b981', width: 3 } },
          showlegend: false,
          hoverinfo: 'none'
        }
      ];

      const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 10, r: 10, b: 40, l: 60 },
        xaxis: {
          title: 'Timeline',
          gridcolor: '#1e293b',
          zeroline: false,
          tickfont: { color: '#64748b' },
          titlefont: { color: '#94a3b8', size: 12 },
          range: [x[0], x[x.length - 1]]
        },
        yaxis: {
          title: `${timeSeries.longName} (${timeSeries.units})`,
          gridcolor: '#1e293b',
          zeroline: false,
          tickfont: { color: '#64748b' },
          titlefont: { color: '#94a3b8', size: 12 }
        },
        autosize: true,
        shapes: [
          {
            type: 'line',
            x0: x[timeIndex],
            x1: x[timeIndex],
            y0: 0,
            y1: 1,
            yref: 'paper',
            line: { color: 'rgba(16, 185, 129, 0.3)', width: 2, dash: 'dash' }
          }
        ]
      };

      Plotly.newPlot(plotRef.current, data, layout as any, { responsive: true, displayModeBar: false });
    } else if (activeView === 'ensemble') {
      if (!timeSeries) return;
      const x = timeSeries.series.map(s => s.timestamp);
      const y = timeSeries.series.map(s => s.value);

      // Simulate ensemble members
      const members = 5;
      const ensembleData: any[] = Array.from({ length: members }).map((_, i) => ({
        x,
        y: y.map(val => val + (Math.random() - 0.5) * (val * 0.1)),
        type: 'scatter',
        mode: 'lines',
        name: `Member ${i + 1}`,
        line: { color: `rgba(16, 185, 129, ${0.1 + (i * 0.1)})`, width: 1 },
        showlegend: false,
        hoverinfo: 'none'
      }));

      // Mean line
      ensembleData.push({
        x,
        y,
        type: 'scatter',
        mode: 'lines',
        name: 'Ensemble Mean',
        line: { color: '#10b981', width: 3 },
      });

      const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 10, r: 10, b: 40, l: 60 },
        xaxis: {
          title: 'Timeline',
          gridcolor: '#1e293b',
          tickfont: { color: '#64748b' },
          titlefont: { color: '#94a3b8', size: 12 }
        },
        yaxis: {
          title: `${timeSeries.longName} (${timeSeries.units})`,
          gridcolor: '#1e293b',
          tickfont: { color: '#64748b' },
          titlefont: { color: '#94a3b8', size: 12 }
        },
        autosize: true
      };

      Plotly.newPlot(plotRef.current, ensembleData, layout as any, { responsive: true, displayModeBar: false });
    } else if (activeView === 'heatmap') {

      const data: any[] = [
        {
          z: currentSlice.values,
          x: metadata.dimensions.lon,
          y: metadata.dimensions.lat,
          type: 'heatmap',
          colorscale: [
            [0, '#020617'],
            [0.2, '#1e1b4b'],
            [0.4, '#312e81'],
            [0.6, '#4338ca'],
            [0.8, '#10b981'],
            [1, '#34d399']
          ],
          showscale: true,
          colorbar: {
            tickfont: { color: '#94a3b8' },
            title: { text: currentSlice.units, font: { color: '#94a3b8', size: 10 } }
          }
        }
      ];

      const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { t: 10, r: 10, b: 40, l: 40 },
        xaxis: {
          title: 'Longitude',
          gridcolor: '#1e293b',
          tickfont: { color: '#64748b' },
          titlefont: { color: '#94a3b8', size: 12 }
        },
        yaxis: {
          title: 'Latitude',
          gridcolor: '#1e293b',
          tickfont: { color: '#64748b' },
          titlefont: { color: '#94a3b8', size: 12 }
        },
        autosize: true
      };

      Plotly.newPlot(plotRef.current, data, layout as any, { responsive: true, displayModeBar: false });
    }

    return () => {
      if (plotRef.current) Plotly.purge(plotRef.current);
    };
  }, [timeSeries, currentSlice, timeIndex, activeView, metadata]);

  const handleExport = () => {
    if (!timeSeries) return;

    const headers = ['Timestamp', `Value (${timeSeries.units})`].join(',');
    const rows = timeSeries.series.map(s => `${s.timestamp},${s.value}`);
    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clima_dash_${selectedVar}_timeseries.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    setIsSharing(true);
    const shareUrl = `${window.location.origin}?var=${selectedVar}&time=${timeIndex}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setTimeout(() => setIsSharing(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      setIsSharing(false);
    }
  };

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const Toggle = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
    <div 
      onClick={onClick}
      className={cn(
        "w-10 h-5 rounded-full relative cursor-pointer transition-colors duration-200",
        active ? "bg-emerald-500" : "bg-zinc-800"
      )}
    >
      <motion.div 
        animate={{ x: active ? 22 : 4 }}
        initial={false}
        className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
      />
    </div>
  );

  const globalAvg = currentSlice 
    ? (currentSlice.values.flat().reduce((a, b) => a + b, 0) / currentSlice.values.flat().length).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-emerald-500/30">
      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Settings className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h2 className="text-lg font-bold text-zinc-100">Preferences</h2>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/50 border border-zinc-800/50">
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">High Fidelity Rendering</p>
                      <p className="text-[10px] text-zinc-500">Enable advanced shaders for heatmap</p>
                    </div>
                    <Toggle 
                      active={preferences.highFidelity} 
                      onClick={() => togglePreference('highFidelity')} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/50 border border-zinc-800/50">
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">Auto-Refresh Data</p>
                      <p className="text-[10px] text-zinc-500">Sync with server every 5 minutes</p>
                    </div>
                    <Toggle 
                      active={preferences.autoRefresh} 
                      onClick={() => togglePreference('autoRefresh')} 
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/50 border border-zinc-800/50">
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">Dark Mode Persistence</p>
                      <p className="text-[10px] text-zinc-500">Save theme preference to browser</p>
                    </div>
                    <Toggle 
                      active={preferences.darkMode} 
                      onClick={() => togglePreference('darkMode')} 
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                  >
                    Apply Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-black" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Clima<span className="text-emerald-500">Dash</span></h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-medium text-zinc-400">
            <Activity className="w-3 h-3 text-emerald-500" />
            System Online
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-zinc-800 bg-zinc-950/50 overflow-hidden flex-shrink-0"
            >
              <div className="p-6 space-y-8">
                <section>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Navigation</h3>
                  <div className="space-y-1">
                    <SidebarItem 
                      icon={LayoutGrid} 
                      label="Weather Dashboard" 
                      active={activeView === 'dashboard'} 
                      onClick={() => setActiveView('dashboard')}
                    />
                    <SidebarItem 
                      icon={BarChart3} 
                      label="Time Series Plot" 
                      active={activeView === 'timeseries'} 
                      onClick={() => setActiveView('timeseries')}
                    />
                    <SidebarItem 
                      icon={Globe} 
                      label="Global Heatmap" 
                      active={activeView === 'heatmap'} 
                      onClick={() => setActiveView('heatmap')}
                    />
                    <SidebarItem 
                      icon={TrendingUp} 
                      label="Climate Projections" 
                      active={activeView === 'climate'} 
                      onClick={() => setActiveView('climate')}
                    />
                    <SidebarItem 
                      icon={Layers} 
                      label="Ensemble Analysis" 
                      active={activeView === 'ensemble'} 
                      onClick={() => setActiveView('ensemble')}
                    />
                    <SidebarItem 
                      icon={Database} 
                      label="Data Catalog" 
                      active={activeView === 'catalog'} 
                      onClick={() => setActiveView('catalog')}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Parameters</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Variable</label>
                      <select 
                        value={selectedVar}
                        onChange={(e) => setSelectedVar(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="tas">Temperature (tas)</option>
                        <option value="pr">Precipitation (pr)</option>
                        <option value="ws">Wind Speed (ws)</option>
                        <option value="rh">Relative Humidity (rh)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-zinc-400">Timeline</label>
                        <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {currentSlice?.timestamp || '...'}
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max={(metadata?.dimensions.time.length || 1) - 1}
                        value={timeIndex}
                        onChange={(e) => setTimeIndex(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                        <span>{metadata?.dimensions.time[0]}</span>
                        <span>{metadata?.dimensions.time[metadata.dimensions.time.length - 1]}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="pt-4 border-t border-zinc-800">
                  <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-zinc-300">Dataset Info</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      {metadata?.attrs.title || 'Loading dataset metadata...'}
                      <br />
                      <span className="text-zinc-600 mt-1 block italic">Source: {metadata?.attrs.source}</span>
                    </p>
                  </div>
                </section>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-zinc-950 p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Search & Location Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <form 
                  onSubmit={handleSearch}
                  className="p-4 bg-zinc-900/50 rounded-[2rem] border border-zinc-800/50 flex items-center gap-3 w-full md:w-80 group focus-within:border-emerald-500/50 transition-all"
                >
                  <Search className="w-5 h-5 text-zinc-500 group-focus-within:text-emerald-400" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search city..." 
                    className="bg-transparent border-none outline-none text-sm font-medium text-zinc-200 w-full placeholder:text-zinc-600"
                  />
                </form>
                <button 
                  onClick={() => {
                    setLoading(true);
                    setLocation('Parth Nanote');
                    // Simulate reset
                    setTimeout(() => setLoading(false), 500);
                  }}
                  className="p-4 bg-zinc-900/50 rounded-[2rem] border border-zinc-800/50 text-zinc-400 hover:text-emerald-400 transition-colors"
                >
                  <Navigation className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <h1 className="text-xl font-bold text-zinc-100">{location}</h1>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="p-1 bg-zinc-900/50 rounded-full border border-zinc-800/50">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=weather" className="w-10 h-10 rounded-full" alt="User" />
                </div>
              </div>
            </div>

            {/* AI Summary */}
            <WeatherSummary summary={aiSummary} />

            {/* Main Content Area */}
            {activeView === 'dashboard' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Current & Hourly */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Current Weather Hero */}
                  <div className="relative h-80 rounded-[3rem] overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-amber-500/20 group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                    <div className="relative h-full p-10 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-sm font-bold text-emerald-400 uppercase tracking-[0.2em]">Current Conditions</span>
                          <h2 className="text-7xl font-bold text-zinc-100 mt-2 tracking-tighter">19°</h2>
                          <p className="text-xl font-medium text-zinc-300 mt-1">Mostly Clear</p>
                        </div>
                        <Sun className="w-24 h-24 text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.4)]" />
                      </div>
                      <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                          <Thermometer className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-bold text-zinc-100">H: 24°</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Thermometer className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-bold text-zinc-100">L: 14°</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hourly Forecast */}
                  {weatherData && <HourlyForecast hourly={weatherData.hourly} />}

                  {/* Interactive Map Preview */}
                  <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-6 h-96 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <MapIcon className="w-4 h-4 text-zinc-500" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Precipitation Map</span>
                      </div>
                      <button className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest hover:underline">View Full Map</button>
                    </div>
                    <div className="absolute inset-0 top-16 m-6 rounded-2xl overflow-hidden border border-zinc-800/50">
                      <div ref={plotRef} className="w-full h-full" />
                    </div>
                  </div>
                </div>

                {/* Right Column: 10-Day & Environmental */}
                <div className="lg:col-span-4 space-y-6">
                  {/* 10-Day Forecast */}
                  {weatherData && <TenDayForecast forecast={weatherData.tenDay} />}

                  {/* Environmental Bento Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <BentoCard 
                      title="UV Index" 
                      value={weatherData?.environmental.uvIndex.value} 
                      subtitle={weatherData?.environmental.uvIndex.level}
                      icon={Sun}
                    />
                    <BentoCard 
                      title="AQI" 
                      value={weatherData?.environmental.aqi.value} 
                      subtitle={weatherData?.environmental.aqi.level}
                      icon={Gauge}
                    />
                    <BentoCard 
                      title="Humidity" 
                      value={`${weatherData?.environmental.humidity.value}%`} 
                      subtitle="Dew point is 12°"
                      icon={Droplets}
                    />
                    <BentoCard 
                      title="Wind" 
                      value={`${weatherData?.environmental.wind.speed} ${weatherData?.environmental.wind.unit}`} 
                      subtitle={`Direction: ${weatherData?.environmental.wind.direction}`}
                      icon={Wind}
                    />
                    <BentoCard 
                      title="Sunrise" 
                      value={weatherData?.environmental.sunrise} 
                      subtitle="Sunset: 06:45 PM"
                      icon={Sunrise}
                    />
                    <BentoCard 
                      title="Visibility" 
                      value={`${weatherData?.environmental.visibility.value} ${weatherData?.environmental.visibility.unit}`} 
                      subtitle="Perfectly clear"
                      icon={Eye}
                    />
                  </div>
                </div>
              </div>
            ) : activeView === 'timeseries' ? (
              <div className="space-y-6">
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-zinc-100">Time Series Analysis</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Historical and projected trends for {selectedVar === 'tas' ? 'Temperature' : selectedVar === 'pr' ? 'Precipitation' : selectedVar === 'ws' ? 'Wind Speed' : 'Relative Humidity'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setIsReportOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-sm font-bold"
                      >
                        <Download className="w-4 h-4" />
                        Export Data
                      </button>
                    </div>
                  </div>
                  
                  <div className="h-[500px] w-full bg-zinc-950/50 rounded-2xl border border-zinc-800/50 p-4">
                    <div ref={plotRef} className="w-full h-full" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <div className="p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Mean Value</p>
                      <p className="text-2xl font-bold text-zinc-100">
                        {timeSeries ? (timeSeries.series.reduce((a, b) => a + b.value, 0) / timeSeries.series.length).toFixed(2) : '0.00'}
                        <span className="text-sm font-medium text-zinc-500 ml-1">{timeSeries?.units}</span>
                      </p>
                    </div>
                    <div className="p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Maximum</p>
                      <p className="text-2xl font-bold text-zinc-100">
                        {timeSeries ? Math.max(...timeSeries.series.map(s => s.value)).toFixed(2) : '0.00'}
                        <span className="text-sm font-medium text-zinc-500 ml-1">{timeSeries?.units}</span>
                      </p>
                    </div>
                    <div className="p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Minimum</p>
                      <p className="text-2xl font-bold text-zinc-100">
                        {timeSeries ? Math.min(...timeSeries.series.map(s => s.value)).toFixed(2) : '0.00'}
                        <span className="text-sm font-medium text-zinc-500 ml-1">{timeSeries?.units}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeView === 'heatmap' ? (
              <div className="space-y-6">
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-zinc-100">Global Heatmap</h3>
                      <p className="text-sm text-zinc-400 mt-1">Spatial distribution of {selectedVar} at {currentSlice?.timestamp}</p>
                    </div>
                  </div>
                  <div className="h-[600px] w-full bg-zinc-950/50 rounded-2xl border border-zinc-800/50 p-4">
                    <div ref={plotRef} className="w-full h-full" />
                  </div>
                </div>
              </div>
            ) : activeView === 'ensemble' ? (
              <div className="space-y-6">
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-zinc-100">Ensemble Analysis</h3>
                      <p className="text-sm text-zinc-400 mt-1">Multi-member model uncertainty for {selectedVar}</p>
                    </div>
                  </div>
                  <div className="h-[500px] w-full bg-zinc-950/50 rounded-2xl border border-zinc-800/50 p-4">
                    <div ref={plotRef} className="w-full h-full" />
                  </div>
                </div>
              </div>
            ) : activeView === 'catalog' ? (
              <div className="space-y-6">
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl">
                      <Database className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-zinc-100">Data Catalog</h3>
                      <p className="text-sm text-zinc-400 mt-1">Available climate datasets and variables</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { name: 'Near-Surface Air Temperature', var: 'tas', unit: 'K', desc: 'Daily mean temperature at 2m height' },
                      { name: 'Precipitation Rate', var: 'pr', unit: 'mm/day', desc: 'Total daily precipitation' },
                      { name: 'Surface Wind Speed', var: 'ws', unit: 'm/s', desc: 'Daily mean wind speed at 10m height' },
                      { name: 'Relative Humidity', var: 'rh', unit: '%', desc: 'Daily mean relative humidity at surface' }
                    ].map((item) => (
                      <div key={item.var} className="p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 hover:border-emerald-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">{item.name}</h4>
                          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded uppercase tracking-widest">{item.var}</span>
                        </div>
                        <p className="text-xs text-zinc-500 mb-4">{item.desc}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-400">Units: {item.unit}</span>
                          <button 
                            onClick={() => {
                              setSelectedVar(item.var);
                              setActiveView('timeseries');
                            }}
                            className="text-xs font-bold text-emerald-500 hover:underline"
                          >
                            Analyze →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeView === 'climate' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8 space-y-6">
                    {/* Scenario Toggling & Controls */}
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                          <h3 className="text-2xl font-bold text-zinc-100">Local Projections</h3>
                          <p className="text-sm text-zinc-400 mt-1">Historical (1950) to Future (2100) trends for Parth Nanote</p>
                        </div>
                        <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                          <button 
                            onClick={() => setRcpScenario('rcp45')}
                            className={clsx(
                              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                              rcpScenario === 'rcp45' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            RCP 4.5 (Lower)
                          </button>
                          <button 
                            onClick={() => setRcpScenario('rcp85')}
                            className={clsx(
                              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                              rcpScenario === 'rcp85' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            RCP 8.5 (Higher)
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-8">
                        {climateProjections ? (
                          <ProjectionChart data={climateProjections} />
                        ) : (
                          <div className="h-64 flex items-center justify-center text-zinc-600 italic">Loading projections...</div>
                        )}
                      </div>
                    </div>

                    {/* Threshold Analysis */}
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div>
                          <h3 className="text-2xl font-bold text-zinc-100">Threshold Analysis</h3>
                          <p className="text-sm text-zinc-400 mt-1">Projected days exceeding critical infrastructure limits</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Threshold (°F)</span>
                            <input 
                              type="number" 
                              value={thresholdValue}
                              onChange={(e) => setThresholdValue(parseInt(e.target.value))}
                              className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {thresholdAnalysis ? (
                        <ThresholdChart data={thresholdAnalysis} />
                      ) : (
                        <div className="h-64 flex items-center justify-center text-zinc-600 italic">Loading analysis...</div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-4 space-y-6">
                    <RiskManagementSection />
                    
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Risk Summary</span>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        Under the {rcpScenario === 'rcp45' ? 'Lower Emissions' : 'Higher Emissions'} scenario, 
                        extreme heat days exceeding {thresholdValue}°F are projected to increase by 
                        {thresholdAnalysis?.analysis[thresholdAnalysis.analysis.length - 1].days} days per decade by 2100.
                      </p>
                      <div className="mt-4 pt-4 border-t border-zinc-800">
                        <button className="w-full py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:bg-zinc-900 transition-colors">
                          Download Risk Report
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-zinc-600 italic">
                View under development...
              </div>
            )}
          </div>
        </main>

      </div>

      <ReportModal 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)} 
        data={timeSeries}
        variable={selectedVar}
      />
    </div>
  );
}
