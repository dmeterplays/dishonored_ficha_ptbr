import {renderOwnedGear} from './active-upgrade-ui.js?v=1';
const root=document.getElementById('master-inventory-list');
const status=document.getElementById('master-inventory-status');
const id=new URLSearchParams(location.search).get('id');
if(id){
 status.textContent='Ative ou desative as melhorias concedidas pelo mestre. A capacidade adicional e as regras aparecem nos equipamentos.';
 renderOwnedGear(root,id);
}else status.textContent='Abra uma ficha salva para consultar o inventário.';
