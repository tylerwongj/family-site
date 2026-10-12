// Runs in <head> before the page paints: dark by default, light if the visitor picked it.
try {
  if (localStorage.getItem('theme') === 'light') document.documentElement.dataset.theme = 'light';
} catch { /* storage blocked: stay dark */ }
