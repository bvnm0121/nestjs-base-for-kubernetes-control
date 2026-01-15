export interface KubernetesHealth {
  status: 'ok' | 'degraded';
  timestamp: string;
  kubernetesApi?: {
    ok: boolean;
    checkedAt: string;
    latencyMs?: number;
    mode?: 'in-cluster' | 'out-of-cluster';
    error?: { kind: string; message: string; statusCode?: number };
  };
}
