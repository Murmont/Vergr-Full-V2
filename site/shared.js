/* ═══════════════════════════════════════════════════════════
   VERGR — Public Pages Shared JavaScript
   Theme toggle, mobile nav, scroll effects
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Theme ───
  function getResolvedTheme(pref) {
    if (pref === 'system') {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return pref || 'dark';
  }

  function applyTheme(pref) {
    const resolved = getResolvedTheme(pref);
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.className = resolved;
    try { localStorage.setItem('vergr_theme', pref); } catch (e) {}
  }

  // Init theme
  var savedTheme = 'dark';
  try { savedTheme = localStorage.getItem('vergr_theme') || 'dark'; } catch (e) {}
  applyTheme(savedTheme);

  // Listen for system changes
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
    var current = 'dark';
    try { current = localStorage.getItem('vergr_theme') || 'dark'; } catch (e) {}
    if (current === 'system') applyTheme('system');
  });

  // Theme toggle button
  document.addEventListener('DOMContentLoaded', function () {
    var toggleBtn = document.querySelector('.theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        var current = 'dark';
        try { current = localStorage.getItem('vergr_theme') || 'dark'; } catch (e) {}
        // Cycle: dark → light → system → dark
        var next = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
        applyTheme(next);
        // Update tooltip
        toggleBtn.title = 'Theme: ' + next;
      });
    }
  });

  // ─── Mobile Nav ───
  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        links.classList.toggle('open');
        var isOpen = links.classList.contains('open');
        toggle.setAttribute('aria-expanded', isOpen);
      });
      // Close on link click
      links.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { links.classList.remove('open'); });
      });
    }
  });

  // ─── Nav Scroll Effect ───
  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;
    function onScroll() {
      if (window.scrollY > 20) {
        nav.classList.add('glass-header');
      } else {
        nav.classList.remove('glass-header');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  });

  // ─── Intersection Observer for Animations ───
  document.addEventListener('DOMContentLoaded', function () {
    var targets = document.querySelectorAll('[data-animate]');
    if (!targets.length) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-up');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (el) {
      el.style.opacity = '0';
      observer.observe(el);
    });
  });

  // ─── Modal ───
  window.openModal = function (id) {
    var modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
  };
  window.closeModal = function (id) {
    var modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  };
})();
