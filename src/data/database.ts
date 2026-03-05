import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const openDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
    if (!db) {
        db = await SQLite.openDatabaseAsync('flowgym.db');
    }
    return db;
};

export const initDatabase = async (): Promise<void> => {
    const database = await openDatabase();

    // Step 1: Create tables with minimal safe schema (no new columns that might not exist on old DBs)
    await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS CheckIns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      energy INTEGER NOT NULL,
      mood INTEGER NOT NULL,
      focus INTEGER NOT NULL,
      sleep INTEGER NOT NULL,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS UserHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS Goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS UserProfile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS GoalLogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (goal_id) REFERENCES Goals (id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS SkillStats (
      skill_id TEXT PRIMARY KEY,
      shown INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0,
      postponed INTEGER NOT NULL DEFAULT 0,
      avg_rating REAL DEFAULT 0,
      last_shown_date TEXT,
      last_completed_date TEXT
    );
    CREATE TABLE IF NOT EXISTS AiMessageLog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      context_hash TEXT,
      message_key TEXT NOT NULL,
      tone TEXT NOT NULL
    );
  `);

    // Step 2: Safely attempt to migrate older databases (add columns one by one)
    const migrations = [
        'ALTER TABLE CheckIns ADD COLUMN drive INTEGER NOT NULL DEFAULT 3;',
        'ALTER TABLE CheckIns ADD COLUMN timestamp TEXT;',
        'ALTER TABLE Goals ADD COLUMN type TEXT NOT NULL DEFAULT "short";',
        'ALTER TABLE Goals ADD COLUMN progress INTEGER NOT NULL DEFAULT 0;',
        'ALTER TABLE Goals ADD COLUMN target INTEGER NOT NULL DEFAULT 1;',
        'ALTER TABLE Goals ADD COLUMN status TEXT NOT NULL DEFAULT "active";',
        'ALTER TABLE UserProfile ADD COLUMN name TEXT;',
        'ALTER TABLE UserProfile ADD COLUMN birth_year INTEGER;',
        'ALTER TABLE UserProfile ADD COLUMN streak_target INTEGER NOT NULL DEFAULT 7;'
    ];

    for (const sql of migrations) {
        try {
            await database.execAsync(sql);
        } catch (e) {
            // column likely exists, ignore
        }
    }

    // Step 3: Ensure default profile row exists (AFTER migrations so all columns are available)
    await database.execAsync(
        `INSERT OR IGNORE INTO UserProfile (id, level, xp, name, birth_year, streak_target) VALUES (1, 1, 0, '', null, 7);`
    );

    console.log("Database initialized and migrations checked");
};

export const saveCheckIn = async (energy: number, mood: number, focus: number, sleep: number, drive: number): Promise<number> => {
    const database = await openDatabase();
    const isoString = new Date().toISOString();
    const date = isoString.split('T')[0];
    const result = await database.runAsync(
        'INSERT INTO CheckIns (date, timestamp, energy, mood, focus, sleep, drive) VALUES (?, ?, ?, ?, ?, ?, ?)',
        date, isoString, energy, mood, focus, sleep, drive
    );
    return result.lastInsertRowId;
};

export const saveSkillHistory = async (skillId: string, completed: boolean): Promise<number> => {
    const database = await openDatabase();
    const date = new Date().toISOString().split('T')[0];
    const result = await database.runAsync(
        'INSERT INTO UserHistory (date, skill_id, completed) VALUES (?, ?, ?)',
        date, skillId, completed ? 1 : 0
    );
    return result.lastInsertRowId;
};

export type CheckInRecord = {
    id: number;
    date: string;
    timestamp?: string;
    energy: number;
    mood: number;
    focus: number;
    sleep: number;
    drive: number;
    notes: string | null;
};

export const getWeeklyCheckIns = async (): Promise<CheckInRecord[]> => {
    const database = await openDatabase();
    const allRows = await database.getAllAsync<CheckInRecord>('SELECT * FROM CheckIns ORDER BY date DESC LIMIT 7');
    return allRows;
};

export const getAverageCheckInHour = async (): Promise<number | null> => {
    const database = await openDatabase();
    // Get up to last 14 checkins to find their typical time
    const rows = await database.getAllAsync<{ timestamp: string }>(
        'SELECT timestamp FROM CheckIns WHERE timestamp IS NOT NULL ORDER BY date DESC LIMIT 14'
    );
    if (rows.length === 0) return null;

    let totalHours = 0;
    for (const row of rows) {
        const dateObj = new Date(row.timestamp);
        totalHours += dateObj.getHours() + (dateObj.getMinutes() / 60);
    }
    return totalHours / rows.length;
};

export const getCheckInsByRange = async (days: number): Promise<CheckInRecord[]> => {
    const database = await openDatabase();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    const allRows = await database.getAllAsync<CheckInRecord>(
        'SELECT * FROM CheckIns WHERE date >= ? ORDER BY date DESC',
        sinceStr
    );
    return allRows;
};

export type GoalRecord = {
    id: number;
    title: string;
    type: 'short' | 'mid' | 'long';
    progress: number;
    target: number;
    created_at: string;
    completed: number; // SQLite boolean (legacy)
    status: 'active' | 'completed' | 'failed';
};

export const saveGoal = async (title: string, type: 'short' | 'mid' | 'long', target: number): Promise<number> => {
    const database = await openDatabase();
    const date = new Date().toISOString().split('T')[0];
    const result = await database.runAsync(
        'INSERT INTO Goals (title, type, progress, target, created_at, completed, status) VALUES (?, ?, 0, ?, ?, 0, "active")',
        title, type, target, date
    );
    return result.lastInsertRowId;
};

export const getActiveGoals = async (): Promise<GoalRecord[]> => {
    const database = await openDatabase();
    const allRows = await database.getAllAsync<GoalRecord>('SELECT * FROM Goals WHERE status = "active" ORDER BY created_at DESC');
    return allRows;
};

export const getAllGoalsByStatus = async (statusFilter: 'active' | 'completed' | 'failed' | 'all'): Promise<GoalRecord[]> => {
    const database = await openDatabase();
    let rows: GoalRecord[] = [];
    if (statusFilter === 'all') {
        rows = await database.getAllAsync<GoalRecord>('SELECT * FROM Goals ORDER BY created_at DESC');
    } else {
        rows = await database.getAllAsync<GoalRecord>('SELECT * FROM Goals WHERE status = ? ORDER BY created_at DESC', statusFilter);
    }
    console.log(`[DB] Fetched ${rows.length} goals with filter: ${statusFilter}`);
    return rows;
};

export const getConsecutiveFailedGoals = async (): Promise<number> => {
    const database = await openDatabase();
    // Get up to the last 5 resolved goals
    const rows = await database.getAllAsync<GoalRecord>(
        'SELECT status FROM Goals WHERE status != "active" ORDER BY id DESC LIMIT 5'
    );
    let failedCount = 0;
    for (const row of rows) {
        if (row.status === 'failed') failedCount++;
        else break; // loop breaks if we hit a 'completed' goal
    }
    return failedCount;
};

export const updateGoalProgress = async (goalId: number): Promise<GoalRecord | null> => {
    const database = await openDatabase();

    // 1. Increment progress atomically
    await database.runAsync('UPDATE Goals SET progress = progress + 1 WHERE id = ?', goalId);

    // 2. Fetch updated state
    const goal = await database.getFirstAsync<GoalRecord>('SELECT * FROM Goals WHERE id = ?', goalId);

    if (goal) {
        console.log(`[DB] Goal ${goalId} update: ${goal.progress}/${goal.target} (Status: ${goal.status})`);
        return goal;
    }

    return null;
};

export const updateGoalStatus = async (goalId: number, status: 'active' | 'completed' | 'failed'): Promise<void> => {
    const database = await openDatabase();
    await database.runAsync('UPDATE Goals SET status = ? WHERE id = ?', status, goalId);
};

export type GoalLogRecord = {
    id: number;
    goal_id: number;
    note: string;
    created_at: string;
};

export const addGoalLog = async (goalId: number, note: string): Promise<number> => {
    const database = await openDatabase();
    const date = new Date().toISOString();
    const result = await database.runAsync(
        'INSERT INTO GoalLogs (goal_id, note, created_at) VALUES (?, ?, ?)',
        goalId, note, date
    );
    return result.lastInsertRowId;
};

export const getGoalLogs = async (goalId: number): Promise<GoalLogRecord[]> => {
    const database = await openDatabase();
    const rows = await database.getAllAsync<GoalLogRecord>(
        'SELECT * FROM GoalLogs WHERE goal_id = ? ORDER BY created_at DESC',
        goalId
    );
    return rows;
};

export type UserProfileRecord = {
    id: number;
    level: number;
    xp: number;
    name: string | null;
    birth_year: number | null;
    streak_target: number;
};

export const getUserProfile = async (): Promise<UserProfileRecord> => {
    const database = await openDatabase();
    const profile = await database.getFirstAsync<UserProfileRecord>('SELECT * FROM UserProfile WHERE id = 1');
    return profile || { id: 1, level: 1, xp: 0, name: '', birth_year: null, streak_target: 7 };
};

export const updateUserProfile = async (name: string, birthYear: number): Promise<void> => {
    const database = await openDatabase();
    await database.runAsync('UPDATE UserProfile SET name = ?, birth_year = ? WHERE id = 1', name, birthYear);
};

export const updateStreakTarget = async (target: number): Promise<void> => {
    const database = await openDatabase();
    await database.runAsync('UPDATE UserProfile SET streak_target = ? WHERE id = 1', target);
};

export const addXP = async (amount: number): Promise<{ oldLevel: number, newLevel: number, currentXP: number }> => {
    const database = await openDatabase();
    const profile = await getUserProfile();

    let newXP = profile.xp + amount;
    // Level boundary formula: Level = floor(sqrt(XP / 50)) + 1
    let newLevel = Math.floor(Math.sqrt(newXP / 50)) + 1;

    await database.runAsync('UPDATE UserProfile SET xp = ?, level = ? WHERE id = 1', newXP, newLevel);
    return { oldLevel: profile.level, newLevel, currentXP: newXP };
};

// --- Telemetry & Analytics Functions --- //

export type SkillStatsRecord = {
    skill_id: string;
    shown: number;
    completed: number;
    skipped: number;
    postponed: number;
    avg_rating: number;
    last_shown_date: string | null;
    last_completed_date: string | null;
};

export const getSkillStats = async (skillId: string): Promise<SkillStatsRecord | null> => {
    const database = await openDatabase();
    return await database.getFirstAsync<SkillStatsRecord>('SELECT * FROM SkillStats WHERE skill_id = ?', skillId);
};

export const getAllSkillStats = async (): Promise<SkillStatsRecord[]> => {
    const database = await openDatabase();
    return await database.getAllAsync<SkillStatsRecord>('SELECT * FROM SkillStats');
};

const ensureSkillStatsRow = async (database: SQLite.SQLiteDatabase, skillId: string) => {
    await database.runAsync(
        'INSERT OR IGNORE INTO SkillStats (skill_id) VALUES (?)',
        skillId
    );
};

export const recordSkillShown = async (skillId: string): Promise<void> => {
    const database = await openDatabase();
    await ensureSkillStatsRow(database, skillId);
    const date = new Date().toISOString().split('T')[0];
    await database.runAsync(
        'UPDATE SkillStats SET shown = shown + 1, last_shown_date = ? WHERE skill_id = ?',
        date, skillId
    );
};

export const recordSkillCompleted = async (skillId: string): Promise<void> => {
    const database = await openDatabase();
    await ensureSkillStatsRow(database, skillId);
    const date = new Date().toISOString().split('T')[0];
    await database.runAsync(
        'UPDATE SkillStats SET completed = completed + 1, last_completed_date = ? WHERE skill_id = ?',
        date, skillId
    );
};

export const recordSkillSkipped = async (skillId: string): Promise<void> => {
    const database = await openDatabase();
    await ensureSkillStatsRow(database, skillId);
    await database.runAsync(
        'UPDATE SkillStats SET skipped = skipped + 1 WHERE skill_id = ?',
        skillId
    );
};

export const recordSkillPostponed = async (skillId: string): Promise<void> => {
    const database = await openDatabase();
    await ensureSkillStatsRow(database, skillId);
    await database.runAsync(
        'UPDATE SkillStats SET postponed = postponed + 1 WHERE skill_id = ?',
        skillId
    );
};

export const upsertSkillRating = async (skillId: string, rating: number): Promise<void> => {
    const database = await openDatabase();
    await ensureSkillStatsRow(database, skillId);
    // Simple exponential moving average for rating
    const currentStats = await getSkillStats(skillId);
    let newAvg = rating;
    if (currentStats && currentStats.avg_rating > 0) {
        newAvg = (currentStats.avg_rating * 0.7) + (rating * 0.3);
    }
    await database.runAsync(
        'UPDATE SkillStats SET avg_rating = ? WHERE skill_id = ?',
        newAvg, skillId
    );
};

export type UserHistoryRecord = {
    id: number;
    date: string;
    skill_id: string;
    completed: number;
};

export const getSkillHistoryLastN = async (days: number): Promise<UserHistoryRecord[]> => {
    const database = await openDatabase();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    return await database.getAllAsync<UserHistoryRecord>(
        'SELECT * FROM UserHistory WHERE date >= ? ORDER BY date DESC',
        sinceStr
    );
};

export const logAiMessage = async (messageKey: string, tone: string, contextHash: string = ''): Promise<number> => {
    const database = await openDatabase();
    const date = new Date().toISOString();
    const result = await database.runAsync(
        'INSERT INTO AiMessageLog (date, context_hash, message_key, tone) VALUES (?, ?, ?, ?)',
        date, contextHash, messageKey, tone
    );
    return result.lastInsertRowId;
};

export const getRecentAiMessages = async (limit: number = 20): Promise<{ message_key: string, tone: string }[]> => {
    const database = await openDatabase();
    return await database.getAllAsync<{ message_key: string, tone: string }>(
        'SELECT message_key, tone FROM AiMessageLog ORDER BY id DESC LIMIT ?',
        limit
    );
};
