# MedAccess Sudan

> **DEVELOPMENT/DEMO ONLY:** Healthcare providers who register with an existing approved city are currently auto-approved when `MEDACCESS_DEMO_AUTO_VERIFY_DOCTORS=true`, enabling end-to-end scheduling and booking tests. Providers proposing a new city remain pending. Production provider verification requires MedAccess administrator approval and identity/professional verification; set this flag to `false` before production deployment.

## Master Development Instructions for Codex

This document is the authoritative development specification for the **MedAccess Sudan** graduation project.

Read this document completely before generating, modifying, or deleting any project files.

Do not invent functionality outside this specification unless explicitly requested.

The first development phase is a **responsive web application**. The architecture must be designed so that a mobile application can later consume the same Laravel API without requiring the backend to be rebuilt.

---

# 1. Project Overview

**MedAccess Sudan** is an integrated digital healthcare platform designed to connect patients with healthcare providers and improve access to healthcare services.

The system will initially be developed as a responsive web application.

The system must support three primary user roles:

1. **Patient / Client**
2. **Doctor / Healthcare Provider**
3. **Administrator**

Each role must have its own interface, permissions, navigation, and protected functionality.

The main patient workflow is:

**Register/Login → Search Doctor → Filter Results → View Doctor → Select Appointment → Confirm Booking → Appointment Created**

The system must also support home visits, laboratory reservations, appointment management, notifications, medical history, healthcare-provider administration, and future expansion.

---

# 2. Technology Stack

Use the following stack unless explicitly instructed otherwise.

## Frontend

**React**

Use React for the complete website frontend.

Use:

* Functional components
* React Hooks
* React Router
* Reusable components
* Clear feature-based project organization
* API-driven data rather than hardcoded production data

Do not tightly couple React components to backend implementation details.

## Styling

**Tailwind CSS**

Use Tailwind CSS for styling and responsive layouts.

Do not introduce Bootstrap, Material UI, Chakra UI, or another major CSS framework unless explicitly requested.

The visual design must remain consistent with the approved Figma prototype.

## Backend

**Laravel**

Laravel will provide:

* REST API
* Authentication
* Authorization
* Validation
* Business logic
* Database interaction
* Notifications
* Role management
* Appointment management
* Provider management
* Home visit management
* Laboratory reservation management
* Medical-history operations

Keep controllers relatively thin.

Business rules should be placed in appropriate service/action classes when complexity grows.

Use Laravel conventions wherever practical.

## Database

**MySQL**

Use MySQL as the main relational database.

Use:

* Migrations
* Foreign keys
* Indexes
* Database constraints
* Appropriate data types
* Seeders
* Factories for development/testing
* Transactions where multiple related records must be created or modified together

Never depend only on frontend validation for database integrity.

## API

The React frontend must communicate with Laravel through a REST API.

The API must later be reusable by a mobile application.

Therefore, do not design important backend functionality that only works through the web frontend.

---

# 3. Future Mobile Application

The first implementation is the website.

However, MedAccess Sudan is intended to later become a mobile application.

The Laravel backend and MySQL database should remain shared infrastructure.

The future architecture should therefore resemble:

**React Website**
↓
**Laravel REST API**
↓
**Laravel Business Logic**
↓
**MySQL Database**

Later:

**Mobile Application**
↓
**Same Laravel REST API**
↓
**Same Laravel Business Logic**
↓
**Same MySQL Database**

Do not duplicate business logic between web and future mobile clients.

---

# 4. Visual Design System

The implementation must closely follow the approved MedAccess Sudan Figma prototype.

The visual identity is based on **teal + neutral grays**, with limited accent colors for individual healthcare services.

---

# 5. Primary Color Palette

## Primary Teal

**#0D9488**

Role:

Primary MedAccess Sudan brand color.

Use for:

* Primary buttons
* Main links
* Active navigation states
* Selected states
* Primary icons
* Focus indicators where appropriate
* Important borders
* Interactive controls

This should remain the dominant interactive color throughout the platform.

---

## Success Green

**#10B981**

Use for:

* Successful actions
* Appointment confirmation
* Available status
* “Available Today”
* Success checkmarks
* Positive status indicators

Do not use success green as the primary brand color.

---

## Primary Light Teal Surface

**#F0FDFA**

Use for:

