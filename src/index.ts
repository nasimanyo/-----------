import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { PORT } from './config';
import healthCheckServer from './server';
import { startHealthCheckCron } from './cron';

// 環境変数からトークンを取得（Koyebでは環境変数で管理）
const TOKEN = process.env.BOT_TOKEN || '';
if (!TOKEN || TOKEN.length < 20) {
  console.error('環境変数 BOT_TOKEN に有効なトークンを設定してください。');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel]
});

const commands = [
  {
    name: 'submit',
    description: 'コマンド提出',
    options: [{ name: 'command', type: 3, description: 'コマンド内容', required: true }]
  },
  { name: 'set_admin_role', description: '管理ロール設定', options: [{ name: 'role', type: 8, description: 'ロール', required: true }] },
  { name: 'set_channel', description: '送信チャンネル設定', options: [{ name: 'channel', type: 7, description: 'チャンネル', required: true }] },
  { name: 'set_time', description: 'イベント時間設定', options: [{ name: 'start', type: 3, description: '開始 (YYYY-MM-DD HH:MM)', required: true }, { name: 'end', type: 3, description: '終了 (YYYY-MM-DD HH:MM)', required: true }] },
  { name: 'set_description', description: '説明文設定', options: [{ name: 'text', type: 3, description: '説明文', required: true }] },
  { name: 'result', description: '結果発表', options: [{ name: 'first', type: 6, description: '1位', required: true }, { name: 'second', type: 6, description: '2位', required: true }, { name: 'third', type: 6, description: '3位', required: true }] }
];

function parseDateString(str: string) {
  try {
    const [datePart, timePart] = str.split(' ');
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm] = timePart.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm);
  } catch (e) {
    return null;
  }
}

function loadConfig() {
  const CONFIG_FILE = path.join(process.cwd(), 'config.json');
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (e) {
    const defaultConfig = {
      admin_role: 'イベント管理者',
      channel_id: 0,
      start: '2026-03-02 00:00',
      end: '2026-03-03 00:00',
      description: 'イベント説明文'
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
    return defaultConfig;
  }
}

function saveConfig(data: any) {
  const CONFIG_FILE = path.join(process.cwd(), 'config.json');
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function loadIdeas() {
  const IDEA_FILE = path.join(process.cwd(), 'ideas.json');
  try {
    return JSON.parse(fs.readFileSync(IDEA_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveIdeas(data: any) {
  const IDEA_FILE = path.join(process.cwd(), 'ideas.json');
  fs.writeFileSync(IDEA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function hasAdminRole(member: any, roleName: string) {
  if (!member || !member.roles) return false;
  return member.roles.cache.some((r: any) => r.name === roleName);
}

client.once('ready', async () => {
  console.log('起動');
  try {
    await client.application?.commands.set(commands as any);
    console.log('スラッシュコマンド登録完了');
  } catch (e) {
    console.warn('コマンド登録に失敗:', e);
  }
  // start any schedulers if needed
});

client.on('interactionCreate', async (interaction: any) => {
  if (!interaction.isChatInputCommand?.()) return;
  const config = loadConfig();
  const name = interaction.commandName;
  const member = interaction.member;

  if (name === 'submit') {
    const now = new Date();
    const start = parseDateString(config.start);
    const end = parseDateString(config.end);
    if (!start || !end || now < start || now > end) {
      await interaction.reply({ content: '現在受付時間外です', ephemeral: true });
      return;
    }
    const command = interaction.options.getString('command');
    const ideas = loadIdeas();
    ideas[String(interaction.user.id)] = { name: interaction.user.username, command };
    saveIdeas(ideas);
    await interaction.reply({ content: '✅提出完了', ephemeral: true });
    return;
  }

  if (name === 'set_admin_role') {
    const role = interaction.options.getRole('role');
    if (config.admin_role !== '' && !hasAdminRole(member, config.admin_role)) {
      await interaction.reply({ content: '権限がありません', ephemeral: true });
      return;
    }
    config.admin_role = role.name;
    saveConfig(config);
    await interaction.reply({ content: `✅管理ロールを ${role.name} に設定`, ephemeral: true });
    return;
  }

  if (name === 'set_channel') {
    if (!hasAdminRole(member, config.admin_role)) {
      await interaction.reply({ content: '権限がありません', ephemeral: true });
      return;
    }
    const channel = interaction.options.getChannel('channel');
    config.channel_id = channel.id;
    saveConfig(config);
    await interaction.reply({ content: `✅ ${channel} に設定`, ephemeral: true });
    return;
  }

  if (name === 'set_time') {
    if (!hasAdminRole(member, config.admin_role)) {
      await interaction.reply({ content: '権限がありません', ephemeral: true });
      return;
    }
    const start = interaction.options.getString('start');
    const end = interaction.options.getString('end');
    config.start = start;
    config.end = end;
    saveConfig(config);
    await interaction.reply({ content: '✅設定しました', ephemeral: true });
    return;
  }

  if (name === 'set_description') {
    if (!hasAdminRole(member, config.admin_role)) {
      await interaction.reply({ content: '権限がありません', ephemeral: true });
      return;
    }
    const text = interaction.options.getString('text');
    config.description = text;
    saveConfig(config);
    await interaction.reply({ content: '✅設定しました', ephemeral: true });
    return;
  }

  if (name === 'result') {
    if (!hasAdminRole(member, config.admin_role)) {
      await interaction.reply({ content: '権限がありません', ephemeral: true });
      return;
    }
    const first = interaction.options.getUser('first');
    const second = interaction.options.getUser('second');
    const third = interaction.options.getUser('third');
    try {
      const channel = await client.channels.fetch(String(config.channel_id));
      await channel.send(`🏆結果発表\n\n🥇 ${first}\n🥈 ${second}\n🥉 ${third}`);
      await interaction.reply({ content: '✅送信しました', ephemeral: true });
    } catch (e) {
      await interaction.reply({ content: 'チャンネル送信に失敗しました', ephemeral: true });
    }
    return;
  }
});

// Login
client.login(TOKEN).catch((err) => {
  console.error('ログインに失敗しました:', err);
  process.exit(1);
});

// Start Hono health server (Koyeb)
(async () => {
  try {
    const { serve } = await import('@hono/node-server');
    serve({ fetch: (healthCheckServer as any).fetch, port: PORT });
    console.log(`Health server listening on port ${PORT}`);
  } catch (e) {
    console.warn('Health server failed to start:', e);
  }
})();

// Start health-check cron (prevents free-plan sleep)
startHealthCheckCron();
