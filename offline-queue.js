function createOfflineQueue({send, onStatus}){
  const KEY = 'offline-logs-v1';
  const ERRKEY = 'offline-errors-v1';

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY) || '[]'); }catch(_){ return []; } }
  function save(arr){ localStorage.setItem(KEY, JSON.stringify(arr)); }

  function loadErr(){ try{ return JSON.parse(localStorage.getItem(ERRKEY) || '[]'); }catch(_){ return []; } }
  function saveErr(arr){ localStorage.setItem(ERRKEY, JSON.stringify(arr)); }

  async function flush(){
    let q = load();
    if(!q.length) return;
    onStatus && onStatus(`Syncing ${q.length} pending log(s)…`, 'warn');
    const remain = [];
    for(const item of q){
      try{
        await send(item);
      }catch(err){ remain.push(item); }
    }
    save(remain);
    onStatus && onStatus(remain.length ? `${remain.length} log(s) still pending.` : 'All pending logs synced.', remain.length ? 'warn' : 'ok');
  }

  return {
    enqueue(item){ const q = load(); q.push(item); save(q); },
    flush,
    recordError(err){ const es = loadErr(); es.push({ts: Date.now(), ...err}); saveErr(es); }
  };
}
