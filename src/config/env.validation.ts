import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  APP_PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().allow('').default('api'),
  CORS_ORIGINS: Joi.string().optional(), // comma-separated list
  KUBERNETES_NAMESPACE: Joi.string().default('default'),
  KUBERNETES_LOCAL_CONFIG_PATH: Joi.string().default('./kube/kubeconfig.yaml'),
});
