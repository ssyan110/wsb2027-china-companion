// WSB 2027 China Companion — Shared Enums

export const RoleTypes = ['traveler', 'minor', 'representative', 'staff', 'staff_desk', 'admin', 'super_admin'] as const;
export type RoleType = (typeof RoleTypes)[number];

export const AccessStatuses = ['invited', 'activated', 'linked', 'rescued'] as const;
export type AccessStatus = (typeof AccessStatuses)[number];

export const EventTypes = ['bus', 'meal', 'activity', 'ceremony', 'transfer', 'hotel_checkin'] as const;
export type EventType = (typeof EventTypes)[number];

export const ScanResults = ['pass', 'fail', 'wrong_assignment', 'override'] as const;
export type ScanResult = (typeof ScanResults)[number];

export const NotificationTargets = ['all', 'group', 'hotel', 'bus', 'individual'] as const;
export type NotificationTarget = (typeof NotificationTargets)[number];
