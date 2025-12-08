export function getDaysUntil(dateStr: string): number {
  if (!dateStr) return Number.NaN;
  if (dateStr === '상시') return 0;

  const targetDate = new Date(dateStr);
  if (Number.isNaN(targetDate.getTime())) return Number.NaN;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

export function formatDDay(days: number): string {
  if (days === 0) return 'D-Day';
  if (days < 0) return `D+${Math.abs(days)}`;
  return `D-${days}`;
}

export function formatDate(dateStr: string, format: 'short' | 'long' = 'long'): string {
  if (dateStr === '상시') return '상시';
  if (!dateStr) return '-';

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  
  if (format === 'short') {
    return date.toLocaleDateString('ko-KR', { 
      month: 'numeric', 
      day: 'numeric' 
    });
  }
  
  return date.toLocaleDateString('ko-KR', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric' 
  });
}

export function getWeatherEmoji(condition: string): string {
  switch (condition) {
    case '맑음':
      return '☀️';
    case '비':
      return '🌧️';
    case '눈':
      return '❄️';
    case '흐림':
      return '☁️';
    default:
      return '🌤️';
  }
}
