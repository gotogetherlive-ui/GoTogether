import { EventEmitter } from 'events';
import { run, getPoolInstance } from './db';
import { PoolClient } from 'pg';

class NotificationEmitter extends EventEmitter {}

const globalForNotifications = globalThis as unknown as {
  __notificationEvents?: NotificationEmitter;
  __pgListenerStarted?: boolean;
};

function getNotificationEmitter(): NotificationEmitter {
  if (globalForNotifications.__notificationEvents) {
    return globalForNotifications.__notificationEvents;
  }
  const emitter = new NotificationEmitter();
  emitter.setMaxListeners(100000);
  globalForNotifications.__notificationEvents = emitter;
  return emitter;
}

export const notificationEvents = getNotificationEmitter();

const PG_CHANNEL = 'gotogether_notifications';

async function startPgListener() {
  if (globalForNotifications.__pgListenerStarted) return;
  globalForNotifications.__pgListenerStarted = true;

  const pool = getPoolInstance();

  async function connectAndListen() {
    let client: PoolClient | null = null;
    try {
      const conn = await pool.connect();
      client = conn;

      conn.on('notification', (msg) => {
        if (msg.channel !== PG_CHANNEL || !msg.payload) return;
        try {
          const data = JSON.parse(msg.payload);
          if (data.type === 'user' && data.id) {
            notificationEvents.emit(`notification:${data.id}`);
          } else if (data.type === 'admin') {
            notificationEvents.emit('notification:admin');
          } else if (data.type === 'stories') {
            notificationEvents.emit('stories:changed', data);
          }
        } catch {
          // ignore malformed payloads
        }
      });

      conn.on('error', (err) => {
        console.error('[PG LISTEN] Client error', err);
        conn.release(true); // force discard
        reconnect();
      });

      await conn.query(`LISTEN ${PG_CHANNEL}`);
      console.log(`[PG LISTEN] Subscribed to channel: ${PG_CHANNEL}`);
    } catch (err) {
      console.error('[PG LISTEN] Subscription failed, retrying in 5 seconds...', err);
      if (client) {
        try { client.release(true); } catch {}
      }
      reconnect();
    }
  }

  let reconnectTimeout: NodeJS.Timeout | null = null;
  function reconnect() {
    if (reconnectTimeout) return;
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connectAndListen();
    }, 5000);
  }

  connectAndListen();
}

export async function ensureNotificationListener() {
  await startPgListener();
}

export async function notifyUser(userId: string) {
  try {
    await run(`SELECT pg_notify($1, $2)`, [PG_CHANNEL, JSON.stringify({ type: 'user', id: userId })]);
  } catch (err) {
    console.error('[PG NOTIFY] Failed to notify user:', err);
    notificationEvents.emit(`notification:${userId}`);
  }
}

export async function notifyAdmins() {
  try {
    await run(`SELECT pg_notify($1, $2)`, [PG_CHANNEL, JSON.stringify({ type: 'admin' })]);
  } catch (err) {
    console.error('[PG NOTIFY] Failed to notify admins:', err);
    notificationEvents.emit('notification:admin');
  }
}

export async function notifyStories(action: string, storyId?: string) {
  const payload = JSON.stringify({ type: 'stories', action, storyId: storyId || null });
  try {
    await run(`SELECT pg_notify($1, $2)`, [PG_CHANNEL, payload]);
  } catch (err) {
    console.error('[PG NOTIFY] Failed to notify story subscribers:', err);
    notificationEvents.emit('stories:changed', { type: 'stories', action, storyId: storyId || null });
  }
}