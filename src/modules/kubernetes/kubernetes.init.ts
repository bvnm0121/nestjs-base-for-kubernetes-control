// kubernetest initializing file
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type * as k8s from '@kubernetes/client-node' with { 'resolution-mode': 'import' };
import type { KubernetesHealth } from './kubernetes.types';

export type KubernetesApiChecker = (opts?: {
  ttlMs?: number;
  timeoutMs?: number;
}) => Promise<KubernetesHealth['kubernetesApi']>;

export async function initKubernetesClients(
  configService: ConfigService,
  logger: Logger,
): Promise<{
  kc: k8s.KubeConfig;
  coreV1: k8s.CoreV1Api;
  appsV1: k8s.AppsV1Api;
  checkKubernetesApi: KubernetesApiChecker;
}> {
  logger.log(
    '=============== Kubernetes - Initializing Kubernetes client... ===============',
  );

  const k8s = await import('@kubernetes/client-node');
  const kc = new k8s.KubeConfig();

  const inCluster =
    !!process.env.KUBERNETES_SERVICE_HOST &&
    !!process.env.KUBERNETES_SERVICE_PORT;

  try {
    if (inCluster) {
      kc.loadFromCluster();
      logger.log('Kubernetes auth: in-cluster (ServiceAccount)');
    } else {
      const localConfigPath =
        configService.get<string>('KUBERNETES_LOCAL_CONFIG_PATH') ??
        'kube/kubeconfig.yaml';
      const resolvedPath = path.resolve(process.cwd(), localConfigPath);

      kc.loadFromFile(resolvedPath);
      logger.log(
        `Kubernetes auth: out-of-cluster (using local kubeconfig file)`,
      );
    }
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown';
    logger.error(`Kubeconfig file load failed: ${message}`);
    kc.loadFromDefault();
    logger.warn('Kubernetes auth: fallback to default path(~./kube/config)');
  }

  const coreV1 = kc.makeApiClient(k8s.CoreV1Api);
  const appsV1 = kc.makeApiClient(k8s.AppsV1Api);
  const checkKubernetesApi = createKubernetesApiChecker(kc, coreV1);

  const api = await checkKubernetesApi({ ttlMs: 0, timeoutMs: 1500 });
  if (api.ok) {
    logger.log(
      `Kubernetes health check: success (${api.latencyMs}ms, ${api.mode})`,
    );
  } else {
    const error = 'error' in api ? api.error : undefined;
    const details = {
      kind: error?.kind,
      message: error?.message,
      statusCode: error?.statusCode,
      mode: api.mode,
      latencyMs: api.latencyMs,
      checkedAt: api.checkedAt,
    };
    logger.error(
      `Kubernetes health check - failed (${error?.kind}): ${error?.message} | details=${JSON.stringify(
        details,
      )}`,
    );
  }

  logger.log(
    '=============== Kubernetes - Initialization complete =========================',
  );

  return { kc, coreV1, appsV1, checkKubernetesApi };
}

function createKubernetesApiChecker(
  kc: k8s.KubeConfig,
  coreV1: k8s.CoreV1Api,
): KubernetesApiChecker {
  let lastK8sApiCheck:
    | { ts: number; value: KubernetesHealth['kubernetesApi'] }
    | undefined;

  return async (opts) => {
    const ttlMs = opts?.ttlMs ?? 10_000;
    const timeoutMs = opts?.timeoutMs ?? 1500;

    const now = Date.now();
    if (ttlMs > 0 && lastK8sApiCheck && now - lastK8sApiCheck.ts < ttlMs) {
      return lastK8sApiCheck.value;
    }

    const start = Date.now();
    const mode: 'in-cluster' | 'out-of-cluster' = process.env
      .KUBERNETES_SERVICE_HOST
      ? 'in-cluster'
      : 'out-of-cluster';

    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error('Kubernetes API request timed out');
        err.name = 'TimeoutError';
        reject(err);
      }, timeoutMs);
    });

    try {
      await Promise.race([coreV1.getAPIResources(), timeoutPromise]);

      const value = {
        ok: true,
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - start,
        mode,
      } satisfies KubernetesHealth['kubernetesApi'];

      lastK8sApiCheck = { ts: now, value };
      return value;
    } catch (e: unknown) {
      const err = e as {
        name?: string;
        message?: string;
        statusCode?: number;
        response?: { statusCode?: number };
      };
      const statusCode = err?.statusCode ?? err?.response?.statusCode;
      const message = err?.message;
      const kind =
        err?.name === 'TimeoutError'
          ? 'timeout'
          : typeof statusCode === 'number'
            ? statusCode === 401 || statusCode === 403
              ? 'auth'
              : 'http'
            : message.includes('ENOTFOUND') ||
                message.includes('ECONNREFUSED') ||
                message.includes('ETIMEDOUT')
              ? 'network'
              : 'unknown';

      const value = {
        ok: false,
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - start,
        mode,
        error: { kind, message, statusCode },
      } satisfies KubernetesHealth['kubernetesApi'];

      lastK8sApiCheck = { ts: now, value };
      return value;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}
