// Fixed, reviewed DOM operations. Never interpolate chat text, selectors or URLs.
// These functions run only in the explicitly selected /portal tab.
function readPortalDom() {
  if (location.origin !== 'https://capstone.cs.fiu.edu' || location.pathname !== '/portal' || location.search) return { state:'connection-lost' };
  const visible = el => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
  const account = document.querySelector('button[aria-label="Account menu"]');
  const active = document.querySelector('main .sidebar .nav-item.on')?.textContent?.trim();
  const navigation = performance.getEntriesByType('navigation')[0];
  const proof = { documentId:performance.timeOrigin, status:navigation?.responseStatus, transferred:navigation?.transferSize, worker:navigation?.workerStart || 0, serviceWorker:!!navigator.serviceWorker?.controller };
  if (!visible(account)) return { state:'sign-in-required', proof };
  if (active !== 'Overview') return { state:'overview-required', proof };
  const wasOpen = account.getAttribute('aria-expanded') === 'true';
  if (!wasOpen) account.click(); // Only opens the account display; never submits its form.
  const menu = document.querySelector('#pubavdrop.open');
  const name = menu?.querySelector('.avdname')?.textContent?.trim();
  const email = menu?.querySelector('.avdemail')?.textContent?.trim();
  const hasSignout = !!menu?.querySelector('form[action="/logout"][method="post"]');
  const identity = visible(menu) && hasSignout && name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') ? { name:name.slice(0,120), email:email.toLowerCase().slice(0,254) } : null;
  if (!wasOpen) account.click();
  if (!identity) return { state:'sign-in-required', proof };
  const container = document.querySelector('main #cmain');
  if (!container) return { state:'connection-lost', proof };
  const readVisible = root => {
    const parts=[];
    const visit = el => {
      if (el.nodeType === 3) { const t=el.textContent.trim(); if(t) parts.push(t); return; }
      if (el.nodeType !== 1 || !visible(el) || el.matches('script,style,form,input,textarea,button,[contenteditable="true"],details:not([open])') || el.closest('.collapsed')) return;
      // Do not collect meeting passwords, tracking links or controls.
      if (el.matches('a') && /(?:pwd|passcode|token|secret|key)=/i.test(el.getAttribute('href') || '')) return;
      for (const child of el.childNodes) visit(child);
    };
    visit(root); return parts.join('\n').slice(0,6000);
  };
  const records=[];
  for (const card of [...container.children].slice(0,30)) {
    if (!card.classList.contains('card') || card.classList.contains('collapsed') || !visible(card)) continue;
    const heading=card.querySelector('h2,h3')?.textContent?.replace(/[▾▸]/g,'').trim();
    if (!heading) continue;
    let kind;
    if (/^This week,/i.test(heading)) kind='profile';
    else if (/^This week.s dates/i.test(heading)) kind='dates';
    else if (/^This week.s assignment/i.test(heading)) kind='assignment';
    else if (/^Product Owner$/i.test(heading)) kind='product-owner';
    else if (/^Your team$/i.test(heading)) kind='team';
    else if (/^Sprint$/i.test(heading)) kind='sprint';
    else if (card.querySelector('a[href^="/wizard2/projects?p="]')) kind='project';
    else continue; // No grades, other teams, directory, messages or hidden records.
    const text=readVisible(card);
    if (!text || /\bLoading(?:…|\.\.\.)?\s*$/.test(text)) continue;
    records.push({ kind, heading:heading.slice(0,180), text, url:location.origin+'/portal', section:'Overview', sourceTimestamp:null });
  }
  // Sidebar badges only: never enter Messages or open an unread conversation.
  const messages=[...document.querySelectorAll('main .sidebar button.nav-item')].find(el=>/^Messages\b/.test(el.textContent.trim()));
  const badge=messages?.innerText?.trim();
  if (badge && /^Messages\s+\d+$/.test(badge)) records.push({kind:'messages',heading:'Messages sidebar indicator',text:badge,url:location.origin+'/portal',section:'Messages',sourceTimestamp:null});
  return { state:'verified', identity, proof, records, coverage:'Visible Overview cards and any Messages sidebar number only. Collapsed cards, inbox contents, grades, Canvas and other students’ records are not read.' };
}
function readPortalGuard() {
  if (location.origin !== 'https://capstone.cs.fiu.edu' || location.pathname !== '/portal' || location.search) return { state:'connection-lost' };
  return { state:'present', documentId:performance.timeOrigin, active:document.querySelector('main .sidebar .nav-item.on')?.textContent?.trim(), editable:!!document.activeElement?.matches('input,textarea,[contenteditable="true"]') };
}
module.exports = { readPortalDom, readPortalGuard };
