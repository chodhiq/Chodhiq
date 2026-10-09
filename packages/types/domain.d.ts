export type UUID = string;
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined';
export type PreferredContact = 'whatsapp' | 'call' | 'email';
export type ReportReason = 'incorrect_information' | 'closed_business' | 'fraud' | 'other';

export interface BookingInput {
  providerId: UUID;
  serviceId?: UUID | null;
  requestedDate: string;
  requestedTime: string;
  notes?: string;
}
export interface BookingRecord {
  id: UUID;
  userId: UUID;
  providerId: UUID;
  serviceId: UUID | null;
  providerName: string;
  serviceName: string;
  requestedDate: string;
  requestedTime: string;
  status: BookingStatus;
  notes: string;
  providerMessage: string;
  createdAt: string;
}
export interface ProfileInput {
  name: string;
  email?: string;
  phone?: string;
  location: string;
  avatarUri?: string | null;
  memberSince?: string | null;
}
export interface QuoteInput {
  providerId: UUID;
  providerName?: string;
  message: string;
  preferredContact?: PreferredContact | string;
}
