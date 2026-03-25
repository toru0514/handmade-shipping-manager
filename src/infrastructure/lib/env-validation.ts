import { getLogger } from './logger';

const log = getLogger('env-validation');

type EnvVarConfig = {
  name: string;
  required: boolean;
  description: string;
};

const ENV_VARS: EnvVarConfig[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key for client-side auth',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key for server-side operations',
  },
  {
    name: 'GOOGLE_SERVICE_ACCOUNT_BASE64',
    required: false, // Not required if using mock data
    description: 'Base64-encoded Google service account JSON',
  },
  {
    name: 'PRODUCT_SPREADSHEET_ID',
    required: false, // Not required if using mock data
    description: 'Google Sheets spreadsheet ID',
  },
];

export type ValidationResult = {
  valid: boolean;
  missing: string[];
  warnings: string[];
};

export function validateEnv(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const useMockData = process.env.USE_MOCK_SHEETS_DATA === 'true';

  for (const config of ENV_VARS) {
    const value = process.env[config.name];

    if (!value || value.trim() === '') {
      if (config.required) {
        // Special case: Google Sheets vars are only required if not using mock data
        if (
          (config.name === 'GOOGLE_SERVICE_ACCOUNT_BASE64' ||
            config.name === 'PRODUCT_SPREADSHEET_ID') &&
          useMockData
        ) {
          continue;
        }
        missing.push(config.name);
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

export function validateEnvOrThrow(): void {
  const result = validateEnv();

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      log.warn(warning);
    }
  }

  if (!result.valid) {
    const message = `Missing required environment variables: ${result.missing.join(', ')}`;
    log.error(message, undefined, { missing: result.missing });
    throw new Error(message);
  }

  log.info('環境変数の検証が完了しました');
}
