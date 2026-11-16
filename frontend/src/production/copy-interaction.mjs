/** A deliberate user click is the only caller in ProductionApp.astro. */
export async function copyValue(button,{clipboard,track}={clipboard:globalThis.navigator?.clipboard,track:globalThis.window?.gtag}){
 const message=button.parentElement?.querySelector('[data-copy-error-message]');
 const label=button.querySelector('[data-copy-label]');
 try{
  await clipboard.writeText(button.dataset.catalogCopy??'');
  if(label)label.textContent=button.dataset.copySuccess??'Copied';
  if(message)message.hidden=true;
  if(track)track('event','mcp_copy',{app_id:button.dataset.copyApp,copy_type:button.dataset.copyKind});
  return true;
 }catch{
  if(label)label.textContent=button.dataset.copyIdle??'Copy';
  if(message){message.textContent=button.dataset.copyError??'Copy failed. Select and copy the text manually.';message.hidden=false;}
  return false;
 }
}
