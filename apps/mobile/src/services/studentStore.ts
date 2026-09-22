export interface BusStudent {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  year: number;
  section: string;
  boardingStopId: string;
  boardingStopName: string;
  phone: string;
  email: string;
  busId: string;
  busNumber: string;
  routeId: string;
  isBoarded: boolean;
  isOnLeave?: boolean;
  leaveDate?: string;
  leaveReason?: string;
  avatarBg?: string;
}

export const INITIAL_BUS12_STUDENTS: BusStudent[] = [
  {
    id: 's1',
    name: 'Kavitha M',
    rollNumber: '953621104021',
    department: 'BE Computer Science & Eng.',
    year: 4,
    section: 'A',
    boardingStopId: 'st1',
    boardingStopName: 'Rajapalayam New Bus Stand (Stop 1)',
    phone: '+91 99887 76655',
    email: 'kavitha.cse@college.edu',
    busId: 'b1',
    busNumber: 'BUS 12',
    routeId: 'r1',
    isBoarded: true,
    isOnLeave: false,
    avatarBg: '#059669',
  },
  {
    id: 's2',
    name: 'Vignesh K',
    rollNumber: '953621104088',
    department: 'BE Mechanical Engineering',
    year: 4,
    section: 'B',
    boardingStopId: 'st1',
    boardingStopName: 'Rajapalayam New Bus Stand (Stop 1)',
    phone: '+91 94421 98765',
    email: 'vignesh.mech@college.edu',
    busId: 'b1',
    busNumber: 'BUS 12',
    routeId: 'r1',
    isBoarded: true,
    isOnLeave: false,
    avatarBg: '#2563eb',
  },
  {
    id: 's3',
    name: 'Kishore ST',
    rollNumber: '21IT045',
    department: 'B.Tech Information Tech.',
    year: 3,
    section: 'A',
    boardingStopId: 'st2',
    boardingStopName: 'Gandhi Statue Junction (Stop 2)',
    phone: '+91 98421 23456',
    email: 'kishore.it@college.edu',
    busId: 'b1',
    busNumber: 'BUS 12',
    routeId: 'r1',
    isBoarded: false,
    isOnLeave: true,
    leaveDate: 'Today (20 Sep)',
    leaveReason: 'Family Function / Personal Leave',
    avatarBg: '#f59e0b',
  },
  {
    id: 's4',
    name: 'Ananya P',
    rollNumber: '953621104005',
    department: 'B.Tech AI & Data Science',
    year: 1,
    section: 'A',
    boardingStopId: 'st2',
    boardingStopName: 'Gandhi Statue Junction (Stop 2)',
    phone: '+91 98401 54321',
    email: 'ananya.aids@college.edu',
    busId: 'b1',
    busNumber: 'BUS 12',
    routeId: 'r1',
    isBoarded: false,
    isOnLeave: false,
    avatarBg: '#8b5cf6',
  },
  {
    id: 's5',
    name: 'Rahul S',
    rollNumber: '953621104045',
    department: 'BE Electronics & Comm.',
    year: 3,
    section: 'B',
    boardingStopId: 'st3',
    boardingStopName: 'PACR Mill Circle (Stop 3)',
    phone: '+91 98765 43210',
    email: 'rahul.ece@college.edu',
    busId: 'b1',
    busNumber: 'BUS 12',
    routeId: 'r1',
    isBoarded: false,
    isOnLeave: false,
    avatarBg: '#06b6d4',
  },
  {
    id: 's6',
    name: 'Surya Prakash',
    rollNumber: '953621104092',
    department: 'BE Electrical & Electronics',
    year: 3,
    section: 'A',
    boardingStopId: 'st3',
    boardingStopName: 'PACR Mill Circle (Stop 3)',
    phone: '+91 93456 78901',
    email: 'surya.eee@college.edu',
    busId: 'b1',
    busNumber: 'BUS 12',
    routeId: 'r1',
    isBoarded: false,
    isOnLeave: false,
    avatarBg: '#ec4899',
  },
  {
    id: 's7',
    name: 'Deepa R',
    rollNumber: '953621104018',
    department: 'BE Civil Engineering',
    year: 2,
    section: 'A',
    boardingStopId: 'st4',
    boardingStopName: 'Samsigapuram Road Turn (Stop 4)',
    phone: '+91 97890 12345',
    email: 'deepa.civil@college.edu',
    busId: 'b1',
    busNumber: 'BUS 12',
    routeId: 'r1',
    isBoarded: false,
    isOnLeave: false,
    avatarBg: '#10b981',
  },
  {
    id: 's8',
    name: 'Harish N',
    rollNumber: '953621104033',
    department: 'BE Computer Science & Eng.',
    year: 2,
    section: 'B',
    boardingStopId: 'st4',
    boardingStopName: 'Samsigapuram Road Turn (Stop 4)',
    phone: '+91 96543 21098',
    email: 'harish.cse@college.edu',
    busId: 'b1',
    busNumber: 'BUS 12',
    routeId: 'r1',
    isBoarded: false,
    isOnLeave: false,
    avatarBg: '#3b82f6',
  },
];

class StudentRosterStore {
  private students: BusStudent[] = [...INITIAL_BUS12_STUDENTS];
  private listeners: Set<() => void> = new Set();

  getStudents(busId: string = 'b1'): BusStudent[] {
    return this.students.filter((s) => s.busId === busId);
  }

  getAllStudents(): BusStudent[] {
    return this.students;
  }

  getStudentById(studentId: string): BusStudent | undefined {
    return this.students.find((s) => s.id === studentId);
  }

  getTotalCount(busId: string = 'b1'): number {
    return this.getStudents(busId).length;
  }

  getBoardedCount(busId: string = 'b1'): number {
    return this.getStudents(busId).filter((s) => s.isBoarded).length;
  }

  getOnLeaveCount(busId: string = 'b1'): number {
    return this.getStudents(busId).filter((s) => s.isOnLeave).length;
  }

  getStudentsOnLeave(busId: string = 'b1'): BusStudent[] {
    return this.getStudents(busId).filter((s) => s.isOnLeave);
  }

  setStudentLeave(
    studentId: string,
    isOnLeave: boolean,
    reason: string = 'Personal / Medical Leave',
    leaveDate: string = 'Today'
  ) {
    this.students = this.students.map((s) =>
      s.id === studentId
        ? {
            ...s,
            isOnLeave,
            leaveReason: isOnLeave ? reason : undefined,
            leaveDate: isOnLeave ? leaveDate : undefined,
          }
        : s
    );
    this.notify();
  }

  addStudent(student: BusStudent) {
    this.students = [student, ...this.students];
    this.notify();
  }

  removeStudent(studentId: string) {
    this.students = this.students.filter((s) => s.id !== studentId);
    this.notify();
  }

  toggleBoarded(studentId: string) {
    this.students = this.students.map((s) =>
      s.id === studentId ? { ...s, isBoarded: !s.isBoarded } : s
    );
    this.notify();
  }

  resetAttendance() {
    this.students = this.students.map((s) => ({ ...s, isBoarded: false }));
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const studentRosterStore = new StudentRosterStore();

