import json
import sys
import random
import math
from datetime import datetime, timedelta

def get_extended_forecast():
    # ... (existing forecast logic)
    days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    now = datetime.now()
    
    ten_day = []
    for i in range(10):
        date = now + timedelta(days=i)
        ten_day.append({
            "day": days[date.weekday()],
            "date": date.strftime('%Y-%m-%d'),
            "high": 25 + random.randint(0, 10),
            "low": 15 + random.randint(0, 5),
            "condition": random.choice(['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy']),
            "precip": random.randint(0, 100)
        })

    hourly = []
    for i in range(24):
        date = now + timedelta(hours=i)
        hourly.append({
            "time": date.strftime('%I:%M %p'),
            "timestamp": date.isoformat(),
            "temp": round(20 + (i % 12) * 0.5 + random.uniform(0, 2), 1),
            "condition": random.choice(['Clear', 'Cloudy', 'Showers'])
        })

    environmental = {
        "uvIndex": {"value": 6, "level": "High", "description": "Protection required"},
        "aqi": {"value": 42, "level": "Good", "description": "Air quality is satisfactory"},
        "humidity": {"value": 65, "unit": "%"},
        "wind": {"speed": 12, "unit": "km/h", "direction": "NW"},
        "visibility": {"value": 10, "unit": "km"},
        "pressure": {"value": 1012, "unit": "hPa"},
        "sunrise": "06:12 AM",
        "sunset": "06:45 PM"
    }

    return {
        "tenDay": ten_day,
        "hourly": hourly,
        "environmental": environmental
    }

def get_climate_projections(scenario="rcp45", county="Parth Nanote"):
    # Generate data from 1950 to 2100
    years = list(range(1950, 2101))
    data = []
    
    # Base temperature for the county
    base_temp = 14.5 # Average for SF
    
    # Warming rates per year
    warming_rates = {
        "rcp45": 0.02, # ~1.5C by 2100
        "rcp85": 0.05  # ~4C by 2100
    }
    rate = warming_rates.get(scenario, 0.02)
    
    for year in years:
        # Historical variability vs projected trend
        is_future = year > 2024
        warming_effect = (year - 1950) * rate if is_future else (year - 1950) * 0.01
        
        # Add some multi-decadal oscillation and noise
        oscillation = math.sin((year - 1950) / 10) * 0.5
        noise = random.uniform(-0.8, 0.8)
        
        temp = base_temp + warming_effect + oscillation + noise
        
        data.append({
            "year": year,
            "temp": round(temp, 2),
            "isFuture": is_future
        })
        
    return {
        "county": county,
        "scenario": scenario,
        "projections": data
    }

def get_threshold_analysis(threshold=95, scenario="rcp85"):
    # Calculate days over threshold per decade
    decades = list(range(1950, 2100, 10))
    results = []
    
    base_days = 2 # Base extreme heat days in 1950
    growth_factor = 1.2 if scenario == "rcp45" else 2.5
    
    for decade in decades:
        # Exponential growth of extreme events in high emission scenarios
        is_future = decade >= 2020
        years_since_start = (decade - 1950) / 10
        
        if is_future:
            days = base_days * (growth_factor ** years_since_start)
        else:
            days = base_days + (years_since_start * 0.5)
            
        results.append({
            "decade": f"{decade}s",
            "days": round(days, 1),
            "riskLevel": "High" if days > 30 else "Moderate" if days > 10 else "Low"
        })
        
    return {
        "threshold": threshold,
        "scenario": scenario,
        "analysis": results
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "forecast":
            print(json.dumps(get_extended_forecast()))
        elif command == "projections":
            scenario = sys.argv[2] if len(sys.argv) > 2 else "rcp45"
            county = sys.argv[3] if len(sys.argv) > 3 else "Parth Nanote"
            print(json.dumps(get_climate_projections(scenario, county)))
        elif command == "threshold":
            threshold = int(sys.argv[2]) if len(sys.argv) > 2 else 95
            scenario = sys.argv[3] if len(sys.argv) > 3 else "rcp85"
            print(json.dumps(get_threshold_analysis(threshold, scenario)))
    else:
        print(json.dumps(get_extended_forecast()))
