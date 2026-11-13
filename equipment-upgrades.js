// Adaptação narrativa para Dishonored RPG 2d20. Referências: Dishonored Wiki / Upgrades.
// Efeitos são propostas de mesa; não alteram rolagens automaticamente.
export const UPGRADES = [
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
];
export function itemType(name=''){
 const n=String(name).toLocaleLowerCase('pt-BR');
 if(/pistola|revólver/.test(n))return 'pistol';
 if(/besta|arco|crossbow/.test(n))return 'crossbow';
 if(/espada|sabre|lâmina|faca/.test(n))return 'sword';
 if(/armadura|manto|colete|capacete|roupa/.test(n))return 'armor';
 if(/luneta|máscara|lente/.test(n))return 'optic';
 return 'other';
}
export function optionsFor(name){const type=itemType(name);return UPGRADES.filter(u=>u.type===type)}
