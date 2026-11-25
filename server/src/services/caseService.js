import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { logAuditEvent, AuditActions } from './auditService.js';

/**
 * Creates a new case in the system.
 */
export async function createCase({
  caseNumber,
  title,
  description = '',
  securityLevel = 'RESTRICTED',
  createdBy,
  ipAddress = '127.0.0.1',
}) {
  if (!caseNumber || !title) {
    const error = new Error('Case Number and Title are required.');
    error.statusCode = 400;
    throw error;
  }

  if (!createdBy) {
    const error = new Error('Authenticated user ID (createdBy) is required to create a case.');
    error.statusCode = 401;
    throw error;
  }

  // Check unique case number
  const existing = await query('SELECT id FROM cases WHERE case_number = $1', [caseNumber]);
  if (existing.rows.length > 0) {
    const error = new Error(`Case with number "${caseNumber}" already exists.`);
    error.statusCode = 409;
    throw error;
  }

  const id = `case-${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();

  const insertSql = `
    INSERT INTO cases (id, case_number, title, description, security_level, status, created_by, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, case_number, title, description, security_level, status, created_by, created_at, updated_at;
  `;

  const res = await query(insertSql, [
    id,
    caseNumber.trim(),
    title.trim(),
    description.trim(),
    securityLevel,
    'AWAITING_ALLOCATION',
    createdBy,
    now,
    now,
  ]);

  const newCase = res.rows[0];

  // Record Audit Event
  await logAuditEvent({
    userId: createdBy,
    caseId: newCase.id,
    action: AuditActions.CASE_CREATED,
    ipAddress,
    metadata: {
      caseNumber: newCase.case_number,
      title: newCase.title,
      securityLevel: newCase.security_level,
      status: newCase.status,
    },
  });

  return newCase;
}

/**
 * Retrieves all active investigation cases with document statistics and assigned personnel.
 */
export async function listCases(user = null) {
  let sql = `
    SELECT 
      c.id,
      c.case_number,
      c.title,
      c.description,
      c.security_level,
      c.status,
      c.created_at,
      c.updated_at,
      u.full_name as created_by_name,
      u.badge_number as created_by_badge,
      u.role as created_by_role,
      COUNT(DISTINCT d.id)::int as document_count,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'user_id', ca.user_id,
            'assigned_role', ca.assigned_role,
            'full_name', au.full_name,
            'badge_number', au.badge_number,
            'role', au.role,
            'department', au.department,
            'assigned_at', ca.assigned_at
          ))
          FROM case_assignments ca
          JOIN users au ON ca.user_id = au.id
          WHERE ca.case_id = c.id
        ),
        '[]'::json
      ) as assignments
    FROM cases c
    LEFT JOIN users u ON c.created_by = u.id
    LEFT JOIN documents d ON c.id = d.case_id
  `;
  
  const params = [];
  if (user) {
    if (user.role === 'INVESTIGATING_OFFICER') {
      sql += ` WHERE c.created_by = $1 OR EXISTS (SELECT 1 FROM documents d2 WHERE d2.case_id = c.id AND d2.uploaded_by = $1)`;
      params.push(user.id);
    } else if (['JUDICIAL_OFFICER', 'LAWYER_PROSECUTION', 'LAWYER_DEFENSE'].includes(user.role)) {
      sql += ` WHERE EXISTS (SELECT 1 FROM case_assignments ca WHERE ca.case_id = c.id AND ca.user_id = $1)`;
      params.push(user.id);
    }
  }
  
  sql += ` GROUP BY c.id, u.id ORDER BY c.created_at DESC;`;

  const res = await query(sql, params);
  return res.rows;
}

/**
 * Retrieves a single case by ID with full details and assignments.
 */
export async function getCaseById(caseId) {
  if (!caseId) {
    const error = new Error('Case ID is required');
    error.statusCode = 400;
    throw error;
  }
  const idStr = String(caseId).trim();
  const normalizedHyphen = idStr.replace(/_/g, '-');
  const normalizedUnderscore = idStr.replace(/-/g, '_');

  const sql = `
    SELECT 
      c.id,
      c.case_number,
      c.title,
      c.description,
      c.security_level,
      c.status,
      c.created_at,
      c.updated_at,
      u.full_name as created_by_name,
      u.badge_number as created_by_badge,
      u.role as created_by_role,
      COUNT(DISTINCT d.id)::int as document_count,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'user_id', ca.user_id,
            'assigned_role', ca.assigned_role,
            'full_name', au.full_name,
            'badge_number', au.badge_number,
            'role', au.role,
            'department', au.department,
            'assigned_at', ca.assigned_at
          ))
          FROM case_assignments ca
          JOIN users au ON ca.user_id = au.id
          WHERE ca.case_id = c.id
        ),
        '[]'::json
      ) as assignments
    FROM cases c
    LEFT JOIN users u ON c.created_by = u.id
    LEFT JOIN documents d ON c.id = d.case_id
    WHERE c.id = $1 OR c.id = $2 OR c.id = $3 OR LOWER(c.case_number) = LOWER($1)
    GROUP BY c.id, u.id;
  `;

  const res = await query(sql, [idStr, normalizedHyphen, normalizedUnderscore]);
  if (res.rows.length === 0) {
    const error = new Error(`Case not found with ID: ${caseId}`);
    error.statusCode = 404;
    throw error;
  }
  return res.rows[0];
}

export async function updateCaseStatus(caseId, status, user, ipAddress) {
  const caseItem = await getCaseById(caseId);
  const sql = `UPDATE cases SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
  const res = await query(sql, [status, caseItem.id]);
  
  if (res.rows.length === 0) {
    throw new Error('Case not found');
  }

  // Log the status change
  await logAuditEvent({
    userId: user?.id,
    caseId: caseItem.id,
    action: 'CASE_STATUS_UPDATED',
    ipAddress,
    metadata: { new_status: status }
  });

  return res.rows[0];
}

