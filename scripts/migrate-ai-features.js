import { query, closePool } from '../server/db.js';

async function migrateAIFeatures() {
  console.log('🚀 Starting AI features migration...\n');

  try {
    // 1. Add organization column to users table
    console.log('1. Adding organization column to users table...');
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS organization VARCHAR(255) DEFAULT 'lodhagroup'
    `);
    console.log('   ✓ Organization column added\n');

    // 2. Create user_documents table
    console.log('2. Creating user_documents table...');
    await query(`
      CREATE TABLE IF NOT EXISTS user_documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        document_name VARCHAR(255) NOT NULL,
        document_type VARCHAR(100),
        file_url TEXT NOT NULL,
        file_size INTEGER,
        content_text TEXT,
        metadata JSONB,
        is_indexed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ user_documents table created\n');

    // 3. Create ai_chat_history table
    console.log('3. Creating ai_chat_history table...');
    await query(`
      CREATE TABLE IF NOT EXISTS ai_chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
        message TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ ai_chat_history table created\n');

    // 4. Create design_sheets table
    console.log('4. Creating design_sheets table...');
    await query(`
      CREATE TABLE IF NOT EXISTS design_sheets (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        created_by_id INTEGER NOT NULL REFERENCES users(id),
        sheet_name VARCHAR(255) NOT NULL,
        sheet_type VARCHAR(100),
        content JSONB NOT NULL,
        pdf_url TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ design_sheets table created\n');

    // 5. Create user_preferences table
    console.log('5. Creating user_preferences table...');
    await query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        ai_enabled BOOLEAN DEFAULT TRUE,
        preferred_response_style VARCHAR(50) DEFAULT 'professional',
        notification_preferences JSONB,
        dashboard_layout JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ user_preferences table created\n');

    // 6. Create indexes
    console.log('6. Creating indexes...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_documents_project ON user_documents(project_id);
      CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user ON ai_chat_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_chat_history_session ON ai_chat_history(session_id);
      CREATE INDEX IF NOT EXISTS idx_design_sheets_project ON design_sheets(project_id);
      CREATE INDEX IF NOT EXISTS idx_design_sheets_created_by ON design_sheets(created_by_id);
      CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization);
    `);
    console.log('   ✓ Indexes created\n');

    // 7. Update existing users to lodhagroup organization
    console.log('7. Updating existing users to lodhagroup organization...');
    const result = await query(`
      UPDATE users 
      SET organization = 'lodhagroup' 
      WHERE organization IS NULL
    `);
    console.log(`   ✓ Updated ${result.rowCount} users\n`);

    // 8. Create default user preferences for existing users
    console.log('8. Creating default user preferences...');
    await query(`
      INSERT INTO user_preferences (user_id, ai_enabled, preferred_response_style)
      SELECT id, true, 'professional' 
      FROM users
      WHERE id NOT IN (SELECT user_id FROM user_preferences)
    `);
    console.log('   ✓ User preferences created\n');

    console.log('✅ AI features migration completed successfully!\n');
    console.log('📝 Summary:');
    console.log('   - Organization field added to users');
    console.log('   - Document management tables created');
    console.log('   - AI chat history tracking enabled');
    console.log('   - Design sheets feature ready');
    console.log('   - User preferences initialized');
    console.log('\n💡 AI Assistant is now available for all lodhagroup users!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Run migration
migrateAIFeatures().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
