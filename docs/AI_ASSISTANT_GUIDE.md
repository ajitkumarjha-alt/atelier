# AI Personal Assistant - User Guide

## Overview

The Atelier MEP system now features a **personalized AI assistant** that helps users with project management, design calculations, schedule tracking, and document analysis. The AI assistant is **exclusively available for users from the lodhagroup organization**.

## Key Features

### 🤖 Personalized Experience
- AI knows your name, role, and access level
- Responses tailored to your user level (L1, L2, L3, L4, etc.)
- Access to your assigned projects and data

### 📊 Intelligent Data Analysis
- Query project status and completion
- Analyze MAS (Material Approval Sheets) trends
- Track RFI (Request for Information) status
- Generate custom reports from database

### 📋 Design Sheet Creation
- AI-generated design sheets based on requirements
- Includes calculations and specifications
- References uploaded standards (IS codes, NBC)
- Saved automatically to your project

### 📅 Schedule & Delivery Tracking
- Track drawing schedules and deadlines
- Monitor material approval and delivery status
- Identify overdue items
- Get proactive alerts for upcoming deadlines

### 📁 Document Intelligence (RAG)
- Upload project documents (PDF, TXT, DOC)
- AI references your uploaded documents when answering
- Query standards, codes, and company policies
- Context-aware responses based on your documents

## Access Requirements

### ✅ Eligible Users
- Organization: **lodhagroup** only
- All user levels: L1, L2, L3, L4, SUPER_ADMIN
- AI must be enabled in user preferences

### ❌ Restricted
- Users from other organizations cannot access AI features
- AI can be disabled per user by administrators

## How to Use

### Starting a Conversation

1. **Open AI Chat**
   - Click the "AI Help" button on any dashboard
   - Chat widget appears in bottom-right corner

2. **Ask Questions**
   ```
   Examples:
   - "What projects am I assigned to?"
   - "Show me pending MAS for Project ABC"
   - "What are the overdue drawings this week?"
   - "Generate a project status report"
   ```

3. **Natural Language**
   - Ask questions in plain English
   - AI understands context from conversation history
   - No need to use technical query syntax

### Quick Actions

#### 📅 Track Schedule
- Click "Track Schedule" button
- Get instant summary of:
  - Overdue items
  - Upcoming deadlines (7 days, 30 days)
  - On-track items
  - Material delivery status
  - Recommended actions

#### 📋 Create Design Sheet
- Available when viewing a project
- Click "Create Design Sheet"
- Enter requirements (e.g., "HVAC load calculation for Floor 5")
- AI generates comprehensive design sheet with:
  - Calculations
  - Specifications
  - Standards references
  - Notes and assumptions

#### 📁 Upload Documents
- Click "Upload Document"
- Select PDF, TXT, DOC, or DOCX
- AI indexes document content
- Reference in future queries

### Example Conversations

#### Project Status Query
```
You: What's the status of Atelier Wing A?

AI: Atelier Wing A is currently on track with:
- Completion: 75%
- Floors completed: 15 of 20
- MEP Status: In Progress
- Material stock: 85%
- Next milestone: Floor 16-17 completion by March 15
```

#### Design Assistance
```
You: Create a design sheet for electrical load calculation

AI: ✅ Design sheet "Electrical Load Calculation - Atelier Wing A" created!

Sheet includes:
1. Building specifications
2. Load calculations per floor
3. Diversity factors
4. Total demand calculation
5. References: IS 732, NBC 2016

Sheet ID: 42
```

#### Schedule Tracking
```
You: Show overdue drawings

AI: 📅 Overdue Drawings (3):

1. DRG-001: HVAC Layout Floor 5
   - Due: Feb 28, 2026
   - Status: Pending
   - Assigned: Team A

2. DRG-015: Electrical Single Line
   - Due: Jan 30, 2026
   - Status: In Review
   - Assigned: Team B

Recommendation: Prioritize DRG-015 (4 days overdue)
```

## Data Privacy & Security

### What AI Can Access
✅ **Your database data:**
- Your assigned projects
- MAS/RFI you created or have access to
- Drawing schedules for your projects
- Team assignments

