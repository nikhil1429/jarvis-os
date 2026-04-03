// gadgetSchemas.js — Future-proof schemas for Oura, Pi, Hue, CO2, Camera
// WHY: Build the data architecture NOW that gadgets will plug into later.
// All fields nullable — populated when gadgets arrive.

export function initGadgetSchemas() {
  const defaults = {
    'jos-biometrics': [],
    'jos-environment': {
      lighting: 'unknown', co2: null, noise: 'unknown',
      temperature: null, presence: 'unknown', lastUpdated: null,
    },
    'jos-device-status': {
      ouraRing: { connected: false, lastSync: null },
      raspberryPi: { connected: false, lastPing: null },
      hueHub: { connected: false, lights: 0 },
      co2Monitor: { connected: false, lastReading: null },
      camera: { connected: false, lastCapture: null },
    },
  }

  Object.entries(defaults).forEach(([key, value]) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(value))
    }
  })
}

export function logBiometric(source, type, value) {
  try {
    const data = JSON.parse(localStorage.getItem('jos-biometrics') || '[]')
    data.push({ timestamp: new Date().toISOString(), source, type, value, confidence: source === 'manual' ? 0.6 : 0.95 })
    if (data.length > 1000) data.splice(0, data.length - 1000)
    localStorage.setItem('jos-biometrics', JSON.stringify(data))
  } catch { /* ok */ }
}

export function bridgeCheckinToBiometrics(checkin) {
  if (checkin.sleep) logBiometric('manual', 'sleep', checkin.sleep)
  if (checkin.energy) logBiometric('manual', 'energy-rating', checkin.energy)
  if (checkin.coffee !== undefined) logBiometric('manual', 'caffeine', checkin.coffee)
}
