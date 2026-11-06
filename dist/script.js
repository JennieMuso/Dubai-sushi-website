const menuButton=document.querySelector('.menu-toggle');
const mobileNav=document.querySelector('.mobile-nav');
const header=document.querySelector('.header');
const hero=document.querySelector('.hero');

function updateHeader(){
  const heroBottom=hero.getBoundingClientRect().bottom;
  header.classList.toggle('scrolled',heroBottom<=header.offsetHeight);
}

menuButton.addEventListener('click',()=>{
  const isOpen=menuButton.getAttribute('aria-expanded')==='true';
  menuButton.setAttribute('aria-expanded',String(!isOpen));
  menuButton.setAttribute('aria-label',isOpen?'Open menu':'Close menu');
  mobileNav.hidden=isOpen;
  header.classList.toggle('menu-open',!isOpen);
});

mobileNav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
  mobileNav.hidden=true;
  menuButton.setAttribute('aria-expanded','false');
  menuButton.setAttribute('aria-label','Open menu');
  header.classList.remove('menu-open');
}));

updateHeader();
window.addEventListener('scroll',updateHeader,{passive:true});
window.addEventListener('resize',updateHeader);