* Light teal icon backgrounds
* Selected or highlighted surfaces
* Subtle brand backgrounds
* Informational cards where appropriate

---

## Success Surface

**#ECFDF5**

Use for:

* Successful appointment confirmation backgrounds
* Positive status surfaces
* Success alerts

---

# 6. Neutral Palette

## Primary Text

**#111827**

Use for:

* Main headings
* Card titles
* Important body text
* Primary labels

This is the default strong text color.

## Secondary Text

**#4B5563**

Use for:

* Descriptions
* Supporting information
* Metadata
* Secondary labels

## Muted Text

**#9CA3AF**

Use for:

* Placeholders
* Helper text
* Disabled text
* Low-priority metadata

Do not use this color for important information where accessibility would suffer.

## Borders

**#E5E7EB**

Use for:

* Input borders
* Card borders
* Dividers
* Neutral strokes

## Disabled Surface

**#F3F4F6**

Use for:

* Disabled controls
* Unavailable appointment slots
* Inactive surfaces

## Main Background

**#F9FAFB**

Use for:

* Screen/page backgrounds
* Large neutral sections

## White

**#FFFFFF**

Use for:

* Cards
* Modal surfaces
* Primary button text
* Clean content surfaces

---

# 7. Service Accent Colors

Accent colors should only provide visual differentiation between service categories.

They must not replace the primary teal for core actions.

## Home Visit

Background:

**#FEF3C7**

Icon/accent:

**#D97706**

## Laboratory Tests

Background:

**#E0F2FE**

Icon/accent:

**#0284C7**

## My Appointments

Background:

**#F3E8FF**

Icon/accent:

**#7C3AED**

## Find a Doctor

Use the primary teal palette:

**#F0FDFA**

with:

**#0D9488**

---

# 8. General UI Principles

The website must feel:

* Professional
* Trustworthy
* Calm
* Clean
* Modern
* Accessible
* Healthcare-oriented
* Easy to understand
* Suitable for users with different digital literacy levels

Avoid overly futuristic interfaces.

Avoid excessive gradients.

Avoid unnecessary animation.

Avoid decorative elements that reduce usability.

Maintain generous whitespace and strong hierarchy.

---

# 9. Responsive Design

The web application must work effectively across:

Desktop

Tablet

Mobile browser

Use Tailwind responsive breakpoints appropriately.

Desktop interfaces may use sidebars where appropriate.

Mobile interfaces may use compact navigation or bottom navigation when suitable.

Do not simply shrink desktop layouts.

Components should adapt appropriately to the available screen size.

---

# 10. Reusable Components

Build reusable frontend components rather than recreating visual elements repeatedly.

Examples include:

PrimaryButton

SecondaryButton

InputField

SelectField

SearchField

ServiceCard

DoctorCard

AppointmentCard

StatusBadge

TimeSlot

DateSelector

ProfileHeader

PageHeader

Sidebar

Navbar

BottomNavigation

Modal

ConfirmationDialog

LoadingState

EmptyState

ErrorState

Pagination

NotificationItem

Use component variants for different states where appropriate.

---

# 10A. Bilingual Interface and Internationalization

All patient, doctor, and administrator interfaces must support English and
Arabic from the time each page or shared component is created.

Use structured English and Arabic translation resources through i18next and
react-i18next. Do not hardcode user-facing interface strings throughout React
components. Persist the selected language while users navigate without forcing
a full application reload.

English uses `lang="en"` and `dir="ltr"`. Arabic uses `lang="ar"` and
`dir="rtl"`. Update these attributes on the document root when the language
changes. Prefer logical start/end positioning so layouts, forms, navigation,
tables, cards, modals, and directional controls work naturally in both modes.

Store stable untranslated identifiers for backend statuses and categories.
Translate those values only when they are displayed. Every completed page must
be reviewed in English, Arabic, LTR, RTL, and responsive layouts before it can
be approved.

---

# 11. Application Roles

The system must support:

## Patient

A person seeking healthcare services.

## Doctor

A verified healthcare provider providing services through MedAccess Sudan.

## Administrator

An authorized system administrator responsible for managing provider records and administrative system functions.

Role permissions must be enforced by the Laravel backend.

Do not rely only on hiding frontend buttons.

---

# 12. Authentication

Implement authentication securely.

Users must be able to:

Register

