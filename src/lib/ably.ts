import Ably from 'ably';

let _client: Ably.Realtime | null = null;

export function getServerRealtime(): Ably.Realtime {
  if (_client) return _client;
  if (!process.env.ABLY_API_KEY) {
    throw new Error('ABLY_API_KEY is not set');
  }
  _client = new Ably.Realtime({ key: process.env.ABLY_API_KEY });
  return _client;
}
