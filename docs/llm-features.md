# LLM/AI Features Documentation

## Overview

The Atelier MEP system integrates Google's Gemini AI to provide intelligent assistance across all user levels. The AI features are designed to work **exclusively with database data** (no external knowledge) to ensure accuracy and relevance.

## Table of Contents

1. [Core Features](#core-features)
2. [Architecture](#architecture)
3. [Setup & Configuration](#setup--configuration)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [Usage Examples](#usage-examples)
7. [Security & Constraints](#security--constraints)

## Core Features

### 1. L0 Dashboard - AI-Powered Custom Reports

**Purpose**: Enable VP/HoD MEP users to generate custom reports through natural language queries

**Capabilities**:
- Natural language to SQL conversion
- Automatic visualization type suggestion (bar, line, pie, scatter, table)
- Export to CSV/JSON (Excel/PDF coming soon)
- Example queries:
  - "Show me projects with most delayed MAS"
  - "Which projects have highest RFI count?"
  - "Projects with most pending approvals"
  - "Material submissions by category"
  - "Drawing schedule status by discipline"

**Component**: `AIReports.jsx`  
**Endpoint**: `POST /api/llm/query`

### 2. L2/L3/L4 - AI Chat Assistant

**Purpose**: Provide database-only conversational AI for project teams

**Capabilities**:
- Answer questions about project details, schedules, calculations
- Analyze MAS and RFI trends
- Provide insights on drawing schedules
- Generate reports and summaries
- **Strict constraint**: Only uses database data, no external knowledge

**Features**:
- Floating chat widget (minimize/maximize)
- Message history with timestamps
- Typing indicators
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Lodha-themed UI

**Component**: `AIChat.jsx`  
**Endpoint**: `POST /api/llm/chat`

### 3. Project Story Generator

**Purpose**: Create comprehensive timeline narratives of project history

**Capabilities**:
- Aggregates all project data (MAS, RFI, drawings, change requests)
- Highlights important changes, uploads, status updates
- Shows revision history with dates
- Professional report format
- Can be exported as PDF/Excel

**Component**: Add "Generate Project Story" button to project pages  
**Endpoint**: `GET /api/llm/project-story/:projectId`

## Architecture

### Backend Structure

```
server/
├── llm.js           # Core Gemini AI integration
├── index.js         # API endpoints for AI features
└── db.js            # Database connection
```

### Key Modules

#### `server/llm.js`

Core AI integration module with the following functions:

```javascript
// Check if Gemini API is configured
isLLMConfigured()

// Get complete database schema for AI context
getDatabaseSchema()

// Convert natural language to SQL
naturalLanguageToSQL(userQuery, userLevel)

// Execute natural language query and return results
executeNaturalLanguageQuery(userQuery, userLevel)

// Suggest best visualization type for data
suggestVisualization(data, userQuery)

// Generate comprehensive project timeline
generateProjectStory(projectId)

// Conversational AI with database context
chatWithDatabase(message, history)
```

#### Database Schema Context

The AI has access to the complete schema of 9 tables:
- `projects` - Project basic information
- `material_approval_sheets` - MAS submissions and approvals
- `requests_for_information` - RFI tracking
- `drawing_schedules` - Drawing submissions and status
- `project_change_requests` - Change request workflow
- `buildings` - Building structure
- `floors` - Floor details
- `flats` - Unit/flat information
- `users` - User management

### Frontend Structure

```
src/
├── components/
│   ├── AIChat.jsx         # Floating chat widget
│   └── AIReports.jsx      # Custom report generator
└── pages/
    ├── L0Dashboard.jsx    # Includes AIReports
    └── L2Dashboard.jsx    # Includes AIChat
```

## Setup & Configuration

### 1. Install Dependencies

```bash
npm install @google/generative-ai
```

For report generation (optional):
```bash
npm install exceljs jspdf jspdf-autotable
```

### 2. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Create new API key
4. Copy the key

### 3. Configure Environment Variables

Create `.env` file in project root:

```env
# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Other configurations...
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_NAME=atelier_mep
```

### 4. Verify Configuration

Check if LLM is configured:
```bash
curl http://localhost:3000/api/llm/status
```

Expected response:
```json
{
  "configured": true,
  "message": "LLM is configured and ready"
}
```

## API Endpoints

### 1. Natural Language Query

**Endpoint**: `POST /api/llm/query`

**Request**:
```json
{
  "query": "Show me projects with most delayed MAS"
}
```

**Response**:
```json
{
  "data": [
    {
      "project_name": "Grande",
      "delayed_count": 15,
      "total_mas": 50
    }
  ],
  "rowCount": 1,
  "visualization": {
    "type": "bar",
    "title": "Projects with Most Delayed MAS"
  },
  "query": "SELECT p.project_name, COUNT(*) as delayed_count..."
}
```

### 2. AI Chat

**Endpoint**: `POST /api/llm/chat`

**Request**:
```json
{
  "message": "What's the status of MAS in Grande project?",
  "history": [
    {
      "role": "user",
      "content": "Tell me about Grande project"
    },
    {
      "role": "assistant",
      "content": "Grande is a residential project..."
    }
  ]
}
```

**Response**:
```json
{
  "answer": "Based on the database, Grande project has 50 total MAS submissions. 30 are approved, 15 are pending review, and 5 are rejected. The approval rate is 60%."
}
```

### 3. Project Story

**Endpoint**: `GET /api/llm/project-story/:projectId`

**Response**:
```json
{
  "story": "# Grande Project Timeline\n\nCreated on 2024-01-15...",
  "projectName": "Grande",
  "generatedAt": "2024-12-20T10:30:00Z"
}
```

### 4. Status Check

**Endpoint**: `GET /api/llm/status`

**Response**:
```json
{
  "configured": true,
  "message": "LLM is configured and ready"
}
```

## Frontend Components

### AIReports Component

**Location**: `src/components/AIReports.jsx`  
**Used in**: L0 Dashboard

**Props**: None (standalone component)

**Features**:
- Natural language input field
- Example query suggestions
- Real-time query execution
- Data visualization (table format)
- Export to CSV/JSON
- SQL query display (collapsible)

**Usage**:
```jsx
import AIReports from '../components/AIReports';

function L0Dashboard() {
  return (
    <Layout>
      <AIReports />
    </Layout>
  );
}
```

### AIChat Component

**Location**: `src/components/AIChat.jsx`  
**Used in**: L2/L3/L4 Dashboards

**Props**:
- `isOpen` (boolean) - Chat widget visibility
- `onClose` (function) - Close callback
- `userLevel` (string) - User level (L2/L3/L4)

**Features**:
- Floating widget with minimize/maximize
- Message history
- Typing indicators
- Timestamps
- Auto-scroll to latest message
- Keyboard shortcuts

**Usage**:
```jsx
import AIChat from '../components/AIChat';
import { MessageCircle } from 'lucide-react';

function L2Dashboard() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <Layout>
      {/* Other content */}
      
      {/* Floating button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 bg-lodha-gold text-white p-4 rounded-full shadow-lg"
      >
        <MessageCircle className="w-6 h-6" />
        <span>AI Help</span>
      </button>

      {/* Chat widget */}
      <AIChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userLevel="L2"
      />
    </Layout>
  );
}
```

## Usage Examples

### Example 1: L0 Custom Report

**User Query**: "Show me projects with highest number of pending RFIs"

**AI Processing**:
1. Converts to SQL:
```sql
SELECT p.project_name, COUNT(r.id) as pending_rfis
FROM projects p
LEFT JOIN requests_for_information r ON p.id = r.project_id
WHERE r.status = 'Pending'
GROUP BY p.id, p.project_name
ORDER BY pending_rfis DESC;
```

2. Executes query
3. Suggests visualization: "bar" chart
4. Returns data and metadata

**User Actions**:
- View data in table
- Export to CSV/JSON
- See generated SQL query

### Example 2: L2 Chat Assistant

**Conversation**:

User: "What's the approval rate for MAS in Grande project?"

AI: "Based on the database, Grande project has 50 total MAS submissions. 30 are approved (60% approval rate), 15 are pending review, and 5 are rejected. The average approval time is 7 days."

User: "Which materials are pending the longest?"

AI: "The longest pending materials in Grande are: 1) Electrical Panel - 45 days, 2) HVAC Duct - 38 days, 3) Plumbing Fixtures - 32 days. These are significantly above the average pending time of 12 days."

### Example 3: Project Story

**Generated Story**:

```markdown
# Grande Project Timeline

## Project Overview
- Created: January 15, 2024
- Status: Construction
- Location: Mumbai, Maharashtra
- BOQ Value: ₹15,00,00,000

## Key Milestones

### January 2024
- Project initiated with concept phase
- 5 initial RFIs submitted for site conditions

### February 2024
- Design Development phase started
- 15 MAS submissions for HVAC equipment
- 3 change requests approved for electrical modifications

### March 2024
- Tender phase completed
- Major revision: MEP layout updated for building optimization
- 20 new MAS submissions for plumbing fixtures
- Drawing schedule: 45 drawings submitted, 40 approved

### April 2024
- Construction phase started
- Critical change: Fire protection system upgrade
- 10 RFIs resolved, 5 new RFIs submitted
- Material approval accelerated: 25 MAS approved in 2 weeks

## Current Status
- Total MAS: 50 (30 approved, 15 pending, 5 rejected)
- Total RFIs: 20 (15 resolved, 5 pending)
- Drawing Schedule: 85% complete
- Change Requests: 8 (6 approved, 2 under review)

## Important Changes
1. MEP layout revision - February 28, 2024
2. Fire protection upgrade - April 10, 2024
3. Electrical panel specification change - March 15, 2024
```

## Security & Constraints

### Data Security

1. **Authentication**: All LLM endpoints require authentication
```javascript
app.post('/api/llm/query', verifyToken, async (req, res) => {
  // Endpoint logic
});
```

2. **Database-Only Constraint**: AI strictly uses database data
```javascript
const systemContext = `
You are an AI assistant for the Atelier MEP system.
CRITICAL RULES:
1. ONLY use data from the provided database
2. NEVER make up information or use external knowledge
3. If data is not in the database, say "I don't have that information"
4. Be concise and professional
`;
```

3. **SQL Injection Protection**: All queries are parameterized
```javascript
const result = await db.query(query, params);
```

### Constraints

1. **No External Knowledge**: AI cannot answer questions outside database scope
   - ❌ "What's the weather in Mumbai?" 
   - ✅ "What's the status of Mumbai projects?"

2. **No Data Modification**: AI can only query, not modify data
   - ❌ "Approve all pending MAS"
   - ✅ "Show all pending MAS"

3. **User Level Restrictions**: AI respects user permissions
   - L0: Can see all projects
   - L2/L3/L4: Can only see assigned projects

4. **Rate Limiting**: Consider implementing rate limits for API calls
```javascript
// TODO: Add rate limiting
app.use('/api/llm', rateLimit({ windowMs: 60000, max: 20 }));
```

### Error Handling

1. **LLM Not Configured**:
```json
{
  "error": "LLM service not configured",
  "statusCode": 503
}
```

2. **Invalid Query**:
```json
{
  "error": "Query parameter is required",
  "statusCode": 400
}
```

3. **Query Execution Failed**:
```json
{
  "error": "Failed to execute query: [error details]",
  "statusCode": 500
}
```

## Performance Considerations

### Optimization Tips

1. **Caching**: Cache common queries
```javascript
const cache = new Map();
const cacheKey = `query:${query}`;
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

2. **Query Limits**: Limit result set size
```sql
SELECT * FROM projects LIMIT 100;
```

3. **Conversation History**: Limit history to last 10 messages
```javascript
const recentHistory = history.slice(-10);
```

4. **Async Processing**: Use background jobs for heavy queries
```javascript
const jobId = await queueLLMQuery(query);
return { jobId, status: 'processing' };
```

## Troubleshooting

### Common Issues

1. **"LLM service not configured"**
   - Check if `GEMINI_API_KEY` is set in `.env`
   - Verify API key is valid
   - Run `GET /api/llm/status` to diagnose

2. **Slow query performance**
   - Add database indexes
   - Limit result set size
   - Cache frequently used queries

3. **Chat not responding**
   - Check browser console for errors
   - Verify `/api/llm/chat` endpoint is accessible
   - Check conversation history size

4. **Incorrect SQL generation**
   - Review database schema in `getDatabaseSchema()`
   - Add more context to prompt
   - Test with simpler queries first

### Debug Mode

Enable debug logging:
```javascript
const DEBUG_LLM = process.env.DEBUG_LLM === 'true';

if (DEBUG_LLM) {
  console.log('Generated SQL:', generatedSQL);
  console.log('AI Response:', response);
}
```

## Future Enhancements

### Planned Features

1. **Excel/PDF Export**: Complete report generation
   - Use ExcelJS for Excel files
   - Use jsPDF for PDF files
   - Add charts and graphs

2. **Voice Input**: Voice-to-text for queries
   - Integrate Web Speech API
   - Support multiple languages

3. **Data Visualization**: Interactive charts
   - Integrate Chart.js or Recharts
   - Auto-generate charts based on data

4. **Scheduled Reports**: Automated report generation
   - Daily/weekly/monthly reports
   - Email delivery
   - Custom templates

5. **Advanced Analytics**: Predictive insights
   - Project delay predictions
   - Material cost trends
   - Resource allocation optimization

## Support

For issues or questions:
- Check troubleshooting section
- Review API documentation
- Contact development team

---

**Last Updated**: December 2024  
**Version**: 1.0.0
