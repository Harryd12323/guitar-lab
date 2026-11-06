// Wakes the metronome scheduler. Worker timers keep running when the main
// thread is busy; actual click timing comes from the AudioContext clock.
let id = null;
self.onmessage = (e) => {
  clearInterval(id);
  if (e.data === 'start') id = setInterval(() => self.postMessage('tick'), 25);
};
