import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from './db.js';

// Initialize Gemini
let genAI = null;
let model = null;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

try {
  if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    console.log('✅ Gemini AI initialized');
  } else {
    console.warn('⚠️  Gemini API key not configured. LLM features will be disabled.');
  }
} catch (error) {
  console.error('Error initializing Gemini:', error.message);
}

/**
 * Check if LLM is configured
 */
export function isLLMConfigured() {
  return model !== null;
}

/**
 * Get database schema for context
 */
async function getDatabaseSchema() {
  const schema = `
Database Schema:

1. projects table:
   - id, name, description, status, lifecycle_stage, completion_percentage
   - floors_completed, total_floors, material_stock_percentage
   - assigned_lead_id, start_date, target_completion_date
   - is_archived, created_at, updated_at

2. material_approval_sheets table:
   - id, project_id, mas_ref_no, material_name, material_category
   - manufacturer, model_specification, quantity, unit
   - submitted_by_vendor, vendor_email
   - l2_status, l2_comments, l2_reviewed_by, l2_reviewed_at
   - l1_status, l1_comments, l1_reviewed_by, l1_reviewed_at
   - final_status, created_at, updated_at

3. requests_for_information table:
   - id, project_id, rfi_ref_no, rfi_subject, rfi_description
   - disciplines, raised_by, raised_by_email
   - project_team_response, design_team_response
   - status, created_at, updated_at

4. drawing_schedules table:
   - id, project_id, drawing_ref_no, discipline, drawing_title
   - drawing_type, revision, planned_submission_date, actual_submission_date
   - status, priority, assigned_to, created_at, updated_at

5. project_change_requests table:
   - id, project_id, change_ref_no, change_type, change_category
   - change_description, justification, impact_assessment
   - requested_by, l2_status, l1_status, final_status
   - implemented, priority, created_at, updated_at

6. buildings table:
   - id, project_id, name, building_type, application_type
   - created_at, updated_at

7. floors table:
   - id, building_id, floor_number, floor_name
   - created_at, updated_at

8. flats table:
   - id, floor_id, flat_type, area_sqft, number_of_flats
   - created_at, updated_at

9. users table:
   - id, email, full_name, role, user_level
   - last_login, created_at, updated_at
`;

  return schema;
}

/**
 * Natural language to SQL query converter
 * Converts user questions into SQL queries
 */
