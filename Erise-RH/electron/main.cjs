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

// Organization Department Todo Database
const ORG_SUPABASE_URL = process.env.VITE_ORG_SUPABASE_URL || 'https://yzeclqpdiajahopzlcag.supabase.co';
const ORG_SUPABASE_SECRET_KEY = 
  process.env.ORG_SUPABASE_SECRET_KEY || 
  Buffer.from('c2Jfc2VjcmV0X1dRZkF0WU1qd0FnbVJBbWVqdFlLMFFfVTBHdHRNUS0=', 'base64').toString('utf8');

let supabaseOrgAdmin;
try {
  supabaseOrgAdmin = createClient(ORG_SUPABASE_URL, ORG_SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
} catch (e) {
  console.error('[Main] Supabase Org client init error:', e);
}

// --- Intelligent Multi-Tier Matching Engine for Member Bridge ---
function normalizeName(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDist(a, b) {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;
  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      if (b[j - 1] === a[i - 1]) matrix[j][i] = matrix[j - 1][i - 1];
      else matrix[j][i] = Math.min(matrix[j - 1][i - 1] + 1, matrix[j][i - 1] + 1, matrix[j - 1][i] + 1);
    }
  }
  return matrix[bn][an];
}

function matchOrgProfileToMember(profile, registrations) {
  if (!profile || !registrations) return null;
  const rawEmail = (profile.email || '').toLowerCase().trim();
  const cleanEmail = rawEmail.replace(/hns-re2esddz/g, 'hns-re2sd.dz');
  const pName = normalizeName(profile.full_name);
  const pTokens = new Set(pName.split(' ').filter(Boolean));
  const pEmailUser = cleanEmail.split('@')[0];

  // Tier 1: Exact Email
  for (const reg of registrations) {
    const rEmail = (reg.email || '').toLowerCase().trim();
    if (cleanEmail && rEmail && cleanEmail === rEmail) return reg;
  }

  // Tier 2: University email username
  if (pEmailUser && pEmailUser.length > 3) {
    for (const reg of registrations) {
      const rEmail = (reg.email || '').toLowerCase().trim();
      if (rEmail.split('@')[0] === pEmailUser) return reg;
    }
  }

  // Tier 3: Exact Normalized Name
  for (const reg of registrations) {
    if (pName && normalizeName(reg.full_name) === pName) return reg;
  }

  // Tier 4: Inverted / Permuted Name Tokens
  for (const reg of registrations) {
    const rTokens = new Set(normalizeName(reg.full_name).split(' ').filter(Boolean));
    if (pTokens.size > 1 && rTokens.size > 1) {
      const intersect = [...pTokens].filter(t => rTokens.has(t));
      if (intersect.length === pTokens.size && intersect.length === rTokens.size) return reg;
    }
  }

  // Tier 5: Substring / Subset Tokens
  for (const reg of registrations) {
    const rTokens = new Set(normalizeName(reg.full_name).split(' ').filter(Boolean));
    const intersect = [...pTokens].filter(t => rTokens.has(t));
    if (intersect.length > 0 && (intersect.length === pTokens.size || intersect.length === rTokens.size)) return reg;
  }

  // Tier 6: Fuzzy Levenshtein >= 80%
  let bestMatch = null;
  let highestSim = 0;
  for (const reg of registrations) {
    const rName = normalizeName(reg.full_name);
    const maxLen = Math.max(pName.length, rName.length);
    const sim = maxLen === 0 ? 1.0 : 1.0 - levenshteinDist(pName, rName) / maxLen;
    if (sim > highestSim && sim >= 0.80) {
      highestSim = sim;
      bestMatch = reg;
    }
  }
  return bestMatch;
}

// 1. Fetch all members with 50% baseline ratings and unified evaluation bridge
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

    // Merge Organization App task completions using Intelligent Matcher
    let orgProfilesList = [];
    if (supabaseOrgAdmin) {
      try {
        const [orgProfilesRes, orgTasksRes, orgAssignRes] = await Promise.all([
          supabaseOrgAdmin.from('profiles').select('*'),
          supabaseOrgAdmin.from('tasks').select('*'),
          supabaseOrgAdmin.from('task_assignments').select('*'),
        ]);

        orgProfilesList = orgProfilesRes.data || [];
        const orgTasks = orgTasksRes.data || [];
        const orgAssignments = orgAssignRes.data || [];

        // Build orgUserId -> matched registration lookup
        const orgUserToMember = new Map();
        orgProfilesList.forEach((p) => {
          const matched = matchOrgProfileToMember(p, registrations);
          if (matched) {
            orgUserToMember.set(p.id, matched);
          }
        });

        // Map task assignments to check completions
        const assignmentsByTask = new Map();
        orgAssignments.forEach((a) => {
          if (!assignmentsByTask.has(a.task_id)) assignmentsByTask.set(a.task_id, []);
          assignmentsByTask.get(a.task_id).push(a.user_id);
        });

        // Award completed tasks from Org DB
        orgTasks.forEach((t) => {
          const isCompleted = t.due_at && new Date(t.due_at).getTime() < Date.now();
          if (isCompleted) {
            const assignedUsers = assignmentsByTask.get(t.id) || [];
            assignedUsers.forEach((orgUId) => {
              const matchedMember = orgUserToMember.get(orgUId);
              if (matchedMember) {
                tasksByMember.set(matchedMember.id, (tasksByMember.get(matchedMember.id) || 0) + 1);
              }
            });
          }
        });
      } catch (orgErr) {
        console.warn('[Main] Error processing Org DB tasks for evaluation:', orgErr);
      }
    }

    const BASELINE = 50.0;
    const membersList = (registrations || []).map((reg) => {
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
        departments: depts,
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

    // Merge any unmatched Organization App Profiles into members list
    if (orgProfilesList.length > 0) {
      const existingEmails = new Set(membersList.map((m) => (m.email || '').toLowerCase().trim()));
      const existingNames = new Set(membersList.map((m) => normalizeName(m.full_name)));

      orgProfilesList.forEach((p) => {
        const pEmail = (p.email || '').toLowerCase().trim();
        const pNorm = normalizeName(p.full_name);
        const alreadyIncluded = existingEmails.has(pEmail) || existingNames.has(pNorm);

        if (!alreadyIncluded) {
          membersList.push({
            id: p.id,
            full_name: p.full_name || 'Organization Member',
            email: p.email || '',
            phone: p.edu_number ? `Matricule: ${p.edu_number}` : '',
            department: 'Organization',
            departments: ['Organization'],
            sub_department: `Role: ${p.role}`,
            skills: `Student ID: ${p.edu_number || '—'}`,
            academic_year: 'Organization App',
            motivation: '',
            status: p.status === 'approved' ? 'approved' : (p.status === 'rejected' ? 'rejected' : 'pending'),
            created_at: p.created_at,
            baseline_rating: 50.0,
            overall_rating: 50.0,
            tasks_completed: 0,
            attendance_present: 0,
            attendance_absent: 0,
            manual_adjustment: 0,
            rating_tier: 'Baseline',
            evaluation_notes: `Synced from Organization Todo App (Role: ${p.role})`,
            source: 'org_app'
          });
        }
      });
    }

    return membersList;
  } catch (err) {
    console.error('[Main] db-fetch-members error:', err);
    return [];
  }
});

