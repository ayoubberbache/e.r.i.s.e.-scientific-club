const { app, BrowserWindow, ipcMain, Notification, shell } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    frame: false, // Frameless custom title bar
    backgroundColor: '#f8fcfd',
    show: false,
    icon: path.join(__dirname, '../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false, // Allow API calls to Supabase from file:// protocol
    },
  });

  // Graceful show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Log renderer console messages to main process stdout
  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    console.log('[Renderer]', message);
  });

  // External link handler
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Determine URL/File to load
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Serve dist via local HTTP server to avoid file:// CORS issues with Supabase
    const http = require('http');
    const fs = require('fs');
    const distPath = path.join(__dirname, '../dist');
    
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript', 
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    };

    const server = http.createServer((req, res) => {
      let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      fs.readFile(filePath, (err, content) => {
        if (err) {
          // Fallback to index.html for SPA routing
          fs.readFile(path.join(distPath, 'index.html'), (err2, fallback) => {
            res.writeHead(err2 ? 404 : 200, { 'Content-Type': 'text/html' });
            res.end(err2 ? 'Not Found' : fallback);
          });
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log(`[Main] Serving dist on http://127.0.0.1:${port}`);
      mainWindow.loadURL(`http://127.0.0.1:${port}`);
    });
  }
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Window Controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Native Desktop Notifications
ipcMain.on('desktop-notify', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'ERISE RH Alert',
      body: body || 'New club operational activity detected.',
      silent: false,
    }).show();
  }
});

// =============================================================================
// NODE.JS SUPABASE SERVICE ROLE BRIDGE (Bypasses Browser RLS & Security Guards)
// =============================================================================
try {
  if (!globalThis.WebSocket) {
    globalThis.WebSocket = require('ws');
  }
} catch (e) {}

// Load local environment config if available
try {
  const fs = require('fs');
  const envFile = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf8').split('\n');
    for (const line of lines) {
      const idx = line.indexOf('=');
      if (idx > 0) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k && !process.env[k]) process.env[k] = v;
      }
    }
  }
} catch (e) {}

const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ygougrhejaesbtifacdk.supabase.co';
const SUPABASE_SECRET_KEY = 
  process.env.SUPABASE_SECRET_KEY || 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  Buffer.from('c2Jfc2VjcmV0XzBVbFlfQUp5b2dUSVhFN1Q2MklDVlFfR3ItRGJQZWw=', 'base64').toString('utf8');

let supabaseAdmin;
try {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
} catch (e) {
  console.error('[Main] Supabase client init error:', e);
}

// 1. Fetch all members with 50% baseline ratings
ipcMain.handle('db-fetch-members', async () => {
  try {
    const { data: registrations, error: regErr } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .order('registered_at', { ascending: false });

    if (regErr) {
      console.error('[Main] fetch-members registrations error:', regErr);
      return [];
    }

    const [ratingsRes, attRes, projRes] = await Promise.all([
      supabaseAdmin.from('member_ratings').select('*'),
      supabaseAdmin.from('attendance_logs').select('*'),
      supabaseAdmin.from('projects').select('*'),
    ]);

    const ratingsMap = new Map();
    (ratingsRes.data || []).forEach((r) => ratingsMap.set(r.member_id, r));

    const attendanceByMember = new Map();
    (attRes.data || []).forEach((log) => {
      const cur = attendanceByMember.get(log.member_id) || { present: 0, absent: 0 };
      if (log.status === 'Present') cur.present++;
      else if (log.status === 'Absent') cur.absent++;
      attendanceByMember.set(log.member_id, cur);
    });

    const tasksByMember = new Map();
    (projRes.data || []).forEach((p) => {
      const s = (p.status || '').toLowerCase();
      if ((s === 'completed' || s === 'done') && Array.isArray(p.team_member_ids)) {
        p.team_member_ids.forEach((id) => {
          tasksByMember.set(id, (tasksByMember.get(id) || 0) + 1);
        });
      }
    });

    const BASELINE = 50.0;
    return (registrations || []).map((reg) => {
      const att = attendanceByMember.get(reg.id) || { present: 0, absent: 0 };
      const tasksCompleted = tasksByMember.get(reg.id) || 0;
      const existingRating = ratingsMap.get(reg.id);
      const manualAdj = existingRating?.department_head_ratings?.hr_adjustment || 0;

      let score = BASELINE + att.present * 5.0 - att.absent * 5.0 + tasksCompleted * 5.0 + manualAdj;
      const overallRating = Math.max(0, Math.min(100, Math.round(score * 10) / 10));

      let tier = 'Baseline';
      if (overallRating >= 85) tier = 'Exceptional';
      else if (overallRating >= 65) tier = 'Solid Standing';
      else if (overallRating >= 45) tier = 'Baseline';
      else tier = 'Needs Improvement';

      const depts = Array.isArray(reg.departments) ? reg.departments : [];
      const primaryDept = depts[0] || 'General';

      return {
        id: reg.id,
        full_name: reg.full_name || 'Club Member',
        email: reg.email || '',
        phone: reg.phone || '',
        department: primaryDept,
        sub_department: reg.specialization || '',
        skills: reg.specialization || '',
        academic_year: reg.study_year ? `Year ${reg.study_year}` : '',
        motivation: '',
        status: reg.status || 'approved',
        created_at: reg.registered_at,
        baseline_rating: BASELINE,
        overall_rating: overallRating,
        tasks_completed: tasksCompleted,
        attendance_present: att.present,
        attendance_absent: att.absent,
        manual_adjustment: manualAdj,
        rating_tier: tier,
        evaluation_notes: existingRating?.notes || '',
        last_evaluated_at: existingRating?.last_evaluated_at,
      };
    });
  } catch (err) {
    console.error('[Main] db-fetch-members error:', err);
    return [];
  }
});

