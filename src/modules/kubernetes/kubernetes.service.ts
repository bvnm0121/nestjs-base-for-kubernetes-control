import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type * as k8s from '@kubernetes/client-node' with {
  'resolution-mode': 'import',
};
import { initKubernetesClients, type KubernetesApiChecker } from './kubernetes.init';
import type { KubernetesHealth } from './kubernetes.types';

@Injectable()
export class KubernetesService implements OnModuleInit {
  private readonly logger = new Logger(KubernetesService.name);
  private readonly k8sNamespace: string;

  private kc!: k8s.KubeConfig;
  private coreV1!: k8s.CoreV1Api;
  private appsV1!: k8s.AppsV1Api;

  private checkKubernetesApi!: KubernetesApiChecker;

  constructor(private readonly configService: ConfigService) {
    this.k8sNamespace =
      this.configService.get<string>('KUBERNETES_NAMESPACE') ?? 'default';
  }

  async onModuleInit(): Promise<void> {
    const { kc, coreV1, appsV1, checkKubernetesApi } =
      await initKubernetesClients(this.configService, this.logger);
    this.kc = kc;
    this.coreV1 = coreV1;
    this.appsV1 = appsV1;
    this.checkKubernetesApi = checkKubernetesApi;
  }

  // Kubernetes handling Api from here
  async listPods(k8sNamespace?: string): Promise<k8s.V1Pod[]> {
    const namespace = k8sNamespace ?? this.k8sNamespace;
    try {
      const res = await this.coreV1.listNamespacedPod({ namespace });
      const items =
        (res as { body?: k8s.V1PodList }).body?.items ?? res.items ?? [];
      return items;
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'unknown';
      this.logger.error(
        `Failed to list pods in namespace "${namespace}": ${message}`,
      );
      throw e;
    }
  }

  async getHealth(includeKubernetesApi = true): Promise<KubernetesHealth> {
    const base: KubernetesHealth = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };

    if (!includeKubernetesApi) return base;

    const kubernetesApi = await this.checkKubernetesApi();
    return {
      status: kubernetesApi.ok ? 'ok' : 'degraded',
      timestamp: base.timestamp,
      kubernetesApi,
    };
  }

  
}
