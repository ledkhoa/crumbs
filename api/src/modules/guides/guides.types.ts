import type { Guide } from '../../core/db/schemas/guides.table';
import type { Restaurant } from '../../core/db/schemas/restaurants.table';

export interface CreateGuideInput {
  name: string;
  description?: string;
  emojiIcon?: string;
  coverImageUrl?: string;
  isPublic?: boolean;
}

export interface UpdateGuideInput {
  name?: string;
  description?: string | null;
  emojiIcon?: string;
  coverImageUrl?: string | null;
  isPublic?: boolean;
}

export interface GuideSummaryPayload {
  id: string;
  name: string;
  description?: string | null;
  emojiIcon?: string | null;
  coverImageUrl?: string | null;
  isPublic: boolean;
  crumbCount: number;
  coverThumbnails: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GuideCrumbItem {
  crumbId: string;
  orderIndex: number;
  status: string;
  userNotes?: string | null;
  userHeroDishOverride?: string | null;
  effectiveHeroDish?: string | null;
  restaurant: Restaurant;
  attribution?: {
    creatorUsername?: string | null;
    vibeAnchor?: string | null;
    courseCategory?: string | null;
    walkInTips?: string | null;
    vibeTags: string[];
    sourcePostUrl?: string | null;
  };
}

export interface GuideDetailPayload extends Guide {
  crumbCount: number;
  crumbs: GuideCrumbItem[];
}
