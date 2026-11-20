# Requirements Document

## Introduction

The SwiftChain Frontend notification system currently forwards every WebSocket `notification:new` event directly into the NotificationCenter with no deduplication, no rate limiting, no grouping, no context awareness, and no priority model. The result is a noisy experience: duplicate and near-identical notifications pile up, rapid WebSocket bursts create spam, ten delivery updates appear as ten separate entries instead of one grouped entry, toasts fire even when the user is already viewing the relevant page, and critical alerts are treated identically to routine system pings.

This feature introduces a notification processing pipeline between the WebSocket event source and the NotificationCenter/Toast display layer. The pipeline derives a priority level from the existing notification type union, suppresses exact duplicates, rate-limits bursts via debounce, collapses similar rapid notifications into grouped entries with counts, and suppresses the toast for medium- and low-priority notifications when the user is already on the relevant route while still recording the entry in the NotificationCenter. High-priority alerts always produce a toast regardless of route.

## Glossary

- **Notification System**: The combination of the `useNotifications` hook, the `NotificationContext` provider, the `NotificationCenter` component, and the `ToastService` that together receive, process, store, and display notifications.
- **Notification**: A data record with the fields `id`, `title`, `message`, `type` (`delivery` | `system` | `alert`), `read`, and `createdAt` produced by the backend and delivered in real time over WebSocket.
- **NotificationCenter**: The bell-icon component with an unread badge and a dropdown panel that lists notifications.
- **Toast**: A transient popup notification displayed to the user that auto-dismisses after a configured duration.
- **WebSocket**: The real-time transport (socket.io) that emits `notification:new` events to the frontend.
- **Priority**: A classification derived from a notification's `type` field: `alert` maps to high, `delivery` maps to medium, and `system` maps to low.
- **Grouped Notification Entry**: A single entry in the NotificationCenter that represents two or more collapsed notifications sharing the same `type` and `title`, displayed with a visible count of the collapsed notifications.
- **Route**: The current URL pathname obtained via `usePathname` from `next/navigation`.
- **Unread Badge**: The numeric indicator on the NotificationCenter bell icon showing the count of unread notifications.
- **Batch**: A set of WebSocket notification events accumulated during a debounce quiet period and processed together as one unit.

## Requirements

### Requirement 1: Priority Assignment

**User Story:** As a fleet operator, I want notifications ranked by priority, so that critical alerts are distinguished from routine system pings.

#### Acceptance Criteria

1. THE Notification System SHALL assign a priority level of high, medium, or low to each Notification based on the Notification type field, where the type `alert` maps to high, the type `delivery` maps to medium, and the type `system` maps to low.

### Requirement 2: Duplicate Suppression

**User Story:** As a user, I want identical repeated notifications suppressed, so that duplicate events do not pile up in the NotificationCenter.

#### Acceptance Criteria

1. IF the Notification System receives a Notification whose title, message, and type fields exactly match an existing unread Notification received within the preceding 5 minutes, THEN THE Notification System SHALL suppress the newly received Notification from both the NotificationCenter and the Toast.

### Requirement 3: Burst Rate Limiting

**User Story:** As a user, I want rapid WebSocket bursts handled gracefully, so that bursts do not create notification spam.

#### Acceptance Criteria

1. WHEN the Notification System receives more than 10 Notification events from WebSocket within a 1-second window, THE Notification System SHALL debounce the incoming events by accumulating the events for a 2-second quiet period before processing the accumulated events as a single Batch.

### Requirement 4: Notification Grouping

**User Story:** As a user, I want similar rapid notifications grouped, so that multiple delivery updates appear as a single entry with a count instead of separate entries.

#### Acceptance Criteria

1. WHILE processing a Batch of accumulated Notifications, THE Notification System SHALL collapse two or more Notifications that share the same type and title into a single Grouped Notification Entry.
2. THE Notification System SHALL render each Grouped Notification Entry in the NotificationCenter with a visible count indicating the number of collapsed Notifications.
3. THE Notification System SHALL render each high-priority Notification as a separate entry in the NotificationCenter.

### Requirement 5: Context-Aware Toast Suppression

**User Story:** As a user, I want toast notifications suppressed when I am already viewing the relevant page, so that I am not distracted by toasts for information I can already see.

#### Acceptance Criteria

1. WHEN the Notification System processes a Notification and the current Route is relevant to the Notification, THE Notification System SHALL record the Notification in the NotificationCenter and increment the Unread Badge without displaying a Toast.
2. THE Notification System SHALL consider a Notification relevant to the current Route when the Notification type is `delivery` and the Route path begins with `/deliveries`, or when the Notification type is `system` and the Route path begins with `/admin`.

### Requirement 6: Priority-Based Toast Delivery

**User Story:** As a fleet operator, I want critical alerts to always produce a toast, so that I never miss a high-priority alert regardless of which page I am viewing.

#### Acceptance Criteria

1. WHILE a Notification has high priority, THE Notification System SHALL display a Toast for the Notification regardless of the current Route.

### Requirement 7: Non-Regression Baseline

**User Story:** As a developer, I want the notification processing pipeline to preserve existing behavior for operations not covered by the new rules, so that the change introduces no regressions.

#### Acceptance Criteria

1. WHEN the Notification System receives a Notification that is not suppressed by duplicate detection, is not part of a debounced Batch, and the current Route is not relevant to the Notification, THE Notification System SHALL display a Toast for the Notification and record the Notification in the NotificationCenter.
2. WHEN the Notification System marks all Notifications as read, THE Notification System SHALL call the backend read-all endpoint and update the NotificationContext so that the Unread Badge reflects zero unread Notifications.
