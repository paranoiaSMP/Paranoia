export const INTRO_OPEN_AT = 1.35;

export const introDelay = () =>
  typeof document !== "undefined" && document.documentElement.hasAttribute("data-intro") ? INTRO_OPEN_AT + 0.1 : 0;

export const INTRO_SCRIPT = `try{var d=document.documentElement;if(!sessionStorage.getItem("ps-intro")&&!matchMedia("(prefers-reduced-motion: reduce)").matches&&!location.pathname.startsWith("/admin")){d.setAttribute("data-intro","");sessionStorage.setItem("ps-intro","1")}}catch(e){}`;