✅ **Your uploaded documents:**
- Documents you uploaded
- Project-specific reference documents
- Company standards (if uploaded by admins)

❌ **What AI Cannot Access:**
- Data from other organizations
- Projects you're not assigned to
- Other users' private documents
- External internet data

### Key Security Features
- **Organization-based access control**: Only lodhagroup users
- **User-level data isolation**: See only your data
- **Conversation history tracking**: All chats logged for audit
- **No external data**: AI uses only your database and documents

## Technical Details

### Database Tables

#### `user_documents`
Stores uploaded documents for AI reference
```sql
- user_id: Owner of document
- project_id: Associated project (optional)
- document_name: Original filename
- content_text: Extracted text for AI
- is_indexed: Whether AI can search this
```

#### `ai_chat_history`
Conversation tracking and audit
```sql
- user_id: User who sent message
- session_id: Unique chat session
- role: 'user' or 'assistant'
- message: Message content
- created_at: Timestamp
```

#### `design_sheets`
AI-generated design sheets
```sql
- project_id: Associated project
- created_by_id: User who requested
- sheet_name: Title of sheet
- content: JSON with calculations
- status: draft/approved/archived
```

#### `user_preferences`
AI personalization settings
```sql
- ai_enabled: Can user access AI?
- preferred_response_style: professional/casual
- notification_preferences: Alert settings
```

### API Endpoints

#### POST `/api/llm/chat`
Main chat interface
```json
{
  "message": "User question",
  "history": [],
  "projectId": 123,
  "sessionId": "session-xyz"
}
```

#### POST `/api/llm/design-sheet`
Create design sheet
```json
{
  "projectId": 123,
  "requirements": "HVAC load calculation",
  "sheetType": "general"
}
```

#### GET `/api/llm/track-schedule/:projectId?`
Get schedule summary

#### POST `/api/user-documents`
Upload document
```
FormData with file and metadata
```

## Best Practices

### 1. Be Specific
❌ "Tell me about projects"
✅ "What's the completion status of Atelier Wing A?"

### 2. Use Context
AI remembers conversation history:
```
You: Show pending MAS for Wing A
AI: [Shows 5 pending MAS]
You: Which ones are urgent?
AI: [Filters to urgent items from previous list]
```

### 3. Upload Relevant Documents
- Upload standards before asking about compliance
- Include project specs for accurate calculations
- Keep documents up-to-date

### 4. Verify Critical Data
- AI responses based on database data
- Always verify critical calculations
- Use AI as assistant, not replacement for expertise

## Troubleshooting

### "AI assistant is only available for lodhagroup users"
**Cause**: Your organization is not set to 'lodhagroup'
**Solution**: Contact administrator to update your organization

### "AI assistant is not enabled for your account"
**Cause**: AI disabled in your preferences
**Solution**: Ask administrator to enable AI in user_preferences

### "I don't have that information in the database"
**Cause**: Data not in database or documents
**Solution**: 
- Check if data exists in system
- Upload relevant documents
- Ensure you have project access

### AI Response Seems Incorrect
**Steps**:
1. Verify data in database
2. Check uploaded documents
3. Rephrase your question
4. Start new conversation session

## Admin Controls

### Enable/Disable AI for User
```sql
UPDATE user_preferences 
SET ai_enabled = true 
WHERE user_id = <user_id>;
```

### Change User Organization
```sql
UPDATE users 
SET organization = 'lodhagroup' 
WHERE email = 'user@example.com';
```

### View Chat History
```sql
SELECT * FROM ai_chat_history 
WHERE user_id = <user_id> 
ORDER BY created_at DESC;
```

## Future Enhancements

🚀 **Planned Features**:
- Voice input/output
- Multi-language support
- Advanced data visualization
- Predictive analytics
- Mobile app integration
- Email notifications for AI alerts
- Custom report templates
- Integration with external standards databases

---

## Support

For issues or questions:
- Check this guide first
- Contact your system administrator
- Review database logs for errors
- Check [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) for technical details

**Version**: 1.0.0  
**Last Updated**: February 3, 2026  
**Organization**: Lodha Group
