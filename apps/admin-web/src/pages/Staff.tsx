import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StaffUser, StaffCommuter, Bus, Route, Stop } from '@college-bus/shared';
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BusFront,
  X,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Eye,
  ArrowRight,
  CircleHelp,
  CheckCircle2,
  CalendarDays,
  CalendarOff,
  UserCheck,
  KeyRound,
  Users,
  MapPin,
  Building2,
  Mail,
  Phone,
  Info,
} from 'lucide-react';

interface StaffProps {
  currentUser?: any;
  canEdit?: boolean;
  staffList?: StaffUser[];
  staffCommuters?: StaffCommuter[];
  buses: Bus[];
  routes: Route[];
  stops: Stop[];
  onSaveStaff?: (staff: StaffUser) => void;
  onDeleteStaff?: (staffId: string) => void;
  onToggleStaffAccess?: (staffId: string) => void;
  onUpdateStaffPassword?: (staffId: string, newPass: string) => void;
  onSimulateLoginAsStaff?: (staff: StaffUser) => void;
  onSaveStaffCommuter?: (commuter: StaffCommuter) => void;
  onDeleteStaffCommuter?: (commuterId: string) => void;
  onToggleStaffCommuterLeave?: (commuterId: string) => void;
  onUpdateStaffCommuterPassword?: (commuterId: string, newPass: string) => void;
  onImportStaffCommuterCSV?: (commuters: Partial<StaffCommuter>[]) => void;
}

