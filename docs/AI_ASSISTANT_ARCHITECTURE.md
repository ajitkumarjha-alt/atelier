# AI Personal Assistant - System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          AIChat Component (Floating Widget)               │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Quick Actions:                                     │  │  │
│  │  │  [📅 Track Schedule] [📋 Design Sheet] [📁 Upload] │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Chat Messages (User ⟷ AI)                        │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Input Box + Send Button                           │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    API Requests (REST)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API LAYER                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Authentication & Authorization Middleware               │  │
│  │  • verifyToken()                                         │  │
│  │  • Check organization === 'lodhagroup' ✓                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Endpoints (server/index.js)                         │  │
│  │  • POST /api/llm/chat                                    │  │
│  │  • POST /api/llm/design-sheet                            │  │
│  │  • GET  /api/llm/track-schedule/:projectId?              │  │
│  │  • POST /api/user-documents                              │  │
│  │  • GET  /api/user-documents                              │  │
│  │  • GET  /api/design-sheets                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     LLM SERVICE LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  LLM Functions (server/llm.js)                           │  │
│  │                                                           │  │
│  │  1. getUserContext(userId) ────────┐                     │  │
│  │     • Get user profile             │                     │  │
│  │     • Get preferences              │                     │  │
│  │     • Get assigned projects        │                     │  │
│  │                                    ↓                     │  │
│  │  2. getUserDocumentsContext() ─────┤                     │  │
│  │     • Fetch uploaded documents     │                     │  │
│  │     • Extract content excerpts     │                     │  │
│  │                                    │                     │  │
│  │  3. getDatabaseSchema() ───────────┤                     │  │
│  │     • Get table structures         │  Build Context     │  │
│  │     • Prepare for SQL generation   │  for Gemini AI     │  │
│  │                                    │                     │  │
│  │  4. getStandardsDocuments() ───────┤                     │  │
│  │     • Fetch reference documents    │                     │  │
│  │     • IS codes, NBC, policies      │                     │  │
│  │                                    ↓                     │  │
│  │  5. chatWithDatabase(message) ─────→ Send to Gemini     │  │
│  │     • Organization check           │                     │  │
│  │     • Personalized prompt          │                     │  │
│  │     • Natural language processing  │                     │  │
│  │                                                           │  │
│  │  6. createDesignSheet(requirements)                      │  │
│  │     • Generate calculations                              │  │
│  │     • Reference standards                                │  │
│  │     • Save to database                                   │  │
│  │                                                           │  │
│  │  7. trackScheduleAndDelivery()                           │  │
│  │     • Analyze schedules                                  │  │
│  │     • Identify overdue items                             │  │
│  │     • Generate summary                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │   Google Gemini  │
                    │   AI (gemini-pro)│
                    └──────────────────┘
                              ↓
                       AI Response
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                     │  │
│  │                                                           │  │
│  │  Core Tables:                                            │  │
│  │  • users (with organization column)                      │  │
│  │  • projects                                              │  │
│  │  • material_approval_sheets (MAS)                        │  │
│  │  • requests_for_information (RFI)                        │  │
│  │  • drawing_schedules                                     │  │
│  │  • project_standards_documents                           │  │
│  │                                                           │  │
│  │  AI Feature Tables:                                      │  │
│  │  • user_documents ─────────→ RAG document storage        │  │
│  │  • ai_chat_history ────────→ Conversation audit trail    │  │
│  │  • design_sheets ──────────→ AI-generated designs        │  │
│  │  • user_preferences ───────→ AI personalization          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow - Chat Request

