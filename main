// CONFIG — fill these in
const config = {
  apiBase: https://script.google.com/macros/s/AKfycbxZ3DRvrGRSd5kBJttQnJ1kL0sU_vyjJOSHkrh06d1q3d5-QR60BiokCRRwmibN5316/exec, // e.g., https://script.google.com/macros/s/XXXX/exec
  sharedSecret: '',                        // OPTIONAL: set to your SHARED_SECRET if enabled server-side
  appVersion: 'v1',
  maxAcceptableAccuracyMeters: 100          // if GPS accuracy worse than this, prompt to retry
};

// --- PWA install prompt ---
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('install');
  if(btn) btn.style.display='block';
});
document.getElementById('install').addEventListener('click', async ()=>{
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt=null;
  document.getElementById('install').style.display='none';
});

// --- Helpers ---
const $ = s => document.querySelector(s);
const statusEl = $('#status');
function setStatus(msg, cls){
  statusEl.className = 'muted ' + (cls || '');
  statusEl.textContent = msg;
}
function deviceInfo(){
  return `${navigator.platform || ''} | ${navigator.userAgent}`.slice(0,250);
}
function uuid(){ return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c/4).toString(16)); }

// --- Load Guards ---
async function loadGuards(){
  setStatus('Loading guards…');
  try{
    const url = config.sharedSecret 
      ? `${config.apiBase}?path=guards&secret=${encodeURIComponent(config.sharedSecret)}`
      : `${config.apiBase}?path=guards`;
    const res = await fetch(url, {cache:'no-store'});
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || 'Failed to load');
    const sel = $('#guard'); sel.innerHTML='';
    data.guards.forEach(g=>{
      const opt = document.createElement('option');
      opt.value = g.id; opt.textContent = g.name; sel.appendChild(opt);
    });
    // Remember last guard selection
    const last = localStorage.getItem('guardId');
    if(last) sel.value = last;
    setStatus(`Loaded ${data.guards.length} guard(s).`, 'ok');
  }catch(err){
    setStatus('Could not load names (offline?). Using last saved choice if any.', 'warn');
  }
}
$('#refresh').addEventListener('click', loadGuards);

// --- Geolocation with graceful errors ---
function getPosition(opts={enableHighAccuracy:true, timeout:15000, maximumAge:0}){
  return new Promise((resolve,reject)=>{
    if(!('geolocation' in navigator)) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(resolve,reject,opts);
  });
}

// --- Submit Log (send immediately; fall back to queue on error) ---
// Use Content-Type: text/plain to AVOID CORS preflight on Apps Script
async function submitLog(payload){
  const body = JSON.stringify(payload);
  const res = await fetch(config.apiBase, {
    method:'POST',
    headers: { 'Content-Type':'text/plain;charset=utf-8' },
    body
  });
  const json = await res.json();
  if(!json.ok && !json.duplicate) throw new Error(json.error || 'Server error');
  return json;
}

async function logNow(){
  const guardSel = $('#guard');
  const guardId = guardSel.value;
  const guardName = guardSel.selectedOptions[0]?.textContent || '';
  if(!guardId){ setStatus('Select your name first.', 'warn'); return; }
  localStorage.setItem('guardId', guardId);

  setStatus('Getting GPS location…');
  try{
    const pos = await getPosition();
    const { latitude:lat, longitude:lng, accuracy } = pos.coords;

    if(accuracy && accuracy > config.maxAcceptableAccuracyMeters){
      setStatus(`GPS accuracy ${Math.round(accuracy)}m is poor (>${config.maxAcceptableAccuracyMeters}m). Move to open sky & retry.`, 'warn');
      // still allow log if they insist — comment out the return to force retry
      // return;
    }

    const payload = {
      guardId,
      name: guardName,
      lat, lng,
      accuracy,
      idempotencyKey: uuid(),
      device: deviceInfo(),
      appVersion: config.appVersion,
      notes: '',
      ...(config.sharedSecret ? { secret: config.sharedSecret } : {})
    };

    try{
      const res = await submitLog(payload);
      if(res.duplicate) setStatus('Already logged (duplicate).', 'warn');
      else setStatus('Logged successfully!', 'ok');
    }catch(err){
      OfflineQueue.enqueue(payload);
      setStatus('No network. Saved offline — will auto-sync.', 'warn');
    }

  }catch(geoErr){
    OfflineQueue.recordError({ message: geoErr.message || String(geoErr) });
    setStatus(geoErr.message || 'Location error. Enable location & retry.', 'err');
  }
}

$('#log').addEventListener('click', logNow);

// --- Offline Queue bootstrap ---
const OfflineQueue = createOfflineQueue({
  send: submitLog,
  onStatus: (msg) => setStatus(msg)
});

window.addEventListener('online', ()=> OfflineQueue.flush());
window.addEventListener('load', async ()=>{
  try{ await navigator.serviceWorker.register('service-worker.js'); }catch(_){}
  document.getElementById('appver').textContent = config.appVersion;
  await loadGuards();
  setTimeout(()=> OfflineQueue.flush(), 1000);
});
