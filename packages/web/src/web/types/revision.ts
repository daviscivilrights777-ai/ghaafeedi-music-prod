// Shared revision types (mirrored from revisions-intake.ts for frontend use)

export type RevisionType = "song" | "video" | "both";

export interface RevisionData {
  revisionType: RevisionType;
  shotIndex?: number;
  retakeStart?: number;
  retakeDuration?: number;
  emotionalIntent: string;
  songChanges: {
    lyrics?: string; tempo?: string; key?: string;
    genre?: string; mood?: string; structure?: string;
  };
  videoChanges: {
    sceneChanges?: string; colorGrade?: string;
    pacing?: string; cameraMovement?: string;
    characterConsistency?: string;
  };
  customerNotes: string;
  sophiaDirective?: string;
}

export interface RevisionRequest {
  id: string;
  userId: string;
  orderId: string;
  productionId?: string;
  productSlug: string;
  tier: "starter" | "premium" | "elite";
  revisionRound: number;
  status: "pending" | "approved" | "rejected" | "in_progress" | "complete";
  revisionType: string;
  songPayload?: object;
  videoPayload?: object;
  sophiaDirective?: string;
  adminNotes?: string;
  customerNotes?: string;
  jobId?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}
