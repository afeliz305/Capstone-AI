const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { randomUUID, createHash } = require('node:crypto');
const { createApiClient } = require('../js/shared/api-client');
const { createOcelotPackage, prepareOcelotUpload } = require('../scripts/package-ocelot');
const { searchKnowledge } = require('../server/lib/search');

async function cleanup(temp) {
  assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temp).startsWith('capstone-ocelot-test-'));
  await fs.rm(temp, { recursive: true, force: true });
}
test('PHP transport preserves folder, query, and authenticated attachment routes', () => {
  for (const baseUrl of ['https://example.edu/', 'https://example.edu/~user/Capstone%20-%20AI/']) {
    const api = createApiClient({ baseUrl, transport: 'php' });
    const url = new URL(api.url('/api/search?q=attendance%20%26%20grades&route=evil'));
    assert.equal(url.pathname, new URL(baseUrl).pathname + 'api/index.php');
    assert.equal(url.searchParams.get('route'), '/search');
    assert.equal(url.searchParams.get('q'), 'attendance & grades');
    assert.equal(new URL(api.url('/api/tickets/CAP-1001/attachments/abc')).searchParams.get('route'), '/tickets/CAP-1001/attachments/abc');
    assert.throws(() => api.url('/api/../../private'));
  }
});
test('Ocelot package includes only public assets and credential-free PHP, never runtime state', async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'capstone-ocelot-test-'));
  t.after(() => cleanup(temp));
  const result = await createOcelotPackage({ outputRoot: temp });
  assert.equal(path.basename(result.uploadDirectory), 'Capstone - AI');
  for (const item of result.manifest) {
    assert.doesNotMatch(item.file, /^(?:data|server|scripts|test|docs|node_modules|\.git)(?:\/|$)|state\.json|credentials|\.env/);
    const bytes = await fs.readFile(path.join(result.uploadDirectory, item.file));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
    assert.equal(bytes.length, item.bytes);
  }
  for (const page of ['index.html', 'pages/staff.html']) {
    const html = await fs.readFile(path.join(result.uploadDirectory, page), 'utf8');
    assert.match(html, /data-api-transport="php"/);
    assert.match(html, /Group testing only/);
  }
  assert.ok(result.manifest.some(item => item.file === 'api/index.php'));
  assert.ok(result.manifest.some(item => item.file === 'css/fonts/OFL.txt'));
  assert.ok(result.manifest.some(item => item.file === 'css/images/capstone-chat.svg'));
  assert.ok(result.manifest.some(item => item.file === 'documents/Fall-Term-2026-CIS-4951-RVC-Capstone-II-public.pdf'));
  assert.deepEqual(await fs.readFile(path.join(result.uploadDirectory, 'css/images/capstone-chat.svg')), await fs.readFile(path.join(__dirname, '../css/images/capstone-chat.svg')));
  assert.deepEqual(await fs.readFile(path.join(result.uploadDirectory, 'documents/Fall-Term-2026-CIS-4951-RVC-Capstone-II-public.pdf')), await fs.readFile(path.join(__dirname, '../documents/Fall-Term-2026-CIS-4951-RVC-Capstone-II-public.pdf')));
  assert.ok(!result.manifest.some(item => item.file === 'package.json'));
});

test('current Ocelot upload has one stable location and archives previous files without overwriting', async t => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'capstone-ocelot-test-'));
  t.after(() => cleanup(workspace));
  const first = await prepareOcelotUpload({ workspace });
  assert.equal(first.destination, path.join(workspace, 'Capstone - AI'));
  assert.equal(first.uploadDirectory, first.destination);
  assert.deepEqual((await fs.readdir(first.destination)).sort(), ['css','documents','index.html','js','pages']);
  assert.ok(first.recordDirectory.startsWith(path.join(workspace, 'DEVELOPMENT', 'dist', 'release-records') + path.sep));
  assert.ok((await fs.stat(path.join(first.recordDirectory, 'manifest.json'))).isFile());
  assert.equal(first.archivedDirectory, null);
  const before = await fs.readFile(path.join(first.uploadDirectory, 'index.html'));
  await fs.writeFile(path.join(first.destination, 'preserve-this-note.txt'), 'Fictional release note');
  const second = await prepareOcelotUpload({ workspace });
  assert.equal(second.destination, first.destination);
  assert.ok(second.archivedDirectory.startsWith(path.join(workspace, 'DEVELOPMENT', 'dist', 'archive', 'ocelot') + path.sep));
  assert.equal(await fs.readFile(path.join(second.archivedDirectory, 'preserve-this-note.txt'), 'utf8'), 'Fictional release note');
  assert.deepEqual(await fs.readFile(path.join(second.archivedDirectory, 'index.html')), before);
  await assert.rejects(fs.access(path.join(second.destination, 'preserve-this-note.txt')));
  assert.deepEqual(await fs.readdir(path.join(workspace, 'DEVELOPMENT', 'dist', 'staging')), []);
  // A failed source build must leave the current upload in place and release the lock.
  await assert.rejects(prepareOcelotUpload({ root:path.join(workspace, 'missing-source'), workspace }));
  assert.deepEqual(await fs.readFile(path.join(second.uploadDirectory, 'index.html')), before);
  await assert.rejects(fs.access(path.join(workspace, 'DEVELOPMENT', 'dist', '.ocelot-package.lock')));
});

