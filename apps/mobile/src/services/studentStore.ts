import { Platform } from 'react-native';
import { broadcastLeaveToggle, subscribeToLeave, fetchLiveStudentsFromDB } from './supabase';
import { MASTER_BUSES, MASTER_ROUTES } from '@college-bus/shared';

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
  routeName?: string;
  isBoarded: boolean;
  isOnLeave?: boolean;
  leaveDate?: string;
  leaveReason?: string;
  avatarBg?: string;
  register_number?: string;
  profile?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

const resolveStudentBusNumber = (as: any): string => {
  if (as.bus?.bus_number) return as.bus.bus_number;
  if (as.bus_number) return as.bus_number;
  if (as.busNumber) return as.busNumber;
  const bId = as.bus_id || as.busId;
  if (bId) {
    const found = MASTER_BUSES.find(b => b.id === bId || b.bus_number === bId);
    if (found) return found.bus_number;
    if (typeof bId === 'string' && bId.startsWith('b') && !isNaN(Number(bId.slice(1)))) {
      return `BUS-${String(bId.slice(1)).padStart(2, '0')}`;
    }
  }
  return 'BUS-01';
};

const resolveStudentRouteId = (as: any): string => {
  if (as.route_id) return as.route_id;
  if (as.routeId) return as.routeId;
  if (as.route?.id) return as.route.id;
  const bId = as.bus_id || as.busId;
  if (bId) {
    const found = MASTER_BUSES.find(b => b.id === bId || b.bus_number === bId);
    if (found?.route_id) return found.route_id;
    if (typeof bId === 'string' && bId.startsWith('b') && !isNaN(Number(bId.slice(1)))) {
      return `r${bId.slice(1)}`;
    }
  }
  return 'r1';
};

export const INITIAL_BUS12_STUDENTS: BusStudent[] = [
  {
    id: 's1',
    name: 'Kavitha M',
    rollNumber: '953621104021',
    department: 'BE Computer Science & Eng.',
    year: 4,
    section: 'A',
    boardingStopId: 'st1',
    boardingStopName: 'Old Bus Stand, RJPM (Stop 1)',
    phone: '+91 99887 76655',
    email: 'kavitha.cse@ritrjpm.ac.in',
    busId: 'b1',
    busNumber: 'BUS-01',
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
    boardingStopName: 'Old Bus Stand, RJPM (Stop 1)',
    phone: '+91 94421 98765',
    email: 'vignesh.mech@ritrjpm.ac.in',
    busId: 'b1',
    busNumber: 'BUS-01',
    routeId: 'r1',
    isBoarded: true,
    isOnLeave: false,
    avatarBg: '#2563eb',
  },
  {
    id: 's3',
    name: 'Kishore ST',
    rollNumber: '953624205052',
    department: 'B.Tech Information Tech.',
    year: 3,
    section: 'A',
    boardingStopId: 'st1',
    boardingStopName: 'Old Bus Stand, RJPM (Stop 1)',
    phone: '+91 98421 23456',
    email: '953624205052@ritrjpm.ac.in',
    busId: 'b1',
    busNumber: 'BUS-01',
    routeId: 'r1',
    isBoarded: false,
    isOnLeave: false,
    avatarBg: '#059669',
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
    email: 'ananya.aids@ritrjpm.ac.in',
    busId: 'b1',
    busNumber: 'BUS-01',
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
    email: 'rahul.ece@ritrjpm.ac.in',
    busId: 'b1',
    busNumber: 'BUS-01',
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
    email: 'surya.eee@ritrjpm.ac.in',
    busId: 'b1',
    busNumber: 'BUS-01',
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
    email: 'deepa.civil@ritrjpm.ac.in',
    busId: 'b1',
    busNumber: 'BUS-01',
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
    email: 'harish.cse@ritrjpm.ac.in',
    busId: 'b1',
    busNumber: 'BUS-01',
    routeId: 'r1',
    isBoarded: false,
    isOnLeave: false,
    avatarBg: '#3b82f6',
  },
];

const loadSavedStudents = (): BusStudent[] => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('bustrack_students_v1');
      if (raw) {
        const adminStudents = JSON.parse(raw);
        if (Array.isArray(adminStudents) && adminStudents.length > 0) {
          return adminStudents.map((as: any, idx: number) => ({
            id: as.id || `s${idx + 1}`,
            name: as.profile?.name || as.name || `Student ${idx + 1}`,
            rollNumber: as.register_number || as.rollNumber || `REG-${idx + 1}`,
            department: as.department || 'Computer Science',
            year: as.year || 4,
            section: as.section || 'A',
            boardingStopId: as.boarding_stop_id || as.boardingStopId || 'st1',
            boardingStopName: as.boarding_stop?.stop_name || as.boardingStopName || 'Old Bus Stand, RJPM',
            phone: as.profile?.phone || as.phone || '+91 99887 76655',
            email: as.profile?.email || as.email || 'student@ritrjpm.ac.in',
            busId: as.bus_id || as.busId || 'b1',
            busNumber: resolveStudentBusNumber(as),
            routeId: resolveStudentRouteId(as),
            routeName: as.route?.route_name || as.routeName || (as.route_id ? MASTER_ROUTES.find(r => r.id === as.route_id)?.route_name : undefined) || 'Route 1',
            isBoarded: false,
            isOnLeave: Boolean(as.is_on_leave || as.isOnLeave),
            leaveDate: as.leave_date || as.leaveDate || (as.is_on_leave ? 'Today' : undefined),
            leaveReason: as.leave_reason || as.leaveReason || undefined,
            avatarBg: idx % 2 === 0 ? '#059669' : '#2563eb'
          }));
        }
      }
    } catch {}
  }
  return INITIAL_BUS12_STUDENTS;
};

