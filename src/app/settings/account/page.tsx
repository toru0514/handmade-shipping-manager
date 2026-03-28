'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';

type UserSettingsResponse = {
  email: string;
  slackWebhookUrl: string;
  slackWebhookUrlSet: boolean;
  slackEnabled: boolean;
};

export default function AccountSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [initialEmail, setInitialEmail] = useState('');

  // Account
  const [email, setEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Slack
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [slackWebhookUrlSet, setSlackWebhookUrlSet] = useState(false);
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackSaving, setSlackSaving] = useState(false);
  const [slackMessage, setSlackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings/user');
        if (!res.ok) throw new Error();
        const data = (await res.json()) as UserSettingsResponse;
        setInitialEmail(data.email);
        setEmail(data.email);
        setSlackWebhookUrlSet(data.slackWebhookUrlSet);
        setSlackEnabled(data.slackEnabled);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleEmailSave() {
    setEmailSaving(true);
    setEmailMessage(null);
    try {
      const res = await fetch('/api/settings/user/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'メールアドレスの更新に失敗しました');
      }
      setEmailMessage({
        type: 'success',
        text: '確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。',
      });
    } catch (err) {
      setEmailMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'エラーが発生しました',
      });
    } finally {
      setEmailSaving(false);
    }
  }

  async function handlePasswordSave() {
    setPasswordSaving(true);
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'パスワードが一致しません' });
      setPasswordSaving(false);
      return;
    }
    try {
      const res = await fetch('/api/settings/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'パスワードの変更に失敗しました');
      }
      setPasswordMessage({ type: 'success', text: 'パスワードを変更しました' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'エラーが発生しました',
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleSlackSave() {
    setSlackSaving(true);
    setSlackMessage(null);
    try {
      const res = await fetch('/api/settings/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slackWebhookUrl, slackEnabled }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? '設定の保存に失敗しました');
      }
      setSlackMessage({ type: 'success', text: 'Slack通知設定を保存しました' });
    } catch (err) {
      setSlackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'エラーが発生しました',
      });
    } finally {
      setSlackSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Typography variant="body2" color="text.secondary">
          読み込み中...
        </Typography>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Typography variant="h5" component="h1" fontWeight={600} sx={{ mb: 3 }}>
        アカウント設定
      </Typography>

      {/* Email Section */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          メールアドレス
        </Typography>
        {emailMessage && (
          <Alert severity={emailMessage.type} sx={{ mb: 2 }} onClose={() => setEmailMessage(null)}>
            {emailMessage.text}
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            size="small"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleEmailSave}
            disabled={emailSaving || email === initialEmail}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {emailSaving ? '保存中...' : '変更'}
          </Button>
        </Box>
      </Paper>

      {/* Password Section */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          パスワード変更
        </Typography>
        {passwordMessage && (
          <Alert
            severity={passwordMessage.type}
            sx={{ mb: 2 }}
            onClose={() => setPasswordMessage(null)}
          >
            {passwordMessage.text}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            size="small"
            type="password"
            label="新しいパスワード"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
          />
          <TextField
            size="small"
            type="password"
            label="パスワード確認"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            size="small"
            onClick={handlePasswordSave}
            disabled={passwordSaving || !newPassword || !confirmPassword}
            sx={{ alignSelf: 'flex-start' }}
          >
            {passwordSaving ? '変更中...' : 'パスワードを変更'}
          </Button>
        </Box>
      </Paper>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h5" component="h2" fontWeight={600} sx={{ mb: 3 }}>
        通知設定
      </Typography>

      {/* Slack Section */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          Slack通知
        </Typography>
        {slackMessage && (
          <Alert severity={slackMessage.type} sx={{ mb: 2 }} onClose={() => setSlackMessage(null)}>
            {slackMessage.text}
          </Alert>
        )}
        <FormControlLabel
          control={
            <Switch checked={slackEnabled} onChange={(e) => setSlackEnabled(e.target.checked)} />
          }
          label="Slack通知を有効にする"
          sx={{ mb: 2 }}
        />
        {slackEnabled && (
          <TextField
            size="small"
            label="Webhook URL"
            placeholder={
              slackWebhookUrlSet
                ? '設定済み（変更する場合は新しいURLを入力）'
                : 'https://hooks.slack.com/services/...'
            }
            value={slackWebhookUrl}
            onChange={(e) => setSlackWebhookUrl(e.target.value)}
            fullWidth
            helperText={
              slackWebhookUrlSet && !slackWebhookUrl
                ? 'Webhook URLは設定済みです。変更する場合のみ入力してください。'
                : undefined
            }
            sx={{ mb: 2 }}
          />
        )}
        <Button variant="contained" size="small" onClick={handleSlackSave} disabled={slackSaving}>
          {slackSaving ? '保存中...' : '通知設定を保存'}
        </Button>
      </Paper>
    </main>
  );
}