```
User Types Message
       ↓
[1] Frontend (AIChat.jsx)
    • Capture message
    • Add to UI immediately
    • Generate session ID
       ↓
[2] API Call: POST /api/llm/chat
    • Body: { message, history, projectId, sessionId }
    • Headers: Authorization token
       ↓
[3] Authentication Middleware
    • Verify JWT token
    • Extract user ID
    • Check user exists
       ↓
[4] Authorization Check
    • Query: SELECT organization FROM users WHERE id = userId
    • If organization !== 'lodhagroup' → Return error 403
    • If ai_enabled = false → Return error 403
       ↓
[5] Save User Message
    • INSERT INTO ai_chat_history (user_id, session_id, role='user', message)
       ↓
[6] Build AI Context
    • Get user profile (getUserContext)
    • Get user's documents (getUserDocumentsContext)
    • Get database schema (getDatabaseSchema)
    • Get standards docs (getStandardsDocuments)
       ↓
[7] Prepare Prompt
    ```
    You are [User Name]'s personal AI assistant
    
    USER PROFILE:
    - Name: John Doe
    - Role: L2 Project Manager
    - Level: L2
    - Organization: lodhagroup
    
    DATABASE SCHEMA: [tables and columns]
    
    AVAILABLE DOCUMENTS: [user's uploaded docs]
    
    STANDARDS: [IS codes, NBC, etc.]
    
    CONVERSATION HISTORY: [last 10 messages]
    
    USER QUESTION: "What projects am I assigned to?"
    ```
       ↓
[8] Call Gemini AI
    • model.generateContent(prompt)
    • Wait for response (2-5 seconds)
       ↓
[9] Process AI Response
    • Extract answer text
    • Clean up formatting
       ↓
[10] Save AI Response
     • INSERT INTO ai_chat_history (user_id, session_id, role='assistant', message)
       ↓
[11] Return to Frontend
     • Response: { success: true, answer: "..." }
       ↓
[12] Display in UI
     • Add AI message to chat
     • Show timestamp
     • Scroll to bottom
```

---

## Data Flow - Design Sheet Creation

```
User Clicks "Create Design Sheet"
       ↓
Prompt for Requirements
       ↓
User Enters: "HVAC load calculation for Floor 5"
       ↓
API Call: POST /api/llm/design-sheet
{
  projectId: 123,
  requirements: "HVAC load calculation for Floor 5",
  sheetType: "general"
}
       ↓
Authorization Check (lodhagroup only)
       ↓
Get Project Details
• SELECT * FROM projects WHERE id = 123
       ↓
Build Context
• User profile
• Project data
• Standards documents
• User documents
       ↓
Prepare Prompt
```
Create design sheet for John Doe

PROJECT: Atelier Wing A
Sheet Type: general
Requirements: HVAC load calculation for Floor 5

[Standards Context]
[User Documents]

Return JSON with:
- title
- sections
- calculations
- references
- notes
```
       ↓
Call Gemini AI
       ↓
Parse JSON Response
{
  "title": "HVAC Load Calculation - Floor 5",
  "sections": [...],
  "calculations": [...],
  "references": ["IS 732", "NBC 2016"]
}
       ↓
Save to Database
INSERT INTO design_sheets (project_id, created_by_id, sheet_name, content, status)
       ↓
Return to Frontend
{
  success: true,
  sheetId: 42,
  content: {...}
}
       ↓
Display Success Message
"✅ Design sheet created successfully!"
```

---

## Data Flow - Document Upload

```
User Clicks "Upload Document"
       ↓
Select File (PDF/TXT/DOC)
       ↓
API Call: POST /api/user-documents
FormData {
  document: [file],
  projectId: 123,
  documentType: "reference",
  documentName: "IS 732 Code.pdf"
}
       ↓
File Upload Processing
• Save to Google Cloud Storage (if configured)
• Or save locally to /uploads/
       ↓
Text Extraction
• For TXT: Read file content
• For PDF: Extract text (basic)
• For DOC: Convert and extract
       ↓
Save to Database
INSERT INTO user_documents (
  user_id,
  project_id,
  document_name,
  file_url,
  content_text,
  is_indexed = true
)
       ↓
Index for AI
• Document now searchable by AI
• Will be included in getUserDocumentsContext()
       ↓
Return Success
{
  success: true,
  documentId: 99
}
       ↓
Display in Chat
"✅ Document uploaded successfully!
I can now reference this document."
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                      │
│                                                         │
│  Layer 1: Authentication                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Firebase Auth JWT Token                         │  │
│  │  • Every API request requires valid token       │  │
│  │  • Token contains user email and ID             │  │
│  └──────────────────────────────────────────────────┘  │
│                       ↓                                 │
│  Layer 2: Organization Check                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  SELECT organization FROM users                  │  │
│  │  WHERE id = decoded_token.user_id                │  │
│  │                                                   │  │
│  │  IF organization !== 'lodhagroup' THEN           │  │
│  │    RETURN 403 Forbidden                          │  │
│  └──────────────────────────────────────────────────┘  │
│                       ↓                                 │
│  Layer 3: AI Enable Check                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  SELECT ai_enabled FROM user_preferences         │  │
│  │  WHERE user_id = current_user                    │  │
│  │                                                   │  │
│  │  IF ai_enabled = false THEN                      │  │
│  │    RETURN 403 "AI not enabled"                   │  │
│  └──────────────────────────────────────────────────┘  │
│                       ↓                                 │
│  Layer 4: Data Filtering                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  All Queries Include User Filter:                │  │
│  │                                                   │  │
│  │  SELECT * FROM projects                          │  │
│  │  WHERE assigned_lead_id = current_user           │  │
│  │  OR id IN (                                      │  │
│  │    SELECT project_id FROM project_team_members  │  │
│  │    WHERE user_id = current_user                 │  │
│  │  )                                               │  │
│  └──────────────────────────────────────────────────┘  │
│                       ↓                                 │
│  Layer 5: Audit Trail                                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  All Actions Logged:                             │  │
│  │  • Chat messages → ai_chat_history              │  │
│  │  • Document uploads → user_documents            │  │
│  │  • Design sheets → design_sheets                │  │
│  │  • With timestamps and user IDs                 │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Database Relationships

```
users
  ├── organization [VARCHAR] ──→ Must be 'lodhagroup' for AI access
  ├── user_level [VARCHAR] ────→ Determines permissions
  │
  ├──< user_documents
  │    ├── user_id [FK]
  │    ├── project_id [FK] (optional)
  │    ├── content_text ──────→ Used for RAG context
  │    └── is_indexed ────────→ If true, AI can search
  │
  ├──< ai_chat_history
  │    ├── user_id [FK]
  │    ├── session_id ────────→ Groups conversations
  │    ├── role ──────────────→ 'user' or 'assistant'
  │    └── message ───────────→ Chat content
  │
  ├──< design_sheets
  │    ├── created_by_id [FK]
  │    ├── project_id [FK]
  │    ├── content [JSONB] ───→ Design calculations
  │    └── status ────────────→ draft/approved/archived
  │
  └──< user_preferences
       ├── user_id [FK]
       ├── ai_enabled ────────→ Can user access AI?
       └── preferred_response_style → How AI responds

projects
  ├── assigned_lead_id [FK to users]
  │
  ├──< project_team_members
  │    └── user_id [FK] ──────→ Users assigned to project
  │
  ├──< user_documents (project-specific)
  ├──< ai_chat_history (project context)
  └──< design_sheets (project designs)
```

---

## AI Context Building Process

```
When user asks a question, the system builds rich context:

1. USER PROFILE
   ┌─────────────────────────────────────────────┐
   │ SELECT u.*, up.preferred_response_style     │
   │ FROM users u                                │
   │ JOIN user_preferences up ON u.id = up.user_id│
   │ WHERE u.id = current_user                   │
   └─────────────────────────────────────────────┘
   Result:
   • Name: John Doe
   • Role: Project Manager
   • Level: L2
   • Organization: lodhagroup
   • Response Style: professional

2. USER'S PROJECTS
   ┌─────────────────────────────────────────────┐
   │ SELECT p.* FROM projects p                  │
   │ WHERE p.assigned_lead_id = current_user     │
   │ OR p.id IN (                                │
   │   SELECT project_id FROM project_team_members│
   │   WHERE user_id = current_user             │
   │ )                                           │
   └─────────────────────────────────────────────┘
   Result:
   • Atelier Wing A (75% complete)
   • Atelier Wing B (45% complete)

3. USER'S DOCUMENTS
   ┌─────────────────────────────────────────────┐
   │ SELECT document_name, content_text          │
   │ FROM user_documents                         │
   │ WHERE user_id = current_user                │
   │ AND is_indexed = true                       │
   │ LIMIT 50                                    │
   └─────────────────────────────────────────────┘
   Result:
   • IS 732 HVAC Code (excerpt...)
   • Company Policy MEP (excerpt...)
   • Project Specs (excerpt...)

4. DATABASE SCHEMA
   ┌─────────────────────────────────────────────┐
   │ Hard-coded schema info for:                 │
   │ • projects                                  │
   │ • material_approval_sheets                  │
   │ • requests_for_information                  │
   │ • drawing_schedules                         │
   │ • etc.                                      │
   └─────────────────────────────────────────────┘

5. STANDARDS DOCUMENTS
   ┌─────────────────────────────────────────────┐
   │ SELECT category, document_name              │
   │ FROM project_standards_documents            │
   │ WHERE project_id = current_project          │
   │ OR project_id IS NULL                       │
   └─────────────────────────────────────────────┘

6. CONVERSATION HISTORY
   ┌─────────────────────────────────────────────┐
   │ SELECT role, message FROM ai_chat_history   │
   │ WHERE user_id = current_user                │
   │ AND session_id = current_session            │
   │ ORDER BY created_at DESC                    │
   │ LIMIT 10                                    │
   └─────────────────────────────────────────────┘

ALL COMBINED into single prompt sent to Gemini AI ↓

┌───────────────────────────────────────────────────┐
│ You are John Doe's personal AI assistant         │
│                                                   │
│ USER PROFILE: [from step 1]                      │
│ ACTIVE PROJECTS: [from step 2]                   │
│ UPLOADED DOCUMENTS: [from step 3]                │
│ DATABASE SCHEMA: [from step 4]                   │
│ STANDARDS: [from step 5]                         │
│ CONVERSATION HISTORY: [from step 6]              │
│                                                   │
│ USER QUESTION: "What projects am I assigned to?" │
│                                                   │
│ Answer professionally based on the context above.│
└───────────────────────────────────────────────────┘
                          ↓
                    Gemini AI
                          ↓
                "You are assigned to 2 projects:
                 1. Atelier Wing A (75% complete)
                 2. Atelier Wing B (45% complete)"
```

---

## Technology Stack

```
Frontend
├── React 18
├── Tailwind CSS
├── Lucide Icons
├── Vite (build tool)
└── Components:
    └── AIChat.jsx (main AI interface)

Backend
├── Node.js
├── Express.js
├── PostgreSQL
├── Firebase Admin (auth)
├── Google Cloud Storage (file storage)
└── Modules:
    ├── server/index.js (API endpoints)
    ├── server/llm.js (AI logic)
    ├── server/db.js (database)
    └── server/storage.js (file storage)

AI/ML
├── Google Gemini AI (gemini-pro model)
├── Natural Language Processing
├── Retrieval-Augmented Generation (RAG)
└── Context-aware responses

Database
├── PostgreSQL 14+
├── JSONB for flexible data
├── Full-text search ready
└── Indexed for performance
```

---

This architecture ensures:
✅ Security through multiple layers
✅ Personalization through user context
✅ Intelligence through RAG
✅ Audit through logging
✅ Scalability through stateless design
