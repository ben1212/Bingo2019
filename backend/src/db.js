const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[DB] WARNING: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables!');
}

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

// SQL-compatible helper for single record
async function get(query, params = []) {
  const q = query.trim();
  const selectMatch = q.match(/^SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+\d+)?$/i);
  
  if (selectMatch) {
    const table = selectMatch[2];
    const whereClause = selectMatch[3];
    let builder = supabase.from(table).select('*');

    if (whereClause) {
      if (whereClause.includes('telegram_id = ?') || whereClause.includes('telegram_id = $1')) {
        builder = builder.eq('telegram_id', String(params[0]));
      } else if (whereClause.includes('id = ?') || whereClause.includes('id = $1')) {
        builder = builder.eq('id', params[0]);
      } else if (whereClause.includes('username = ?') || whereClause.includes('phone = ?')) {
        const val = params[0];
        builder = builder.or(`username.eq.${val},phone.eq.${val}`);
      } else if (whereClause.includes('username = ?')) {
        builder = builder.eq('username', params[0]);
      } else if (whereClause.includes('phone = ?')) {
        builder = builder.eq('phone', params[0]);
      } else if (whereClause.includes('referral_code = ?')) {
        builder = builder.eq('referral_code', params[0]);
      } else if (whereClause.includes('status = ?')) {
        builder = builder.eq('status', params[0]);
      } else if (whereClause.includes('code = ?')) {
        builder = builder.eq('code', params[0]);
      } else if (whereClause.includes('key = ?')) {
        builder = builder.eq('key', params[0]);
      }
    }

    if (selectMatch[4]) {
      const orderParts = selectMatch[4].trim().split(/\s+/);
      builder = builder.order(orderParts[0], { ascending: !orderParts[1] || orderParts[1].toUpperCase() === 'ASC' });
    }

    const { data, error } = await builder.limit(1).maybeSingle();
    if (error) console.error('[DB get Error]', error.message, 'Query:', q);
    return data || null;
  }

  // Fallback direct RPC
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query, params });
    if (!error && data && data.length > 0) return data[0];
  } catch (e) {}

  return null;
}

// SQL-compatible helper for multiple records
async function all(query, params = []) {
  const q = query.trim();
  const selectMatch = q.match(/^SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);

  if (selectMatch) {
    const table = selectMatch[2];
    const whereClause = selectMatch[3];
    let builder = supabase.from(table).select('*');

    if (whereClause) {
      if (whereClause.includes('user_id = ?')) {
        builder = builder.eq('user_id', params[0]);
      } else if (whereClause.includes('status = ?')) {
        builder = builder.eq('status', params[0]);
      } else if (whereClause.includes('is_active = ?')) {
        builder = builder.eq('is_active', !!params[0]);
      } else if (whereClause.includes('referrer_id = ?')) {
        builder = builder.eq('referrer_id', params[0]);
      }
    }

    if (selectMatch[4]) {
      const orderParts = selectMatch[4].trim().split(/\s+/);
      builder = builder.order(orderParts[0], { ascending: !orderParts[1] || orderParts[1].toUpperCase() === 'ASC' });
    }

    if (selectMatch[5]) {
      builder = builder.limit(parseInt(selectMatch[5], 10));
    }

    const { data, error } = await builder;
    if (error) console.error('[DB all Error]', error.message);
    return data || [];
  }

  return [];
}

// SQL-compatible helper for INSERT / UPDATE / DELETE
async function run(query, params = []) {
  const q = query.trim();

  // INSERT INTO users
  if (q.startsWith('INSERT INTO users')) {
    const fieldsMatch = q.match(/INSERT\s+INTO\s+users\s*\((.+?)\)\s*VALUES/is);
    if (fieldsMatch) {
      const fieldNames = fieldsMatch[1].split(',').map(s => s.trim());
      const row = {};
      fieldNames.forEach((field, idx) => {
        row[field] = params[idx] !== undefined ? params[idx] : null;
      });

      const { data, error } = await supabase.from('users').insert(row).select('id').single();
      if (error) {
        console.error('[DB Insert User Error]', error.message);
        throw error;
      }
      return { lastID: data?.id, changes: 1 };
    }
  }

  // UPDATE users SET ... WHERE id = ?
  if (q.startsWith('UPDATE users')) {
    const whereMatch = q.match(/WHERE\s+id\s*=\s*\?/i);
    if (whereMatch) {
      const idVal = params[params.length - 1];
      const setMatch = q.match(/SET\s+(.+?)\s+WHERE/is);
      if (setMatch) {
        const setClauses = setMatch[1].split(',').map(s => s.trim());
        const updateData = {};
        setClauses.forEach((clause, idx) => {
          const colName = clause.split('=')[0].trim();
          updateData[colName] = params[idx];
        });

        const { error } = await supabase.from('users').update(updateData).eq('id', idVal);
        if (error) console.error('[DB Update User Error]', error.message);
        return { changes: error ? 0 : 1 };
      }
    }
  }

  return { changes: 1 };
}

module.exports = {
  supabase,
  get,
  all,
  run
};
