// Fixed, reviewed DOM operations. Never interpolate chat text, selectors or URLs.
// These functions run only in the explicitly selected /portal tab.
const SECTION_ROUTES={Overview:'home',Messages:'messages',Team:'team',Standing:'compare',Grade:'mygrade'};

function readPortalGuard() {
  if(location.origin!=='https://capstone.cs.fiu.edu'||location.pathname!=='/portal'||location.search)return{state:'connection-lost'};
  const active=document.querySelector('main .sidebar .nav-item.on')?.textContent?.trim();
  const route=document.querySelector('main .sidebar .nav-item.on')?.getAttribute('data-v')||null;
  return{state:'present',documentId:performance.timeOrigin,active,route,editable:!!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')};
}

function readPortalIdentity() {
  if(location.origin!=='https://capstone.cs.fiu.edu'||location.pathname!=='/portal'||location.search)return{state:'connection-lost'};
  const visible=el=>!!el&&!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length)&&getComputedStyle(el).visibility!=='hidden';
  const navigation=performance.getEntriesByType('navigation')[0];
  const proof={documentId:performance.timeOrigin,status:navigation?.responseStatus,transferred:navigation?.transferSize,worker:navigation?.workerStart||0,serviceWorker:!!navigator.serviceWorker?.controller};
  if(document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))return{state:'editing-active',proof};
  const account=document.querySelector('button[aria-label="Account menu"]');
  if(!visible(account))return{state:'sign-in-required',proof};
  const wasOpen=account.getAttribute('aria-expanded')==='true';
  if(!wasOpen)account.click(); // Approved identity disclosure only; never submits the logout form.
  const menu=document.querySelector('#pubavdrop.open');
  const name=menu?.querySelector('.avdname')?.textContent?.trim();
  const email=menu?.querySelector('.avdemail')?.textContent?.trim();
  const hasSignout=!!menu?.querySelector('form[action="/logout"][method="post"]');
  const identity=visible(menu)&&hasSignout&&name&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||'')?{name:name.slice(0,120),email:email.toLowerCase().slice(0,254)}:null;
  if(!wasOpen)account.click();
  if(!identity)return{state:'sign-in-required',proof};
  return{state:'verified',identity,proof,active:document.querySelector('main .sidebar .nav-item.on')?.textContent?.trim()||null};
}

async function navigatePortalSection(section) {
  if(location.origin!=='https://capstone.cs.fiu.edu'||location.pathname!=='/portal'||location.search)return{state:'connection-lost'};
  const routes={Overview:'home',Messages:'messages',Team:'team',Standing:'compare',Grade:'mygrade'};
  const route=routes[section];
  if(!route)return{state:'section-denied'};
  if(document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))return{state:'editing-active'};
  const button=document.querySelector('main .sidebar button.nav-item[data-v="'+route+'"]');
  if(!button||button.disabled)return{state:'section-unavailable'};
  if(!button.classList.contains('on'))button.click(); // Fixed sidebar navigation only.
  let active=null;
  for(let attempt=0;attempt<40;attempt++){
    await new Promise(resolve=>setTimeout(resolve,50));
    active=document.querySelector('main .sidebar .nav-item.on')?.textContent?.trim();
    if(active===section&&document.querySelector('main #cmain'))break;
  }
  return{state:active===section?'present':'section-unavailable',active,section,url:location.origin+'/portal'};
}

