import { getLogger } from './logger';
import { fetchWithRetry } from './fetch-with-retry';

const log = getLogger('notifications');

export type SlackMessageAttachment = {
  color?: string;
  title?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  footer?: string;
  ts?: number;
};

export type SlackMessage = {
  text: string;
  attachments?: SlackMessageAttachment[];
  channel?: string;
  username?: string;
  icon_emoji?: string;
};

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

const LEVEL_COLORS: Record<NotificationLevel, string> = {
  info: '#2196F3',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
};

const LEVEL_EMOJIS: Record<NotificationLevel, string> = {
  info: ':information_source:',
  success: ':white_check_mark:',
  warning: ':warning:',
  error: ':x:',
};

function getSlackWebhookUrl(): string | null {
  return process.env.SLACK_WEBHOOK_URL || null;
}

async function sendSlackWebhook(message: SlackMessage): Promise<boolean> {
  const webhookUrl = getSlackWebhookUrl();

  if (!webhookUrl) {
    log.debug('SLACK_WEBHOOK_URL が設定されていないため、通知をスキップしました');
    return false;
  }

  try {
    const response = await fetchWithRetry(
      webhookUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      },
      {
        timeout: 10000,
        maxRetries: 2,
      },
    );

    if (!response.ok) {
      log.error('Slack 通知の送信に失敗しました', undefined, {
        status: response.status,
        statusText: response.statusText,
      });
      return false;
    }

    log.debug('Slack 通知を送信しました');
    return true;
  } catch (error) {
    log.error('Slack 通知の送信中にエラーが発生しました', error);
    return false;
  }
}

export type NotificationOptions = {
  title?: string;
  level?: NotificationLevel;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  footer?: string;
};

/**
 * Send a notification via Slack webhook.
 */
export async function notify(message: string, options: NotificationOptions = {}): Promise<boolean> {
  const level = options.level ?? 'info';
  const emoji = LEVEL_EMOJIS[level];

  const slackMessage: SlackMessage = {
    text: `${emoji} ${message}`,
    username: 'Handmade Sync Hub',
    icon_emoji: ':robot_face:',
    attachments: [],
  };

  if (options.title || options.fields || options.footer) {
    slackMessage.attachments = [
      {
        color: LEVEL_COLORS[level],
        title: options.title,
        fields: options.fields,
        footer: options.footer,
        ts: Math.floor(Date.now() / 1000),
      },
    ];
  }

  return sendSlackWebhook(slackMessage);
}

/**
 * Send a job completion notification.
 */
export async function notifyJobComplete(
  jobName: string,
  success: boolean,
  details?: {
    duration?: number;
    itemsProcessed?: number;
    errors?: string[];
  },
): Promise<boolean> {
  const level: NotificationLevel = success ? 'success' : 'error';
  const status = success ? '完了' : '失敗';
  const message = `ジョブ「${jobName}」が${status}しました`;

  const fields: Array<{ title: string; value: string; short?: boolean }> = [];

  if (details?.duration !== undefined) {
    const durationSec = Math.round(details.duration / 1000);
    fields.push({
      title: '実行時間',
      value: `${durationSec}秒`,
      short: true,
    });
  }

  if (details?.itemsProcessed !== undefined) {
    fields.push({
      title: '処理件数',
      value: `${details.itemsProcessed}件`,
      short: true,
    });
  }

  if (details?.errors && details.errors.length > 0) {
    fields.push({
      title: 'エラー',
      value: details.errors.slice(0, 3).join('\n'),
      short: false,
    });
  }

  return notify(message, {
    level,
    fields: fields.length > 0 ? fields : undefined,
  });
}

/**
 * Send an error notification.
 */
export async function notifyError(
  context: string,
  error: Error | string,
  additionalInfo?: Record<string, string>,
): Promise<boolean> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  const fields: Array<{ title: string; value: string; short?: boolean }> = [
    {
      title: 'コンテキスト',
      value: context,
      short: true,
    },
    {
      title: 'エラーメッセージ',
      value: errorMessage.slice(0, 500),
      short: false,
    },
  ];

  if (errorStack) {
    fields.push({
      title: 'スタックトレース',
      value: '```' + errorStack.slice(0, 500) + '```',
      short: false,
    });
  }

  if (additionalInfo) {
    for (const [key, value] of Object.entries(additionalInfo)) {
      fields.push({
        title: key,
        value: value.slice(0, 200),
        short: true,
      });
    }
  }

  return notify('エラーが発生しました', {
    level: 'error',
    title: context,
    fields,
  });
}