export const Staff: React.FC<StaffProps> = ({
  staffList = [],
  staffCommuters = [],
  buses = [],
  routes = [],
  stops = [],
  onSaveStaff,
  onDeleteStaff,
  onToggleStaffAccess,
  onUpdateStaffPassword,
  onSimulateLoginAsStaff,
  onSaveStaffCommuter,
  onDeleteStaffCommuter,
  onToggleStaffCommuterLeave,
  onUpdateStaffCommuterPassword,
  onImportStaffCommuterCSV,
  currentUser,
  canEdit,
}) => {
  const isEditable =
    canEdit ??
    (currentUser?.role === 'admin' ||
      (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));

  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'portal_staff' | 'commuters'>(
    urlTab === 'portal' ? 'portal_staff' : 'portal_staff'
  );

  // Sync tab change to URL query params
  const handleTabChange = (tab: 'portal_staff' | 'commuters') => {
    setActiveTab(tab);
    setSearchParams({ tab: tab === 'portal_staff' ? 'portal' : 'commuters' });
  };

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ----------------------------------------------------
  // SECTION 1: ADMIN PORTAL STAFF (VIEW & EDIT ACCESS)
  // ----------------------------------------------------
  const [portalQuery, setPortalQuery] = useState('');
  const [portalAccessFilter, setPortalAccessFilter] = useState('All permissions');
  const [portalStatusFilter, setPortalStatusFilter] = useState('All status');
  const [portalPage, setPortalPage] = useState(1);
  const [portalPageSize, setPortalPageSize] = useState(10);

  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const [editingPortalStaff, setEditingPortalStaff] = useState<StaffUser | null>(null);
  const [portalFormValues, setPortalFormValues] = useState({
    name: '',
    employeeId: '',
    department: 'Transport Department',
    designation: 'Transport Incharge',
    email: '',
    phone: '',
    accessLevel: 'edit' as 'edit' | 'view',
    password: 'staff123',
    status: 'active' as 'active' | 'inactive',
  });

  const filteredPortalStaff = staffList.filter((staff) => {
    const text = `${staff.name || ''} ${(staff as any).employee_id || staff.id || ''} ${
      staff.department || ''
    } ${staff.designation || ''} ${staff.email || ''} ${staff.phone || ''}`.toLowerCase();
    const matchesQuery = !portalQuery || text.includes(portalQuery.toLowerCase());
    const matchesAccess =
      portalAccessFilter === 'All permissions' ||
      (portalAccessFilter === 'Edit access' && staff.access_level === 'edit') ||
      (portalAccessFilter === 'View only' && staff.access_level === 'view');
    const matchesStatus =
      portalStatusFilter === 'All status' ||
      (staff.status || 'active').toLowerCase() === portalStatusFilter.toLowerCase();
    return matchesQuery && matchesAccess && matchesStatus;
  });

  const portalPageCount = Math.max(1, Math.ceil(filteredPortalStaff.length / portalPageSize));
  const visiblePortalStaff = filteredPortalStaff.slice(
    (portalPage - 1) * portalPageSize,
    portalPage * portalPageSize
  );
  const visiblePortalStart = filteredPortalStaff.length
    ? (portalPage - 1) * portalPageSize + 1
    : 0;
  const visiblePortalEnd = Math.min(portalPage * portalPageSize, filteredPortalStaff.length);

  useEffect(() => {
    setPortalPage(1);
  }, [portalQuery, portalAccessFilter, portalStatusFilter, portalPageSize]);

  const openAddPortalStaff = () => {
    setEditingPortalStaff(null);
    setPortalFormValues({
      name: '',
      employeeId: `STF-${Math.floor(100 + Math.random() * 900)}`,
      department: 'Transport Department',
      designation: 'Route Coordinator',
      email: '',
      phone: '+91 96292 84690',
      accessLevel: 'edit',
      password: 'staff123',
      status: 'active',
    });
    setPortalModalOpen(true);
  };

  const openEditPortalStaff = (staff: StaffUser) => {
    setEditingPortalStaff(staff);
    setPortalFormValues({
      name: staff.name,
      employeeId: (staff as any).employee_id || staff.id,
      department: staff.department || 'Transport Department',
      designation: staff.designation || 'Transport Coordinator',
      email: staff.email || '',
      phone: staff.phone || '',
      accessLevel: staff.access_level || 'view',
      password: staff.password || 'staff123',
      status: staff.status || 'active',
    });
    setPortalModalOpen(true);
  };

  const handleSavePortalStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalFormValues.name.trim()) return;

    const email = portalFormValues.email.trim()
      ? portalFormValues.email.trim().toLowerCase()
      : `${portalFormValues.name.toLowerCase().replace(/\s+/g, '.')}@ritrjpm.ac.in`;

    const staffPayload: StaffUser = {
      id: editingPortalStaff ? editingPortalStaff.id : `stf_${Date.now()}`,
      auth_user_id: editingPortalStaff?.auth_user_id || `auth_stf_${Date.now()}`,
      name: portalFormValues.name.trim(),
      email,
      phone: portalFormValues.phone.trim(),
      department: portalFormValues.department,
      designation: portalFormValues.designation,
      access_level: portalFormValues.accessLevel,
      status: portalFormValues.status,
      password: portalFormValues.password.trim() || 'staff123',
      assigned_route_ids: editingPortalStaff?.assigned_route_ids || routes.map((r) => r.id),
      created_at: editingPortalStaff?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(portalFormValues.employeeId ? { employee_id: portalFormValues.employeeId } : {}),
    } as any;

    if (onSaveStaff) {
      onSaveStaff(staffPayload);
      showToast(
        editingPortalStaff
          ? `Updated portal staff: ${staffPayload.name}`
          : `Added new portal staff: ${staffPayload.name}`
      );
    }
    setPortalModalOpen(false);
  };

  const handleDeletePortalStaff = (staff: StaffUser) => {
    if (window.confirm(`Delete portal staff coordinator "${staff.name}"?`)) {
      if (onDeleteStaff) {
        onDeleteStaff(staff.id);
        showToast(`Deleted portal staff: ${staff.name}`);
      }
    }
  };

  const handleToggleAccess = (staff: StaffUser) => {
    if (!isEditable) return;
    if (onToggleStaffAccess) {
      onToggleStaffAccess(staff.id);
      const nextLevel = staff.access_level === 'edit' ? 'View only' : 'Edit access';
      showToast(`Changed ${staff.name} access to ${nextLevel}`);
    }
  };

  const exportPortalStaffCSV = () => {
    if (!staffList.length) return;
    const headers = [
      'Staff Name',
      'Employee ID',
      'Department',
      'Designation',
      'Email',
      'Phone',
      'Portal Access Level',
      'Status',
    ];
    const rows = staffList.map((s) => [
      `"${s.name}"`,
      `"${(s as any).employee_id || s.id}"`,
      `"${s.department}"`,
      `"${s.designation}"`,
      `"${s.email}"`,
      `"${s.phone}"`,
      `"${s.access_level === 'edit' ? 'Edit access' : 'View only'}"`,
      `"${s.status}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `admin-portal-staff-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // ----------------------------------------------------
  // SECTION 2: STAFF COMMUTERS (TRAVEL LIKE STUDENTS)
  // ----------------------------------------------------
  const [commuterQuery, setCommuterQuery] = useState('');
  const [commuterStatusFilter, setCommuterStatusFilter] = useState('All status');
  const [commuterBusFilter, setCommuterBusFilter] = useState('All buses');
  const [commuterPage, setCommuterPage] = useState(1);
  const [commuterPageSize, setCommuterPageSize] = useState(10);

  const [commuterModalOpen, setCommuterModalOpen] = useState(false);
  const [editingCommuter, setEditingCommuter] = useState<StaffCommuter | null>(null);
  const [commuterFormValues, setCommuterFormValues] = useState({
    name: '',
    employeeId: '',
    department: 'Computer Science & Engg',
    designation: 'Assistant Professor',
    phone: '',
    email: '',
    busId: '',
    stopName: 'Gandhi Statue',
    isOnLeave: false,
    password: 'staff123',
    status: 'active',
  });

  const filteredCommuters = staffCommuters.filter((c) => {
    const busId = c.bus_id || (c as any).assigned_bus_id;
    const bus = buses.find((b) => b.id === busId);
    const busNum = bus ? bus.bus_number || bus.id : '';
    const stopName =
      c.boarding_stop?.stop_name ||
      (c as any).assigned_stop_id ||
      c.boarding_stop_id ||
      '';
    const commuterName = c.name || c.profile?.name || '';
    const empId = c.employee_id || c.id || '';
    const text = `${commuterName} ${empId} ${c.department || ''} ${c.designation || ''} ${
      c.phone || ''
    } ${c.email || ''} ${busNum} ${stopName}`.toLowerCase();

    const matchesQuery = !commuterQuery || text.includes(commuterQuery.toLowerCase());
    const displayStatus = c.is_on_leave ? 'On leave' : 'Active';
    const matchesStatus =
      commuterStatusFilter === 'All status' ||
      displayStatus.toLowerCase() === commuterStatusFilter.toLowerCase();
    const matchesBus =
      commuterBusFilter === 'All buses' || busId === commuterBusFilter;

    return matchesQuery && matchesStatus && matchesBus;
  });

  const commuterPageCount = Math.max(1, Math.ceil(filteredCommuters.length / commuterPageSize));
  const visibleCommuters = filteredCommuters.slice(
    (commuterPage - 1) * commuterPageSize,
    commuterPage * commuterPageSize
  );
  const visibleCommuterStart = filteredCommuters.length
    ? (commuterPage - 1) * commuterPageSize + 1
    : 0;
  const visibleCommuterEnd = Math.min(
    commuterPage * commuterPageSize,
    filteredCommuters.length
  );

  useEffect(() => {
    setCommuterPage(1);
  }, [commuterQuery, commuterStatusFilter, commuterBusFilter, commuterPageSize]);

  const openAddCommuter = () => {
    setEditingCommuter(null);
    setCommuterFormValues({
      name: '',
      employeeId: `EMP-FAC-${Math.floor(10 + Math.random() * 90)}`,
      department: 'Computer Science & Engg',
      designation: 'Assistant Professor',
      phone: '+91 98421 ' + Math.floor(10000 + Math.random() * 90000),
      email: '',
      busId: buses[0]?.id || '',
      stopName: 'Gandhi Statue',
      isOnLeave: false,
      password: 'staff123',
      status: 'active',
    });
    setCommuterModalOpen(true);
  };

  const openEditCommuter = (commuter: StaffCommuter) => {
    setEditingCommuter(commuter);
    const busId = commuter.bus_id || (commuter as any).assigned_bus_id || buses[0]?.id || '';
    const stopName =
      commuter.boarding_stop?.stop_name ||
      (commuter as any).assigned_stop_id ||
      commuter.boarding_stop_id ||
      'Gandhi Statue';

    setCommuterFormValues({
      name: commuter.name || commuter.profile?.name || '',
      employeeId: commuter.employee_id || commuter.id,
      department: commuter.department || 'Academic Department',
      designation: commuter.designation || 'Faculty Member',
      phone: commuter.phone || commuter.profile?.phone || '',
      email: commuter.email || commuter.profile?.email || '',
      busId,
      stopName,
      isOnLeave: !!commuter.is_on_leave,
      password: commuter.password || 'staff123',
      status: commuter.status || 'active',
    });
    setCommuterModalOpen(true);
  };

  const handleSaveCommuter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commuterFormValues.name.trim()) return;

    const email = commuterFormValues.email.trim()
      ? commuterFormValues.email.trim().toLowerCase()
      : `${commuterFormValues.name.toLowerCase().replace(/\s+/g, '.')}@ritrjpm.ac.in`;

    const selectedBus = buses.find((b) => b.id === commuterFormValues.busId);
    const selectedRoute = routes.find((r) => r.id === selectedBus?.route_id);

    const commuterPayload: StaffCommuter = {
      id: editingCommuter ? editingCommuter.id : `sc_${Date.now()}`,
      user_id: editingCommuter?.user_id || `u_sc_${Date.now()}`,
      employee_id: commuterFormValues.employeeId.trim(),
      name: commuterFormValues.name.trim(),
      email,
      phone: commuterFormValues.phone.trim(),
      department: commuterFormValues.department,
      designation: commuterFormValues.designation,
      bus_id: commuterFormValues.busId || null,
      route_id: selectedRoute?.id || null,
      boarding_stop_id: commuterFormValues.stopName,
      status: 'active',
      is_on_leave: commuterFormValues.isOnLeave,
      leave_date: commuterFormValues.isOnLeave
        ? new Date().toISOString().split('T')[0]
        : undefined,
      password: commuterFormValues.password.trim() || 'staff123',
      profile: {
        id: editingCommuter?.user_id || `u_sc_${Date.now()}`,
        auth_user_id: `auth_sc_${Date.now()}`,
        name: commuterFormValues.name.trim(),
        email,
        phone: commuterFormValues.phone.trim(),
        role: 'staff',
        status: 'active',
      },
      bus: selectedBus,
      route: selectedRoute,
    } as any;

    if (onSaveStaffCommuter) {
      onSaveStaffCommuter(commuterPayload);
      showToast(
        editingCommuter
          ? `Updated staff commuter: ${commuterPayload.name}`
          : `Added new staff commuter: ${commuterPayload.name}`
      );
    }
    setCommuterModalOpen(false);
  };

  const handleDeleteCommuter = (commuter: StaffCommuter) => {
    if (window.confirm(`Delete staff commuter "${commuter.name}"?`)) {
      if (onDeleteStaffCommuter) {
        onDeleteStaffCommuter(commuter.id);
        showToast(`Deleted staff commuter: ${commuter.name}`);
      }
    }
  };

  const handleToggleCommuterLeave = (commuter: StaffCommuter) => {
    if (!isEditable) return;
    if (onToggleStaffCommuterLeave) {
      onToggleStaffCommuterLeave(commuter.id);
      const nextStatus = commuter.is_on_leave ? 'Active (Boarding bus)' : 'On Leave';
      showToast(`${commuter.name} transit status changed to: ${nextStatus}`);
    }
  };

  const exportCommutersCSV = () => {
    if (!staffCommuters.length) return;
    const headers = [
      'Staff Commuter Name',
      'Employee ID',
      'Department',
      'Designation',
      'Phone',
      'Email',
      'Assigned Bus',
      'Boarding Stop',
      'Transit Status',
    ];
    const rows = staffCommuters.map((c) => {
      const bus = buses.find((b) => b.id === (c.bus_id || (c as any).assigned_bus_id));
      const stopName =
        c.boarding_stop?.stop_name || (c as any).assigned_stop_id || c.boarding_stop_id || 'Unassigned';
      return [
        `"${c.name}"`,
        `"${c.employee_id}"`,
        `"${c.department}"`,
        `"${c.designation}"`,
        `"${c.phone}"`,
        `"${c.email}"`,
        `"${bus ? bus.bus_number || bus.id : 'Unassigned'}"`,
        `"${stopName}"`,
        `"${c.is_on_leave ? 'On leave' : 'Active'}"`,
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `staff-commuters-roster-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleCommuterCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportStaffCommuterCSV) return;

    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result || '').split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
      const parsed: Partial<StaffCommuter>[] = lines.slice(1).map((line) => {
        const parts = line.split(',').map((v) => v.replace(/^"|"$/g, '').trim());
        const row: any = {};
        headers.forEach((h, i) => {
          row[h] = parts[i] || '';
        });
        const name = row['name'] || row['staff name'] || row['commuter name'] || 'Faculty Member';
        return {
          id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name,
          employee_id:
            row['employee id'] ||
            row['id'] ||
            `EMP-FAC-${Math.floor(1000 + Math.random() * 9000)}`,
          department: row['department'] || row['dept'] || 'Engineering',
          designation: row['designation'] || 'Faculty Member',
          phone: row['phone'] || '+91 98401 11200',
          email: row['email'] || `${name.toLowerCase().replace(/\s+/g, '.')}@ritrjpm.ac.in`,
          boarding_stop_id: row['stop'] || row['boarding stop'] || 'Gandhi Statue',
          is_on_leave: false,
        };
      });
      onImportStaffCommuterCSV(parsed);
      showToast(`Imported ${parsed.length} staff commuters successfully!`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') return 'ST';
    return (
      name
        .replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s+/i, '')
        .trim()
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'ST'
    );
  };

  // Helper stats
  const portalEditCount = staffList.filter((s) => s.access_level === 'edit').length;
  const portalViewCount = staffList.filter((s) => s.access_level === 'view').length;
  const commuterActiveCount = staffCommuters.filter((c) => !c.is_on_leave).length;
  const commuterLeaveCount = staffCommuters.filter((c) => c.is_on_leave).length;

  return (
    <>
      <style>{`
        .staff-hero-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }
        .staff-hero-tab {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: var(--panel);
          border: 2px solid var(--border);
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          color: var(--ink);
          position: relative;
          overflow: hidden;
        }
        .staff-hero-tab:hover {
          border-color: var(--border-strong);
          transform: translateY(-1px);
        }
        .staff-hero-tab.active {
          border-color: #9bbd5c;
          background: color-mix(in srgb, var(--accent-soft) 40%, var(--panel));
          box-shadow: 0 4px 16px rgba(155, 189, 92, 0.12);
        }
        .staff-hero-tab-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .staff-hero-tab.active .staff-hero-tab-icon.portal {
          background: var(--green);
          color: #fff;
        }
        .staff-hero-tab:not(.active) .staff-hero-tab-icon.portal {
          background: var(--green-soft);
          color: var(--green);
        }
        .staff-hero-tab.active .staff-hero-tab-icon.commuter {
          background: var(--blue);
          color: #fff;
        }
        .staff-hero-tab:not(.active) .staff-hero-tab-icon.commuter {
          background: var(--blue-soft);
          color: var(--blue);
        }
        .staff-hero-tab-content {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          min-width: 0;
        }
        .staff-hero-tab-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .staff-hero-tab-header strong {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -0.2px;
        }
        .staff-hero-tab-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 7px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .badge-portal {
          background: var(--green-soft);
          color: var(--green);
        }
        .badge-commuter {
          background: var(--blue-soft);
          color: var(--blue);
        }
        .staff-hero-tab-desc {
          font-size: 11.5px;
          color: var(--muted);
          line-height: 1.4;
        }
        .staff-kpi-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .staff-kpi-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .staff-kpi-card small {
          font-size: 10.5px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .staff-kpi-card strong {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: var(--ink);
        }
        .staff-kpi-card span {
          font-size: 10.5px;
          color: var(--muted);
        }
        .access-badge-interactive {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }
        .access-badge-interactive:hover {
          filter: brightness(0.96);
          transform: translateY(-0.5px);
        }
        .access-edit {
          background: var(--green-soft);
          color: var(--green);
          border-color: color-mix(in srgb, var(--green) 30%, transparent);
        }
        .access-view {
          background: var(--blue-soft);
          color: var(--blue);
          border-color: color-mix(in srgb, var(--blue) 30%, transparent);
        }
        .leave-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 10.5px;
          font-weight: 600;
          border: 1px solid var(--border);
          background: var(--panel);
          color: var(--muted);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .leave-toggle-btn:hover {
          background: var(--hover);
          color: var(--ink);
        }
        .leave-toggle-btn.is-on-leave {
          background: var(--amber-soft);
          color: var(--amber);
          border-color: color-mix(in srgb, var(--amber) 40%, transparent);
        }
        .leave-toggle-btn.is-active {
          background: var(--green-soft);
          color: var(--green);
          border-color: color-mix(in srgb, var(--green) 35%, transparent);
        }
        .role-radio-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .role-radio-card {
          border: 2px solid var(--border);
          border-radius: 9px;
          padding: 10px 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: var(--panel);
        }
        .role-radio-card:hover {
          border-color: var(--border-strong);
        }
        .role-radio-card.selected {
          border-color: #9bbd5c;
          background: var(--accent-soft);
        }
        .role-radio-card strong {
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .role-radio-card p {
          font-size: 10px;
          color: var(--muted);
          margin: 0;
          line-height: 1.4;
        }
        @media (max-width: 860px) {
          .staff-hero-tabs {
            grid-template-columns: 1fr;
          }
          .staff-kpi-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      {/* 1. Header Section */}
      <div className="section-intro">
        <div>
          <span className="eyebrow section-eyebrow">
            <span className="eyebrow-dot" /> STAFF SECTION DIRECTORY
          </span>
          <h1>
            Staff Management<span className="headline-period">.</span>
          </h1>
          <p>
            Separated into two distinct sections: Admin Portal Staff (View & Edit Access) and Staff Commuters (App Travel Like Students).
          </p>
        </div>
        <div className="section-summary">
          <strong>{staffList.length + staffCommuters.length}</strong>
          <span>total staff registered</span>
        </div>
      </div>

      {/* 2. Hero Segmented Switcher (2 Distinct Sections) */}
      <div className="staff-hero-tabs">
        <button
          type="button"
          className={`staff-hero-tab ${activeTab === 'portal_staff' ? 'active' : ''}`}
          onClick={() => handleTabChange('portal_staff')}
        >
          <div className="staff-hero-tab-icon portal">
            <ShieldCheck size={22} />
          </div>
          <div className="staff-hero-tab-content">
            <div className="staff-hero-tab-header">
              <strong>Admin Portal Staff</strong>
              <span className="staff-hero-tab-badge badge-portal">
                {staffList.length} coordinators
              </span>
            </div>
            <span className="staff-hero-tab-desc">
              Staff who access admin web portal with <strong>View</strong> and <strong>Edit</strong> access permissions.
            </span>
          </div>
        </button>

        <button
          type="button"
          className={`staff-hero-tab ${activeTab === 'commuters' ? 'active' : ''}`}
          onClick={() => handleTabChange('commuters')}
        >
          <div className="staff-hero-tab-icon commuter">
            <BusFront size={22} />
          </div>
          <div className="staff-hero-tab-content">
            <div className="staff-hero-tab-header">
              <strong>Staff Commuters</strong>
              <span className="staff-hero-tab-badge badge-commuter">
                {staffCommuters.length} commuters
              </span>
            </div>
            <span className="staff-hero-tab-desc">
              Faculty & staff who access the mobile app for daily transit, bus stops, and leave requests (like students).
            </span>
          </div>
        </button>
      </div>

      {/* ============================================================ */}
      {/* SECTION A: ADMIN PORTAL STAFF (VIEW & EDIT ACCESS)           */}
      {/* ============================================================ */}
      {activeTab === 'portal_staff' && (
        <section aria-label="Admin Portal Staff Management">
          {/* KPI Summary Cards */}
          <div className="staff-kpi-row">
            <div className="staff-kpi-card">
              <small>Total Portal Staff</small>
              <strong>{staffList.length}</strong>
              <span>Authorized portal users</span>
            </div>
            <div className="staff-kpi-card">
              <small>Full Edit Access</small>
              <strong style={{ color: 'var(--green)' }}>{portalEditCount}</strong>
              <span>Can edit routes, fleet & rosters</span>
            </div>
            <div className="staff-kpi-card">
              <small>View Only Access</small>
              <strong style={{ color: 'var(--blue)' }}>{portalViewCount}</strong>
              <span>Read-only inspection rights</span>
            </div>
            <div className="staff-kpi-card">
              <small>Active Accounts</small>
              <strong>{staffList.filter((s) => s.status !== 'inactive').length}</strong>
              <span>Ready for web login</span>
            </div>
          </div>

          {/* Data Toolbar */}
          <div className="data-toolbar">
            <div className="data-toolbar-left">
              <label className="table-search">
                <Search size={15} />
                <input
                  value={portalQuery}
                  onChange={(e) => setPortalQuery(e.target.value)}
                  placeholder="Search portal staff, email, role..."
                />
                <kbd>/</kbd>
              </label>

              <label className="select-wrap">
                <Shield size={14} />
                <select
                  value={portalAccessFilter}
                  onChange={(e) => setPortalAccessFilter(e.target.value)}
                >
                  <option>All permissions</option>
                  <option>Edit access</option>
                  <option>View only</option>
                </select>
                <ChevronDown size={13} />
              </label>

              <label className="select-wrap">
                <Filter size={14} />
                <select
                  value={portalStatusFilter}
                  onChange={(e) => setPortalStatusFilter(e.target.value)}
                >
                  <option>All status</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
                <ChevronDown size={13} />
              </label>
            </div>

            <div className="data-toolbar-right">
              <button className="button button-quiet" onClick={exportPortalStaffCSV}>
                <Download size={15} /> Export Staff
              </button>
              {isEditable && (
                <button className="button button-primary" onClick={openAddPortalStaff}>
                  <Plus size={16} /> Add Portal Staff
                </button>
              )}
            </div>
          </div>

          {/* Table Panel */}
          <div className="panel table-panel">
            <div className="table-meta">
              <span>
                Showing <strong>{visiblePortalStart}–{visiblePortalEnd}</strong> of{' '}
                {filteredPortalStaff.length} portal staff{' '}
                <small>({staffList.length} total)</small>
              </span>
              {(portalQuery ||
                portalAccessFilter !== 'All permissions' ||
                portalStatusFilter !== 'All status') && (
                <button
                  className="text-action"
                  onClick={() => {
                    setPortalQuery('');
                    setPortalAccessFilter('All permissions');
                    setPortalStatusFilter('All status');
                  }}
                >
                  Clear filters <X size={13} />
                </button>
              )}
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Portal Staff Member</th>
                    <th>Staff ID</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Contact Info</th>
                    <th>Portal Access Level</th>
                    <th>Status</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePortalStaff.map((staff) => {
                    const isEdit = staff.access_level === 'edit';
                    const empId = (staff as any).employee_id || staff.id;

                    return (
                      <tr key={staff.id}>
                        <td>
                          <div className="primary-cell">
                            <span className="primary-cell-icon" style={{ background: isEdit ? 'var(--green-soft)' : 'var(--blue-soft)', color: isEdit ? 'var(--green)' : 'var(--blue)' }}>
                              <span>{getInitials(staff.name)}</span>
                            </span>
                            <span>
                              <strong>{staff.name}</strong>
                              <small>{staff.designation || 'Staff Coordinator'}</small>
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="secondary-text font-mono">{empId}</span>
                        </td>

                        <td>{staff.department || 'Administration'}</td>

                        <td>
                          <span style={{ fontSize: '11px', color: 'var(--ink)' }}>
                            {staff.designation || 'Transport Incharge'}
                          </span>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--ink)' }}>{staff.email}</span>
                            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{staff.phone}</span>
                          </div>
                        </td>

                        <td>
                          <button
                            type="button"
                            className={`access-badge-interactive ${isEdit ? 'access-edit' : 'access-view'}`}
                            onClick={() => handleToggleAccess(staff)}
                            title={isEditable ? 'Click to toggle between View and Edit access' : undefined}
                            disabled={!isEditable}
                          >
                            {isEdit ? <ShieldCheck size={13} /> : <Eye size={13} />}
                            <span>{isEdit ? 'Edit access' : 'View only'}</span>
                            {isEditable && (
                              <span style={{ fontSize: '9px', opacity: 0.7, marginLeft: '2px' }}>
                                (click to flip)
                              </span>
                            )}
                          </button>
                        </td>

                        <td>
                          <span
                            className={`status-badge ${
                              staff.status === 'inactive' ? 'status-muted' : 'status-positive'
                            }`}
                          >
                            <i />
                            {staff.status === 'inactive' ? 'Inactive' : 'Active'}
                          </span>
                        </td>

                        <td>
                          <div className="row-actions">
                            {onSimulateLoginAsStaff && currentUser?.role === 'admin' && (
                              <button
                                className="icon-button"
                                onClick={() => {
                                  if (window.confirm(`Simulate login as ${staff.name} (${staff.access_level} access)?`)) {
                                    onSimulateLoginAsStaff(staff);
                                    showToast(`Logged in as ${staff.name}`);
                                  }
                                }}
                                title="Simulate portal login as this staff"
                                style={{ color: 'var(--green)' }}
                              >
                                <UserCheck size={14} />
                              </button>
                            )}

                            {isEditable && (
                              <>
                                <button
                                  className="icon-button row-edit"
                                  onClick={() => openEditPortalStaff(staff)}
                                  title="Edit portal permissions & details"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  className="icon-button row-delete"
                                  onClick={() => handleDeletePortalStaff(staff)}
                                  title="Delete portal staff account"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredPortalStaff.length === 0 && (
                <div className="empty-state">
                  <span>
                    <Search size={19} />
                  </span>
                  <strong>No portal staff members found</strong>
                  <p>
                    {portalQuery
                      ? `Nothing matched “${portalQuery}”.`
                      : 'No portal records match the current filter.'}
                  </p>
                </div>
              )}
            </div>

            {/* Table Footer */}
            <div className="table-footer">
              <span>
                {visiblePortalStart}–{visiblePortalEnd} of {filteredPortalStaff.length} records
              </span>
              <div className="pagination">
                <button
                  aria-label="Previous page"
                  disabled={portalPage <= 1}
                  onClick={() => setPortalPage((v) => Math.max(1, v - 1))}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="page-number active">
                  {portalPage} / {portalPageCount}
                </span>
                <button
                  aria-label="Next page"
                  disabled={portalPage >= portalPageCount}
                  onClick={() => setPortalPage((v) => Math.min(portalPageCount, v + 1))}
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              <label className="rows-select">
                Rows per page{' '}
                <select
                  value={portalPageSize}
                  onChange={(e) => setPortalPageSize(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <ChevronDown size={12} aria-hidden="true" />
              </label>
            </div>
          </div>

          <p className="import-note" style={{ marginTop: '12px' }}>
            <Info size={14} /> Portal staff credentials allow web login at the admin portal. Staff with Edit access can modify fleet, drivers, routes, substitutions, and alerts; View-only staff can inspect operations without making edits.
          </p>
        </section>
      )}

      {/* ============================================================ */}
      {/* SECTION B: STAFF COMMUTERS (APP TRAVEL LIKE STUDENTS)        */}
      {/* ============================================================ */}
      {activeTab === 'commuters' && (
        <section aria-label="Staff Commuter Management">
          {/* KPI Summary Cards */}
          <div className="staff-kpi-row">
            <div className="staff-kpi-card">
              <small>Total Staff Commuters</small>
              <strong>{staffCommuters.length}</strong>
              <span>Faculty bus passengers</span>
            </div>
            <div className="staff-kpi-card">
              <small>Active (Boarding Today)</small>
              <strong style={{ color: 'var(--green)' }}>{commuterActiveCount}</strong>
              <span>Traveling on college buses</span>
            </div>
            <div className="staff-kpi-card">
              <small>On Leave Today</small>
              <strong style={{ color: 'var(--amber)' }}>{commuterLeaveCount}</strong>
              <span>Exempted from bus pickup</span>
            </div>
            <div className="staff-kpi-card">
              <small>Assigned Buses</small>
              <strong style={{ color: 'var(--blue)' }}>
                {
                  new Set(
                    staffCommuters
                      .map((c) => c.bus_id || (c as any).assigned_bus_id)
                      .filter(Boolean)
                  ).size
                }
              </strong>
              <span>Transit routes utilized</span>
            </div>
          </div>

          {/* Data Toolbar */}
          <div className="data-toolbar">
            <div className="data-toolbar-left">
              <label className="table-search">
                <Search size={15} />
                <input
                  value={commuterQuery}
                  onChange={(e) => setCommuterQuery(e.target.value)}
                  placeholder="Search faculty commuter, ID, bus, stop..."
                />
                <kbd>/</kbd>
              </label>

              <label className="select-wrap">
                <CalendarDays size={14} />
                <select
                  value={commuterStatusFilter}
                  onChange={(e) => setCommuterStatusFilter(e.target.value)}
                >
                  <option>All status</option>
                  <option>Active</option>
                  <option>On leave</option>
                </select>
                <ChevronDown size={13} />
              </label>

              <label className="select-wrap">
                <BusFront size={14} />
                <select
                  value={commuterBusFilter}
                  onChange={(e) => setCommuterBusFilter(e.target.value)}
                >
                  <option>All buses</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bus_number || b.id}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} />
              </label>
            </div>

            <div className="data-toolbar-right">
              <input
                type="file"
                id="commuter-csv"
                accept=".csv,text/csv"
                className="hidden-file-input"
                onChange={handleCommuterCSVUpload}
              />
              <label htmlFor="commuter-csv" className="button button-quiet file-label">
                <Upload size={15} /> Import CSV
              </label>
              <button className="button button-quiet" onClick={exportCommutersCSV}>
                <Download size={15} /> Export Roster
              </button>
              {isEditable && (
                <button className="button button-primary" onClick={openAddCommuter}>
                  <Plus size={16} /> Add Staff Commuter
                </button>
              )}
            </div>
          </div>

          {/* Table Panel */}
          <div className="panel table-panel">
            <div className="table-meta">
              <span>
                Showing <strong>{visibleCommuterStart}–{visibleCommuterEnd}</strong> of{' '}
                {filteredCommuters.length} commuters{' '}
                <small>({staffCommuters.length} total)</small>
              </span>
              {(commuterQuery ||
                commuterStatusFilter !== 'All status' ||
                commuterBusFilter !== 'All buses') && (
                <button
                  className="text-action"
                  onClick={() => {
                    setCommuterQuery('');
                    setCommuterStatusFilter('All status');
                    setCommuterBusFilter('All buses');
                  }}
                >
                  Clear filters <X size={13} />
                </button>
              )}
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Staff Commuter</th>
                    <th>Employee ID</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Assigned Bus</th>
                    <th>Boarding Stop</th>
                    <th>Travel Status</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCommuters.map((commuter) => {
                    const busId = commuter.bus_id || (commuter as any).assigned_bus_id;
                    const bus = buses.find((b) => b.id === busId);
                    const busLabel = bus ? bus.bus_number || bus.id : 'Unassigned';
                    const stopName =
                      commuter.boarding_stop?.stop_name ||
                      (commuter as any).assigned_stop_id ||
                      commuter.boarding_stop_id ||
                      'Campus Gate';
                    const isOnLeave = !!commuter.is_on_leave;

                    return (
                      <tr key={commuter.id}>
                        <td>
                          <div className="primary-cell">
                            <span className="primary-cell-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}>
                              <span>{getInitials(commuter.name)}</span>
                            </span>
                            <span>
                              <strong>{commuter.name || commuter.profile?.name}</strong>
                              <small>{commuter.phone || '+91 98401 11200'}</small>
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="secondary-text font-mono">{commuter.employee_id}</span>
                        </td>

                        <td>{commuter.department || 'Academic Affairs'}</td>

                        <td>
                          <span style={{ fontSize: '11px', color: 'var(--ink)' }}>
                            {commuter.designation || 'Faculty Member'}
                          </span>
                        </td>

                        <td>
                          <span className="bus-tag">
                            <BusFront size={12} /> {busLabel}
                          </span>
                        </td>

                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px' }}>
                            <MapPin size={12} style={{ color: 'var(--muted)' }} />
                            {stopName}
                          </span>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              className={`status-badge ${
                                isOnLeave ? 'status-warning' : 'status-positive'
                              }`}
                            >
                              <i />
                              {isOnLeave ? 'On leave' : 'Active'}
                            </span>
                            {isEditable && (
                              <button
                                type="button"
                                className={`leave-toggle-btn ${isOnLeave ? 'is-on-leave' : 'is-active'}`}
                                onClick={() => handleToggleCommuterLeave(commuter)}
                                title={isOnLeave ? 'Mark as active for bus boarding' : 'Mark on leave for today'}
                              >
                                {isOnLeave ? <CalendarDays size={12} /> : <CalendarOff size={12} />}
                                <span>{isOnLeave ? 'Back' : 'Leave'}</span>
                              </button>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="row-actions">
                            {isEditable && (
                              <>
                                <button
                                  className="icon-button row-edit"
                                  onClick={() => openEditCommuter(commuter)}
                                  title="Edit commuter details & bus stop"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  className="icon-button row-delete"
                                  onClick={() => handleDeleteCommuter(commuter)}
                                  title="Delete commuter"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredCommuters.length === 0 && (
                <div className="empty-state">
                  <span>
                    <Search size={19} />
                  </span>
                  <strong>No staff commuters found</strong>
                  <p>
                    {commuterQuery
                      ? `Nothing matched “${commuterQuery}”.`
                      : 'No commuter records match the current filter.'}
                  </p>
                </div>
              )}
            </div>

            {/* Table Footer */}
            <div className="table-footer">
              <span>
                {visibleCommuterStart}–{visibleCommuterEnd} of {filteredCommuters.length} records
              </span>
              <div className="pagination">
                <button
                  aria-label="Previous page"
                  disabled={commuterPage <= 1}
                  onClick={() => setCommuterPage((v) => Math.max(1, v - 1))}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="page-number active">
                  {commuterPage} / {commuterPageCount}
                </span>
                <button
                  aria-label="Next page"
                  disabled={commuterPage >= commuterPageCount}
                  onClick={() => setCommuterPage((v) => Math.min(commuterPageCount, v + 1))}
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              <label className="rows-select">
                Rows per page{' '}
                <select
                  value={commuterPageSize}
                  onChange={(e) => setCommuterPageSize(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <ChevronDown size={12} aria-hidden="true" />
              </label>
            </div>
          </div>

          <p className="import-note" style={{ marginTop: '12px' }}>
            <CircleHelp size={14} /> Staff commuters log into the mobile app to view live bus tracking, ETA at their boarding stop, driver substitutions, and to mark travel leave (just like student commuters).
          </p>
        </section>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: ADD / EDIT ADMIN PORTAL STAFF                      */}
      {/* ============================================================ */}
      {portalModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPortalModalOpen(false);
          }}
        >
          <section className="modal" role="dialog" aria-modal="true">
            <header className="modal-header">
              <div>
                <span className="modal-kicker">
                  <span className="eyebrow-dot" /> ADMIN WEB PORTAL ACCESS
                </span>
                <h2>{editingPortalStaff ? 'Edit Portal Staff' : 'Add Portal Staff'}</h2>
                <p>
                  Configure web portal account and assign View-only or Edit permissions.
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setPortalModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </header>

            <form className="record-form" onSubmit={handleSavePortalStaff}>
              <div className="record-form-grid">
                <label className="span-2">
                  Full name
                  <input
                    type="text"
                    required
                    value={portalFormValues.name}
                    onChange={(e) =>
                      setPortalFormValues({ ...portalFormValues, name: e.target.value })
                    }
                    placeholder="e.g. Mr. N. Govindaraju"
                  />
                </label>

                <label>
                  Staff / Employee ID
                  <input
                    type="text"
                    required
                    value={portalFormValues.employeeId}
                    onChange={(e) =>
                      setPortalFormValues({ ...portalFormValues, employeeId: e.target.value })
                    }
                    placeholder="STF-1021"
                  />
                </label>

                <label>
                  Department
                  <select
                    value={portalFormValues.department}
                    onChange={(e) =>
                      setPortalFormValues({ ...portalFormValues, department: e.target.value })
                    }
                  >
                    <option>Transport Department</option>
                    <option>Administration</option>
                    <option>Mechanical Engineering</option>
                    <option>Computer Science & Engg</option>
                    <option>Information Technology</option>
                    <option>Student Affairs & Hostel</option>
                    <option>Electronics & Comm Engg</option>
                  </select>
                </label>

                <label>
                  Designation
                  <input
                    type="text"
                    required
                    value={portalFormValues.designation}
                    onChange={(e) =>
                      setPortalFormValues({ ...portalFormValues, designation: e.target.value })
                    }
                    placeholder="e.g. Transport Incharge"
                  />
                </label>

                <label>
                  Portal Login Email
                  <input
                    type="email"
                    required
                    value={portalFormValues.email}
                    onChange={(e) =>
                      setPortalFormValues({ ...portalFormValues, email: e.target.value })
                    }
                    placeholder="name@ritrjpm.ac.in"
                  />
                </label>

                <label>
                  Phone number
                  <input
                    type="text"
                    required
                    value={portalFormValues.phone}
                    onChange={(e) =>
                      setPortalFormValues({ ...portalFormValues, phone: e.target.value })
                    }
                    placeholder="+91 96292 84690"
                  />
                </label>

                <label>
                  Account Status
                  <select
                    value={portalFormValues.status}
                    onChange={(e) =>
                      setPortalFormValues({
                        ...portalFormValues,
                        status: e.target.value as any,
                      })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive / Disabled</option>
                  </select>
                </label>

                <label className="span-2">
                  Portal Login Password
                  <input
                    type="text"
                    value={portalFormValues.password}
                    onChange={(e) =>
                      setPortalFormValues({ ...portalFormValues, password: e.target.value })
                    }
                    placeholder="staff123"
                  />
                </label>

                {/* Portal Permission Radio Cards */}
                <div className="span-2" style={{ marginTop: '4px' }}>
                  <label style={{ marginBottom: '6px' }}>Portal Access Level</label>
                  <div className="role-radio-group">
                    <div
                      className={`role-radio-card ${
                        portalFormValues.accessLevel === 'edit' ? 'selected' : ''
                      }`}
                      onClick={() =>
                        setPortalFormValues({ ...portalFormValues, accessLevel: 'edit' })
                      }
                    >
                      <strong>
                        <ShieldCheck size={16} style={{ color: 'var(--green)' }} /> Edit Access
                      </strong>
                      <p>Full control: Can modify buses, drivers, routes, assign substitutes, and dispatch notices.</p>
                    </div>

                    <div
                      className={`role-radio-card ${
                        portalFormValues.accessLevel === 'view' ? 'selected' : ''
                      }`}
                      onClick={() =>
                        setPortalFormValues({ ...portalFormValues, accessLevel: 'view' })
                      }
                    >
                      <strong>
                        <Eye size={16} style={{ color: 'var(--blue)' }} /> View Only
                      </strong>
                      <p>Read-only access: Can view live radar, route timetables, rosters, and time records without edits.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-note">
                <ShieldCheck size={14} /> Credentials synchronize with web administration portal login.
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setPortalModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  {editingPortalStaff ? 'Save Changes' : 'Create Portal Staff'} <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: ADD / EDIT STAFF COMMUTER (APP TRAVEL)              */}
      {/* ============================================================ */}
      {commuterModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCommuterModalOpen(false);
          }}
        >
          <section className="modal" role="dialog" aria-modal="true">
            <header className="modal-header">
              <div>
                <span className="modal-kicker">
                  <span className="eyebrow-dot" /> FACULTY TRANSIT PASS
                </span>
                <h2>{editingCommuter ? 'Edit Staff Commuter' : 'Add Staff Commuter'}</h2>
                <p>Register faculty/staff passenger for bus transit, stop tracking, and mobile app.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setCommuterModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </header>

            <form className="record-form" onSubmit={handleSaveCommuter}>
              <div className="record-form-grid">
                <label className="span-2">
                  Full name
                  <input
                    type="text"
                    required
                    value={commuterFormValues.name}
                    onChange={(e) =>
                      setCommuterFormValues({ ...commuterFormValues, name: e.target.value })
                    }
                    placeholder="e.g. Dr. S. Ganesh"
                  />
                </label>

                <label>
                  Employee ID
                  <input
                    type="text"
                    required
                    value={commuterFormValues.employeeId}
                    onChange={(e) =>
                      setCommuterFormValues({ ...commuterFormValues, employeeId: e.target.value })
                    }
                    placeholder="EMP-FAC-01"
                  />
                </label>

                <label>
                  Department
                  <select
                    value={commuterFormValues.department}
                    onChange={(e) =>
                      setCommuterFormValues({ ...commuterFormValues, department: e.target.value })
                    }
                  >
                    <option>Computer Science & Engg</option>
                    <option>Information Technology</option>
                    <option>Electronics & Comm Engg</option>
                    <option>Mechanical Engineering</option>
                    <option>Civil Engineering</option>
                    <option>Science & Humanities</option>
                    <option>Administrative Office</option>
                  </select>
                </label>

                <label>
                  Designation
                  <input
                    type="text"
                    value={commuterFormValues.designation}
                    onChange={(e) =>
                      setCommuterFormValues({ ...commuterFormValues, designation: e.target.value })
                    }
                    placeholder="e.g. Professor & HOD"
                  />
                </label>

                <label>
                  Phone number
                  <input
                    type="text"
                    required
                    value={commuterFormValues.phone}
                    onChange={(e) =>
                      setCommuterFormValues({ ...commuterFormValues, phone: e.target.value })
                    }
                    placeholder="+91 98421 22334"
                  />
                </label>

                <label className="span-2">
                  Email Address (App Login)
                  <input
                    type="email"
                    value={commuterFormValues.email}
                    onChange={(e) =>
                      setCommuterFormValues({ ...commuterFormValues, email: e.target.value })
                    }
                    placeholder="ganesh.staff@ritrjpm.ac.in"
                  />
                </label>

                <label>
                  Assigned Bus
                  <select
                    value={commuterFormValues.busId}
                    onChange={(e) =>
                      setCommuterFormValues({ ...commuterFormValues, busId: e.target.value })
                    }
                  >
                    <option value="">Unassigned</option>
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bus_number || b.id}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Boarding Stop
                  <input
                    type="text"
                    required
                    value={commuterFormValues.stopName}
                    onChange={(e) =>
                      setCommuterFormValues({ ...commuterFormValues, stopName: e.target.value })
                    }
                    placeholder="Gandhi Statue, Rajapalayam"
                  />
                </label>

                <label>
                  Travel Status
                  <select
                    value={commuterFormValues.isOnLeave ? 'leave' : 'active'}
                    onChange={(e) =>
                      setCommuterFormValues({
                        ...commuterFormValues,
                        isOnLeave: e.target.value === 'leave',
                      })
                    }
                  >
                    <option value="active">Active (Boarding buses)</option>
                    <option value="leave">On Leave Today</option>
                  </select>
                </label>

                <label>
                  Mobile App Password
                  <input
                    type="text"
                    value={commuterFormValues.password}
                    onChange={(e) =>
                      setCommuterFormValues({ ...commuterFormValues, password: e.target.value })
                    }
                    placeholder="staff123"
                  />
                </label>
              </div>

              <div className="modal-note">
                <BusFront size={14} /> Staff commuters use their email / phone and password to track their assigned bus and stops on the mobile app like students.
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setCommuterModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  {editingCommuter ? 'Save Changes' : 'Enroll Staff Commuter'} <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="toast" role="status" aria-live="polite">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
};
