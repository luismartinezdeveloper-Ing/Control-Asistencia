export type ScrumRole = 'PRODUCT_OWNER' | 'SCRUM_MASTER' | 'DEVELOPMENT_TEAM' | 'STAKEHOLDER';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: ScrumRole;
  roleTitle: string;
  avatar?: string;
  department?: string;
  site?: string;
  linkedEmployeeName?: string; // Links Team Member directly to their attendance biometric records
  passwordHash?: string; // Securely hashed using bcryptjs (no plain text passwords)
  jwtToken?: string; // Signed JWT token for session validation
}

export interface ScrumSprint {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  targetAttendanceRate: number;
  status: 'ACTIVE' | 'PLANNED' | 'COMPLETED';
}

export interface ScrumAttendanceTask {
  id: string;
  recordId: string;
  employeeName: string;
  date: string;
  type: 'INASISTENCIA_SIN_JUSTIFICAR' | 'REVISION_JUSTIFICATIVO' | 'DEFICIT_HORARIO' | 'MARCACION_IMPERFECTA';
  status: 'BACKLOG' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  assignedTo?: string; // Scrum Master username or role
  justificationNotes?: string;
  createdDate: string;
}
