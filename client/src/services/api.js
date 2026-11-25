const BASE_URL = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('nv_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchApi(endpoint, options = {}) {
  const headers = {
    ...getAuthHeader(),
    ...options.headers,
  };

  if (!(options.body instanceof FormData) && options.body) {
    headers['Content-Type'] = 'application/json';
    if (typeof options.body !== 'string') {
      options.body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP Error ${res.status}`);
  }
  
  return res.json();
}

export async function getUsers() {
  return fetchApi('/auth/users');
}

export async function getCases() {
  return fetchApi('/cases');
}

export async function createCase(data) {
  return fetchApi('/cases', {
    method: 'POST',
    body: data,
  });
}

export async function getCaseDetails(caseId) {
  return fetchApi(`/cases/${caseId}`);
}

export async function getCaseDocuments(caseId) {
  return fetchApi(`/cases/${caseId}/documents`);
}

export async function getAllDocuments() {
  return fetchApi('/documents');
}

export async function getCaseAuditTrail(caseId) {
  return fetchApi(`/cases/${caseId}/audit-trail`);
}

export async function getGlobalAuditLogs(limit = 100) {
  return fetchApi(`/audit?limit=${limit}`);
}

export async function uploadDocument(caseId, file, isMedical = false) {
  const formData = new FormData();
  formData.append('file', file);
  if (isMedical) {
    formData.append('isMedical', 'true');
  }
  
  // Custom fetch to handle FormData properly (without setting Content-Type, let browser set boundary)
  const res = await fetch(`${BASE_URL}/cases/${caseId}/documents`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: formData,
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  
  return res.json();
}

export async function verifyDocument(documentId) {
  return fetchApi(`/documents/${documentId}/verify`);
}

export function getDownloadUrl(documentId) {
  return `${BASE_URL}/documents/${documentId}/download`;
}

export async function semanticSearchCase(caseId, query) {
  return fetchApi(`/cases/${caseId}/search?q=${encodeURIComponent(query)}`);
}

// Complaint APIs
export async function getComplaints(caseId) {
  return fetchApi(`/cases/${caseId}/complaints`);
}

export async function createComplaint(caseId, data) {
  return fetchApi(`/cases/${caseId}/complaints`, {
    method: 'POST',
    body: data,
  });
}

export async function reviewComplaint(complaintId, data) {
  return fetchApi(`/complaints/${complaintId}/review`, {
    method: 'PATCH',
    body: data,
  });
}

export async function generateCaseSummary(caseId) {
  return fetchApi(`/cases/${caseId}/summary`, { method: 'POST' });
}

export async function findContradictions(caseId) {
  return fetchApi(`/cases/${caseId}/contradictions`);
}

export async function updateCaseStatus(caseId, status) {
  return fetchApi(`/cases/${caseId}/status`, {
    method: 'PATCH',
    body: { status }
  });
}

export async function fetchDocumentBlob(documentId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${BASE_URL}/documents/${documentId}/download`, {
      headers: getAuthHeader(),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to download file (HTTP ${res.status})`);
    }

    const blob = await res.blob();
    const contentType = res.headers.get('content-type') || blob.type || 'application/octet-stream';
    const sha256 = res.headers.get('x-evidence-sha256') || null;
    const objectUrl = URL.createObjectURL(blob);

    return { blob, objectUrl, contentType, sha256 };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Evidence stream request timed out (vault proxy busy).');
    }
    throw err;
  }
}

export async function assignCase(caseId, allocationData) {
  return fetchApi(`/cases/${caseId}/assignments`, {
    method: 'POST',
    body: allocationData,
  });
}

export async function getCaseAssignments(caseId) {
  return fetchApi(`/cases/${caseId}/assignments`);
}

export async function verifyAuditChain(caseId = null) {
  const url = caseId ? `/audit/verify-chain?caseId=${encodeURIComponent(caseId)}` : '/audit/verify-chain';
  return fetchApi(url);
}

export async function signExhibit(documentId) {
  return fetchApi(`/documents/${documentId}/sign`, { method: 'POST' });
}

export async function getBsaCertificate(documentId) {
  return fetchApi(`/documents/${documentId}/pki-certificate`);
}

export async function getAiMode() {
  return fetchApi('/intelligence/ai-mode');
}

export async function setAiMode(mode) {
  return fetchApi('/intelligence/ai-mode', {
    method: 'POST',
    body: { mode },
  });
}

export async function simulateTamper(documentId) {
  return fetchApi(`/dev/tamper/${documentId}`, { method: 'POST' });
}

export async function restoreTamper(documentId) {
  return fetchApi(`/dev/restore/${documentId}`, { method: 'POST' });
}
