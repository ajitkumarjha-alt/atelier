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
 * Chat with database context
 */
export async function chatWithDatabase(userMessage, conversationHistory = [], projectId = null) {
  if (!model) {
    throw new Error('Gemini AI is not configured');
  }

  const schema = await getDatabaseSchema();
  const standardsContext = await getStandardsDocumentsContext(projectId);

  const systemContext = `You are an AI assistant for the Atelier MEP Project Management System.
You help users with project details, scheduling, design calculations, MAS/RFI analysis, and trends.

IMPORTANT RULES:
1. You can ONLY answer questions using data from the database and uploaded reference documents
2. Do NOT use external knowledge or make assumptions
3. If data is not in the database, say "I don't have that information in the database"
4. Be professional and concise
5. When discussing numbers, be specific (e.g., "5 pending MAS" not "several")
6. When asked about standards, codes, or regulations, refer to the uploaded reference documents
7. For design calculations, ensure compliance with uploaded standards documents

${schema}
${standardsContext}

Previous conversation:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User: ${userMessage}

Answer the user's question professionally and accurately based on the database schema, uploaded standards documents, and context above.`;

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