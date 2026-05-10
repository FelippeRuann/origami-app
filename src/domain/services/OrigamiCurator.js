export class OrigamiCurator {
  /**
   * O "Algoritmo Perfeito" (Versão 1.0)
   * Responsável por filtrar e garantir que apenas vídeos REAIS de origami entrem no app.
   */

  // 1. Canais 100% Confiáveis (Whitelist). Tudo que vier daqui é aprovado direto.
  static TRUSTED_CHANNELS = [
    'Jo Nakashima - Origami Tutorials',
    'JeremyShaferOrigami',
    'Tadashi Mori',
    'Origami with Jo Nakashima',
    'Kade Chan',
    'Riccardo Foschi',
    'Henry Origami'
  ];

  // 2. Palavras obrigatórias (Pelo menos uma deve estar no título ou tags)
  static ORIGAMI_KEYWORDS = [
    'origami', 'paper folding', 'dobradura', 'papiroflexia', 
    'kusudama', 'tessellation', 'origami tutorial', 'origami instructions'
  ];

  // 3. Palavras proibidas (Blacklist). Se tiver isso, descartamos o vídeo.
  // Muitas vezes vídeos de "crafts em 5 minutos", "paper craft cortando com tesoura" enganam.
  static FORBIDDEN_KEYWORDS = [
    '5-minute crafts', '5 minute', 'ตัดกระดาษ', 'kirigami', // kirigami usa tesoura, origami não
    'scissors', 'tesoura', 'glue', 'cola', 'papercraft 3d',
    'scrapbook', 'hack', 'lifehack', 'diy paper card', 'pop-up card'
  ];

  /**
   * Função principal do Algoritmo.
   * Recebe os metadados de um vídeo do YouTube e retorna TRUE (Aprovado) ou FALSE (Lixo).
   */
  static analyzeVideo(videoData) {
    const { title, channelName, description, tags = [] } = videoData;
    
    const textToAnalyze = `${title} ${description} ${tags.join(' ')}`.toLowerCase();

    // Regra 1: É de um Mestre do Origami?
    if (this.TRUSTED_CHANNELS.includes(channelName)) {
      return { isOrigami: true, reason: 'trusted_channel', score: 100 };
    }

    // Regra 2: Contém Palavras Proibidas? (Tesoura, Cola, Hacks genéricos)
    for (let forbidden of this.FORBIDDEN_KEYWORDS) {
      if (textToAnalyze.includes(forbidden.toLowerCase())) {
        return { isOrigami: false, reason: `forbidden_word: ${forbidden}`, score: 0 };
      }
    }

    // Regra 3: Pontuação por Palavras-chave
    // É OBRIGATÓRIO ter pelo menos uma palavra da lista ORIGAMI_KEYWORDS, 
    // a não ser que seja um canal confiável (já aprovado na Regra 1)
    let score = 0;
    let hasOrigamiKeyword = false;
    for (let keyword of this.ORIGAMI_KEYWORDS) {
      if (textToAnalyze.includes(keyword.toLowerCase())) {
        score += 30; // Ganha pontos por cada palavra forte
        hasOrigamiKeyword = true;
      }
    }

    if (!hasOrigamiKeyword) {
       return { isOrigami: false, reason: 'missing_origami_context', score: score };
    }

    // Regra 4: Punição se o título tiver "DIY" genérico sem "Origami" perto
    if (textToAnalyze.includes('diy') && !textToAnalyze.includes('origami')) {
      score -= 50; 
    }

    // Veridicto: Se a pontuação passar de um limite (ex: 30), aprovamos.
    if (score >= 30) {
      return { isOrigami: true, reason: 'high_score', score: score };
    } else {
      return { isOrigami: false, reason: 'low_score', score: score };
    }
  }

  /**
   * Simula a busca no YouTube e aplicação do nosso filtro.
   */
  static async fetchFeed(page = 1) {
    // No futuro, isso faria uma chamada real à API do YouTube:
    // fetch(`https://youtube.googleapis.com/youtube/v3/search?q=origami...`)
    
    // Simulação do retorno "sujo" da API do YouTube
    const rawYoutubeResults = [
      { videoId: '1', title: 'Origami Dragon Tutorial', channelName: 'Jo Nakashima - Origami Tutorials' },
      { videoId: '2', title: '5-Minute Crafts Paper Hacks with Scissors', channelName: '5-Minute Crafts' },
      { videoId: '3', title: 'How to fold an Origami Crane', channelName: 'Random Dude' },
      { videoId: '4', title: 'DIY Paper box using glue', channelName: 'Crafty' }
    ];

    // Aqui a mágica acontece: Filtramos o lixo antes de chegar no usuário!
    const pureOrigamiFeed = rawYoutubeResults.filter(video => {
      const analysis = this.analyzeVideo(video);
      if(!analysis.isOrigami) {
         console.log(`❌ VÍDEO DESCARTADO: ${video.title} | Motivo: ${analysis.reason}`);
      }
      return analysis.isOrigami;
    });

    return pureOrigamiFeed;
  }
}
