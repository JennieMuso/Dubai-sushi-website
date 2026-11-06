document.documentElement.classList.add('js');

const menuButton=document.querySelector('.menu-toggle');
const mobileNav=document.querySelector('.mobile-nav');
const header=document.querySelector('.header');
const hero=document.querySelector('.hero');
const desktopBreakpoint=window.matchMedia('(min-width: 981px)');
let menuTrigger=null;

function updateHeader(){
  const heroBottom=hero.getBoundingClientRect().bottom;
  header.classList.toggle('scrolled',heroBottom<=header.offsetHeight);
}

function setMenu(open,{restoreFocus=true}={}){
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

menuButton.addEventListener('click',()=>{
  setMenu(menuButton.getAttribute('aria-expanded')!=='true');
});

mobileNav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setMenu(false,{restoreFocus:false})));

document.addEventListener('keydown',event=>{
  if(menuButton.getAttribute('aria-expanded')!=='true')return;
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

updateHeader();
window.addEventListener('scroll',updateHeader,{passive:true});
window.addEventListener('resize',updateHeader);
