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

interface Terminal {
  name: string;
  lat: number;
  lon: number;
  address: string;
}

export function parseExamXML(xmlString: string): ExamRound[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  const exams = xmlDoc.querySelectorAll('exam');
  const examRounds: ExamRound[] = [];
  
  exams.forEach(exam => {
    const round = exam.querySelector('round')?.textContent || '';
    const registrationStart = exam.querySelector('registrationStart')?.textContent || '';
    const registrationEnd = exam.querySelector('registrationEnd')?.textContent || '';
    const examDate = exam.querySelector('examDate')?.textContent || '';
    const resultDate = exam.querySelector('resultDate')?.textContent || '';
    const fee = parseInt(exam.querySelector('fee')?.textContent || '0');
    
    const locations: Array<{name: string; lat: number; lon: number; address: string}> = [];
    const locationElements = exam.querySelectorAll('location');
    
    locationElements.forEach(loc => {
      locations.push({
        name: loc.getAttribute('name') || '',
        lat: parseFloat(loc.getAttribute('lat') || '0'),
        lon: parseFloat(loc.getAttribute('lon') || '0'),
        address: loc.getAttribute('address') || '',
      });
    });
    
    examRounds.push({
      round,
      registrationStart,
      registrationEnd,
      examDate,
      resultDate,
      fee,
      locations,
    });
  });
  
  return examRounds;
}

export function parseTerminalXML(xmlString: string): Terminal[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  const terminals = xmlDoc.querySelectorAll('terminal');
  const terminalList: Terminal[] = [];
  
  terminals.forEach(terminal => {
    terminalList.push({
      name: terminal.getAttribute('name') || '',
      lat: parseFloat(terminal.getAttribute('lat') || '0'),
      lon: parseFloat(terminal.getAttribute('lon') || '0'),
      address: terminal.getAttribute('address') || '',
    });
  });
  
  return terminalList;
}
