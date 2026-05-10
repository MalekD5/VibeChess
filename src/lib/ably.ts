import Ably from 'ably';

let _client: Ably.Realtime | null = null;
let _restClient: Ably.Rest | null = null;

/**
 * Returns a singleton {@link Ably.Realtime} client for server-side use.
 *
 * On the first call the client is created using `process.env.ABLY_API_KEY`
 * and cached in the module-level `_client` variable. Subsequent calls return
 * the same instance.
 *
 * @returns {Ably.Realtime} The cached (or newly created) Ably Realtime client.
 * @throws {Error} If `process.env.ABLY_API_KEY` is not set.
 */
export function getServerRealtime(): Ably.Realtime {
  if (_client) return _client;
  if (!process.env.ABLY_API_KEY) {
    throw new Error('ABLY_API_KEY is not set');
  }
  _client = new Ably.Realtime({ key: process.env.ABLY_API_KEY });
  return _client;
}

export function getServerRest(): Ably.Rest {
  if (_restClient) return _restClient;
  if (!process.env.ABLY_API_KEY) {
    throw new Error('ABLY_API_KEY is not set');
  }
  _restClient = new Ably.Rest({ key: process.env.ABLY_API_KEY });
  return _restClient;
}
