import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Cloud, CloudRain, Sun, Wind, Droplets } from 'lucide-react';
import { Badge } from './ui/badge';
import { fetchRegionWeather, forecastForDate, inferRegionFromAddress, summarizeRegionWeather } from '../services/backend';

interface ExamRound {
  round: string;
  registrationStart: string;
  registrationEnd: string;
  examDate: string;
  resultDate: string;
  fee: number;
  locations: Array<{
    name: string;
    lat: number;
    lon: number;
    address: string;
  }>;
}

interface WeatherInfoProps {
  rounds: ExamRound[];
}

interface WeatherData {
  date: string;
  round: string;
  region: string;
  condition?: string;
  minTemp?: number;
  maxTemp?: number;
  rainProb?: number;
}

export function WeatherInfo({ rounds }: WeatherInfoProps) {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const regions = Array.from(
      new Set(rounds.map((round) => inferRegionFromAddress(round.locations?.[0]?.address) || '수도권')),
    );

    if (regions.length === 0) {
      setWeatherData([]);
      setLoading(false);
      return;
    }

    const loadWeather = async () => {
      setLoading(true);
      const weatherMap: Record<string, Awaited<ReturnType<typeof fetchRegionWeather>>> = {};

      for (const region of regions) {
        weatherMap[region] = await fetchRegionWeather(region);
      }

      if (!isMounted) return;

      const entries: WeatherData[] = rounds.map((round) => {
        const region = inferRegionFromAddress(round.locations?.[0]?.address) || '수도권';
        const targetDate = new Date(round.examDate);
        const regionWeather = weatherMap[region] ?? null;
        const forecast =
          (!Number.isNaN(targetDate.getTime()) && forecastForDate(regionWeather, targetDate)) ||
          summarizeRegionWeather(regionWeather);

        return {
          date: round.examDate,
          round: round.round,
          region,
          condition: forecast?.condition,
          minTemp: forecast?.minTemp,
          maxTemp: forecast?.maxTemp,
          rainProb: forecast?.rainProb,
        };
      });

      setWeatherData(entries);
      setLoading(false);
    };

    loadWeather();

    return () => {
      isMounted = false;
    };
  }, [rounds]);

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case '맑음':
        return <Sun className="w-8 h-8 text-yellow-500" />;
      case '비':
      case '눈':
        return <CloudRain className="w-8 h-8 text-blue-500" />;
      case '흐림':
        return <Cloud className="w-8 h-8 text-gray-500" />;
      default:
        return <Cloud className="w-8 h-8 text-gray-500" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>시험일 날씨 예보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">날씨 정보를 불러오는 중...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>시험일 날씨 예보</CardTitle>
        <div className="text-sm text-gray-500">
          * 기상청 중기예보를 기반으로 한 실데이터입니다.
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weatherData.map((weather, index) => (
            <div 
              key={index} 
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Badge className="bg-blue-500 mb-2">{weather.round}</Badge>
                  <div className="text-sm text-gray-600">{formatDate(weather.date)}</div>
                </div>
                {getWeatherIcon(weather.condition || '')}
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-2 bg-orange-50 rounded">
                  <div className="text-xs text-gray-600 mb-1">기온</div>
                  <div className="text-orange-700">
                    {weather.minTemp !== undefined && weather.maxTemp !== undefined
                      ? `${weather.minTemp}~${weather.maxTemp}°C`
                      : '예보 준비중'}
                  </div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-xs text-gray-600 mb-1">날씨</div>
                  <div className="text-blue-700">{weather.condition || '예보 준비중'}</div>
                </div>
                <div className="text-center p-2 bg-cyan-50 rounded">
                  <Droplets className="w-4 h-4 mx-auto mb-1 text-cyan-600" />
                  <div className="text-xs text-cyan-700">
                    {weather.rainProb !== undefined ? `${weather.rainProb}%` : '강수 정보 없음'}
                  </div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <Wind className="w-4 h-4 mx-auto mb-1 text-green-600" />
                  <div className="text-xs text-green-700">{weather.region}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