// 2. Fetch projects/tasks
ipcMain.handle('db-fetch-tasks', async () => {
  try {
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !projects) {
      console.error('[Main] db-fetch-tasks error:', error);
      return [];
    }

    const { data: members } = await supabaseAdmin
      .from('registrations')
      .select('id, full_name');

    const memberNameMap = new Map();
    (members || []).forEach((m) => memberNameMap.set(m.id, m.full_name || `Member #${m.id}`));

    return projects.map((p) => {
      const assignedIds = Array.isArray(p.team_member_ids)
        ? p.team_member_ids
        : Array.isArray(p.assigned_member_ids)
        ? p.assigned_member_ids
        : [];

      const assignedNames = assignedIds.map((id) => memberNameMap.get(id) || `Member #${id}`);
      const customRoles = p.member_custom_roles || {};

      let status = 'pending';
      const s = (p.status || '').toLowerCase();
      if (s === 'completed' || s === 'done') status = 'completed';
      else if (s === 'in_progress' || s === 'in progress' || s === 'in development' || s === 'active') status = 'in_progress';
      else if (s === 'planning' || s === 'pending' || s === 'draft') status = 'pending';

      return {
        id: String(p.id),
        department: p.department || 'Projects',
        title: p.title || 'Department Assignment',
        description: p.description || '',
        assigned_member_ids: assignedIds,
        assigned_member_names: assignedNames,
        status,
        priority: (customRoles.priority || 'medium').toLowerCase(),
        created_at: p.created_at || new Date().toISOString(),
        completed_at: status === 'completed' ? p.updated_at || new Date().toISOString() : undefined,
        hr_points_awarded: status === 'completed',
      };
    });
  } catch (err) {
    console.error('[Main] db-fetch-tasks error:', err);
    return [];
  }
});

// 3. Fetch events
ipcMain.handle('db-fetch-events', async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .order('id', { ascending: false });

    return error || !data ? [] : data;
  } catch (err) {
    console.error('[Main] db-fetch-events error:', err);
    return [];
  }
});

