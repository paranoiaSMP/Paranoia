// « PARANOIA » ajusté à la largeur du pied de page
(() => {
  const big = document.getElementById("big");
  const fit = () => {
    big.style.fontSize = "100px";
    const f = big.parentElement, cs = getComputedStyle(f);
    big.style.fontSize = (100 * (f.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * .999 / big.offsetWidth) + "px";
  };
  fit(); addEventListener("resize", fit);
  document.fonts && document.fonts.ready.then(fit);
})();
