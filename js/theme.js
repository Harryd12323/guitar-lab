// Loaded in <head> (not deferred) so a saved theme applies before first paint.
try {
  const saved = localStorage.getItem('guitar-lab:theme');
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
} catch (e) { /* storage blocked: follow the system theme */ }
