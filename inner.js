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

document.querySelector('.enquiry-form')?.addEventListener('submit',event=>{
  event.preventDefault();
  const status=event.currentTarget.querySelector('.form-status');
  if(!event.currentTarget.checkValidity()){
    status.textContent='Please complete the required fields.';
    event.currentTarget.reportValidity();
    return;
  }
  status.textContent='Thank you. This preview form is ready to connect to the restaurant’s booking system.';
});

updateHeader();
updateParallax();
window.addEventListener('scroll',onScroll,{passive:true});
window.addEventListener('resize',onScroll);