class StudentRosterStore {
  private students: BusStudent[] = loadSavedStudents();
  private listeners: Set<() => void> = new Set();

  getStudents(busId: string = 'b1'): BusStudent[] {
    return this.students.filter((s) => s.busId === busId || (!s.busId && busId === 'b1'));
  }

  getAllStudents(): BusStudent[] {
    return this.students;
  }

  getStudentById(studentId: string): BusStudent | undefined {
    return this.students.find((s) => s.id === studentId || s.rollNumber === studentId);
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

  constructor() {
    // 1. Fetch live students from Supabase database
    fetchLiveStudentsFromDB().then((dbStudents) => {
      if (dbStudents && dbStudents.length > 0) {
        const mapped: BusStudent[] = dbStudents.map((as: any, idx: number) => ({
          id: as.id || `s${idx + 1}`,
          name: as.profile?.name || as.name || `Student ${idx + 1}`,
          rollNumber: as.register_number || as.rollNumber || `21IT${String(idx + 10).padStart(3, '0')}`,
          department: as.department || 'B.Tech Information Tech.',
          year: as.year || 3,
          section: as.section || 'A',
          boardingStopId: as.boarding_stop_id || as.boardingStopId || 'st1',
          boardingStopName: as.boarding_stop?.stop_name || as.boardingStopName || 'Old Bus Stand, RJPM (Stop 1)',
          phone: as.profile?.phone || as.phone || '+91 98421 00000',
          email: as.profile?.email || as.email || 'student@ritrjpm.ac.in',
          busId: as.bus_id || as.busId || 'b1',
          busNumber: resolveStudentBusNumber(as),
          routeId: resolveStudentRouteId(as),
          routeName: as.route?.route_name || as.routeName || (as.route_id ? MASTER_ROUTES.find(r => r.id === as.route_id)?.route_name : undefined) || 'Route 1',
          isBoarded: false,
          isOnLeave: Boolean(as.is_on_leave || as.isOnLeave),
          leaveDate: as.leave_date || as.leaveDate || (as.is_on_leave ? 'Today' : undefined),
          leaveReason: as.leave_reason || as.leaveReason || undefined,
          avatarBg: idx % 2 === 0 ? '#059669' : '#2563eb'
        }));
        this.students = mapped;
        this.notify();
      }
    }).catch(() => {});

    // 2. Listen for leave changes from Admin Web / Supabase
    try {
      subscribeToLeave((payload) => {
        this.students = this.students.map((s) =>
          s.id === payload.studentId || s.rollNumber === payload.studentId
            ? {
                ...s,
                isOnLeave: payload.isOnLeave,
                leaveReason: payload.isOnLeave ? (payload.reason || 'Leave Applied') : undefined,
                leaveDate: payload.isOnLeave ? (payload.leaveDate || 'Today') : undefined,
              }
            : s
        );
        this.notify();
      });
    } catch {}
  }

  setStudentLeave(
    studentId: string,
    isOnLeave: boolean,
    reason: string = 'Personal / Medical Leave',
    leaveDate: string = 'Today'
  ) {
    this.students = this.students.map((s) =>
      s.id === studentId || s.rollNumber === studentId
        ? {
            ...s,
            isOnLeave,
            leaveReason: isOnLeave ? reason : undefined,
            leaveDate: isOnLeave ? leaveDate : undefined,
          }
        : s
    );

    // Save directly to localStorage for immediate Admin Web reflection
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('bustrack_students_v1');
        if (raw) {
          const list = JSON.parse(raw);
          const updated = list.map((s: any) => {
            if (s.id === studentId || s.user_id === studentId || s.register_number === studentId || (s.profile && (s.profile.id === studentId || s.profile.name === 'Kishore ST'))) {
              return {
                ...s,
                is_on_leave: isOnLeave,
                leave_date: isOnLeave ? leaveDate : undefined,
                leave_reason: isOnLeave ? reason : undefined,
              };
            }
            return s;
          });
          window.localStorage.setItem('bustrack_students_v1', JSON.stringify(updated));
        }
      } catch (err) {
        console.warn('Storage save error:', err);
      }
    }

    this.notify();

    // Broadcast update to Admin Web and Supabase
    try {
      broadcastLeaveToggle({ studentId, isOnLeave, reason, leaveDate });
    } catch {}
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

