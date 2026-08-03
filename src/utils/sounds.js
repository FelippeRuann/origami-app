import { createAudioPlayer } from 'expo-audio';

// Efeitos sonoros curtos do app. Players são criados sob demanda e reutilizados.
const SOURCES = {
  pop:     require('../../assets/sounds/pop.wav'),     // favoritar origami
  success: require('../../assets/sounds/success.wav'), // conquista desbloqueada
  tap:     require('../../assets/sounds/tap.wav'),     // toques sutis (chips, abas)
};

const players = {};

export const sound = {
  play(name, enabled = true) {
    if (!enabled || !SOURCES[name]) return;
    try {
      if (!players[name]) players[name] = createAudioPlayer(SOURCES[name]);
      players[name].seekTo(0);
      players[name].play();
    } catch {
      // Áudio indisponível (ex.: web sem interação) — falha silenciosa
    }
  },
};
