// Browser and Phone Notification Bar Utility for BingoX Admin

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem('bingo_admin_notifications_enabled', permission === 'granted' ? 'true' : 'false');
    return permission;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return 'denied';
  }
}

/**
 * Synthesizes an audible notification bell chime using the Web Audio API.
 * Works natively in all modern browsers without external audio assets.
 */
export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Two-tone bright notification chime (High D -> High A)
    const tones = [
      { freq: 587.33, delay: 0, duration: 0.18 }, // D5
      { freq: 880.00, delay: 0.15, duration: 0.40 } // A5
    ];

    tones.forEach(({ freq, delay, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

      gain.gain.setValueAtTime(0.01, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration + 0.05);
    });
  } catch (e) {
    console.warn('Audio chime playback omitted:', e.message);
  }
}

export async function sendPhoneNotification({
  title,
  body,
  tag = 'admin-alert',
  url = '/',
}) {
  // Always play audio chime on alert
  playNotificationSound();

  // Try phone vibration directly if available
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate([250, 100, 250]); } catch (e) {}
  }

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const options = {
    body: body || 'New platform update requires admin review.',
    icon: '/icon-512.jpg',
    badge: '/icon-512.jpg',
    tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    data: { url },
  };

  try {
    // Prefer service worker showNotification (essential for mobile phone status/notification bar)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, options);
        return true;
      }
    }

    // Fallback to standard Notification API
    new Notification(title, options);
    return true;
  } catch (err) {
    console.error('Error showing phone notification:', err);
    return false;
  }
}
