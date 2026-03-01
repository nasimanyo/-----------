const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const CONFIG_FILE = path.join(__dirname, 'config.json');
const IDEA_FILE = path.join(__dirname, 'ideas.json');
const TOKEN_FILE = path.join(__dirname, 'token');

function loadConfig() {
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
    saveConfig(defaultConfig);
    return defaultConfig;
  }
}

function saveConfig(data) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function loadIdeas() {
  try {
    return JSON.parse(fs.readFileSync(IDEA_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveIdeas(data) {
  fs.writeFileSync(IDEA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function hasAdminRole(member, roleName) {
  if (!member || !member.roles) return false;
  return member.roles.cache.some(r => r.name === roleName);
}

function parseDateString(str) {
  try {
    const [datePart, timePart] = str.split(' ');
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm] = timePart.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm);
  } catch (e) {
    return null;
  }
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

client.once('ready', async () => {
  console.log('起動');
  try {
    await client.application.commands.set(commands);
    console.log('スラッシュコマンド登録完了');
  } catch (e) {
    console.warn('コマンド登録に失敗:', e);
  }
  startScheduler();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
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

function startScheduler() {
  setInterval(async () => {
    const config = loadConfig();
    if (!config || !config.channel_id || config.channel_id === 0) return;
    const now = new Date();
    const start = parseDateString(config.start);
    const end = parseDateString(config.end);
    try {
      const channel = await client.channels.fetch(String(config.channel_id));
      if (start && now >= start && now <= new Date(start.getTime() + 60 * 1000)) {
        await channel.send(`📢イベント開始！\n\n${config.description}\n\n提出：/submit`);
      }
      if (end && now >= end && now <= new Date(end.getTime() + 60 * 1000)) {
        await channel.send('⛔イベント終了！');
      }
    } catch (e) {
      // ignore fetch errors
    }
  }, 60 * 1000);
}

function readToken() {
  try {
    return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  } catch (e) {
    console.error('token ファイルが見つかりません。token ファイルに Bot トークンを配置してください。');
    process.exit(1);
  }
}

const token = readToken();
if (!token || token.length < 20) {
  console.error('token ファイルに有効なトークンがありません。token ファイルに Bot トークン（余分な空白や改行なし）を配置してください。');
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error('ログインに失敗しました:', err);
  console.error('トークンが間違っている可能性があります。Discord Developer Portal で Bot トークンを再発行して、プロジェクトルートの `token` ファイルを更新してください。');
  process.exit(1);
});

// Koyeb 用ヘルスチェックサーバーを起動（Hono）
(async () => {
  try {
    const { serve } = await import('@hono/node-server');
    const healthModule = await import('./server.mjs');
    const app = healthModule.default;
    serve({ fetch: app.fetch.bind(app), port: 8000 });
    console.log('Health server listening on port 8000');
  } catch (e) {
    console.warn('Health server failed to start:', e);
  }
})();