// 4. Fetch event registrations
ipcMain.handle('db-fetch-event-registrations', async (_event, eventId) => {
  try {
    let query = supabaseAdmin.from('event_registrations').select('*').order('registered_at', { ascending: false });
    if (eventId) query = query.eq('event_id', eventId);

    const { data: registrations, error: regErr } = await query;
    if (regErr || !registrations) return [];

    const [membersRes, eventsRes] = await Promise.all([
      supabaseAdmin.from('event_registration_members').select('*'),
      supabaseAdmin.from('events').select('id, title'),
    ]);

    const eventTitleMap = new Map();
    (eventsRes.data || []).forEach((e) => eventTitleMap.set(e.id, e.title));

    const membersByRegId = new Map();
    (membersRes.data || []).forEach((m) => {
      const list = membersByRegId.get(m.registration_id) || [];
      list.push(m);
      membersByRegId.set(m.registration_id, list);
    });

    return registrations.map((r) => ({
      id: r.id,
      event_id: r.event_id,
      event_title: eventTitleMap.get(r.event_id) || `Event #${r.event_id}`,
      registration_type: r.registration_type || 'individual',
      team_name: r.team_name,
      institution: r.institution || 'N/A',
      study_year: r.study_year || 'N/A',
      has_companion: !!r.has_companion,
      companion_name: r.companion_name,
      companion_role: r.companion_role,
      status: r.status || 'pending',
      registered_at: r.registered_at,
      members: membersByRegId.get(r.id) || [],
    }));
  } catch (err) {
    console.error('[Main] db-fetch-event-registrations error:', err);
    return [];
  }
});

// 5. Fetch attendance logs
ipcMain.handle('db-fetch-attendance-logs', async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('attendance_logs')
      .select('*')
      .order('session_date', { ascending: false });

    if (error || !data) return [];

    const { data: regs } = await supabaseAdmin.from('registrations').select('id, full_name');
    const memberMap = new Map();
    (regs || []).forEach((r) => memberMap.set(r.id, r.full_name || `Member #${r.id}`));

    return data.map((d) => ({
      id: d.id,
      member_id: d.member_id,
      member_name: memberMap.get(d.member_id) || `Member #${d.member_id}`,
      event_id: d.event_id,
      event_title: d.event_title || 'Technical Workshop',
      session_date: d.session_date,
      status: d.status,
      absence_reason: d.absence_reason,
      created_at: d.created_at,
    }));
  } catch (err) {
    console.error('[Main] db-fetch-attendance-logs error:', err);
    return [];
  }
});

// 6. Submit appraisal
ipcMain.handle('db-submit-appraisal', async (_event, appraisal) => {
  try {
    const totalDelta = appraisal.punctuality + appraisal.teamwork + appraisal.initiative + appraisal.quality_of_work;
    const now = new Date().toISOString();

    const { data: existing } = await supabaseAdmin
      .from('member_ratings')
      .select('*')
      .eq('member_id', appraisal.member_id)
      .single();

    if (existing) {
      const updatedHeadRatings = {
        ...(existing.department_head_ratings || {}),
        hr_adjustment: totalDelta,
        criteria: {
          punctuality: appraisal.punctuality,
          teamwork: appraisal.teamwork,
          initiative: appraisal.initiative,
          quality_of_work: appraisal.quality_of_work,
        },
      };

      await supabaseAdmin
        .from('member_ratings')
        .update({
          department_head_ratings: updatedHeadRatings,
          notes: appraisal.notes,
          last_evaluated_at: now,
        })
        .eq('member_id', appraisal.member_id);
    } else {
      await supabaseAdmin.from('member_ratings').insert({
        member_id: appraisal.member_id,
        overall_rating: 50.0 + totalDelta,
        department_head_ratings: {
          hr_adjustment: totalDelta,
          criteria: {
            punctuality: appraisal.punctuality,
            teamwork: appraisal.teamwork,
            initiative: appraisal.initiative,
            quality_of_work: appraisal.quality_of_work,
          },
        },
        notes: appraisal.notes,
        last_evaluated_at: now,
      });
    }
    return true;
  } catch (err) {
    console.error('[Main] db-submit-appraisal error:', err);
    return false;
  }
});

// 7. Update member status
ipcMain.handle('db-update-member-status', async (_event, { id, status }) => {
  try {
    const { error } = await supabaseAdmin
      .from('registrations')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[Main] db-update-member-status error:', err);
    return false;
  }
});

// Setup Realtime subscriptions in Node.js main process
try {
  supabaseAdmin
    .channel('rh-main-ipc-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('db-change', { table: 'registrations', payload });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('db-change', { table: 'projects', payload });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'event_registrations' }, (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('db-change', { table: 'event_registrations', payload });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('db-change', { table: 'attendance_logs', payload });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'member_ratings' }, (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('db-change', { table: 'member_ratings', payload });
      }
    })
    .subscribe((status) => {
      console.log('[Main] Realtime subscription status:', status);
    });
} catch (e) {
  console.warn('[Main] Realtime channel setup warning:', e);
}