function readPortalSection(section) {
  if(location.origin!=='https://capstone.cs.fiu.edu'||location.pathname!=='/portal'||location.search)return{state:'connection-lost'};
  const routes={Overview:'home',Messages:'messages',Team:'team',Standing:'compare',Grade:'mygrade'};
  if(!Object.hasOwn(routes,section))return{state:'section-denied'};
  const active=document.querySelector('main .sidebar .nav-item.on')?.textContent?.trim();
  if(active!==section)return{state:'section-required',active,section};
  if(document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))return{state:'editing-active',active,section};
  const visible=el=>!!el&&!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length)&&getComputedStyle(el).visibility!=='hidden';
  const clean=value=>String(value||'').replace(/[\u25be\u25b8]/g,'').replace(/[ \t]+/g,' ').replace(/\n\s*\n+/g,'\n').trim();
  const safeText=root=>{
    const parts=[];
    const visit=node=>{
      if(node.nodeType===3){const value=clean(node.textContent);if(value)parts.push(value);return;}
      if(node.nodeType!==1||!visible(node))return;
      if(node.matches('script,style,noscript,form,input,textarea,select,option,button,[contenteditable="true"],.sb-card-edit,[class*="sb-e-"],#csMsgs,#csThread,#csComposeWrap,#csTyping'))return;
      if(node.matches('a')&&/(?:pwd|passcode|token|secret|key)=/i.test(node.getAttribute('href')||''))return;
      for(const child of node.childNodes)visit(child);
    };
    visit(root);return clean(parts.join('\n')).slice(0,6000);
  };
  const timestamp=text=>clean(text).match(/(?:updated|posted|as of|synced)[^\n]{0,100}/i)?.[0]?.slice(0,120)||null;
  const records=[];
  const add=(kind,heading,text,subview,sourceTimestamp=null,coverage='')=>{
    const value=clean(text);if(!value||/\bLoading(?:\u2026|\.\.\.)?\s*$/i.test(value))return;
    records.push({kind,heading:clean(heading).slice(0,180),text:value.slice(0,6000),url:location.origin+'/portal',section,subview:clean(subview||section).slice(0,120),sourceTimestamp:sourceTimestamp||timestamp(value),coverage});
  };
  const content=document.querySelector('main #cmain');
  if(!content)return{state:'connection-lost'};

  if(section==='Overview'){
    for(const card of [...content.querySelectorAll(':scope > .card')].slice(0,30)){
      if(!visible(card)||card.classList.contains('collapsed'))continue;
      const heading=clean(card.querySelector('h2,h3')?.textContent);if(!heading)continue;
      let kind=null;
      if(/^This week,/i.test(heading))kind='profile';
      else if(/^This week.s dates/i.test(heading))kind='dates';
      else if(/^This week.s assignment/i.test(heading))kind='assignment';
      else if(/^Product Owner$/i.test(heading))kind='product-owner';
      else if(/^Your team$/i.test(heading))kind='team';
      else if(/^Sprint$/i.test(heading))kind='sprint';
      else if(card.querySelector('a[href^="/wizard2/projects?p="]'))kind='project';
      if(kind)add(kind,heading,safeText(card),'Overview card');
    }
    for(const column of [...content.querySelectorAll('.sb-col')].slice(0,12)){
      const heading=clean(column.querySelector('h3,h4,.sb-col-title')?.textContent)||'Sprint board column';
      const cards=[...column.querySelectorAll('.sb-card-view')].slice(0,30);
      if(!cards.length)add('sprint-board',heading,safeText(column),'Sprint board');
      for(const card of cards){const title=clean(card.querySelector('.sb-card-title')?.textContent)||'Sprint task';add('task',title,safeText(card),'Sprint board · '+heading);}
    }
    for(const panel of [...content.querySelectorAll('[id^="sb-ceremony-"]')].slice(0,10))add('ceremony',clean(panel.querySelector('h3,h4')?.textContent)||'Sprint ceremony',safeText(panel),'Sprint Review / Retrospective');
    const standup=[...content.querySelectorAll('[class*="standup"]')].filter(el=>el.tagName!=='FORM'&&!el.closest('form')).slice(0,10);
    for(const panel of standup)add('standup',clean(panel.querySelector('h3,h4')?.textContent)||'Stand-up information',safeText(panel),'Stand-up');
    for(const table of [...content.querySelectorAll('table')].slice(0,8))add('schedule',clean(table.querySelector('caption')?.textContent)||'Schedule or deadline table',safeText(table),'Schedule');
  }

  if(section==='Team'){
    const root=content.querySelector('.myteam')||content;
    const hero=root.querySelector('.myteam-hero');if(hero)add('team','My team',safeText(hero),'Team summary');
    for(const row of [...root.querySelectorAll('.myteam-row')].slice(0,30))add('team-member','Team member',safeText(row),'Team members');
    for(const card of [...root.querySelectorAll('.card')].slice(0,20)){
      if(!visible(card)||card.classList.contains('collapsed'))continue;
      const heading=clean(card.querySelector('h2,h3,h4')?.textContent)||'Team details';
      const kind=/product owner/i.test(heading)?'product-owner':/lead/i.test(heading)||card.querySelector('.pc-leader,.pc-leader-confirmed')?'leadership':'team';
      add(kind,heading,safeText(card),'Team details');
    }
  }

  if(section==='Standing'){
    for(const card of [...content.querySelectorAll(':scope > .card,.card')].slice(0,10)){
      if(!visible(card)||card.classList.contains('collapsed'))continue;
      const heading=clean(card.querySelector('h2,h3')?.textContent)||'My standing';
      let text=safeText(card);const why=card.querySelector('.whyi[type="button"]:not([form])');
      if(why?.getAttribute('title'))text+='\nExplanation: '+clean(why.getAttribute('title'));
      const graphics=[...card.querySelectorAll('.trend [aria-label],.trend [title]')].map(el=>clean(el.getAttribute('aria-label')||el.getAttribute('title'))).filter(Boolean).join('\n');
      if(graphics)text+='\n'+graphics;
      add(/trend/i.test(heading)||card.querySelector('.trend')?'standing-trend':'standing',heading,text,'Standing');
    }
  }

  if(section==='Grade'){
    const root=content.querySelector('#mygradebox')||content;
    const details=[...root.querySelectorAll('details.gpast')].slice(0,5),states=details.map(el=>el.open);
    details.forEach(el=>{el.open=true;}); // Standard disclosure only; restored below.
    try{
      for(const card of [...root.querySelectorAll(':scope > .card,.card')].slice(0,20)){
        if(!visible(card))continue;const heading=clean(card.querySelector('h2,h3,h4')?.textContent)||'My grade';
        add('grade',heading,safeText(card),'Current grade');
      }
      for(const detail of details){const heading=clean(detail.querySelector('summary')?.textContent)||'Past term grade details';add('past-grade',heading,safeText(detail),'Past term');}
    }finally{details.forEach((el,index)=>{el.open=states[index];});}
  }

  if(section==='Messages'){
    const side=content.querySelector('#csSide');
    if(!side)return{state:'verified',section,records:[],coverage:'Messages view was present, but its approved channel sidebar was unavailable. Conversation bodies were not read.'};
    for(const channel of [...side.querySelectorAll('.cs-chan')].slice(0,60)){
      if(!visible(channel))continue;
      const directName=[...channel.childNodes].filter(node=>node.nodeType===3).map(node=>node.textContent).join(' ');
      const name=clean(channel.getAttribute('aria-label')||channel.getAttribute('data-channel-name')||channel.querySelector('.cs-name,.name,.label,.title,[data-channel-name]')?.textContent||directName).slice(0,180);
      if(!name)continue;
      const unread=channel.classList.contains('unread');
      const count=clean(channel.querySelector('.cs-count')?.textContent);
      add('messages',name,'Channel: '+name+'\nUnread: '+(count||(unread?'yes':'no')),'Channel list',null,'Channel names, channel metadata and unread indicators only; no conversation bodies or threads.');
    }
  }

  const limits={Overview:'Visible approved Overview cards, sprint board read-only views, ceremonies, stand-up information, and schedules. Editing controls, linked evidence contents, hidden fields, and unrelated teams are excluded.',Team:'The signed-in account’s own Team view only. Unrelated teams and hidden/editing controls are excluded.',Standing:'Visible standing and trend information. The information control was classified as a non-form disclosure; no state-changing control is used.',Grade:'The signed-in account’s visible current grade cards and temporarily disclosed past-term details. No prediction or other student record is read.',Messages:'Channel names, accessible channel metadata, and unread indicators from the sidebar only. Conversations, message bodies, threads, composer and typing state are never read.'};
  return{state:'verified',section,records:records.slice(0,160),coverage:limits[section]};
}

// Backward-compatible reader alias; callers that stringify it receive the full
// self-contained implementation and may pass "Overview" explicitly.
const readPortalDom=readPortalSection;

module.exports={SECTION_ROUTES,readPortalDom,readPortalGuard,readPortalIdentity,navigatePortalSection,readPortalSection};
