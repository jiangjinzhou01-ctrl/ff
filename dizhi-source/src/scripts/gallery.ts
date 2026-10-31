  import PhotoSwipeLightbox from 'photoswipe/lightbox';
  import 'photoswipe/style.css';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const lightbox = new PhotoSwipeLightbox({
    gallery: '[data-photo-gallery]', children: 'figure > a[data-lightbox]', pswpModule: () => import('photoswipe'),
    showHideAnimationType: reduced.matches ? 'none' : 'zoom', showAnimationDuration: 300, hideAnimationDuration: 240,
    easing: 'cubic-bezier(.2,.8,.25,1)',
    bgOpacity: .96, padding: { top: 65, bottom: 85, left: 16, right: 16 },
    closeTitle: '关闭图片', zoomTitle: '缩放图片', arrowPrevTitle: '上一张图片', arrowNextTitle: '下一张图片',
    errorMsg: '图片暂时无法加载，请关闭后重试。', indexIndicatorSep: ' / ',
  });
  const syncMotion = () => {
    for (const options of [lightbox.options, lightbox.pswp?.options]) {
      if (!options) continue;
      options.showHideAnimationType = reduced.matches ? 'none' : 'zoom';
      options.zoomAnimationDuration = reduced.matches ? 0 : 260;
    }
    if (reduced.matches) lightbox.pswp?.animations.stopAll();
  };
  lightbox.on('beforeOpen', syncMotion);
  reduced.addEventListener('change', syncMotion);
  lightbox.on('uiRegister', () => {
    lightbox.pswp?.ui?.registerElement({ name: 'caption', order: 9, isButton: false, appendTo: 'root', onInit: (el, pswp) => {
      el.setAttribute('aria-live', 'polite');
      pswp.on('change', () => { el.textContent = pswp.currSlide?.data.element?.getAttribute('data-caption') || ''; });
    }});
  });
  lightbox.init();
  window.addEventListener('pagehide', event => { if (!event.persisted) { lightbox.destroy(); reduced.removeEventListener('change', syncMotion); } });