Log in

Log out

Access only authenticated areas appropriate to their role.

Use Laravel-supported secure authentication.

Passwords must never be stored in plain text.

Use secure password hashing.

Protect API routes.

Validate authentication server-side.

---

# 13. Patient Registration

Patient registration should collect only information required for account creation and system operation.

At minimum, plan for fields such as:

First name

Last name

Email

Phone number

Password

Password confirmation

Additional profile information can be introduced only when required.

Validate email and phone uniqueness where appropriate.

---

# 14. Doctor Accounts

Doctors require their own authenticated interface.

A doctor account should be connected to a healthcare-provider profile.

Doctor registration must not automatically make an account publicly trusted or verified.

The system should support a verification state such as:

Pending

Verified

Rejected

Suspended

Only appropriately verified providers should appear as available healthcare providers to patients.

---

# 15. Patient Interface

The patient dashboard should visually follow the Figma prototype.

The main patient home screen should provide access to:

**Find a Doctor**

**Home Visit**

**Laboratory Tests**

**My Appointments**

Notifications

Patient profile/account

Medical history where implemented

---

# 16. Patient – Find a Doctor

Patients must be able to search healthcare providers.

Filters must include:

**Specialization**

**Location**

**Availability**

Search results should come from the Laravel API and MySQL database.

Do not hardcode final provider results in React.

---

# 17. Doctor Search Results

Each doctor result should display relevant information such as:

Doctor name

Specialization

Location

Availability

Professional image/avatar where available

Clear View Profile action

Do not introduce unsupported functions such as public star ratings unless the requirements are officially expanded.

---

# 18. Doctor Public Profile

The patient-facing doctor profile should include appropriate provider information such as:

Name

Professional image/avatar

Specialization

Location

Relevant professional description

Availability

Appointment booking action

Do not expose sensitive doctor account information.

---

# 19. Doctor Availability

Doctors must be able to manage appointment availability through the doctor interface.

The system should support dates and time slots.

Availability must distinguish between:

Available

Booked

Unavailable

The backend must be the authoritative source of availability.

Do not rely only on frontend state.

---

# 20. Appointment Booking

Patients must be able to:

Select a doctor

View available dates

Select an available date

Select an available time

Review booking details

Confirm booking

Receive booking confirmation

An appointment should contain appropriate relationships such as:

Patient

Doctor/provider

Date

Time

Status

Creation timestamp

Relevant service information

Prevent double booking.

The backend must validate the selected slot again when the patient confirms the booking.

Never trust the assumption that a previously displayed slot remains available.

---

# 21. Appointment Status

Plan appointment statuses such as:

Pending

Confirmed

Completed

Cancelled

Rejected where needed

The exact status workflow should remain centralized in backend logic.

Do not scatter status strings throughout React components.

Use constants/enums where appropriate.

---

# 22. Patient Appointment Management

Patients must be able to view their appointments.

Provide clear separation where appropriate between:

Upcoming

Completed

Cancelled

Patients should be able to open an appointment to view its details.

Cancellation or modification should follow approved business rules.

Do not allow unauthorized users to access another patient's appointments.

---

# 23. Doctor Dashboard

Doctors need a separate dashboard optimized for provider workflows.

The doctor dashboard should provide access to:

Today's appointments

Upcoming appointments

Availability management

Home visit requests

Relevant patient information

Medical records where authorized

Notifications

Doctor profile

The doctor dashboard does not need to visually match the patient's dashboard exactly, but it must use the same MedAccess Sudan design system.

---

# 24. Doctor Appointment Management

Doctors must be able to view appointments assigned to them.

Appointment information should include appropriate details such as:

Patient name

Date

Time

Appointment status

Service type

Relevant appointment information

Doctors must not be able to access appointments belonging to other doctors unless explicitly permitted through an administrative role.

---

# 25. Doctor Availability Management

Doctors must be able to create and manage their available appointment times.

The system should support operations such as:

Add available slot

Remove or disable available slot

View booked slot

Block unavailable periods

Prevent editing that would improperly invalidate an existing appointment.

Availability rules must be validated server-side.

---

# 26. Home Visit Service

Patients must be able to request or schedule healthcare home visits.

The patient interface should provide a dedicated Home Visit workflow.

The request should capture the information required to arrange the service.

Plan for information such as:

Patient

