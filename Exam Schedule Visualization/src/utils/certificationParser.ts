export interface ExamLocation {
  name: string;
  lat: number;
  lon: number;
  address: string;
}

export interface ExamRound {
  round: string;
  registrationStart: string;
  registrationEnd: string;
  writtenExam: string;
  practicalRegistrationStart?: string;
  practicalRegistrationEnd?: string;
  practicalExam?: string;
  resultDate: string;
  writtenFee: number;
  practicalFee?: number;
  locations: ExamLocation[];
}

export interface Certification {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  description: string;
  agency: string;
  exams: ExamRound[];
}

export interface Terminal {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  address: string;
  routes: number;
  telephone?: string;
  url?: string;
}
