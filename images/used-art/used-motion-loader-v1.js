(function () {
  'use strict';
  var ownSource = document.currentScript && document.currentScript.src;
  function start() {
    if (!ownSource || !document.querySelector('.used-editorial-hero') || document.querySelector('script[data-used-motion]')) return;
    var script = document.createElement('script');
    script.src = new URL('used-motion-v1.js', ownSource).href;
    script.dataset.usedMotion = 'true';
    script.defer = true;
    document.head.appendChild(script);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
}());
