import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Data Processing Layer (Simulated NetCDF Engine) ---

interface NetCDFAttributes {
  units: string;
  long_name: string;
  description?: string;
}

interface NetCDFDataset {
  attrs: Record<string, any>;
  variables: {
    [key: string]: {
      attrs: NetCDFAttributes;
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

class DataEngine {
  private dataset: NetCDFDataset | null = null;

  constructor() {
    this.mockDataset();
  }

  private mockDataset() {
    // Simulate a 4D dataset (time, level, lat, lon)
    // For simplicity, we'll focus on (time, lat, lon)
    const times = Array.from({ length: 24 }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`);
    const lats = Array.from({ length: 18 }, (_, i) => -90 + i * 10);
    const lons = Array.from({ length: 36 }, (_, i) => -180 + i * 10);

    this.dataset = {
      attrs: {
        title: "Global Surface Temperature Simulation",
        institution: "ClimateData Engine Research Lab",
        source: "Synthetic Model v1.0",
      },
      variables: {
        tas: {
          attrs: {
            units: "K",
            long_name: "Near-Surface Air Temperature",
            description: "Daily mean temperature at 2m height",
          },
          dimensions: ["time", "lat", "lon"],
          shape: [times.length, lats.length, lons.length],
        },
        pr: {
          attrs: {
            units: "mm/day",
            long_name: "Precipitation Rate",
            description: "Total daily precipitation",
          },
          dimensions: ["time", "lat", "lon"],
          shape: [times.length, lats.length, lons.length],
        },
        ws: {
          attrs: {
            units: "m/s",
            long_name: "Surface Wind Speed",
            description: "Daily mean wind speed at 10m height",
          },
          dimensions: ["time", "lat", "lon"],
          shape: [times.length, lats.length, lons.length],
        },
        rh: {
          attrs: {
            units: "%",
            long_name: "Relative Humidity",
            description: "Daily mean relative humidity at surface",
          },
          dimensions: ["time", "lat", "lon"],
          shape: [times.length, lats.length, lons.length],
        }
      },
      dimensions: {
        time: times,
        lat: lats,
        lon: lons,
      }
    };
  }

  public getMetadata() {
    return this.dataset;
  }

  public getSlice(variable: string, timeIndex: number) {
    if (!this.dataset || !this.dataset.variables[variable]) return null;

    const { lat, lon } = this.dataset.dimensions;
    const data: number[][] = [];

    // Generate synthetic data based on lat/lon and time
    // This simulates the "Slicer" engine returning a 2D array for a specific timestamp
    for (let i = 0; i < lat.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < lon.length; j++) {
        // Base values and effects based on variable type
        let base = 0;
        let latEffect = 0;
        let timeEffect = 0;
        let noise = (Math.random() - 0.5) * 2;

        if (variable === 'tas') {
          base = 280;
          latEffect = Math.cos((lat[i] * Math.PI) / 180) * 30;
          timeEffect = Math.sin((timeIndex / 24) * Math.PI * 2) * 5;
        } else if (variable === 'pr') {
          base = 2;
          latEffect = Math.abs(lat[i]) < 20 ? 10 : 1;
          timeEffect = Math.sin((timeIndex / 24) * Math.PI * 2) * 2;
        } else if (variable === 'ws') {
          base = 5;
          latEffect = Math.abs(lat[i]) > 40 ? 8 : 2; // Stronger winds at mid-latitudes
          timeEffect = Math.random() * 3;
        } else if (variable === 'rh') {
          base = 70;
          latEffect = Math.abs(lat[i]) < 15 ? 15 : -10; // Humid tropics, dry subtropics
          timeEffect = Math.cos((timeIndex / 24) * Math.PI * 2) * 5;
        }

        const val = base + latEffect + timeEffect + noise;
        row.push(Number(val.toFixed(2)));
      }
      data.push(row);
    }

    return {
      variable,
      timestamp: this.dataset.dimensions.time[timeIndex],
      lat,
      lon,
      values: data,
      units: this.dataset.variables[variable].attrs.units,
      longName: this.dataset.variables[variable].attrs.long_name
    };
  }

  public getTimeSeries(variable: string) {
    if (!this.dataset || !this.dataset.variables[variable]) return null;

    const { time } = this.dataset.dimensions;
    const series: { timestamp: string; value: number }[] = [];

    for (let t = 0; t < time.length; t++) {
      const slice = this.getSlice(variable, t);
      if (slice) {
        const avg = slice.values.flat().reduce((a, b) => a + b, 0) / slice.values.flat().length;
        series.push({
          timestamp: time[t],
          value: Number(avg.toFixed(2))
        });
      }
    }

    return {
      variable,
      units: this.dataset.variables[variable].attrs.units,
      longName: this.dataset.variables[variable].attrs.long_name,
      series
    };
  }

  public getExtendedForecast() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    
    const tenDay = Array.from({ length: 10 }, (_, i) => {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      return {
        day: days[date.getDay()],
        date: date.toISOString().split('T')[0],
        high: 25 + Math.floor(Math.random() * 10),
        low: 15 + Math.floor(Math.random() * 5),
        condition: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)],
        precip: Math.floor(Math.random() * 100)
      };
    });

    const hourly = Array.from({ length: 240 }, (_, i) => {
      const date = new Date(now);
      date.setHours(now.getHours() + i);
      return {
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: date.toISOString(),
        temp: 20 + Math.sin(i / 6) * 5 + Math.random() * 2,
        condition: ['Clear', 'Cloudy', 'Showers'][Math.floor(Math.random() * 3)]
      };
    });

    return {
      tenDay,
      hourly,
      environmental: {
        uvIndex: { value: 6, level: 'High', description: 'Protection required' },
        aqi: { value: 42, level: 'Good', description: 'Air quality is satisfactory' },
        humidity: { value: 65, unit: '%' },
        wind: { speed: 12, unit: 'km/h', direction: 'NW' },
        visibility: { value: 10, unit: 'km' },
        pressure: { value: 1012, unit: 'hPa' },
        sunrise: '06:12 AM',
        sunset: '06:45 PM'
      }
    };
  }
}

const engine = new DataEngine();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/metadata", (req, res) => {
    res.json(engine.getMetadata());
  });

  app.get("/api/slice", (req, res) => {
    const { variable = "tas", timeIndex = 0 } = req.query;
    const slice = engine.getSlice(variable as string, parseInt(timeIndex as string));
    res.json(slice);
  });

  app.get("/api/timeseries", (req, res) => {
    const { variable = "tas" } = req.query;
    const series = engine.getTimeSeries(variable as string);
    res.json(series);
  });

  app.get("/api/weather", async (req, res) => {
    try {
      const { stdout } = await execAsync("python3 weather_engine.py forecast");
      res.json(JSON.parse(stdout));
    } catch (error) {
      console.error("Python engine error:", error);
      res.json(engine.getExtendedForecast());
    }
  });

  app.get("/api/projections", async (req, res) => {
    const { scenario = "rcp45", county = "Parth Nanote" } = req.query;
    try {
      const { stdout } = await execAsync(`python3 weather_engine.py projections ${scenario} "${county}"`);
      res.json(JSON.parse(stdout));
    } catch (error) {
      console.error("Projections error:", error);
      res.status(500).json({ error: "Failed to fetch projections" });
    }
  });

  app.get("/api/threshold", async (req, res) => {
    const { threshold = 95, scenario = "rcp85" } = req.query;
    try {
      const { stdout } = await execAsync(`python3 weather_engine.py threshold ${threshold} ${scenario}`);
      res.json(JSON.parse(stdout));
    } catch (error) {
      console.error("Threshold error:", error);
      res.status(500).json({ error: "Failed to fetch threshold analysis" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