test('upload publishing rejects linked destinations and overlapping builds without moving user files', async t => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'capstone-ocelot-test-'));
  t.after(() => cleanup(workspace));
  const protectedFolder = path.join(workspace, 'private-example');
  await fs.mkdir(protectedFolder);
  await fs.writeFile(path.join(protectedFolder, 'keep.txt'), 'Fictional private data');
  const linkedDestination = path.join(workspace, 'Capstone - AI');
  await fs.symlink(protectedFolder, linkedDestination, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(prepareOcelotUpload({ workspace }), /linked or non-directory/);
  assert.equal(await fs.readFile(path.join(protectedFolder, 'keep.txt'), 'utf8'), 'Fictional private data');
  assert.ok((await fs.lstat(linkedDestination)).isSymbolicLink());
  const lock = path.join(workspace, 'DEVELOPMENT', 'dist', '.ocelot-package.lock');
  await fs.mkdir(lock);
  await assert.rejects(prepareOcelotUpload({ workspace }), /already running/);
  assert.ok((await fs.lstat(lock)).isDirectory());
});

test('PHP hosted integration: shared durable queue, documents, conflicts, search and access boundaries', { skip: !process.env.CAPSTONE_PHP_BIN, timeout: 60000 }, async t => {
  const php = process.env.CAPSTONE_PHP_BIN;
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'capstone-ocelot-test-'));
  const publicRoot = path.join(temp, 'home', 'public_html');
  const app = path.join(publicRoot, 'Capstone - AI');
  const processes = [];
  async function stop(child) { if (child.exitCode === null && child.signalCode === null) { child.kill(); await once(child, 'exit'); } }
  t.after(async () => { for (const child of processes) await stop(child); await cleanup(temp); });
  const packaged = await createOcelotPackage({ outputRoot: path.join(temp, 'build') });
  await fs.mkdir(publicRoot, { recursive: true });
  // Both resolved move targets are inside this uniquely created test directory.
  assert.ok(path.resolve(app).startsWith(path.resolve(temp) + path.sep));
  assert.ok(path.resolve(packaged.uploadDirectory).startsWith(path.resolve(temp) + path.sep));
  await fs.rename(packaged.uploadDirectory, app);
  async function start() {
    const socket = net.createServer().listen(0, '127.0.0.1'); await once(socket, 'listening');
    const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
    const args = ['-n'];
    if (process.platform === 'win32') args.push('-d', 'extension_dir=' + path.join(path.dirname(php), 'ext'), '-d', 'extension=mbstring');
    else args.push('-d', 'extension=mbstring');
    args.push('-d', 'post_max_size=20M', '-S', '127.0.0.1:' + port, '-t', publicRoot);
    const child = spawn(php, args, { windowsHide: true, stdio: ['ignore','pipe','pipe'] });
    processes.push(child);
    let log = ''; child.stdout.on('data', b => { log += b; }); child.stderr.on('data', b => { log += b; });
    const base = 'http://127.0.0.1:' + port + '/Capstone%20-%20AI/';
    for (let retry = 0; retry < 80; retry++) {
      if (child.exitCode !== null) throw new Error('PHP failed to start: ' + log);
      try { const response = await fetch(base); if (response.ok) return { child, base }; } catch {}
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error('PHP did not start: ' + log);
  }
  let primary = await start(); const secondary = await start();
  const endpoint = (base, route) => createApiClient({ baseUrl: base, transport: 'php' }).url('/api' + route);
  async function request(route, { method = 'GET', body, cookie, base = primary.base, headers = {} } = {}) {
    const response = await fetch(endpoint(base, route), { method, headers: { ...(body === undefined ? {} : {'Content-Type':'application/json'}), ...(cookie ? {Cookie:cookie} : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    return { response, status:response.status, data, cookie: response.headers.getSetCookie().at(-1)?.split(';')[0] };
  }
  const health = await request('/health'); assert.equal(health.status, 200); assert.equal(health.data.storage, 'private-files');
  assert.equal((await request('/tickets')).status, 401);
  assert.equal((await request('/staff/login', {method:'POST',body:{email:'outsider@example.edu'}})).status, 401);
  assert.equal((await request('/staff/login', {method:'POST',body:{email:'ralva037@fiu.edu'}})).status, 401);
  const alice = await request('/staff/login', {method:'POST',body:{email:'afeli016@fiu.edu'}});
  assert.equal(alice.data.members.length, 5);
  assert.equal(alice.data.members.some(member => member.email === 'ralva037@fiu.edu'), false);
  assert.equal(alice.status, 200); assert.equal(alice.data.staff.name, 'Anthony Feliz');
  assert.match(alice.response.headers.get('set-cookie'), /Path=\/Capstone%20-%20AI\/api\/; HttpOnly; SameSite=Strict/);
  const bob = await request('/staff/login', {method:'POST',body:{email:'zrich010@fiu.edu'},base:secondary.base}); assert.equal(bob.status, 200);
  assert.equal((await request('/staff/session', {cookie:alice.cookie})).data.loginMode, 'email-demo');
  assert.equal((await request('/staff/login', {method:'POST',body:{email:'afeli016@fiu.edu'},headers:{Origin:'https://evil.invalid'}})).status, 403);
  const guest = await request('/session');
  const student = {name:'Fictional Tester',email:'fictional@example.edu',question:'TEST attendance',details:'Fictional attendance report',category:'Attendance',identityContext:guest.data.identityContext,
    preferredContactMethod:'phone',contactPhone:'(305) 555-0123',projectOwnerTicket:true,assignedTo:'afeli016@fiu.edu',attachments:[{name:'sample.txt',size:7,data:Buffer.from('sample\n').toString('base64')}]};
  assert.equal((await request('/tickets', {method:'POST',body:{...student,identityContext:'bad'}})).status, 409);
  assert.equal((await request('/tickets', {method:'POST',body:{...student,contactPhone:'123'}})).status, 400);
  assert.equal((await request('/tickets', {method:'POST',body:{...student,email:'bad..mail@example.edu'}})).status, 400);
  assert.equal((await request('/tickets', {method:'POST',body:{...student,attachments:[{name:'../sample.txt',size:7,data:'c2FtcGxlCg=='}]}})).status, 400);
  assert.equal((await request('/tickets', {method:'POST',body:{...student,attachments:[{name:'fake.pdf',size:7,data:'c2FtcGxlCg=='}]}})).status, 400);
  const created = await request('/tickets', {method:'POST',body:student}); assert.equal(created.status, 201);
  const id = created.data.id; assert.equal(created.data.assignedTo, null); assert.equal(created.data.projectOwnerTicket, undefined); assert.equal(created.data.contact.value, '+13055550123');
  const all = await request('/tickets', {cookie:bob.cookie,base:secondary.base}); assert.ok(all.data.some(ticket => ticket.id === id));
  const documentUrl = endpoint(primary.base, '/tickets/' + id + '/attachments/' + created.data.attachments[0].id);
  assert.equal((await fetch(documentUrl)).status, 401);
  const download = await fetch(documentUrl, {headers:{Cookie:bob.cookie}}); assert.equal(await download.text(), 'sample\n'); assert.match(download.headers.get('content-disposition'), /^attachment/);
  const own = await request('/staff/tickets', {method:'POST',cookie:alice.cookie,body:{category:'Testing and updates',question:'TEST project owner',details:'Fictional request',projectOwnerTicket:true,assignedTo:'afeli016@fiu.edu'}});
  assert.equal(own.status, 201); assert.equal(own.data.createdBy, 'afeli016@fiu.edu'); assert.equal(own.data.projectOwnerTicket, true);
  const change = {expectedRevision:0,requestId:randomUUID(),status:'resolved',priority:'high',category:'Attendance',assignedTo:'afeli016@fiu.edu',question:'TEST attendance',details:'Fictional attendance report',resolution:'Internal resolution',workNote:'Private fictional note',additionalComment:'Public fictional reply'};
  const work = await request('/tickets/'+id+'/work', {method:'PATCH',cookie:alice.cookie,body:change}); assert.equal(work.status, 200); assert.equal(work.data.resolvedBy, 'afeli016@fiu.edu');
  const retry = await request('/tickets/'+id+'/work', {method:'PATCH',cookie:alice.cookie,body:change}); assert.equal(retry.data.activity.length, work.data.activity.length);
  assert.equal((await request('/tickets/'+id+'/work', {method:'PATCH',cookie:bob.cookie,body:{...change,requestId:randomUUID()}})).status, 409);
  const preview = await request('/tickets/'+id+'/requester-preview', {cookie:bob.cookie});
  assert.equal(preview.data.comments[0].body, 'Public fictional reply'); assert.doesNotMatch(JSON.stringify(preview.data), /Private fictional note|Internal resolution|fictional@example|workSaves|resolvedBy/);
  const claim = await request('/tickets/'+own.data.id, {method:'PATCH',cookie:bob.cookie,body:{assignedTo:'zrich010@fiu.edu',expectedAssignee:'afeli016@fiu.edu'}}); assert.equal(claim.status, 200);
  assert.equal((await request('/tickets/'+own.data.id, {method:'PATCH',cookie:alice.cookie,body:{assignedTo:null,expectedAssignee:'afeli016@fiu.edu'}})).status, 409);
  const knowledge = require('../server/lib/knowledge').reviewedKnowledge(JSON.parse(await fs.readFile(path.join(__dirname, '../data/capstone-knowledge.json'), 'utf8')));
  for (const question of ['Where are the sprint planning templates?', 'attendance', 'how do i get started with capstone', 'fonts colors logo', 'showcase judge and retrospective', 'résumé', 'quantum pizza robot', ...knowledge.flatMap(entry => entry.intents || [])]) {
    const found = await request('/search?q='+encodeURIComponent(question));
    assert.equal(found.status, 200); assert.deepEqual(found.data, {question,...searchKnowledge(knowledge, question)}, question);
  }
  // Distinct PHP processes exercise the same persistent lock concurrently on Windows.
  for (const question of ['Check again', 'Open it', 'Any new messages?', 'When is it due?', 'How is my grade calculated?', 'Open my dashboard and messages', 'I see an error message']) {
    const found = await request('/search?q='+encodeURIComponent(question)+'&context=portal-messages');
    assert.equal(found.status, 200); assert.deepEqual(found.data, {question,...searchKnowledge(knowledge, question, 'portal-messages')});
  }
  for (const question of ['When is it due?', 'Where do I submit it?', 'How is it graded?', 'What is my grade?', 'When is Sprint 2 due in Spring 2027?']) {
    const found = await request('/search?q='+encodeURIComponent(question)+'&context=syllabus-sprint-2');
    assert.equal(found.status, 200); assert.deepEqual(found.data, {question,...searchKnowledge(knowledge, question, 'syllabus-sprint-2')});
  }
  const simultaneous = await Promise.all(Array.from({length:10}, (_, i) => request('/tickets', {method:'POST',body:{...student,question:'TEST parallel '+i,attachments:[]},base:i%2 ? primary.base : secondary.base})));
  assert.ok(simultaneous.every(result => result.status === 201)); assert.equal(new Set(simultaneous.map(result => result.data.id)).size, 10);
  assert.equal((await request('/tickets', {cookie:bob.cookie})).data.length, 12);
  const largeText = Buffer.alloc(5*1024*1024, 'A');
  const largeUpload = await request('/staff/tickets', {method:'POST',cookie:bob.cookie,body:{category:'Testing and updates',question:'TEST full allowance',details:'Two fictional text documents',attachments:[1,2].map(i => ({name:'large-'+i+'.txt',size:largeText.length,data:largeText.toString('base64')}))}});
  assert.equal(largeUpload.status, 201); assert.equal(largeUpload.data.attachments.length, 2);
  await stop(primary.child); primary = await start();
  assert.equal((await request('/tickets', {cookie:alice.cookie})).data.length, 13);
  assert.equal((await request('/staff/logout', {method:'POST',cookie:alice.cookie,body:{}})).status, 200);
  assert.equal((await request('/tickets', {cookie:alice.cookie})).status, 401);
  for (let i=0; i<10; i++) assert.equal((await request('/staff/login', {method:'POST',body:{email:'outsider@example.edu'}})).status, 401);
  assert.equal((await request('/staff/login', {method:'POST',body:{email:'outsider@example.edu'}})).status, 429);
  assert.equal((await fetch(primary.base+'api/storage.php')).status, 404);
  assert.equal((await fetch(primary.base+'api/knowledge.php')).status, 404);
  await assert.rejects(fs.access(path.join(app, 'data/tickets.json')));
  const privateRequest = await fetch(primary.base+'data/tickets.json');
  // PHP 8.4's development server may serve the parent index for nonexistent paths.
  assert.doesNotMatch(await privateRequest.text(), /Private fictional note|"tickets"\s*:|"secret"\s*:/);
  const privateBase = path.join(temp, 'home', '.capstone-chat-private');
  const storage = path.join(privateBase, (await fs.readdir(privateBase))[0]);
  assert.ok(!path.resolve(storage).startsWith(path.resolve(publicRoot)+path.sep));
  // Simulate an existing departed-member assignment/session only in this fixture.
  const fixtureFile = path.join(storage, 'state.json');
  const legacyState = JSON.parse(await fs.readFile(fixtureFile, 'utf8'));
  const legacyTicket = legacyState.tickets.find(ticket => ticket.id === own.data.id);
  legacyTicket.assignedTo = 'ralva037@fiu.edu';
  const legacyToken = 'c'.repeat(64);
  legacyState.sessions[createHash('sha256').update(legacyToken).digest('hex')] = { email:'ralva037@fiu.edu', expiresAt:Date.now()+60000 };
  await fs.writeFile(fixtureFile, JSON.stringify(legacyState));
  assert.equal((await request('/staff/session', {cookie:bob.cookie.split('=')[0]+'='+legacyToken})).status, 401);
  const legacyWork = await request('/tickets/'+own.data.id+'/work', {method:'PATCH',cookie:bob.cookie,body:{...legacyTicket,
    priority:legacyTicket.priority || 'normal', expectedRevision:legacyTicket.revision || 0,requestId:randomUUID(),workNote:'Fictional continuity check'}});
  assert.equal(legacyWork.status, 200);
  assert.equal(legacyWork.data.assignedTo, 'ralva037@fiu.edu');
  const legacyReassign = await request('/tickets/'+own.data.id, {method:'PATCH',cookie:bob.cookie,body:{assignedTo:'zrich010@fiu.edu',expectedAssignee:'ralva037@fiu.edu'}});
  assert.equal(legacyReassign.status, 200);
  assert.equal(legacyReassign.data.createdBy, own.data.createdBy);
  assert.equal((await request('/tickets/'+own.data.id, {method:'PATCH',cookie:bob.cookie,body:{assignedTo:'ralva037@fiu.edu',expectedAssignee:'zrich010@fiu.edu'}})).status, 400);
  const attachmentsBefore = await fs.readdir(path.join(storage, 'attachments'));
  // A queued request cannot create files or claim success while another writer holds the lock.
  const locked = spawn(php, ['-n', '-r', '$h=fopen($argv[1],"c+b");flock($h,LOCK_EX);echo "locked";fflush(STDOUT);sleep(30);', path.join(storage, 'state.lock')], {windowsHide:true,stdio:['ignore','pipe','pipe']});
  processes.push(locked); await once(locked.stdout, 'data');
  try {
    const blocked = await request('/staff/tickets', {method:'POST',cookie:bob.cookie,body:{category:'Other',question:'TEST lock failure',details:'No files should be saved',attachments:student.attachments}});
    assert.equal(blocked.status, 503);
  } finally { await stop(locked); }
  assert.deepEqual(await fs.readdir(path.join(storage, 'attachments')), attachmentsBefore);
  assert.equal((await request('/tickets', {cookie:bob.cookie})).data.length, 13);
  // Corruption fails closed instead of resetting the queue; isolated fixture only.
  await fs.writeFile(path.join(storage, 'state.json'), '{broken');
  assert.equal((await request('/health')).status, 503);
  assert.equal(await fs.readFile(path.join(storage, 'state.json'), 'utf8'), '{broken');
});
