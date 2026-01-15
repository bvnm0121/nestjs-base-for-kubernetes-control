import { Controller, Get } from '@nestjs/common';
import { KubernetesService } from './kubernetes.service';

@Controller('kubernetes')
export class KubernetesController {
  constructor(private readonly kubernetesService: KubernetesService) {}

  @Get('health')
  getHealth() {
    return this.kubernetesService.getHealth();
  }

  @Get('pods')
  listPods() {
    return this.kubernetesService.listPods();
  }
}
