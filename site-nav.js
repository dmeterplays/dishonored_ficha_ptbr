/* Navegação consistente entre páginas do Dishonored RPG. */
(()=>{
 const links=[
  ['index.html','Início','Portal e atalhos'],
  ['salas.html','Campanhas','Entrar na mesa'],
  ['fichas.html','Personagens','Minhas fichas'],
  ['criar-personagem.html','Criar ficha','Novo personagem'],
  ['catalogo.html','Compêndio','Regras e itens'],
  ['campanha.html','Conta','Perfil e acesso']
 ];
 const path=location.pathname.split('/').pop()||'index.html';
 const current=links.find(x=>x[0]===path)?.[1]||({
  'personagem.html':'Ficha completa','bestiario.html':'Bestiário',
  'mesa.html':'Mesa de jogo','diario.html':'Diário de Bordo','arquetipos.html':'Arquétipos',
  'poderes.html':'Poderes','amuletos.html':'Amuletos',
  'loja.html':'Itens','pericias.html':'Perícias e estilos',
  'admin.html':'Administração','ficha-inimigo.html':'Ficha do NPC'
 })[path]||'Dishonored RPG';
 const builtInMenu=document.querySelector('.dh-header-menu');
 const root=document.createElement('nav');root.className='global-site-nav';root.setAttribute('aria-label','Navegação principal do site');
 const details=document.createElement('details');details.className='global-site-menu';
 const summary=document.createElement('summary');summary.className='global-site-summary';
 const label=document.createElement('span');label.className='global-site-current';label.textContent=current;
 const toggle=document.createElement('strong');toggle.textContent='☰ Menu';
 summary.append(label,toggle);details.append(summary);
 const list=document.createElement('div');list.className='global-site-links';
 const params=new URLSearchParams(location.search);
 const room=params.get('room')||(path==='mesa.html'?params.get('id'):null);
 const all=room?[...links.slice(0,2),['mesa.html?id='+encodeURIComponent(room),'Mesa atual','Voltar à campanha'],['diario.html?room='+encodeURIComponent(room),'Diário de Bordo','Resumos das sessões'],...links.slice(2)]:links;
 for(const [href,title,help] of all){
  const a=document.createElement('a');a.href=href;a.textContent=title;a.title=help;
  const dest=href.split('?')[0];if(dest===path){a.setAttribute('aria-current','page');}
  list.append(a);
 }
 const actualLinks=builtInMenu?.querySelector('.dh-header-menu-links')||list;
 if(builtInMenu){
  const currentLink=[...actualLinks.querySelectorAll('a')].find(a=>(new URL(a.href,location.href)).pathname===location.pathname);
  if(currentLink)currentLink.setAttribute('aria-current','page');
 }
 // Só mostra Administração quando a conta autenticada realmente é administradora.
 // A própria página e a API continuam verificando as permissões no servidor.
 import('./personagens-common.js').then(async ({db})=>{
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user)return;
  const {data:profile,error:profileError}=await db.from('dh_profiles').select('role').eq('id',user.id).single();
  if(profileError||profile?.role!=='admin')return;
  if(!actualLinks.querySelector('a[href="admin.html"]')){
   const admin=document.createElement('a');
   admin.href='admin.html';admin.textContent='Administração';admin.title='Usuários, personagens e configurações do sistema';
   if(path==='admin.html')admin.setAttribute('aria-current','page');
   actualLinks.append(admin);
  }
 }).catch(()=>{});
 details.append(list);root.append(details);
 const header=document.querySelector('header');
 if(!builtInMenu){
  if(header)header.insertAdjacentElement('afterend',root);
  else document.body.prepend(root);
 }
 document.body.classList.add('global-nav-ready');
 actualLinks.addEventListener('click',event=>{if(event.target.closest('a')){details.open=false;if(builtInMenu)builtInMenu.open=false}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){details.open=false;if(builtInMenu)builtInMenu.open=false}});
 document.addEventListener('click',event=>{if(details.open&&!root.contains(event.target))details.open=false;
  if(builtInMenu?.open&&!builtInMenu.contains(event.target))builtInMenu.open=false});
 // Atualiza a folha compartilhada após deploy para evitar CSS antigo em cache.
 const css=document.querySelector('link[href*="site-nav.css"]');
 if(css)css.href=new URL('./site-nav.css?v=menu-header-20261113d',location.href).href;
})();
