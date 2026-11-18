export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'INVESTIGATOR' | 'VIEWER';
  badgeNumber?: string;
  organization?: string;
}

export interface CaseMember {
  id: string;
  case_id: string;
  user_id: string;
  role_in_case: string;
  assigned_at: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'INVESTIGATOR' | 'VIEWER';
  badge_number?: string;
  organization?: string;
}

export interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string;
  incident_type: 'PHISHING' | 'MALWARE' | 'DATA_BREACH' | 'INSIDER_THREAT' | 'RANSOMWARE' | 'INCIDENT_RESPONSE' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | 'CLOSED';
  lead_investigator_id?: string;
  lead_investigator_name?: string;
  lead_investigator_email?: string;
  closure_summary?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  evidence_count?: number;
  findings_count?: number;
  members?: CaseMember[];
  stats?: {
    evidenceCount: number;
    findingsCount: number;
    timelineCount: number;
    notesCount: number;
  };
}

export interface EvidenceItem {
  id: string;
  case_id: string;
  evidence_number: string;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  mime_type: string;
  sha256: string;
  md5: string;
  sha1: string;
  uploaded_by_id: string;
  uploader_name?: string;
  uploader_email?: string;
  description: string;
  source_device?: string;
  custody_location: string;
  status: 'SECURED' | 'CHECKED_OUT' | 'ANALYZED' | 'DISPOSED';
  created_at: string;
  updated_at: string;
  case_number?: string;
  case_title?: string;
}

export interface CustodyEvent {
  id: string;
  evidence_id: string;
  sequence_number: number;
  action:
    | 'EVIDENCE_COLLECTED'
    | 'EVIDENCE_SECURED'
    | 'CHECKED_OUT'
    | 'CHECKED_IN'
    | 'HASH_VERIFIED'
    | 'TRANSFERRED'
    | 'ANALYZED'
    | 'EXPORTED'
    | 'DISPOSED';
  actor_id: string;
  timestamp: string;
  details: string;
  previous_event_hash: string;
  current_event_hash: string;
  actor_name?: string;
  actor_email?: string;
}

export interface ChainVerificationReport {
  status: 'CHAIN_INTEGRITY_VERIFIED' | 'CHAIN_INTEGRITY_COMPROMISED';
  evidenceId: string;
  totalBlocks: number;
  genesisHash: string;
  headHash: string;
  verifiedAt: string;
  brokenBlockIndex?: number;
  expectedHash?: string;
  recordedHash?: string;
  violationReason?: string;
}

export interface IntegrityCheckRecord {
  id: string;
  evidence_id: string;
  verified_by_id: string;
  expected_hash: string;
  calculated_hash: string;
  result: 'INTEGRITY_VERIFIED' | 'INTEGRITY_COMPROMISED';
  verified_at: string;
  notes?: string;
  verifier_name?: string;
  verifier_email?: string;
}

export interface TimelineEvent {
  id: string;
  case_id: string;
  event_time: string;
  title: string;
  description: string;
  category: 'ATTACK_VECTOR' | 'EXFILTRATION' | 'DETECTION' | 'CONTAINMENT' | 'ANALYSIS' | 'REMEDIATION';
  evidence_id?: string;
  created_by_id: string;
  created_at: string;
  creator_name?: string;
  creator_email?: string;
  evidence_number?: string;
  evidence_filename?: string;
}

export interface Finding {
  id: string;
  case_id: string;
  title: string;
  description: string;
  severity: 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DRAFT' | 'CONFIRMED' | 'REFUTED' | 'RESOLVED';
  remediation?: string;
  evidence_id?: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_email?: string;
  evidence_number?: string;
  evidence_filename?: string;
}

export interface CaseNote {
  id: string;
  case_id: string;
  author_id: string;
  content: string;
  is_pinned: number;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_email?: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string;
  ip_address: string;
  user_agent: string;
  status: 'SUCCESS' | 'FAILURE' | 'DENIED';
  details?: string;
  created_at: string;
}

export interface DashboardMetrics {
  totalCases: number;
  activeCases: number;
  closedCases: number;
  totalEvidence: number;
  criticalFindings: number;
  verifiedChecks: number;
  compromisedChecks: number;
}