// 2. Fetch projects/tasks from Primary DB + Organization Todo App
ipcMain.handle('db-fetch-tasks', async () => {
  try {
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Main] db-fetch-tasks primary error:', error);
    }

    const { data: members } = await supabaseAdmin
      .from('registrations')
      .select('id, full_name, email');

    const memberNameMap = new Map();
    (members || []).forEach((m) => memberNameMap.set(m.id, m.full_name || `Member #${m.id}`));

    const primaryTasks = (projects || []).map((p) => {
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

    // Merge tasks from Organization Todo App (yzeclqpdiajahopzlcag)
    let mergedTasks = primaryTasks;
    if (supabaseOrgAdmin) {
      try {
        const [orgTasksRes, orgAssignRes, orgProfilesRes] = await Promise.all([
          supabaseOrgAdmin.from('tasks').select('*').order('created_at', { ascending: false }),
          supabaseOrgAdmin.from('task_assignments').select('*'),
          supabaseOrgAdmin.from('profiles').select('*')
        ]);

        const orgTasks = orgTasksRes.data || [];
        const orgAssignments = orgAssignRes.data || [];
        const orgProfiles = orgProfilesRes.data || [];

        const profileMap = new Map();
        orgProfiles.forEach((p) => profileMap.set(p.id, p));

        // Group assignments by task_id
        const taskAssignmentsMap = new Map();
        orgAssignments.forEach((a) => {
          if (!taskAssignmentsMap.has(a.task_id)) taskAssignmentsMap.set(a.task_id, []);
          taskAssignmentsMap.get(a.task_id).push(a.user_id);
        });

        const orgFormattedTasks = orgTasks.map((t) => {
          const userIds = taskAssignmentsMap.get(t.id) || [];
          const assignedMemberIds = [];
          const assignedMemberNames = [];

          userIds.forEach((uId) => {
            const orgProf = profileMap.get(uId);
            const matchedReg = matchOrgProfileToMember(orgProf, members);
            if (matchedReg) {
              assignedMemberIds.push(matchedReg.id);
              assignedMemberNames.push(matchedReg.full_name);
            } else if (orgProf) {
              assignedMemberIds.push(orgProf.id);
              assignedMemberNames.push(orgProf.full_name);
            } else {
              assignedMemberIds.push(uId);
              assignedMemberNames.push(`User ${String(uId).slice(0, 6)}`);
            }
          });

          const isCompleted = t.due_at && new Date(t.due_at).getTime() < Date.now();
          const status = isCompleted ? 'completed' : 'in_progress';

          return {
            id: String(t.id),
            department: 'Organization',
            title: t.title || 'Organization Assignment',
            description: t.description || '',
            assigned_member_ids: assignedMemberIds,
            assigned_member_names: assignedMemberNames,
            status,
            priority: 'high',
            created_at: t.created_at || new Date().toISOString(),
            completed_at: isCompleted ? (t.due_at || t.created_at) : undefined,
            hr_points_awarded: isCompleted,
            source: 'org_app'
          };
        });

        const existingIds = new Set(primaryTasks.map((p) => String(p.id)));
        const mirroredOrgIds = new Set(primaryTasks.map((p) => p.member_custom_roles?.org_task_id).filter(Boolean));
        const uniqueOrgTasks = orgFormattedTasks.filter((ot) => !existingIds.has(String(ot.id)) && !mirroredOrgIds.has(String(ot.id)));
        mergedTasks = [...uniqueOrgTasks, ...primaryTasks];
      } catch (orgErr) {
        console.warn('[Main] Error merging Org DB tasks in db-fetch-tasks:', orgErr);
      }
    }

    return mergedTasks;
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

// Setup Realtime subscriptions for Organization DB
if (supabaseOrgAdmin) {
  try {
    supabaseOrgAdmin
      .channel('rh-org-ipc-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('db-change', { table: 'projects', payload });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, (payload) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('db-change', { table: 'projects', payload });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('db-change', { table: 'registrations', payload });
        }
      })
      .subscribe((status) => {
        console.log('[Main] Org DB Realtime subscription status:', status);
      });
  } catch (e) {
    console.warn('[Main] Org DB Realtime channel setup warning:', e);
  }
}