export async function naturalLanguageToSQL(userQuery, userLevel = 'L2') {
  if (!model) {
    throw new Error('Gemini AI is not configured');
  }

  const schema = await getDatabaseSchema();

  const prompt = `You are a SQL query generator for a MEP project management system.

${schema}

User Level: ${userLevel}
User Question: "${userQuery}"

Generate a PostgreSQL query to answer this question. Follow these rules:
1. ONLY return the SQL query, no explanations
2. Use proper PostgreSQL syntax
3. Include appropriate JOINs when needed
4. Use COUNT, SUM, AVG as needed for aggregations
5. Order results meaningfully
6. Limit to 100 results for safety
7. For date comparisons, use CURRENT_DATE
8. Handle NULL values appropriately

Return ONLY the SQL query:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let sqlQuery = response.text().trim();
    
    // Clean up the response
    sqlQuery = sqlQuery.replace(/```sql/g, '').replace(/```/g, '').trim();
    
    return sqlQuery;
  } catch (error) {
    console.error('Error generating SQL:', error);
    throw error;
  }
}

/**
 * Execute natural language query and return results
 */
export async function executeNaturalLanguageQuery(userQuery, userLevel = 'L2') {
  try {
    // Convert to SQL
    const sqlQuery = await naturalLanguageToSQL(userQuery, userLevel);
    console.log('Generated SQL:', sqlQuery);

    // Execute query
    const result = await query(sqlQuery);
    
    return {
      success: true,
      query: sqlQuery,
      data: result.rows,
      rowCount: result.rowCount
    };
  } catch (error) {
    console.error('Error executing NL query:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Analyze data and suggest visualization
 */
export async function suggestVisualization(data, userQuery) {
  if (!model || !data || data.length === 0) {
    return { type: 'table' };
  }

  const sampleData = data.slice(0, 5);
  const columns = Object.keys(sampleData[0] || {});

  const prompt = `Given this data sample and user query, suggest the best visualization type.

User Query: "${userQuery}"

Data Columns: ${columns.join(', ')}
Sample Data (first 5 rows): ${JSON.stringify(sampleData, null, 2)}

Suggest ONE of these visualization types:
- table: Simple data table
- bar: Bar chart (for categorical comparisons)
- line: Line chart (for trends over time)
- pie: Pie chart (for proportions/percentages)
- scatter: Scatter plot (for correlations)

Return ONLY the visualization type word (table/bar/line/pie/scatter):`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const vizType = response.text().trim().toLowerCase();
    
    // Validate response
    const validTypes = ['table', 'bar', 'line', 'pie', 'scatter'];
    if (validTypes.includes(vizType)) {
      return { type: vizType };
    }
    
    return { type: 'table' };
  } catch (error) {
    console.error('Error suggesting visualization:', error);
    return { type: 'table' };
  }
}

/**
 * Generate project history/story
 */
export async function generateProjectStory(projectId) {
  if (!model) {
    throw new Error('Gemini AI is not configured');
  }

  try {
    // Gather all project data
    const projectData = await query(
      `SELECT * FROM projects WHERE id = $1`,
      [projectId]
    );

    const masData = await query(
      `SELECT mas_ref_no, material_name, final_status, created_at, updated_at 
       FROM material_approval_sheets 
       WHERE project_id = $1 
       ORDER BY created_at`,
      [projectId]
    );

    const rfiData = await query(
      `SELECT rfi_ref_no, rfi_subject, status, created_at, updated_at 
       FROM requests_for_information 
       WHERE project_id = $1 
       ORDER BY created_at`,
      [projectId]
    );

    const drawingsData = await query(
      `SELECT drawing_ref_no, drawing_title, status, created_at, updated_at 
       FROM drawing_schedules 
       WHERE project_id = $1 
       ORDER BY created_at`,
      [projectId]
    );

    const changesData = await query(
      `SELECT change_ref_no, change_description, final_status, created_at, updated_at 
       FROM project_change_requests 
       WHERE project_id = $1 
       ORDER BY created_at`,
      [projectId]
    );

    const project = projectData.rows[0];
    if (!project) {
      throw new Error('Project not found');
    }

    const prompt = `Generate a comprehensive, professional project story/timeline report.

Project Details:
${JSON.stringify(project, null, 2)}

Material Approval Sheets (${masData.rowCount}):
${JSON.stringify(masData.rows, null, 2)}

RFIs (${rfiData.rowCount}):
${JSON.stringify(rfiData.rows, null, 2)}

Drawing Schedule (${drawingsData.rowCount}):
${JSON.stringify(drawingsData.rows, null, 2)}

Change Requests (${changesData.rowCount}):
${JSON.stringify(changesData.rows, null, 2)}

Create a professional narrative report with:
1. Executive Summary
2. Project Overview (name, dates, status, completion %)
3. Timeline of Key Events (chronological)
4. Material Approvals Summary
5. RFI Activity
6. Drawing Submissions
7. Change Management
8. Current Status & Next Steps

Use professional language, include dates, reference numbers, and statistics.
Format in clear sections with headers.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const story = response.text();

    return {
      success: true,
      story: story,
      projectName: project.name,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating project story:', error);
    throw error;
  }
}

/**
 * Get user documents context for personalized RAG
 */
