/**
 * TradeMate NZ API Types
 */

// =============================================================================
// USER TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  tradeType: TradeType | null;
  businessName: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TradeType = 'electrician' | 'plumber' | 'builder' | 'landscaper' | 'other';

export interface UserCreateInput {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  tradeType?: TradeType;
  businessName?: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

// =============================================================================
// AUTH TYPES
// =============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// =============================================================================
// SWMS TYPES
// =============================================================================

export interface SWMSDocument {
  id: string;
  userId: string;
  templateType: TradeType;
  title: string;
  status: SWMSStatus;
  jobDescription: string | null;
  siteAddress: string | null;
  clientName: string | null;
  expectedDuration: string | null;
  hazards: Hazard[];
  controls: Control[];
  ppeRequired: string[];
  emergencyPlan: string | null;
  isolationProcedure: string | null;
  workerSignature: string | null;
  workerSignedAt: Date | null;
  supervisorSignature: string | null;
  supervisorSignedAt: Date | null;
  pdfUrl: string | null;
  isSynced: boolean;
  localId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SWMSStatus = 'draft' | 'signed' | 'archived';

export interface Hazard {
  id: string;
  category: string;
  description: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'extreme';
  aiGenerated: boolean;
}

export interface Control {
  hazardId: string;
  controlType: ControlType;
  description: string;
  ppeRequired?: string[];
  aiGenerated: boolean;
}

export type ControlType = 'elimination' | 'substitution' | 'engineering' | 'administrative' | 'ppe';

export interface SWMSGenerateInput {
  tradeType: TradeType;
  jobDescription: string;
  siteAddress?: string;
  clientName?: string;
  expectedDuration?: string;
  useAI?: boolean;
}

export interface SWMSGenerateResponse {
  swmsId: string;
  document: Partial<SWMSDocument>;
  suggestedHazards: Hazard[];
  suggestedControls: Control[];
  template: SWMSTemplate;
}

// =============================================================================
// TEMPLATE TYPES
// =============================================================================

export interface SWMSTemplate {
  tradeType: TradeType;
  version: string;
  nzRegulations: string[];
  sections: TemplateSection[];
  aiPrompts: {
    hazardSuggestions: string;
    controlSuggestions: string;
  };
}

export interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  aiAssisted?: boolean;
  fields: TemplateField[];
}

export interface TemplateField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checklist' | 'date' | 'signature' | 'checkbox' | 'number' | 'calculated' | 'steps';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  defaultValue?: string;
  min?: number;
  max?: number;
}

// =============================================================================
// RISK ASSESSMENT TYPES
// =============================================================================

export interface RiskAssessment {
  id: string;
  userId: string;
  swmsId: string | null;
  title: string;
  siteAddress: string | null;
  assessments: RiskItem[];
  overallRiskLevel: 'low' | 'medium' | 'high' | 'extreme' | null;
  reviewDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RiskItem {
  hazard: string;
  potentialHarm: string;
  likelihood: number; // 1-5
  consequence: number; // 1-5
  riskRating: number; // likelihood * consequence
  controls: string[];
  residualLikelihood?: number;
  residualConsequence?: number;
  residualRisk?: number;
  responsiblePerson?: string;
  completionDate?: Date;
}

// =============================================================================
// CERTIFICATION TYPES
// =============================================================================

export interface Certification {
  id: string;
  userId: string;
  type: CertificationType;
  name: string;
  certNumber: string | null;
  issuingBody: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  documentUrl: string | null;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CertificationType = 'electrical' | 'gas' | 'plumbing' | 'lpg' | 'first_aid' | 'site_safe' | 'other';

export interface CertificationCreateInput {
  type: CertificationType;
  name: string;
  certNumber?: string;
  issuingBody?: string;
  issueDate?: string;
  expiryDate?: string;
}

export interface CertificationUpdateInput {
  type?: CertificationType;
  name?: string;
  certNumber?: string;
  issuingBody?: string;
  issueDate?: string;
  expiryDate?: string;
}

// =============================================================================
// INVOICE TYPES
// =============================================================================

export interface Invoice {
  id: string;
  userId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  swmsId: string | null;
  jobDescription: string | null;
  lineItems: InvoiceLineItem[];
  subtotal: number; // in cents
  gstAmount: number; // in cents
  total: number; // in cents
  status: InvoiceStatus;
  dueDate: string | null; // ISO date string
  paidAt: Date | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  amount: number; // in cents
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface InvoiceCreateInput {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  swmsId?: string;
  jobDescription?: string;
  lineItems: { description: string; amount: number }[]; // amount in cents
  includeGst?: boolean; // default true
  dueDate?: string; // ISO date string
  bankAccountName?: string;
  bankAccountNumber?: string;
  notes?: string;
}

export interface InvoiceUpdateInput {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  swmsId?: string;
  jobDescription?: string;
  lineItems?: { description: string; amount: number }[];
  includeGst?: boolean;
  dueDate?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  notes?: string;
}

// =============================================================================
// STATS TYPES
// =============================================================================

export interface DashboardStats {
  swms: {
    total: number;
    thisMonth: number;
    signed: number;
    draft: number;
  };
  invoices: {
    total: number;
    unpaid: number;
    unpaidAmount: number; // in cents
    thisMonth: number;
  };
  certifications: {
    total: number;
    expiringSoon: number;
    expired: number;
  };
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =============================================================================
// REQUEST EXTENSIONS
// =============================================================================

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
