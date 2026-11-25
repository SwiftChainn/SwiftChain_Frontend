export type DisputeReason =
  | 'damaged_items'
  | 'non_delivery'
  | 'incorrect_items'
  | 'other';

export type DisputeCaseStatus = 'open' | 'under_review' | 'resolved' | 'rejected';

export interface FileDisputeParams {
  deliveryId: string;
  reason: DisputeReason;
  description: string;
}

export interface DisputeCaseResponse {
  caseId: string;
  deliveryId: string;
  status: DisputeCaseStatus;
  escrowFrozen: boolean;
  createdAt: string;
}

export interface EvidenceUploadResponse {
  fileId: string;
  filename: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
}

export interface FreezeResponse {
  deliveryId: string;
  frozen: boolean;
  frozenAt: string;
}

export interface DisputeStatusResponse {
  caseId: string;
  status: DisputeCaseStatus;
  escrowFrozen: boolean;
  evidenceCount: number;
  updatedAt: string;
}

export type DisputeTimelineEvent =
  | {
      eventId: string;
      type: 'evidence_uploaded';
      timestamp: string;
      filename?: string;
    }
  | {
      eventId: string;
      type: 'verdict';
      timestamp: string;
      status: DisputeCaseStatus;
      notes?: string;
    };

export interface DisputeTimelineResponse {
  caseId: string;
  events: DisputeTimelineEvent[];
}

export interface ResolutionResponse {
  caseId: string;
  status: DisputeCaseStatus;
  resolutionNotes: string | null;
  resolvedAt: string;
}