Requested provider where applicable

Preferred date

Preferred time

General location/address information

Request status

Relevant notes

Because address information is sensitive, handle it carefully and do not expose it unnecessarily.

Doctors should be able to see home-visit requests relevant to them.

---

# 27. Laboratory Tests

Patients must be able to reserve laboratory tests.

The system should support:

Viewing available laboratory services

Selecting a test/service

Choosing relevant reservation details

Submitting the reservation

Viewing reservation status

The initial system does not need to implement complex laboratory-result processing unless later added to the official requirements.

---

# 28. Patient Medical History

The system must support patient medical-history information.

Access must be tightly controlled.

A patient should be able to access appropriate records belonging to them.

Healthcare providers should only access medical information when authorized and relevant to their role.

Administrators should not automatically receive unlimited access to sensitive medical information simply because they are administrators.

Authorization must be deliberate.

---

# 29. Notifications

Support relevant notifications for actions such as:

Appointment booking confirmation

Appointment changes

Appointment cancellation

Upcoming appointment reminders

Home visit updates

Laboratory reservation updates

Notifications should be stored or delivered through a structured notification system rather than hardcoded UI messages.

The system architecture should later allow push notifications when the mobile app is introduced.

---

# 30. Doctor Profile Management

Doctors should be able to manage permitted parts of their professional profile.

Potential editable information includes:

Profile image

Professional bio

Location

Professional information

Availability

Some sensitive or verification-related information should require administrator control.

A doctor must not be able to mark themselves as verified.

---

# 31. Administrator Interface

Create a protected administrator dashboard.

The administrator interface should support healthcare-provider management.

Administrator functionality should include appropriate operations such as:

View provider applications

Review provider information

Verify provider

Reject provider

Update relevant provider records

Suspend or disable provider where appropriate

View basic system-management information

Keep administrator functionality separate from patient and doctor navigation.

---

# 32. Authorization Rules

Laravel must enforce authorization.

Examples:

A patient cannot access another patient's medical history.

A patient cannot access the doctor dashboard.

A doctor cannot access another doctor's private appointments.

A doctor cannot verify their own account.

An unauthenticated user cannot access protected dashboards.

An administrator cannot bypass sensitive healthcare-data restrictions unless specifically authorized.

Implement policies, gates, middleware, or equivalent Laravel mechanisms.

---

# 33. API Design

Use clear REST-style endpoints.

Organize API endpoints around resources rather than frontend pages.

Possible resource categories include:

auth

patients

doctors/providers

specializations

locations

availability

appointments

home-visits

laboratory-services

laboratory-reservations

medical-history

notifications

admin/providers

Use appropriate HTTP methods:

GET

POST

PUT/PATCH

DELETE

Return consistent JSON responses.

---

# 34. API Response Standards

Maintain consistent API structures.

Successful responses should clearly distinguish:

Data

Message where appropriate

Metadata when needed

Validation errors should return predictable field-level errors.

Use appropriate HTTP status codes.

Do not return raw Laravel exceptions to the frontend in production.

---

# 35. Database Design

Use a relational structure.

Likely core entities include:

users

patient_profiles

doctor_profiles

specializations

locations

doctor_availability

appointments

home_visit_requests

laboratory_services

laboratory_reservations

medical_history_records

notifications

provider_verification information where required

Do not create all tables blindly.

First design and review the ERD.

Use migrations after the data relationships are agreed upon.

---

# 36. Users and Roles

Avoid duplicating authentication systems unnecessarily.

Prefer a central `users` identity model with role-based related profiles unless there is a strong technical reason otherwise.

Example conceptual relationship:

User
→ Patient Profile

or

User
→ Doctor Profile

or

User
→ Administrator role

Keep authentication identity separate from role-specific profile information.

---

# 37. Database Integrity

Use:

Primary keys

Foreign keys

Unique constraints

Indexes

Required/null constraints

Appropriate cascading behavior

Do not blindly cascade-delete important healthcare records.

Historical records should generally be preserved where required.

---

# 38. Appointment Concurrency

Double booking must be prevented at the database/backend level.

The frontend showing a slot as available is not sufficient.

When booking:

1. Recheck availability.
2. Lock or otherwise safely validate the slot.
3. Create the appointment transactionally.
4. Mark/reserve the slot appropriately.
5. Return confirmation.

