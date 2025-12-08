import { Certification, ExamLocation, ExamRound, Terminal } from '../utils/certificationParser';

type LicenseSearchResponse = {
  results?: Array<{
    uri: string;
    label: string;
    desc?: string;
  }>;
};

export type LicenseSearchResult = {
  uri: string;
  label: string;
  desc?: string;
};

type LicenseScheduleResponse = {
  results?: any[];
};

type LicenseFeeResponse = {
  results?: any[];
};

type TerminalRegionsResponse = {
  regions?: string[];
};

type TerminalByRegionResponse = {
  results?: any[];
};

export interface MidWeatherResponse {
  region: string;
  regId: string;
  tmFc: string;
  has_data: boolean;
  summary_day4?: {
    temp?: {
      min?: number | string;
      max?: number | string;
    };
    am?: {
      weather?: string;
      rain_prob?: number | string;
    };
    pm?: {
      weather?: string;
      rain_prob?: number | string;
    };
  };
  land_raw?: Record<string, any>;
  temp_raw?: Record<string, any>;
}

export interface RegionWeatherSnapshot {
  condition?: string;
  rainProb?: number;
  minTemp?: number;
  maxTemp?: number;
  tmFc?: string;
}

export interface RegionForecast extends RegionWeatherSnapshot {
  dayOffset?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const LICENSE_SEARCH_KEYWORDS = ['사', '기', '자', '전', '설'];

function buildUrl(path: string) {
  if (path.startsWith('http')) return path;
  const prefix = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${prefix}${suffix}`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(buildUrl(path));
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function normalizeDateString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function collectLicenses(limit = 15) {
  const collected = new Map<string, { uri: string; label: string; desc?: string }>();

  for (const keyword of LICENSE_SEARCH_KEYWORDS) {
    try {
      const data = await fetchJson<LicenseSearchResponse>(`/licenses/search?q=${encodeURIComponent(keyword)}`);
      (data.results ?? []).forEach((item) => {
        if (!collected.has(item.uri)) {
          collected.set(item.uri, item);
        }
      });
      if (collected.size >= limit) break;
    } catch (error) {
      console.error('Failed to collect licenses for keyword', keyword, error);
    }
  }

  return Array.from(collected.values()).slice(0, limit);
}

async function fetchSchedulesForLicense(name: string): Promise<any[]> {
  const now = new Date();
  const years = [now.getFullYear(), now.getFullYear() + 1];
  const schedules: any[] = [];

  for (const year of years) {
    try {
      const data = await fetchJson<LicenseScheduleResponse>(
        `/licenses/schedule?name=${encodeURIComponent(name)}&year=${year}`,
      );
      if (Array.isArray(data.results)) {
        schedules.push(...data.results);
      }
    } catch (error) {
      console.warn(`Failed to load schedule for ${name} (${year})`, error);
    }
  }

  return schedules;
}

async function fetchLicenseFee(name: string): Promise<any[]> {
  try {
    const data = await fetchJson<LicenseFeeResponse>(`/licenses/fee?name=${encodeURIComponent(name)}`);
    return Array.isArray(data.results) ? data.results : [];
  } catch (error) {
    console.warn(`Failed to load fees for ${name}`, error);
    return [];
  }
}

async function fetchLicenseSites(name: string): Promise<ExamLocation[]> {
  try {
    const data = await fetchJson<{ results?: any[] }>(`/licenses/sites?name=${encodeURIComponent(name)}`);
    return mapLocations(data.results ?? []);
  } catch (error) {
    console.warn(`Failed to load exam sites for ${name}`, error);
    return [];
  }
}

function extractFeeInfo(items: any[]) {
  let written: number | undefined;
  let practical: number | undefined;

  for (const item of items) {
    if (written === undefined) {
      written =
        toNumber(item?.docExamFee) ??
        toNumber(item?.writtenFee) ??
        toNumber(item?.docfee) ??
        toNumber(item?.exprnFee) ??
        toNumber(item?.docExamfee);
    }
    if (practical === undefined) {
      practical =
        toNumber(item?.pracExamFee) ??
        toNumber(item?.practicalFee) ??
        toNumber(item?.prcExamFee) ??
        toNumber(item?.prcExamfee);
    }
    if (written !== undefined && practical !== undefined) break;
  }

  return { written, practical };
}

function mapLocations(items: any[]): ExamLocation[] {
  return items
    .map((item) => {
      const lat = toNumber(item?.lat ?? item?.latitude ?? item?.latd ?? item?.plceLoctGid) ?? 0;
      const lon = toNumber(item?.lon ?? item?.longitude ?? item?.lond) ?? 0;
      const name =
        item?.siteNm ??
        item?.examAreaNm ??
        item?.examAreaGbNm ??
        item?.brchNm ??
        item?.name ??
        item?.facNm ??
        '시험장';
      const address = item?.address ?? item?.addr ?? item?.streetAddress ?? item?.examAreaNm ?? '';

      return {
        name,
        lat,
        lon,
        address,
      };
    })
    .filter((loc) => loc.name || loc.address);
}

function mapScheduleToExamRound(
  item: any,
  feeInfo: { written?: number; practical?: number },
  locations: ExamLocation[],
): ExamRound {
  const roundLabel =
    item?.description ||
    (item?.year && item?.seq ? `${item.year}년 ${item.seq}회` : `${item?.implYy ?? ''} ${item?.implSeq ?? ''}`.trim()) ||
    '시험 일정';
  const writtenExam = normalizeDateString(item?.docExamStartDt || item?.docExamEndDt);
  const practicalExam = normalizeDateString(item?.pracExamStartDt || item?.pracExamEndDt);

  return {
    round: roundLabel,
    registrationStart: normalizeDateString(item?.docRegStartDt),
    registrationEnd: normalizeDateString(item?.docRegEndDt),
    writtenExam,
    practicalRegistrationStart: normalizeDateString(item?.pracRegStartDt) || undefined,
    practicalRegistrationEnd: normalizeDateString(item?.pracRegEndDt) || undefined,
    practicalExam: practicalExam || undefined,
    resultDate: normalizeDateString(item?.pracPassDt || item?.docPassDt),
    writtenFee: feeInfo.written ?? 0,
    practicalFee: feeInfo.practical,
    locations,
  };
}

export async function fetchInitialCertifications(): Promise<Certification[]> {
  const licenses = await collectLicenses();
  const certifications: Certification[] = [];

  for (const license of licenses) {
    const schedules = await fetchSchedulesForLicense(license.label);
    if (!schedules.length) continue;

    const feeItems = await fetchLicenseFee(license.label);
    const feeInfo = extractFeeInfo(feeItems);
    const locations = await fetchLicenseSites(license.label);

    const exams = schedules
      .map((item) => mapScheduleToExamRound(item, feeInfo, locations))
      .filter((exam) => exam.registrationStart || exam.writtenExam);

    if (!exams.length) continue;

    const sortKey = (exam: ExamRound) => {
      const base = exam.writtenExam || exam.registrationStart;
      const parsed = Date.parse(base);
      return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
    };

    exams.sort((a, b) => sortKey(a) - sortKey(b));

    certifications.push({
      id: encodeURIComponent(license.uri || license.label),
      name: license.label,
      category: schedules[0]?.qualgbNm || '자격증',
      difficulty: '정보없음',
      description: license.desc || schedules[0]?.description || '',
      agency: schedules[0]?.qualgbNm || '국가자격',
      exams,
    });
  }

  return certifications;
}

function inferTerminalType(name: string) {
  return '버스터미널';
}

function buildTerminalAddress(item: any) {
  const parts = [item?.sido, item?.locality, item?.neighborhood, item?.streetAddress].filter(Boolean);
  return parts.join(' ').trim() || item?.streetAddress || item?.name || '';
}

export async function fetchTerminalsFromBackend(): Promise<Terminal[]> {
  const terminals: Terminal[] = [];
  let regions: string[] = [];

  try {
    const data = await fetchJson<TerminalRegionsResponse>('/terminals/regions');
    regions = data.regions ?? [];
  } catch (error) {
    console.error('Failed to load terminal regions', error);
    return terminals;
  }

  for (const region of regions) {
    try {
      const data = await fetchJson<TerminalByRegionResponse>(
        `/terminals/by-region?sido=${encodeURIComponent(region)}`,
      );

      (data.results ?? []).forEach((item) => {
        const name = item?.name || '터미널';
        terminals.push({
          id: item?.id,
          name,
          type: inferTerminalType(name),
          lat: 0,
          lon: 0,
          address: buildTerminalAddress(item),
          routes: 0,
          telephone: item?.telephone,
          url: item?.url,
        });
      });
    } catch (error) {
      console.warn(`Failed to load terminals for ${region}`, error);
    }
  }

  return terminals;
}

export function inferRegionFromAddress(address?: string | null): string | null {
  if (!address) return null;
  if (address.includes('제주')) return '제주도';
  if (address.includes('부산') || address.includes('울산') || address.includes('경남') || address.includes('창원'))
    return '경남권';
  if (address.includes('대구') || address.includes('경북')) return '경북권';
  if (address.includes('강원')) {
    if (address.includes('강릉') || address.includes('속초') || address.includes('동해') || address.includes('삼척')) {
      return '강원영동';
    }
    return '강원영서';
  }
  if (address.includes('광주') || address.includes('전남')) return '전남권';
  if (address.includes('전북')) return '전라북도';
  if (address.includes('대전') || address.includes('충남') || address.includes('세종')) return '충남권';
  if (address.includes('충북')) return '충청북도';
  if (address.includes('서울') || address.includes('경기') || address.includes('인천')) return '수도권';

  return null;
}

export async function fetchRegionWeather(region: string): Promise<MidWeatherResponse | null> {
  try {
    return await fetchJson<MidWeatherResponse>(`/weather/mid?region=${encodeURIComponent(region)}`);
  } catch (error) {
    console.warn(`Failed to load weather for ${region}`, error);
    return null;
  }
}

export function summarizeRegionWeather(weather: MidWeatherResponse | null): RegionWeatherSnapshot | null {
  if (!weather?.has_data) return null;
  const summary = weather.summary_day4;
  if (!summary) return null;

  const minTemp = toNumber(summary.temp?.min);
  const maxTemp = toNumber(summary.temp?.max);
  const condition = summary.pm?.weather || summary.am?.weather;
  const rainProb = toNumber(summary.pm?.rain_prob ?? summary.am?.rain_prob);

  return {
    condition: condition || undefined,
    rainProb,
    minTemp,
    maxTemp,
    tmFc: weather.tmFc,
  };
}

export function forecastForDate(weather: MidWeatherResponse | null, targetDate: Date): RegionForecast | null {
  if (!weather?.has_data || !weather.tmFc) return null;

  const baseDateString = weather.tmFc.slice(0, 8);
  const baseDate = new Date(
    `${baseDateString.slice(0, 4)}-${baseDateString.slice(4, 6)}-${baseDateString.slice(6, 8)}`,
  );
  if (Number.isNaN(baseDate.getTime())) return null;

  const diffDays = Math.round((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 3 || diffDays > 10) return null;

  const land = weather.land_raw ?? {};
  const temp = weather.temp_raw ?? {};
  const key = diffDays;

  const condition = land[`wf${key}Pm`] || land[`wf${key}Am`];
  const rainProb = toNumber(land[`rnSt${key}Pm`] ?? land[`rnSt${key}Am`]);
  const minTemp = toNumber(temp[`taMin${key}`]);
  const maxTemp = toNumber(temp[`taMax${key}`]);

  return {
    condition: condition || undefined,
    rainProb,
    minTemp,
    maxTemp,
    tmFc: weather.tmFc,
    dayOffset: diffDays,
  };
}

export async function searchLicenses(keyword: string): Promise<LicenseSearchResult[]> {
  if (!keyword.trim()) return [];
  try {
    const data = await fetchJson<LicenseSearchResponse>(`/licenses/search?q=${encodeURIComponent(keyword)}`);
    return data.results ?? [];
  } catch (error) {
    console.warn('Failed to search licenses', error);
    return [];
  }
}
