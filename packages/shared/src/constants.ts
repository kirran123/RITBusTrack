import { RouteSimulationPoint, Stop } from './types';

// Default College Location (Ramco Institute of Technology, Rajapalayam)
export const COLLEGE_LOCATION = {
  latitude: 9.4520,
  longitude: 77.5535,
  name: "Ramco Institute of Technology",
};

export const DEFAULT_TRACKING_INTERVAL_MS = 10000; // 10 seconds interval

export interface DepartmentInfo {
  code: string;
  name: string;
  hodName: string;
  hodEmail: string;
}

// 10 Official College Departments (Ramco Institute of Technology)
export const RIT_DEPARTMENTS: DepartmentInfo[] = [
  {
    code: 'IT',
    name: 'Information Technology',
    hodName: 'Mariappan',
    hodEmail: 'mariappan@ritrjpm.ac.in',
  },
  {
    code: 'AI&DS',
    name: 'Artificial Intelligence and Data Science',
    hodName: 'Kaliappan',
    hodEmail: 'kaliappan@ritrjpm.ac.in',
  },
  {
    code: 'AIML',
    name: 'Artificial Intelligence and Machine Learning',
    hodName: 'Kesavan',
    hodEmail: 'vtkesavan@ritrjpm.ac.in',
  },
  {
    code: 'CIVIL',
    name: 'Civil Engineering',
    hodName: 'Meyyappan',
    hodEmail: 'meyyappan@ritrjpm.ac.in',
  },
  {
    code: 'CSBS',
    name: 'Computer Science and Business Systems',
    hodName: 'Gomathynayagam',
    hodEmail: 'gomathynayagam@ritrjpm.ac.in',
  },
  {
    code: 'CSE',
    name: 'Computer Science and Engineering',
    hodName: 'Vijayalakshmi K',
    hodEmail: 'vijayalakshmik@ritrjpm.ac.in',
  },
  {
    code: 'EEE',
    name: 'Electrical and Electronics Engineering',
    hodName: 'Kannan',
    hodEmail: 'kannan@ritrjpm.ac.in',
  },
  {
    code: 'ECE',
    name: 'Electronics and Communication Engineering',
    hodName: 'Arunachala Perumal C',
    hodEmail: 'arunachalaperumal@ritrjpm.ac.in',
  },
  {
    code: 'MECH',
    name: 'Mechanical Engineering',
    hodName: 'Suresh Kumar',
    hodEmail: 'sureshkumar@ritrjpm.ac.in',
  },
  {
    code: 'CYBER',
    name: 'Cyber Security',
    hodName: 'Pending Appointment',
    hodEmail: 'cyberhod@rit.edu.in',
  },
];

export const matchesDepartment = (deptText: string | undefined | null, filterCode: string): boolean => {
  if (!deptText || filterCode === 'all') return true;
  const target = RIT_DEPARTMENTS.find(d => d.code === filterCode || d.name === filterCode);
  if (!target) {
    return deptText.toLowerCase().includes(filterCode.toLowerCase());
  }
  const clean = deptText.toLowerCase();
  const codeClean = target.code.toLowerCase();
  const nameClean = target.name.toLowerCase();
  
  if (clean === codeClean || clean === nameClean) return true;
  if (clean.includes(codeClean) || clean.includes(nameClean)) return true;
  
  // Aliases and abbreviations
  if (target.code === 'IT' && (clean.includes('information tech') || clean === 'it')) return true;
  if (target.code === 'CSE' && (clean.includes('comp') || clean.includes('computer') || clean === 'cse')) return true;
  if (target.code === 'ECE' && (clean.includes('electronics') || clean.includes('ece') || clean.includes('comm'))) return true;
  if (target.code === 'EEE' && (clean.includes('electrical') || clean.includes('eee'))) return true;
  if (target.code === 'MECH' && (clean.includes('mech') || clean.includes('mechanical'))) return true;
  if (target.code === 'CIVIL' && (clean.includes('civil'))) return true;
  if (target.code === 'AI&DS' && ((clean.includes('ai') && clean.includes('ds')) || clean.includes('data science') || clean === 'ai&ds' || clean === 'aids')) return true;
  if (target.code === 'AIML' && (clean.includes('aiml') || (clean.includes('ai') && clean.includes('ml')) || clean.includes('machine learning'))) return true;
  if (target.code === 'CSBS' && (clean.includes('csbs') || clean.includes('business'))) return true;
  if (target.code === 'CYBER' && (clean.includes('cyber') || clean.includes('security'))) return true;

  return false;
};


// Standard Initial Stops for Route 1 (Rajapalayam to Campus)
export const INITIAL_STOPS: Stop[] = [
  {
    id: 'stop_1',
    route_id: 'r1',
    stop_name: 'Rajapalayam New Bus Stand',
    latitude: 9.4475,
    longitude: 77.5450,
    stop_order: 1,
    estimated_arrival: '07:45 AM',
    status: 'active',
  },
  {
    id: 'stop_2',
    route_id: 'r1',
    stop_name: 'Gandhi Statue Junction',
    latitude: 9.4490,
    longitude: 77.5472,
    stop_order: 2,
    estimated_arrival: '07:52 AM',
    status: 'active',
  },
  {
    id: 'stop_3',
    route_id: 'r1',
    stop_name: 'PACR Mill Circle',
    latitude: 9.4505,
    longitude: 77.5495,
    stop_order: 3,
    estimated_arrival: '08:00 AM',
    status: 'active',
  },
  {
    id: 'stop_4',
    route_id: 'r1',
    stop_name: 'Samsigapuram Road Turn',
    latitude: 9.4512,
    longitude: 77.5510,
    stop_order: 4,
    estimated_arrival: '08:08 AM',
    status: 'active',
  },
  {
    id: 'stop_5',
    route_id: 'r1',
    stop_name: 'College Main Gate',
    latitude: 9.4520,
    longitude: 77.5535,
    stop_order: 5,
    estimated_arrival: '08:20 AM',
    status: 'active',
  },
];

// Sample simulation route coordinates for Bus 01 (Rajapalayam Town to College Campus)
export const SIMULATION_ROUTE_A: RouteSimulationPoint[] = [
  { latitude: 9.4475, longitude: 77.5450, speed: 25, heading: 45, accuracy: 5, stop_name: "Rajapalayam New Bus Stand" },
  { latitude: 9.4490, longitude: 77.5472, speed: 30, heading: 40, accuracy: 4, stop_name: "Gandhi Statue Junction" },
  { latitude: 9.4505, longitude: 77.5495, speed: 35, heading: 35, accuracy: 5, stop_name: "PACR Mill Circle" },
  { latitude: 9.4512, longitude: 77.5510, speed: 28, heading: 30, accuracy: 6, stop_name: "Samsigapuram Road Turn" },
  { latitude: 9.4520, longitude: 77.5535, speed: 10, heading: 0, accuracy: 3, stop_name: "College Main Gate" },
];

export const SIMULATION_ROUTE_B: RouteSimulationPoint[] = [
  { latitude: 9.4300, longitude: 77.5600, speed: 40, heading: 310, accuracy: 4, stop_name: "Srivilliputhur Arch" },
  { latitude: 9.4380, longitude: 77.5570, speed: 45, heading: 315, accuracy: 5, stop_name: "Krishnankoil Bus Stop" },
  { latitude: 9.4460, longitude: 77.5540, speed: 38, heading: 320, accuracy: 4, stop_name: "Venkateswara Nagar" },
  { latitude: 9.4520, longitude: 77.5535, speed: 15, heading: 330, accuracy: 3, stop_name: "College Main Gate" },
];