async function getUserDocumentsContext(userId, projectId = null) {
  try {
    let queryText = `
      SELECT document_name, document_type, content_text, metadata, created_at 
      FROM user_documents 
      WHERE user_id = $1 AND is_indexed = true
    `;
    const params = [userId];
    
    if (projectId) {
      params.push(projectId);
      queryText += ` AND (project_id = $2 OR project_id IS NULL)`;
    }
    
    queryText += ' ORDER BY created_at DESC LIMIT 50';
    
    const result = await query(queryText, params);
    
    if (result.rows.length === 0) {
      return '';
    }
    
    let context = '\n\nUSER UPLOADED DOCUMENTS:\n';
    context += 'The following documents have been uploaded by the user:\n\n';
    
    result.rows.forEach((doc, idx) => {
      context += `Document ${idx + 1}: ${doc.document_name}\n`;
      if (doc.document_type) {
        context += `  Type: ${doc.document_type}\n`;
      }
      if (doc.content_text) {
        // Include first 500 chars of content
        const excerpt = doc.content_text.substring(0, 500);
        context += `  Content excerpt: ${excerpt}...\n`;
      }
      context += '\n';
    });
    
    return context;
  } catch (error) {
    console.error('Error fetching user documents context:', error);
    return '';
  }
}

/**
 * Get user profile and preferences for personalization
 */
