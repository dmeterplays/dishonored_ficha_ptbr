// Catálogo de melhorias de equipamentos adaptado de https://dishonored.fandom.com/wiki/Upgrades
// Valores são os preços nos videogames, NÃO regras automáticas de compra de RPG.
// 'effect' resume efeitos do videogame; o mestre decide adaptação mecânica no 2d20.
// IDs legados mantidos para inventários já gravados anteriormente.
const LEGACY_UPGRADES = [
 {id:'pistol-mag-1',type:'pistol',name:'Tambor ampliado I',cost:200,requires:[],effect:'Capacidade de disparos antes de recarregar: +1.'},
 {id:'pistol-mag-2',type:'pistol',name:'Tambor ampliado II',cost:200,requires:['pistol-mag-1'],effect:'Capacidade de disparos antes de recarregar: +1 adicional.'},
 {id:'pistol-mag-3',type:'pistol',name:'Tambor ampliado III',cost:200,requires:['pistol-mag-2'],effect:'Capacidade de disparos antes de recarregar: +1 adicional.'},
 {id:'pistol-aim-1',type:'pistol',name:'Mira aprimorada I',cost:300,requires:[],effect:'Mestre pode conceder vantagem narrativa em tiros cuidadosamente preparados.'},
 {id:'pistol-aim-2',type:'pistol',name:'Mira aprimorada II',cost:600,requires:['pistol-aim-1'],effect:'Vantagem narrativa reforçada em disparos de precisão, a critério do mestre.'},
 {id:'pistol-reload-1',type:'pistol',name:'Recarga rápida I',cost:200,requires:[],effect:'Reduz a exigência narrativa de tempo para recarga.'},
 {id:'pistol-reload-2',type:'pistol',name:'Recarga rápida II',cost:400,requires:['pistol-reload-1'],effect:'Recarga ainda mais ágil; mestre define o custo de ação.'},
 {id:'pistol-explosive',type:'pistol',name:'Compatibilidade com munição explosiva',cost:450,requires:[],effect:'Desbloqueia munição explosiva especial quando disponível; munição adquirida separadamente.'},
 {id:'pistol-magnetic',type:'pistol',name:'Munição magnetizada',cost:350,requires:[],effect:'Permite usar munição ficcional para perturbar soldados mecânicos, quando disponível.'},
 {id:'pistol-stun',type:'pistol',name:'Munição de choque (regra opcional)',cost:400,requires:[],effect:'Munição não letal especial: teste e condições narrativas definidos pelo mestre. Não é melhoria canônica da pistola.'},
 {id:'crossbow-aim',type:'crossbow',name:'Precisão da besta',cost:300,requires:[],effect:'Vantagem narrativa em disparos preparados com a besta.'},
 {id:'crossbow-range',type:'crossbow',name:'Alcance da besta',cost:450,requires:[],effect:'Permite tentativas de disparo a distâncias maiores, sujeitas à dificuldade do mestre.'},
 {id:'crossbow-reload',type:'crossbow',name:'Recarga da besta',cost:600,requires:[],effect:'Simplifica a recarga durante cenas tensas.'},
 {id:'crossbow-sleep',type:'crossbow',name:'Dardo sonífero de combate',cost:600,requires:[],effect:'Permite efeito sedativo imediato durante confronto conforme decisão do mestre.'},
 {id:'crossbow-howling',type:'crossbow',name:'Virote uivante',cost:250,requires:[],effect:'Habilita virotes que causam desorientação e cegueira temporária; consumíveis separados.'},
 {id:'crossbow-incendiary',type:'crossbow',name:'Virote incendiário',cost:600,requires:[],effect:'Habilita munição incendiária especial; consumíveis separados.'},
 {id:'armor-reinforce',type:'armor',name:'Reforço protetor',cost:600,requires:[],effect:'Pode reduzir dano sofrido, mediante regra definida pelo mestre.'},
 {id:'armor-stealth-1',type:'armor',name:'Revestimento silencioso I',cost:450,requires:[],effect:'Facilita abordagens furtivas em movimento.'},
 {id:'armor-stealth-2',type:'armor',name:'Revestimento silencioso II',cost:600,requires:['armor-stealth-1'],effect:'Aprimora ainda mais a discrição de deslocamento.'},
 {id:'sword-parry',type:'sword',name:'Aparo refinado',cost:450,requires:[],effect:'Vantagem narrativa em duelos e confrontos de lâminas.'},
 {id:'sword-clockwork',type:'sword',name:'Lâmina contra autômatos',cost:450,requires:['sword-parry'],effect:'Permite vantagem situacional ao enfrentar soldados mecânicos.'},
 {id:'gear-optics-1',type:'optic',name:'Óptica refinada I',cost:300,requires:[],effect:'Ampliação visual em observações à distância.'},
 {id:'gear-optics-2',type:'optic',name:'Óptica refinada II',cost:400,requires:['gear-optics-1'],effect:'Ampliação visual adicional em observações à distância.'}

].map(u=>({...u,game:'Casa',source:'house',legacy:true}));
const WIKI_UPGRADES=[
 {
  "id": "d1-pistol-base",
  "game": "D1",
  "type": "pistol",
  "name": "Melhoria da pistola de Corvo",
  "cost": 600,
  "requires": [],
  "effect": "Aprimora a pistola e libera precisão, tambor e recarga",
  "source": "wiki"
 },
 {
  "id": "d1-pistol-accuracy1",
  "game": "D1",
  "type": "pistol",
  "name": "Precisão da pistola I",
  "cost": 300,
  "requires": [
   "d1-pistol-base"
  ],
  "effect": "Melhora a precisão",
  "source": "wiki"
 },
 {
  "id": "d1-pistol-accuracy2",
  "game": "D1",
  "type": "pistol",
  "name": "Precisão da pistola II",
  "cost": 600,
  "requires": [
   "d1-pistol-accuracy1"
  ],
  "effect": "Melhora ainda mais a precisão",
  "source": "wiki"
 },
 {
  "id": "d1-pistol-mag1",
  "game": "D1",
  "type": "pistol",
  "name": "Tambor da pistola I",
  "cost": 300,
  "requires": [
   "d1-pistol-base"
  ],
  "effect": "Capacidade total de 2 balas",
  "source": "wiki"
 },
 {
  "id": "d1-pistol-mag2",
  "game": "D1",
  "type": "pistol",
  "name": "Tambor da pistola II",
  "cost": 450,
  "requires": [
   "d1-pistol-mag1"
  ],
  "effect": "Capacidade total de 3 balas",
  "source": "wiki"
 },
 {
  "id": "d1-pistol-mag3",
  "game": "D1",
  "type": "pistol",
  "name": "Tambor da pistola III",
  "cost": 600,
  "requires": [
   "d1-pistol-mag2"
  ],
  "effect": "Capacidade total de 4 balas",
  "source": "wiki"
 },
 {
  "id": "d1-pistol-reload1",
  "game": "D1",
  "type": "pistol",
  "name": "Recarga da pistola I",
  "cost": 300,
  "requires": [
   "d1-pistol-base"
  ],
  "effect": "Reduz o tempo de recarga",
  "source": "wiki"
 },
 {
  "id": "d1-pistol-reload2",
  "game": "D1",
  "type": "pistol",
  "name": "Recarga da pistola II",
  "cost": 600,
  "requires": [
   "d1-pistol-reload1"
  ],
  "effect": "Reduz ainda mais o tempo de recarga",
  "source": "wiki"
 },
 {
  "id": "d1-bullet-cap1",
  "game": "D1",
  "type": "pistol",
  "name": "Reserva de balas I",
  "cost": 300,
  "requires": [],
  "effect": "Permite carregar até 20 balas",
  "source": "wiki"
 },
 {
  "id": "d1-bullet-cap2",
  "game": "D1",
  "type": "pistol",
  "name": "Reserva de balas II",
  "cost": 600,
  "requires": [
   "d1-bullet-cap1"
  ],
  "effect": "Permite carregar até 30 balas",
  "source": "wiki"
 },
 {
  "id": "d1-pistol-explosive",
  "game": "D1",
  "type": "pistol",
  "name": "Disparo explosivo",
  "cost": 600,
  "requires": [],
  "effect": "Desbloqueia a compra de balas explosivas",
  "source": "wiki"
 },
 {
  "id": "d1-bolt-cap1",
  "game": "D1",
  "type": "crossbow",
  "name": "Reserva de virotes I",
  "cost": 300,
  "requires": [],
  "effect": "Permite carregar até 20 virotes",
  "source": "wiki"
 },
 {
  "id": "d1-bolt-cap2",
  "game": "D1",
  "type": "crossbow",
  "name": "Reserva de virotes II",
  "cost": 600,
  "requires": [
   "d1-bolt-cap1"
  ],
  "effect": "Permite carregar até 30 virotes",
  "source": "wiki"
 },
 {
  "id": "d1-crossbow-accuracy",
  "game": "D1",
  "type": "crossbow",
  "name": "Precisão da besta",
  "cost": 300,
  "requires": [],
  "effect": "Melhora a precisão da besta",
  "source": "wiki"
 },
 {
  "id": "d1-crossbow-range",
  "game": "D1",
  "type": "crossbow",
  "name": "Alcance da besta",
  "cost": 450,
  "requires": [],
  "effect": "Aumenta o alcance efetivo",
  "source": "wiki"
 },
 {
  "id": "d1-crossbow-reload",
  "game": "D1",
  "type": "crossbow",
  "name": "Recarga da besta",
  "cost": 600,
  "requires": [],
  "effect": "Acelera a recarga",
  "source": "wiki"
 },
 {
  "id": "d1-crossbow-sleep",
  "game": "D1",
  "type": "crossbow",
  "name": "Dardo sonífero de combate",
  "cost": 600,
  "requires": [],
  "effect": "Sonífero age imediatamente mesmo em combate",
  "source": "wiki"
 },
 {
  "id": "d1-crossbow-fire",
  "game": "D1",
  "type": "crossbow",
  "name": "Virotes incendiários",
  "cost": 600,
  "requires": [],
  "effect": "Desbloqueia compra de virotes incendiários",
  "source": "wiki"
 },
 {
  "id": "d1-grenade-cap",
  "game": "D1",
  "type": "grenade",
  "name": "Capacidade de granadas",
  "cost": 450,
  "requires": [],
  "effect": "Aumenta reserva para 9 granadas",
  "source": "wiki"
 },
 {
  "id": "d1-grenade-sticky",
  "game": "D1",
  "type": "grenade",
  "name": "Granada adesiva",
  "cost": 600,
  "requires": [],
  "effect": "Desbloqueia granadas que aderem aos alvos",
  "source": "wiki"
 },
 {
  "id": "d1-razor-cap",
  "game": "D1",
  "type": "trap",
  "name": "Capacidade de navalhas de mola",
  "cost": 450,
  "requires": [],
  "effect": "Aumenta reserva para 9 armadilhas",
  "source": "wiki"
 },
 {
  "id": "d1-razor-radius",
  "game": "D1",
  "type": "trap",
  "name": "Raio da navalha de mola",
  "cost": 600,
  "requires": [],
  "effect": "Aumenta a área de efeito",
  "source": "wiki"
 },
 {
  "id": "d1-sword-cross",
  "game": "D1",
  "type": "sword",
  "name": "Cruzamento de espadas",
  "cost": 600,
  "requires": [],
  "effect": "Melhora desempenho ao travar lâminas",
  "source": "wiki"
 },
 {
  "id": "d1-mask-optics1",
  "game": "D1",
  "type": "optic",
  "name": "Óptica da máscara I",
  "cost": 300,
  "requires": [],
  "effect": "Permite ampliação visual",
  "source": "wiki"
 },
 {
  "id": "d1-mask-optics2",
  "game": "D1",
  "type": "optic",
  "name": "Óptica da máscara II",
  "cost": 400,
  "requires": [
   "d1-mask-optics1"
  ],
  "effect": "Ampliação adicional",
  "source": "wiki"
 },
 {
  "id": "d1-armor-improved",
  "game": "D1",
  "type": "armor",
  "name": "Armadura aprimorada",
  "cost": 600,
  "requires": [],
  "effect": "Reduz dano sofrido",
  "source": "wiki"
 },
 {
  "id": "d1-boot-stealth1",
  "game": "D1",
  "type": "armor",
  "name": "Botas furtivas I",
  "cost": 450,
  "requires": [],
  "effect": "Elimina som dos passos ao caminhar",
  "source": "wiki"
 },
 {
  "id": "d1-boot-stealth2",
  "game": "D1",
  "type": "armor",
  "name": "Botas furtivas II",
  "cost": 600,
  "requires": [
   "d1-boot-stealth1"
  ],
  "effect": "Elimina som dos passos ao correr",
  "source": "wiki"
 },
 {
  "id": "d1-bone-cap1",
  "game": "D1",
  "type": "bonecharm",
  "name": "Espaço para amuletos I",
  "cost": 300,
  "requires": [],
  "effect": "Até 4 amuletos equipados",
  "source": "wiki"
 },
 {
  "id": "d1-bone-cap2",
  "game": "D1",
  "type": "bonecharm",
  "name": "Espaço para amuletos II",
  "cost": 450,
  "requires": [
   "d1-bone-cap1"
  ],
  "effect": "Até 6 amuletos equipados",
  "source": "wiki"
 },
 {
  "id": "dlc-wrist-accuracy",
  "game": "DLC",
  "type": "wristbow",
  "name": "Precisão da besta de pulso",
  "cost": 300,
  "requires": [],
  "effect": "Melhora a precisão",
  "source": "wiki"
 },
 {
  "id": "dlc-wrist-range",
  "game": "DLC",
  "type": "wristbow",
  "name": "Alcance da besta de pulso",
  "cost": 450,
  "requires": [],
  "effect": "Aumenta o alcance",
  "source": "wiki"
 },
 {
  "id": "dlc-wrist-reload",
  "game": "DLC",
  "type": "wristbow",
  "name": "Recarga da besta de pulso",
  "cost": 450,
  "requires": [],
  "effect": "Recarga automática após disparar ou mudar munição",
  "source": "wiki"
 },
 {
  "id": "dlc-wrist-sleep",
  "game": "DLC",
  "type": "wristbow",
  "name": "Sonífero de combate",
  "cost": 600,
  "requires": [],
  "effect": "Efeito sonífero imediato em combate",
  "source": "wiki"
 },
 {
  "id": "dlc-armor",
  "game": "DLC",
  "type": "armor",
  "name": "Armadura aprimorada",
  "cost": 450,
  "requires": [],
  "effect": "Reduz o dano recebido",
  "source": "wiki"
 },
 {
  "id": "dlc-boot1",
  "game": "DLC",
  "type": "armor",
  "name": "Botas furtivas I",
  "cost": 450,
  "requires": [],
  "effect": "Passos silenciosos ao caminhar",
  "source": "wiki"
 },
 {
  "id": "dlc-boot2",
  "game": "DLC",
  "type": "armor",
  "name": "Botas furtivas II",
  "cost": 600,
  "requires": [
   "dlc-boot1"
  ],
  "effect": "Passos silenciosos ao correr",
  "source": "wiki"
 },
 {
  "id": "dlc-chokedust",
  "game": "DLC",
  "type": "gear",
  "name": "Pó abafador",
  "cost": 300,
  "requires": [],
  "effect": "Inimigos afetados por pó sufocante não ficam alertados após dissipar",
  "source": "wiki"
 },
 {
  "id": "dlc-arc-cap",
  "game": "DLC",
  "type": "mine",
  "name": "Capacidade de minas de arco",
  "cost": 450,
  "requires": [],
  "effect": "Capacidade total de 6 minas",
  "source": "wiki"
 },
 {
  "id": "dlc-stun-cap",
  "game": "DLC",
  "type": "mine",
  "name": "Capacidade de minas de atordoamento",
  "cost": 450,
  "requires": [],
  "effect": "Capacidade total de 6 minas",
  "source": "wiki"
 },
 {
  "id": "dlc-arc-charge",
  "game": "DLC",
  "type": "mine",
  "name": "Carga extra na mina de arco",
  "cost": 600,
  "requires": [],
  "effect": "Permite atingir até 3 alvos",
  "source": "wiki"
 },
 {
  "id": "dlc-stun-charge",
  "game": "DLC",
  "type": "mine",
  "name": "Carga extra na mina de atordoamento",
  "cost": 600,
  "requires": [],
  "effect": "Permite incapacitar até 3 alvos",
  "source": "wiki"
 },
 {
  "id": "dlc-bone1",
  "game": "DLC",
  "type": "bonecharm",
  "name": "Espaços de amuletos I",
  "cost": 250,
  "requires": [],
  "effect": "Até 4 amuletos",
  "source": "wiki"
 },
 {
  "id": "dlc-bone2",
  "game": "DLC",
  "type": "bonecharm",
  "name": "Espaços de amuletos II",
  "cost": 250,
  "requires": [
   "dlc-bone1"
  ],
  "effect": "Até 5 amuletos",
  "source": "wiki"
 },
 {
  "id": "dlc-bone3",
  "game": "DLC",
  "type": "bonecharm",
  "name": "Espaços de amuletos III",
  "cost": 250,
  "requires": [
   "dlc-bone2"
  ],
  "effect": "Até 6 amuletos",
  "source": "wiki"
 },
 {
  "id": "dlc-bone4",
  "game": "DLC",
  "type": "bonecharm",
  "name": "Espaços de amuletos IV",
  "cost": 400,
  "requires": [
   "dlc-bone3"
  ],
  "effect": "Até 8 amuletos",
  "source": "wiki"
 },
 {
  "id": "d2-crossbow-accuracy",
  "game": "D2",
  "type": "crossbow",
  "name": "Precisão da besta",
  "cost": 300,
  "requires": [],
  "effect": "Estabiliza a mira",
  "source": "wiki"
 },
 {
  "id": "d2-crossbow-range",
  "game": "D2",
  "type": "crossbow",
  "name": "Alcance estendido",
  "cost": 450,
  "requires": [],
  "effect": "Virotes viajam mais longe",
  "source": "wiki"
 },
 {
  "id": "d2-crossbow-reload",
  "game": "D2",
  "type": "crossbow",
  "name": "Recarga rápida da besta",
  "cost": 600,
  "requires": [],
  "effect": "Acelera a recarga",
  "source": "wiki"
 },
 {
  "id": "d2-crossbow-harden",
  "game": "D2",
  "type": "crossbow",
  "name": "Virote endurecido",
  "cost": 300,
  "requires": [],
  "effect": "Aumenta o dano dos virotes comuns",
  "source": "wiki"
 },
 {
  "id": "d2-crossbow-sleep",
  "game": "D2",
  "type": "crossbow",
  "name": "Dardo sonífero instantâneo",
  "cost": 400,
  "requires": [],
  "effect": "Efeito imediato de sono",
  "source": "wiki"
 },
 {
  "id": "d2-crossbow-fire",
  "game": "D2",
  "type": "crossbow",
  "name": "Virote incendiário",
  "cost": 400,
  "requires": [],
  "effect": "Disponibiliza munição incendiária",
  "source": "wiki"
 },
 {
  "id": "d2-crossbow-combustion",
  "game": "D2",
  "type": "crossbow",
  "name": "Virote de combustão",
  "cost": 450,
  "requires": [
   "d2-crossbow-fire"
  ],
  "effect": "Aumenta área do efeito incendiário",
  "source": "wiki"
 },
 {
  "id": "d2-crossbow-sting",
  "game": "D2",
  "type": "crossbow",
  "name": "Virote pungente",
  "cost": 250,
  "requires": [],
  "effect": "Faz alvos fugirem",
  "source": "wiki"
 },
 {
  "id": "d2-crossbow-howl",
  "game": "D2",
  "type": "crossbow",
  "name": "Virote uivante",
  "cost": 250,
  "requires": [],
  "effect": "Atordoa e cega temporariamente",
  "source": "wiki"
 },
 {
  "id": "d2-pistol-reload1",
  "game": "D2",
  "type": "pistol",
  "name": "Recarga da pistola I",
  "cost": 200,
  "requires": [],
  "effect": "Reduz tempo de recarga",
  "source": "wiki"
 },
 {
  "id": "d2-pistol-reload2",
  "game": "D2",
  "type": "pistol",
  "name": "Recarga da pistola II",
  "cost": 400,
  "requires": [
   "d2-pistol-reload1"
  ],
  "effect": "Reduz ainda mais tempo de recarga",
  "source": "wiki"
 },
 {
  "id": "d2-pistol-aim1",
  "game": "D2",
  "type": "pistol",
  "name": "Precisão da pistola I",
  "cost": 300,
  "requires": [],
  "effect": "Estabiliza a mira",
  "source": "wiki"
 },
 {
  "id": "d2-pistol-aim2",
  "game": "D2",
  "type": "pistol",
  "name": "Precisão da pistola II",
  "cost": 600,
  "requires": [
   "d2-pistol-aim1"
  ],
  "effect": "Melhora ainda mais a precisão",
  "source": "wiki"
 },
 {
  "id": "d2-pistol-mag1",
  "game": "D2",
  "type": "pistol",
  "name": "Tambor +1 (primeiro)",
  "cost": 200,
  "requires": [],
  "effect": "Acrescenta uma bala",
  "source": "wiki"
 },
 {
  "id": "d2-pistol-mag2",
  "game": "D2",
  "type": "pistol",
  "name": "Tambor +1 (segundo)",
  "cost": 200,
  "requires": [
   "d2-pistol-mag1"
  ],
  "effect": "Acrescenta outra bala",
  "source": "wiki"
 },
 {
  "id": "d2-pistol-mag3",
  "game": "D2",
  "type": "pistol",
  "name": "Tambor +1 (terceiro)",
  "cost": 200,
  "requires": [
   "d2-pistol-mag2"
  ],
  "effect": "Acrescenta outra bala",
  "source": "wiki"
 },
 {
  "id": "d2-pistol-explosive",
  "game": "D2",
  "type": "pistol",
  "name": "Bala explosiva",
  "cost": 450,
  "requires": [],
  "effect": "Habilita compra de balas explosivas",
  "source": "wiki"
 },
 {
  "id": "d2-pistol-cluster",
  "game": "D2",
  "type": "pistol",
  "name": "Bala explosiva fragmentária",
  "cost": 450,
  "requires": [
   "d2-pistol-explosive"
  ],
  "effect": "Bala explode e se fragmenta",
  "source": "wiki"
 },
 {
  "id": "d2-pistol-magnetic",
  "game": "D2",
  "type": "pistol",
  "name": "Bala magnetizada",
  "cost": 350,
  "requires": [],
  "effect": "Perturba temporariamente soldados mecânicos",
  "source": "wiki"
 },
 {
  "id": "d2-pistol-armor",
  "game": "D2",
  "type": "pistol",
  "name": "Bala contra armadura",
  "cost": 350,
  "requires": [],
  "effect": "Ricocheteia em superfícies rígidas",
  "source": "wiki"
 },
 {
  "id": "d2-lens",
  "game": "D2",
  "type": "optic",
  "name": "Lentes refinadas",
  "cost": 200,
  "requires": [],
  "effect": "Segundo nível de ampliação",
  "source": "wiki"
 },
 {
  "id": "d2-bone2",
  "game": "D2",
  "type": "bonecharm",
  "name": "Espaços para amuletos +2",
  "cost": 300,
  "requires": [],
  "effect": "Libera dois espaços extras",
  "source": "wiki"
 },
 {
  "id": "d2-bone3",
  "game": "D2",
  "type": "bonecharm",
  "name": "Espaços para amuletos +3",
  "cost": 450,
  "requires": [
   "d2-bone2"
  ],
  "effect": "Libera mais três espaços",
  "source": "wiki"
 },
 {
  "id": "d2-razor-storage",
  "game": "D2",
  "type": "trap",
  "name": "Reserva de navalhas de mola +2",
  "cost": 450,
  "requires": [],
  "effect": "Reserva aumenta em 2",
  "source": "wiki"
 },
 {
  "id": "d2-bolt-storage1",
  "game": "D2",
  "type": "crossbow",
  "name": "Reserva de virotes +5 (I)",
  "cost": 300,
  "requires": [],
  "effect": "Reserva aumenta em 5",
  "source": "wiki"
 },
 {
  "id": "d2-bolt-storage2",
  "game": "D2",
  "type": "crossbow",
  "name": "Reserva de virotes +5 (II)",
  "cost": 450,
  "requires": [
   "d2-bolt-storage1"
  ],
  "effect": "Reserva aumenta mais 5",
  "source": "wiki"
 },
 {
  "id": "d2-bullet-storage1",
  "game": "D2",
  "type": "pistol",
  "name": "Reserva de balas +5 (I)",
  "cost": 350,
  "requires": [],
  "effect": "Reserva aumenta em 5",
  "source": "wiki"
 },
 {
  "id": "d2-bullet-storage2",
  "game": "D2",
  "type": "pistol",
  "name": "Reserva de balas +5 (II)",
  "cost": 450,
  "requires": [
   "d2-bullet-storage1"
  ],
  "effect": "Reserva aumenta mais 5",
  "source": "wiki"
 },
 {
  "id": "d2-silent-run",
  "game": "D2",
  "type": "armor",
  "name": "Corrida silenciosa",
  "cost": 400,
  "requires": [],
  "effect": "Reduz barulho durante corrida",
  "source": "wiki"
 },
 {
  "id": "d2-silent-sprint",
  "game": "D2",
  "type": "armor",
  "name": "Disparada silenciosa",
  "cost": 500,
  "requires": [
   "d2-silent-run"
  ],
  "effect": "Reduz barulho durante corrida intensa",
  "source": "wiki"
 },
 {
  "id": "d2-sword-cross",
  "game": "D2",
  "type": "sword",
  "name": "Cruzamento de espadas",
  "cost": 450,
  "requires": [],
  "effect": "Melhora combate com espadas travadas",
  "source": "wiki"
 },
 {
  "id": "d2-grenade-impact",
  "game": "D2",
  "type": "grenade",
  "name": "Granada de impacto",
  "cost": 400,
  "requires": [],
  "effect": "Detona no contato",
  "source": "wiki"
 },
 {
  "id": "d2-grenade-sticky",
  "game": "D2",
  "type": "grenade",
  "name": "Granada adesiva",
  "cost": 450,
  "requires": [],
  "effect": "Gruda em alvos",
  "source": "wiki"
 },
 {
  "id": "d2-mine-chain",
  "game": "D2",
  "type": "mine",
  "name": "Relâmpago em cadeia",
  "cost": 450,
  "requires": [],
  "effect": "Afeta alvos próximos ao alvo principal",
  "source": "wiki"
 },
 {
  "id": "d2-mine-charge1",
  "game": "D2",
  "type": "mine",
  "name": "Carga extra de mina I",
  "cost": 300,
  "requires": [],
  "effect": "Mina funciona uma vez adicional",
  "source": "wiki"
 },
 {
  "id": "d2-mine-charge2",
  "game": "D2",
  "type": "mine",
  "name": "Carga extra de mina II",
  "cost": 300,
  "requires": [
   "d2-mine-charge1"
  ],
  "effect": "Mina funciona novamente uma vez adicional",
  "source": "wiki"
 },
 {
  "id": "d2-razor-double",
  "game": "D2",
  "type": "trap",
  "name": "Disparo duplo de navalha",
  "cost": 450,
  "requires": [],
  "effect": "Armadilha funciona duas vezes",
  "source": "wiki"
 },
 {
  "id": "d2-razor-reach",
  "game": "D2",
  "type": "trap",
  "name": "Alcance da navalha",
  "cost": 300,
  "requires": [],
  "effect": "Amplia área de efeito",
  "source": "wiki"
 },
 {
  "id": "d2-master-coffin",
  "game": "D2",
  "type": "crossbow",
  "name": "Obra-prima: Pregos do Caixão",
  "cost": 700,
  "requires": [
   "d2-crossbow-accuracy",
   "d2-crossbow-range",
   "d2-crossbow-reload"
  ],
  "effect": "Disparos semiautomáticos (Corvo)",
  "source": "wiki"
 },
 {
  "id": "d2-master-dealer",
  "game": "D2",
  "type": "crossbow",
  "name": "Obra-prima: O Negociante",
  "cost": 700,
  "requires": [
   "d2-crossbow-accuracy",
   "d2-crossbow-range",
   "d2-crossbow-reload"
  ],
  "effect": "Trava mira em até três alvos (Corvo)",
  "source": "wiki"
 },
 {
  "id": "d2-master-pierce",
  "game": "D2",
  "type": "crossbow",
  "name": "Obra-prima: Insulto Perfurante",
  "cost": 700,
  "requires": [
   "d2-crossbow-accuracy",
   "d2-crossbow-range",
   "d2-crossbow-reload"
  ],
  "effect": "Virotes perfuram múltiplos alvos (Emily)",
  "source": "wiki"
 },
 {
  "id": "d2-master-long",
  "game": "D2",
  "type": "crossbow",
  "name": "Obra-prima: Amante da Distância",
  "cost": 700,
  "requires": [
   "d2-crossbow-accuracy",
   "d2-crossbow-range",
   "d2-crossbow-reload"
  ],
  "effect": "Precisão superior com luneta (Emily)",
  "source": "wiki"
 },
 {
  "id": "d2-master-howl1",
  "game": "D2",
  "type": "crossbow",
  "name": "Obra-prima: Uivo Ancestral",
  "cost": 600,
  "requires": [
   "d2-crossbow-howl"
  ],
  "effect": "Cega inimigos e afugenta bruxas",
  "source": "wiki"
 },
 {
  "id": "d2-master-howl2",
  "game": "D2",
  "type": "crossbow",
  "name": "Obra-prima: Uivo Profundo",
  "cost": 600,
  "requires": [
   "d2-crossbow-howl"
  ],
  "effect": "Cega inimigos e afugenta cães",
  "source": "wiki"
 },
 {
  "id": "d2-master-traveler",
  "game": "D2",
  "type": "pistol",
  "name": "Obra-prima: Viajante Determinado",
  "cost": 700,
  "requires": [
   "d2-pistol-reload2",
   "d2-pistol-aim2",
   "d2-pistol-mag3"
  ],
  "effect": "Precisão superior com luneta (Corvo)",
  "source": "wiki"
 },
 {
  "id": "d2-master-painter",
  "game": "D2",
  "type": "pistol",
  "name": "Obra-prima: Pintor Carmesim",
  "cost": 700,
  "requires": [
   "d2-pistol-reload2",
   "d2-pistol-aim2",
   "d2-pistol-mag3"
  ],
  "effect": "Disparos se fragmentam e causam maior efeito (Corvo)",
  "source": "wiki"
 },
 {
  "id": "d2-master-siblings",
  "game": "D2",
  "type": "pistol",
  "name": "Obra-prima: Irmãos Vermelhos",
  "cost": 700,
  "requires": [
   "d2-pistol-reload2",
   "d2-pistol-aim2",
   "d2-pistol-mag3"
  ],
  "effect": "Disparos em rajadas (Emily)",
  "source": "wiki"
 },
 {
  "id": "d2-master-gentleman",
  "game": "D2",
  "type": "pistol",
  "name": "Obra-prima: Cavalheiro Insistente",
  "cost": 700,
  "requires": [
   "d2-pistol-reload2",
   "d2-pistol-aim2",
   "d2-pistol-mag3"
  ],
  "effect": "Dispensa recargas convencionais (Emily)",
  "source": "wiki"
 },
 {
  "id": "d2-master-carapace",
  "game": "D2",
  "type": "armor",
  "name": "Obra-prima: Carapaça do Colecionador",
  "cost": 700,
  "requires": [],
  "effect": "Reduz dano recebido",
  "source": "wiki"
 },
 {
  "id": "d2-master-wrappings",
  "game": "D2",
  "type": "armor",
  "name": "Obra-prima: Envoltórios de Pó de Mariposa",
  "cost": 700,
  "requires": [],
  "effect": "Menos visível sob iluminação forte",
  "source": "wiki"
 },
 {
  "id": "d2-master-wrench",
  "game": "D2",
  "type": "sword",
  "name": "Obra-prima: Chave Inglesa",
  "cost": 450,
  "requires": [
   "d2-sword-cross"
  ],
  "effect": "Especializada contra soldados mecânicos",
  "source": "wiki"
 },
 {
  "id": "d2-master-kiss",
  "game": "D2",
  "type": "sword",
  "name": "Obra-prima: Beijo Oculto",
  "cost": 450,
  "requires": [
   "d2-sword-cross"
  ],
  "effect": "Especializada contra inimigos com magia",
  "source": "wiki"
 },
 {
  "id": "d2-master-expansive",
  "game": "D2",
  "type": "grenade",
  "name": "Obra-prima: Dama Expansiva",
  "cost": 700,
  "requires": [],
  "effect": "Aumenta raio da explosão",
  "source": "wiki"
 },
 {
  "id": "d2-master-discreet",
  "game": "D2",
  "type": "grenade",
  "name": "Obra-prima: Investigação Discreta",
  "cost": 700,
  "requires": [],
  "effect": "Reduz o barulho da explosão",
  "source": "wiki"
 },
 {
  "id": "doto-bone2",
  "game": "DOTO",
  "type": "bonecharm",
  "name": "Espaços de amuletos +2",
  "cost": 300,
  "requires": [],
  "effect": "Libera dois espaços",
  "source": "wiki"
 },
 {
  "id": "doto-bone3",
  "game": "DOTO",
  "type": "bonecharm",
  "name": "Espaços de amuletos +3",
  "cost": 450,
  "requires": [
   "doto-bone2"
  ],
  "effect": "Libera mais três espaços",
  "source": "wiki"
 },
 {
  "id": "doto-mine-cap",
  "game": "DOTO",
  "type": "mine",
  "name": "Reserva de minas +2",
  "cost": 500,
  "requires": [],
  "effect": "Reserva aumenta em 2",
  "source": "wiki"
 },
 {
  "id": "doto-grenade-cap1",
  "game": "DOTO",
  "type": "grenade",
  "name": "Reserva de granadas +2 (I)",
  "cost": 300,
  "requires": [],
  "effect": "Reserva aumenta em 2",
  "source": "wiki"
 },
 {
  "id": "doto-grenade-cap2",
  "game": "DOTO",
  "type": "grenade",
  "name": "Reserva de granadas +2 (II)",
  "cost": 300,
  "requires": [
   "doto-grenade-cap1"
  ],
  "effect": "Reserva aumenta mais 2",
  "source": "wiki"
 },
 {
  "id": "doto-voltaic-cap1",
  "game": "DOTO",
  "type": "voltaic",
  "name": "Reserva da arma voltaica +5 (I)",
  "cost": 300,
  "requires": [],
  "effect": "Aumenta munição normal em 5 e especial em 3",
  "source": "wiki"
 },
 {
  "id": "doto-voltaic-cap2",
  "game": "DOTO",
  "type": "voltaic",
  "name": "Reserva da arma voltaica +5 (II)",
  "cost": 500,
  "requires": [
   "doto-voltaic-cap1"
  ],
  "effect": "Aumenta novamente munição",
  "source": "wiki"
 },
 {
  "id": "doto-silent1",
  "game": "DOTO",
  "type": "armor",
  "name": "Corrida silenciosa",
  "cost": 500,
  "requires": [],
  "effect": "Reduz ruído ao correr",
  "source": "wiki"
 },
 {
  "id": "doto-silent2",
  "game": "DOTO",
  "type": "armor",
  "name": "Disparada silenciosa",
  "cost": 900,
  "requires": [
   "doto-silent1"
  ],
  "effect": "Reduz ruído em corrida intensa",
  "source": "wiki"
 },
 {
  "id": "doto-optic",
  "game": "DOTO",
  "type": "optic",
  "name": "Lentes refinadas",
  "cost": 200,
  "requires": [],
  "effect": "Ampliação visual adicional",
  "source": "wiki"
 },
 {
  "id": "doto-leather",
  "game": "DOTO",
  "type": "armor",
  "name": "Armadura de couro fervido",
  "cost": 500,
  "requires": [],
  "effect": "Reduz dano",
  "source": "wiki"
 },
 {
  "id": "doto-conceal",
  "game": "DOTO",
  "type": "armor",
  "name": "Acabamento de camuflagem",
  "cost": 500,
  "requires": [],
  "effect": "Reduz visibilidade na penumbra",
  "source": "wiki"
 },
 {
  "id": "doto-voltaic-reload",
  "game": "DOTO",
  "type": "voltaic",
  "name": "Recarga da arma voltaica",
  "cost": 300,
  "requires": [],
  "effect": "Recarga rápida",
  "source": "wiki"
 },
 {
  "id": "doto-voltaic-burst",
  "game": "DOTO",
  "type": "voltaic",
  "name": "Descarga elétrica",
  "cost": 450,
  "requires": [],
  "effect": "Disponibiliza carga elétrica especial",
  "source": "wiki"
 },
 {
  "id": "doto-voltaic-makeshift",
  "game": "DOTO",
  "type": "voltaic",
  "name": "Projétil improvisado",
  "cost": 500,
  "requires": [],
  "effect": "Permite usar objetos como munição",
  "source": "wiki"
 },
 {
  "id": "doto-voltaic-fire",
  "game": "DOTO",
  "type": "voltaic",
  "name": "Virote incendiário",
  "cost": 400,
  "requires": [],
  "effect": "Libera munição incendiária",
  "source": "wiki"
 },
 {
  "id": "doto-voltaic-charge",
  "game": "DOTO",
  "type": "voltaic",
  "name": "Disparo carregado",
  "cost": 700,
  "requires": [],
  "effect": "Melhora disparos e libera funções alternativas",
  "source": "wiki"
 },
 {
  "id": "doto-grenade-sticky",
  "game": "DOTO",
  "type": "grenade",
  "name": "Granada adesiva",
  "cost": 450,
  "requires": [],
  "effect": "Gruda em alvos",
  "source": "wiki"
 },
 {
  "id": "doto-grenade-extender",
  "game": "DOTO",
  "type": "grenade",
  "name": "Extensão da granada adesiva",
  "cost": 400,
  "requires": [
   "doto-grenade-sticky"
  ],
  "effect": "Amplia raio de efeito",
  "source": "wiki"
 },
 {
  "id": "doto-grenade-hyper",
  "game": "DOTO",
  "type": "grenade",
  "name": "Granada hiperbárica",
  "cost": 400,
  "requires": [],
  "effect": "Habilita munição hiperbárica",
  "source": "wiki"
 },
 {
  "id": "doto-grenade-muffler",
  "game": "DOTO",
  "type": "grenade",
  "name": "Silenciador de granada hiperbárica",
  "cost": 400,
  "requires": [
   "doto-grenade-hyper"
  ],
  "effect": "Reduz ruído",
  "source": "wiki"
 },
 {
  "id": "doto-grenade-impact",
  "game": "DOTO",
  "type": "grenade",
  "name": "Granada de impacto",
  "cost": 400,
  "requires": [],
  "effect": "Detona no impacto",
  "source": "wiki"
 },
 {
  "id": "doto-razor-reach",
  "game": "DOTO",
  "type": "trap",
  "name": "Alcance da navalha",
  "cost": 300,
  "requires": [],
  "effect": "Amplia alcance",
  "source": "wiki"
 },
 {
  "id": "doto-razor-double",
  "game": "DOTO",
  "type": "trap",
  "name": "Disparo duplo da navalha",
  "cost": 450,
  "requires": [],
  "effect": "Armadilha funciona duas vezes",
  "source": "wiki"
 },
 {
  "id": "doto-hook-reach",
  "game": "DOTO",
  "type": "mine",
  "name": "Alcance da mina gancho",
  "cost": 300,
  "requires": [],
  "effect": "Amplia alcance",
  "source": "wiki"
 },
 {
  "id": "doto-hook-salvage",
  "game": "DOTO",
  "type": "mine",
  "name": "Reciclagem de minas",
  "cost": 500,
  "requires": [],
  "effect": "Recicla três minas usadas em uma nova",
  "source": "wiki"
 }
];
// Projetos exigidos nos jogos quando explicitamente documentados pela wiki.
const BLUEPRINTS={
'd1-pistol-explosive':'Small-Scale Combustion Refinement','d1-crossbow-fire':'Incandescent Paste',
'd1-grenade-sticky':'Spiked Grenade Housing','d1-mask-optics2':'Lens Magnification',
'd1-armor-improved':'Bonded Galvani Weave','d1-boot-stealth1':'Folded Galvani Resin',
'dlc-armor':'Bonded Galvani Weave','dlc-boot1':'Folded Galvani Resin','dlc-chokedust':'Baffle Dust',
'dlc-arc-cap':'Compact Arc Amplifier','dlc-stun-cap':'Compact Arc Amplifier','dlc-arc-charge':'Compact Arc Amplifier','dlc-stun-charge':'Compact Arc Amplifier',
'd2-crossbow-harden':'Fire Hardening Treatment','d2-crossbow-sleep':'Combat Sleep Dart','d2-crossbow-fire':'Dispersed Incendiary Release','d2-crossbow-combustion':'Dispersed Incendiary Release','d2-crossbow-sting':'Mercury Vapor Distillation','d2-crossbow-howl':'Pyro-Sonic Casing',
'd2-pistol-explosive':'Small-Scale Combustion Refinement','d2-pistol-cluster':'Small-Scale Combustion Refinement','d2-pistol-magnetic':'Alloy Polarization','d2-pistol-armor':'Slug Splintering Wedges',
'd2-silent-run':'Folded Galvani Resin','d2-silent-sprint':'Folded Galvani Resin','d2-grenade-impact':'Triggered Housing','d2-grenade-sticky':'Spiked Grenade Housing','d2-mine-chain':'Conductive Filaments','d2-razor-double':'Secondary Coiling',
'd2-master-coffin':'Configurable Grooving','d2-master-dealer':'Configurable Grooving','d2-master-pierce':'Configurable Grooving','d2-master-long':'Configurable Grooving',
'd2-master-howl1':'Reverberation Tubing','d2-master-howl2':'Reverberation Tubing',
'd2-master-traveler':'Firing Chamber Pivot','d2-master-painter':'Firing Chamber Pivot','d2-master-siblings':'Firing Chamber Pivot','d2-master-gentleman':'Firing Chamber Pivot',
'd2-master-carapace':'Dual-Layered Galvani Weave','d2-master-wrappings':'Dual-Layered Galvani Weave',
'd2-master-wrench':'Blade Conversion','d2-master-kiss':'Blade Conversion','d2-master-expansive':'Counter-Blast Inversion','d2-master-discreet':'Counter-Blast Inversion'
};
const MASTERWORK_PAIRS=[
['d2-master-coffin','d2-master-dealer'],
['d2-master-pierce','d2-master-long'],
['d2-master-howl1','d2-master-howl2'],
['d2-master-traveler','d2-master-painter'],
['d2-master-siblings','d2-master-gentleman'],
['d2-master-carapace','d2-master-wrappings'],
['d2-master-wrench','d2-master-kiss'],
['d2-master-expansive','d2-master-discreet']
];
export function conflictingMasterwork(id,installed){return MASTERWORK_PAIRS.some(pair=>pair.includes(id)&&pair.some(other=>other!==id&&installed.has(other)))}
export const UPGRADES=[...WIKI_UPGRADES.map(u=>({...u,blueprint:BLUEPRINTS[u.id]||null})),...LEGACY_UPGRADES];
const groupLabels={pistol:'Pistola',crossbow:'Besta',wristbow:'Besta de pulso',sword:'Espada',armor:'Armadura/vestimentas',optic:'Óptica',bonecharm:'Amuletos',grenade:'Granadas',trap:'Navalhas/armadilhas',mine:'Minas',voltaic:'Arma voltaica',gear:'Equipamento'};
export const UPGRADE_GROUPS=groupLabels;
export const GAME_LABELS={D1:'Dishonored',DLC:'The Knife of Dunwall / Brigmore Witches',D2:'Dishonored 2',DOTO:'Death of the Outsider',Casa:'Regras opcionais'};
export function itemType(name=''){
 const n=String(name).toLocaleLowerCase('pt-BR');
 if(/pistola|revólver/.test(n))return 'pistol';
 if(/besta de pulso|wristbow/.test(n))return 'wristbow';
 if(/besta|crossbow/.test(n))return 'crossbow';
 if(/arma voltaica|voltaic/.test(n))return 'voltaic';
 if(/granada/.test(n))return 'grenade';
 if(/mina de arco|mina de choque|mina de atordoamento|mina gancho|mina de gancho|hook mine|stun mine/.test(n))return 'mine';
 if(/navalha de mola|springrazor|armadilha/.test(n))return 'trap';
 if(/espada|sabre|lâmina|faca/.test(n))return 'sword';
 if(/amuleto|bonecharm/.test(n))return 'bonecharm';
 if(/máscara|luneta|lente/.test(n))return 'optic';
 if(/armadura|manto|colete|capacete|roupa|bota/.test(n))return 'armor';
 return 'other';
}
export function optionsFor(name){const type=itemType(name);return UPGRADES.filter(u=>u.type===type&&!u.legacy)}