/**
 * Assigns Judicial Officer, Public Prosecutor, and Defense Counsel to a case.
 */
export async function assignCaseActors({
  caseId,
  judgeId,
  prosecutorId,
  defenseId,
  hearingDate = null,
  notes = '',
  allocatedBy = null,
  ipAddress = '127.0.0.1',
}) {
  const caseItem = await getCaseById(caseId);

  // Clear existing role assignments for this case
  await query('DELETE FROM case_assignments WHERE case_id = $1', [caseItem.id]);

  const assignmentsToInsert = [];
  if (judgeId) {
    assignmentsToInsert.push({ userId: judgeId, role: 'BENCH_JUDGE' });
  }
  if (prosecutorId) {
    assignmentsToInsert.push({ userId: prosecutorId, role: 'PROSECUTION_COUNSEL' });
  }
  if (defenseId) {
    assignmentsToInsert.push({ userId: defenseId, role: 'DEFENSE_COUNSEL' });
  }

  for (const a of assignmentsToInsert) {
    await query(`
      INSERT INTO case_assignments (case_id, user_id, assigned_role, assigned_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (case_id, user_id) 
      DO UPDATE SET assigned_role = EXCLUDED.assigned_role, assigned_at = CURRENT_TIMESTAMP
    `, [caseItem.id, a.userId, a.role]);
  }

  // Update case status to ALLOCATED or TRIAL_SCHEDULED
  const newStatus = hearingDate ? 'TRIAL_SCHEDULED' : 'ALLOCATED';
  await query(
    `UPDATE cases SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [newStatus, caseItem.id]
  );

  // Record Audit Event
  await logAuditEvent({
    userId: allocatedBy,
    caseId: caseItem.id,
    action: 'CASE_BENCH_ALLOCATED',
    ipAddress,
    metadata: {
      caseNumber: caseItem.case_number,
      judgeId,
      prosecutorId,
      defenseId,
      hearingDate,
      notes,
      assignedCount: assignmentsToInsert.length,
    },
  });

  return await getCaseById(caseItem.id);
}

/**
 * Gets all assignments for a case with user details.
 */
export async function getCaseAssignments(caseId) {
  const caseItem = await getCaseById(caseId);
  const sql = `
    SELECT 
      ca.id,
      ca.case_id,
      ca.user_id,
      ca.assigned_role,
      ca.assigned_at,
      u.full_name,
      u.badge_number,
      u.role,
      u.department,
      u.email
    FROM case_assignments ca
    JOIN users u ON ca.user_id = u.id
    WHERE ca.case_id = $1
    ORDER BY ca.assigned_at ASC;
  `;
  const res = await query(sql, [caseItem.id]);
  return res.rows;
}

export default {
  createCase,
  listCases,
  getCaseById,
  updateCaseStatus,
  assignCaseActors,
  getCaseAssignments
};