async function getUserContext(userId) {
  try {
    const userResult = await query(
      `SELECT u.full_name, u.email, u.role, u.user_level, u.organization,
              up.preferred_response_style, up.ai_enabled
       FROM users u
       LEFT JOIN user_preferences up ON u.id = up.user_id
       WHERE u.id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return null;
    }
    
    const user = userResult.rows[0];
    
    // Get user's projects
    const projectsResult = await query(
      `SELECT p.id, p.name, p.status, p.completion_percentage
       FROM projects p
       LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
       WHERE ptm.user_id = $1 OR p.assigned_lead_id = $1
       ORDER BY p.created_at DESC
       LIMIT 10`,
      [userId]
    );
    
    return {
      name: user.full_name,
      email: user.email,
      role: user.role,
      level: user.user_level,
      organization: user.organization,
      responseStyle: user.preferred_response_style || 'professional',
      aiEnabled: user.ai_enabled !== false,
      projects: projectsResult.rows
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return null;
  }
}

/**
 * Get standards documents context for LLM
 */
async function getStandardsDocumentsContext(projectId = null) {
  try {
    let queryText = `
      SELECT category, document_name, description, created_at 
      FROM project_standards_documents 
      WHERE 1=1
    `;
    const params = [];
    
    if (projectId) {
      params.push(projectId);
      queryText += ` AND (project_id = $1 OR project_id IS NULL)`;
    }
    
    queryText += ' ORDER BY category, created_at DESC';
    
    const result = await query(queryText, params);
    
    if (result.rows.length === 0) {
      return '';
    }
    
    // Group documents by category
    const docsByCategory = result.rows.reduce((acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = [];
      }
      acc[doc.category].push(doc);
      return acc;
    }, {});
    
    // Format for context
    let context = '\n\nAVAILABLE REFERENCE DOCUMENTS:\n';
    context += 'The following standards and reference documents are available:\n\n';
    
    for (const [category, docs] of Object.entries(docsByCategory)) {
      const categoryLabel = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      context += `${categoryLabel}:\n`;
      docs.forEach(doc => {
        context += `  - ${doc.document_name}`;
        if (doc.description) {
          context += `: ${doc.description}`;
        }
        context += '\n';
      });
      context += '\n';
    }
    
    context += 'When answering questions about standards, codes, or policies, reference these documents.\n';
    context += 'For design calculations, consider compliance with uploaded IS codes, NBC codes, and company policies.\n';
    
    return context;
  } catch (error) {
    console.error('Error fetching standards documents context:', error);
    return '';
  }
}

/**
 * Chat with database context - Personalized RAG Assistant
 */
export async function chatWithDatabase(userMessage, conversationHistory = [], userId, projectId = null) {
  if (!model) {
    throw new Error('Gemini AI is not configured');
  }

  const userContext = await getUserContext(userId);
  
  // Check if user has AI access and is from lodhagroup
  if (!userContext || userContext.organization !== 'lodhagroup') {
    return {
      success: false,
      error: 'AI assistant is only available for lodhagroup users'
    };
  }
  
  if (!userContext.aiEnabled) {
    return {
      success: false,
      error: 'AI assistant is not enabled for your account. Please contact your administrator.'
    };
  }

  const schema = await getDatabaseSchema();
  const standardsContext = await getStandardsDocumentsContext(projectId);
  const userDocsContext = await getUserDocumentsContext(userId, projectId);

  const systemContext = `You are ${userContext.name}'s personal AI assistant for the Atelier MEP Project Management System.

USER PROFILE:
- Name: ${userContext.name}
- Role: ${userContext.role}
- Level: ${userContext.level}
- Organization: ${userContext.organization}
- Response Style: ${userContext.responseStyle}

You help with:
• Project details and scheduling
• Design sheet creation and calculations
• MAS/RFI tracking and analysis
• Delivery and schedule tracking
• Custom reports and insights
• Document analysis and queries

IMPORTANT RULES:
1. Personalize responses based on user's role and level
2. ONLY use data from: database, uploaded company documents, user's uploaded documents
3. Do NOT use external knowledge or assumptions
4. If data is missing, say "I don't have that information in your documents or database"
5. Be professional and match the user's preferred response style
6. When discussing design calculations, reference uploaded standards (IS codes, NBC, company policies)
7. For schedule tracking, use data from drawing_schedules and project milestones
8. For delivery tracking, use material_approval_sheets and project status data

${schema}
${standardsContext}
${userDocsContext}

${userContext.projects.length > 0 ? `
YOUR ACTIVE PROJECTS:
${userContext.projects.map(p => `- ${p.name} (${p.status}, ${p.completion_percentage}% complete)`).join('\n')}
` : ''}

Previous conversation:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User: ${userMessage}

As ${userContext.name}'s personal assistant, provide a helpful, accurate response based on available data.`;

  try {
    const result = await model.generateContent(systemContext);
    const response = await result.response;
    const answer = response.text();

    return {
      success: true,
      answer: answer
    };
  } catch (error) {
    console.error('Error in chat:', error);
    throw error;
  }
}

/**
 * Create design sheet based on user requirements
 */
export async function createDesignSheet(userId, projectId, requirements, sheetType = 'general') {
  if (!model) {
    throw new Error('Gemini AI is not configured');
  }

  try {
    const userContext = await getUserContext(userId);
    
    if (!userContext || userContext.organization !== 'lodhagroup') {
      return {
        success: false,
        error: 'Design sheet creation is only available for lodhagroup users'
      };
    }

    // Get project details
    const projectResult = await query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );
    
    if (projectResult.rows.length === 0) {
      throw new Error('Project not found');
    }
    
    const project = projectResult.rows[0];
    const standardsContext = await getStandardsDocumentsContext(projectId);
    const userDocsContext = await getUserDocumentsContext(userId, projectId);

    const prompt = `You are creating a design sheet for ${userContext.name}.

PROJECT: ${project.name}
Sheet Type: ${sheetType}
Requirements: ${requirements}

${standardsContext}
${userDocsContext}

Create a comprehensive design sheet in JSON format with the following structure:
{
  "title": "Design Sheet Title",
  "project": "${project.name}",
  "date": "${new Date().toISOString()}",
  "preparedBy": "${userContext.name}",
  "sections": [
    {
      "heading": "Section Name",
      "content": "Section content with calculations, specifications, or details",
      "items": ["Item 1", "Item 2"]
    }
  ],
  "calculations": [
    {
      "description": "What is being calculated",
      "formula": "Formula used",
      "values": {"param": "value"},
      "result": "Calculated result with units"
    }
  ],
  "references": ["Standard or document referenced"],
  "notes": ["Important notes or assumptions"]
}

Include relevant design calculations, specifications, and reference applicable standards from uploaded documents.
Return ONLY valid JSON.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let sheetContent = response.text().trim();
    
    // Clean up JSON
    sheetContent = sheetContent.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedContent = JSON.parse(sheetContent);
    
    // Save to database
    const insertResult = await query(
      `INSERT INTO design_sheets (project_id, created_by_id, sheet_name, sheet_type, content, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING id`,
      [projectId, userId, parsedContent.title, sheetType, sheetContent]
    );
    
    return {
      success: true,
      sheetId: insertResult.rows[0].id,
      content: parsedContent,
      message: 'Design sheet created successfully'
    };
  } catch (error) {
    console.error('Error creating design sheet:', error);
    throw error;
  }
}

/**
 * Track schedule and deliveries for user
 */
export async function trackScheduleAndDelivery(userId, projectId = null) {
  if (!model) {
    throw new Error('Gemini AI is not configured');
  }

  try {
    const userContext = await getUserContext(userId);
    
    if (!userContext || userContext.organization !== 'lodhagroup') {
      return {
        success: false,
        error: 'Schedule tracking is only available for lodhagroup users'
      };
    }

    // Get drawing schedules
    let drawingQuery = `
      SELECT ds.*, p.name as project_name
      FROM drawing_schedules ds
      JOIN projects p ON ds.project_id = p.id
      LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
      WHERE (ptm.user_id = $1 OR p.assigned_lead_id = $1)
    `;
    const params = [userId];
    
    if (projectId) {
      params.push(projectId);
      drawingQuery += ` AND ds.project_id = $2`;
    }
    
    drawingQuery += ' ORDER BY ds.planned_submission_date ASC LIMIT 50';
    
    const drawingSchedules = await query(drawingQuery, params);
    
    // Get material deliveries
    let masQuery = `
      SELECT mas.*, p.name as project_name
      FROM material_approval_sheets mas
      JOIN projects p ON mas.project_id = p.id
      LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
      WHERE (ptm.user_id = $1 OR p.assigned_lead_id = $1)
      AND mas.final_status IN ('approved', 'pending')
    `;
    const masParams = [userId];
    
    if (projectId) {
      masParams.push(projectId);
      masQuery += ` AND mas.project_id = $2`;
    }
    
    masQuery += ' ORDER BY mas.created_at DESC LIMIT 50';
    
    const materialSchedules = await query(masQuery, masParams);

    const prompt = `Analyze the schedule and delivery status for ${userContext.name}.

DRAWING SCHEDULES (${drawingSchedules.rowCount} items):
${JSON.stringify(drawingSchedules.rows, null, 2)}

MATERIAL DELIVERIES (${materialSchedules.rowCount} items):
${JSON.stringify(materialSchedules.rows, null, 2)}

Provide a comprehensive summary including:
1. Overdue items (compare planned vs actual dates)
2. Upcoming deadlines (next 7 days, next 30 days)
3. On-track items
4. Material approval status and pending deliveries
5. Recommendations for immediate action

Format as a clear, actionable report.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    return {
      success: true,
      summary: summary,
      drawingCount: drawingSchedules.rowCount,
      materialCount: materialSchedules.rowCount
    };
  } catch (error) {
    console.error('Error tracking schedule:', error);
    throw error;
  }
}

/**
 * Save chat history
 */
export async function saveChatMessage(userId, projectId, sessionId, role, message, metadata = null) {
  try {
    await query(
      `INSERT INTO ai_chat_history (user_id, project_id, session_id, role, message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, projectId, sessionId, role, message, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (error) {
    console.error('Error saving chat message:', error);
  }
}

/**
 * Get chat history for session
 */
export async function getChatHistory(userId, sessionId, limit = 50) {
  try {
    const result = await query(
      `SELECT role, message, created_at 
       FROM ai_chat_history 
       WHERE user_id = $1 AND session_id = $2
       ORDER BY created_at ASC
       LIMIT $3`,
      [userId, sessionId, limit]
    );
    
    return result.rows.map(row => ({
      role: row.role,
      content: row.message,
      timestamp: row.created_at
    }));
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
}