Design the database to support this safely.

---

# 39. Validation

All important inputs must be validated server-side.

Frontend validation should also be provided for usability.

Validate:

Required fields

Email format

Phone format as appropriate

Password requirements

Valid IDs

Appointment dates

Appointment availability

Doctor ownership

Role authorization

Home-visit details

Laboratory reservation details

Never trust IDs sent by the browser.

---

# 40. Security

Treat security as a core requirement.

Implement:

Password hashing

Secure authentication

Role-based authorization

Server-side validation

Protection against SQL injection through Laravel ORM/query bindings

Protection against mass-assignment vulnerabilities

Proper CORS configuration

CSRF protection where applicable

Secure cookies/tokens depending on authentication architecture

HTTPS in deployment

Safe error messages

Environment variables for secrets

Never commit `.env` credentials.

---

# 41. Privacy

Healthcare and medical information is sensitive.

Minimize unnecessary data exposure.

API resources should return only fields required by the current interface.

Do not send complete database records automatically.

Do not log passwords, authentication tokens, or sensitive medical information unnecessarily.

---

# 42. Error Handling

Provide friendly user-facing errors.

Examples:

Unable to log in

Invalid credentials

No doctors found

Appointment slot is no longer available

Unable to complete booking

Network problem

Unauthorized action

Validation problem

Do not expose stack traces or database details to end users.

---

# 43. Loading States

React interfaces must show appropriate loading feedback during API requests.

Avoid blank or frozen interfaces.

Use loading states for:

Authentication

Doctor search

Doctor profile

Availability

Appointments

Booking submission

Dashboard data

---

# 44. Empty States

Create meaningful empty states.

Examples:

No doctors match these filters.

No upcoming appointments.

No notifications yet.

No available appointment times.

No laboratory reservations.

Empty states should guide the user toward an appropriate next action where possible.

---

# 45. Success States

Use the approved success palette.

Primary success:

**#10B981**

Light success surface:

**#ECFDF5**

Important successful actions such as appointment booking should provide clear feedback.

---

# 46. Accessibility

Use semantic HTML.

Ensure:

Readable text sizes

Accessible contrast

Keyboard navigation

Visible focus states

Proper input labels

Button text that explains actions

Accessible form errors

Alt text for meaningful images

Do not use color alone to indicate selected/unavailable/error states.

---

# 47. Figma Prototype Reference

The approved patient prototype contains eight primary screens:

Login

Home

Find Doctor

Search Results

Doctor Profile

Select Appointment

Confirm Booking

Booking Success

The existing main flow is:

**Login → Home → Find Doctor → Results → Doctor Profile → Select Appointment → Confirm Booking → Success**

Preserve this interaction model when implementing the React version unless a clear usability or technical issue requires adjustment.

---

# 48. Approved Figma Sample Content

The prototype currently uses:

Patient:

**Amira**

Example doctors:

**Dr. Ahmed Hassan**

**Dr. Fatima Ali**

**Dr. Omar Khalil**

Example location:

**Khartoum**

These are demonstration values and should not become permanently hardcoded application data.

Create database seeders/factories for development records instead.

---

# 49. Frontend Folder Organization

Prefer a scalable structure such as:

`src/components`

`src/pages`

`src/layouts`

`src/features`

`src/services`

`src/hooks`

`src/context` or appropriate state-management location

`src/utils`

`src/routes`

`src/assets`

Do not place the entire application into a few oversized components.

Feature-based organization is encouraged as the project grows.

---

# 50. Backend Organization

Follow Laravel conventions.

Use:

Models

Controllers

Requests

Resources

Policies

Services/Actions where appropriate

Notifications

Events/Listeners when useful

Migrations

Seeders

Factories

Tests

Avoid controllers containing hundreds of lines of business logic.

---

# 51. State Management

Begin with the simplest appropriate React state-management approach.

Use local state for component-specific information.

Use shared state/context where truly needed.

Do not introduce Redux or another major state library merely because the project is large.

Add more advanced state management only if application complexity justifies it.

---

# 52. Development Workflow

Do not attempt to build the entire platform in one operation.

Develop incrementally.

Recommended implementation order:

**Phase 1 – Foundation**
Project setup, React, Tailwind, Laravel, MySQL, API connection, design tokens.

