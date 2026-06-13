#!/usr/bin/env node
/**
 * Hook de notificación sonora para el evento Stop de Claude Code.
 * Multiplataforma: win32 / darwin / linux. Degrada en silencio si no hay
 * forma de emitir sonido — un hook de notificación jamás debe romper el flujo.
 */
const { exec } = require("child_process");

const platform = process.platform;

/** Ejecuta un comando ignorando cualquier error (degradación silenciosa). */
function tryExec(cmd, fallback) {
  exec(cmd, { timeout: 5000, windowsHide: true }, (err) => {
    if (err && typeof fallback === "function") fallback();
  });
}

if (platform === "win32") {
  // Dos beeps cortos vía PowerShell (disponible en todo Windows moderno).
  tryExec(
    'powershell -NoProfile -Command "[console]::beep(880,180); [console]::beep(1175,220)"'
  );
} else if (platform === "darwin") {
  // Sonido del sistema en macOS; fallback al beep del terminal.
  tryExec('afplay /System/Library/Sounds/Glass.aiff', () =>
    process.stdout.write("\u0007")
  );
} else {
  // Linux: intenta PulseAudio, luego ALSA, luego campana del terminal.
  tryExec(
    "paplay /usr/share/sounds/freedesktop/stereo/complete.oga",
    () =>
      tryExec("aplay -q /usr/share/sounds/alsa/Front_Center.wav", () =>
        process.stdout.write("\u0007")
      )
  );
}

// Salir siempre con 0: el hook nunca debe marcar error en la sesión.
process.exitCode = 0;
