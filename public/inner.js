document.documentElement.classList.add('js');

const header=document.querySelector('.header');
const hero=document.querySelector('.inner-hero');
const menuButton=document.querySelector('.menu-toggle');
const mobileNav=document.querySelector('.mobile-nav');
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const desktopBreakpoint=window.matchMedia('(min-width: 981px)');
let menuTrigger=null;

function updateHeader(){
  if(!hero)return;
  header.classList.toggle('scrolled',hero.getBoundingClientRect().bottom<=header.offsetHeight);
}

function setMenu(open,{restoreFocus=true}={}){
  if(!menuButton||!mobileNav)return;
  if(open)menuTrigger=document.activeElement;
  menuButton.setAttribute('aria-expanded',String(open));
  menuButton.setAttribute('aria-label',open?'Close menu':'Open menu');
  mobileNav.setAttribute('aria-hidden',String(!open));
  mobileNav.inert=!open;
  mobileNav.classList.toggle('is-open',open);
  header.classList.toggle('menu-open',open);
  document.body.classList.toggle('menu-open',open);
  if(open){
    requestAnimationFrame(()=>mobileNav.querySelector('a')?.focus());
  }else if(restoreFocus&&menuTrigger instanceof HTMLElement){
    menuTrigger.focus();
  }
}

menuButton?.addEventListener('click',()=>{
  setMenu(menuButton.getAttribute('aria-expanded')!=='true');
});

mobileNav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setMenu(false,{restoreFocus:false})));

document.addEventListener('keydown',event=>{
  if(menuButton?.getAttribute('aria-expanded')!=='true'||!mobileNav)return;
  if(event.key==='Escape'){
    event.preventDefault();
    setMenu(false);
    return;
  }
  if(event.key!=='Tab')return;
  const focusable=[menuButton,...mobileNav.querySelectorAll('a')];
  const first=focusable[0];
  const last=focusable.at(-1);
  if(event.shiftKey&&document.activeElement===first){
    event.preventDefault();
    last.focus();
  }else if(!event.shiftKey&&document.activeElement===last){
    event.preventDefault();
    first.focus();
  }
});

desktopBreakpoint.addEventListener('change',event=>{
  if(event.matches)setMenu(false,{restoreFocus:false});
});

const revealObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
},{threshold:.16,rootMargin:'0px 0px -8%'});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

const parallaxItems=[...document.querySelectorAll('.parallax-media')];
let ticking=false;
function updateParallax(){
  if(reducedMotion.matches){ticking=false;return}
  const viewport=window.innerHeight;
  parallaxItems.forEach(item=>{
    const rect=item.getBoundingClientRect();
    if(rect.bottom<0||rect.top>viewport)return;
    const progress=(rect.top+rect.height/2-viewport/2)/(viewport+rect.height);
    item.style.setProperty('--parallax-y',`${progress*-70}px`);
  });
  ticking=false;
}
function onScroll(){
  updateHeader();
  if(!ticking){requestAnimationFrame(updateParallax);ticking=true}
}

document.querySelector('[data-reservation-form]')?.addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget;
  const status=form.querySelector('.form-status');
  const button=form.querySelector('.form-action');
  if(!form.checkValidity()){
    status.textContent='Please complete the required fields.';
    form.reportValidity();
    return;
  }
  if(!form.querySelector('[name="cf-turnstile-response"]')?.value){
    status.textContent='Please complete the security check.';
    return;
  }
  form.elements.submission_id.value=crypto.randomUUID();
  button.disabled=true;
  button.setAttribute('aria-busy','true');
  status.textContent='Sending your enquiry…';
  try{
    const response=await fetch(form.action,{
      method:'POST',
      body:new FormData(form),
      headers:{Accept:'application/json'}
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.message||'We could not send your enquiry. Please try again.');
    form.reset();
    status.textContent='Thank you. Your enquiry has been sent to the JIN team.';
  }catch(error){
    status.textContent=error instanceof Error?error.message:'We could not send your enquiry. Please try again.';
  }finally{
    window.turnstile?.reset();
    button.disabled=false;
    button.removeAttribute('aria-busy');
  }
});

updateHeader();
updateParallax();
window.addEventListener('scroll',onScroll,{passive:true});
window.addEventListener('resize',onScroll);