**Phase 2 – Authentication**
Roles, registration, login, logout, protected routes.

**Phase 3 – Patient UI**
Dashboard and shared components.

**Phase 4 – Doctor Directory**
Doctor profiles, specializations, locations, search and filters.

**Phase 5 – Doctor Dashboard**
Provider profile and availability management.

**Phase 6 – Appointment System**
Slots, booking, appointment management, status handling.

**Phase 7 – Home Visits**

**Phase 8 – Laboratory Reservations**

**Phase 9 – Medical History**

**Phase 10 – Notifications**

**Phase 11 – Administrator Dashboard**

**Phase 12 – Testing, security review, responsiveness and accessibility**

Do not move too far ahead without verifying previous phases.

---

# 53. Testing

Add automated tests for important backend functionality.

Prioritize tests for:

Authentication

Authorization

Doctor search/filtering

Doctor availability

Appointment booking

Double-booking prevention

Appointment access permissions

Provider verification

Home visits

Laboratory reservations

Medical-history access

Use appropriate Laravel feature/unit tests.

Frontend testing can be added for critical user interactions as the application grows.

---

# 54. Version Control

Use Git.

Make meaningful commits.

Do not commit:

`.env`

Passwords

Database credentials

API secrets

Generated sensitive data

Large unnecessary build files

---

# 55. Code Quality

Use descriptive names.

Avoid duplicated logic.

Prefer reusable components and functions.

Do not over-engineer simple operations.

Do not create abstractions without a clear reason.

Keep code understandable for university students who will need to explain the project during evaluation.

This is particularly important: generated code must not be unnecessarily complicated simply because an AI agent can generate it.

---

# 56. Documentation

Document:

Installation

Required environment variables

Database setup

Migration commands

Seeder commands

Frontend setup

Backend setup

How to run development servers

Testing commands

Important architectural decisions

API structure

User roles

Do not leave the project in a state where it only works in the original developer's environment.

---

# 57. Future Teleconsultation

Teleconsultation through video/audio is a **future-phase feature**.

Do not implement it in the first version unless explicitly requested.

However, avoid architectural choices that would make future teleconsultation unnecessarily difficult to integrate.

---

# 58. Future Payment and Insurance Integration

Payment and insurance capabilities are future expansion areas.

Do not implement payment processing or insurance claims in the initial version.

Do not generate fake payment functionality simply to populate the UI.

---

# 59. Features That Must Not Be Invented

Do not add unsupported features such as:

AI diagnosis

Symptom checker

Pharmacy ordering

Prescription ordering

Public doctor reviews/ratings

Ambulance dispatch

Insurance claims

Payment gateways

Social feeds

Patient forums

Chatbots

Medical decision-making AI

unless explicitly approved later.

---

# 60. First Instruction Before Coding

Before modifying the project, Codex must:

1. Read this entire specification.
2. Inspect the existing repository.
3. Inspect any provided Figma screenshots/design references.
4. Identify the existing project structure.
5. Summarize its understanding of the architecture.
6. Identify any contradictions or missing information.
7. Propose the next small development milestone.
8. Wait for approval before making large architectural changes.

Do not regenerate the entire project when only a small change is requested.

Preserve existing working functionality unless explicitly instructed otherwise.

---

# 61. Core Development Principle

The final MedAccess Sudan architecture should maintain clear separation between:

**Presentation Layer**
React + Tailwind CSS

**API Layer**
Laravel REST API

**Application / Business Logic**
Laravel services/actions/models

**Persistence Layer**
MySQL

The patient website, doctor website, administrator interface, and future mobile application should all rely on the same backend rules and data.

The backend—not the frontend—must remain the authoritative source for authentication, permissions, healthcare-provider verification, appointment availability, booking rules, and sensitive healthcare information.

---

# 62. Final Objective

Build MedAccess Sudan as a realistic, secure, maintainable and extensible healthcare platform while keeping the first graduation-project implementation achievable.

The website should faithfully translate the approved Figma design into a working React interface while Laravel and MySQL provide the actual system functionality behind it.

The most important first end-to-end workflow is:

**Patient authenticates → searches for a healthcare provider → views provider information → selects genuine backend availability → books appointment → appointment is saved → doctor can see the appointment → patient receives confirmation.**

That workflow must work correctly on both sides of the system before adding unnecessary complexity.
