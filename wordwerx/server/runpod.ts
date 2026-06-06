// Thin helpers around the RunPod Serverless run/status API. Used by the
// companion server only — the API key never reaches the browser.

// Serverless INVOKE host is api.runpod.ai (the management REST API is rest.runpod.io).
const API_BASE = 'https://api.runpod.ai/v2';

function endpointId(): string {
  const id = process.env.RUNPOD_ENDPOINT_ID;
  if (!id) throw new Error('RUNPOD_ENDPOINT_ID is not set (run scripts/runpod/create-endpoint.mjs)');
  return id;
}

function apiKey(): string {
  const key = process.env.RUNPOD_API_KEY;
  if (!key) throw new Error('RUNPOD_API_KEY is not set');
  return key;
}

function headers() {
  return { 'Authorization': `Bearer ${apiKey()}`, 'Content-Type': 'application/json' };
}

export interface RunInput {
  workflow: unknown;
  images?: Array<{ name: string; image: string }>;
}

/** Submit a job. Returns the RunPod job id. */
export async function submitRun(input: RunInput): Promise<{ id: string; status: string }> {
  const res = await fetch(`${API_BASE}/${endpointId()}/run`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ input }),
  });
  if (!res.ok) throw new Error(`RunPod /run failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ id: string; status: string }>;
}

/** Poll a job's status/output. */
export async function getStatus(jobId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/${endpointId()}/status/${jobId}`, { headers: headers() });
  if (!res.ok) throw new Error(`RunPod /status failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Cancel a running/queued job. */
export async function cancelJob(jobId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/${endpointId()}/cancel/${jobId}`, { method: 'POST', headers: headers() });
  if (!res.ok) throw new Error(`RunPod /cancel failed: ${res.status} ${await res.text()}`);
  return res.json();
}
