// Public HTML regression checks. Never return body text in health evidence.
export function inspectRenderedBody(html,expectedText=[]){
 const errors=[];
 if(/Minified React error #\d+|react\.dev\/errors\/\d+|Worker exceeded memory limit|Memory limit would be exceeded|exceeded CPU time|Application error: a (?:client|server)-side exception|Internal Server Error/i.test(html))errors.push('runtime-error');
 if(/<template\b[^>]*\bdata-(?:dgst|msg|stck)=|\$RX\(|\$RC\([^)]*"[^"]*"[^)]*\)/.test(html)&&/<template\b[^>]*\bdata-(?:dgst|msg|stck)=|\$RX\(/.test(html))errors.push('streamed-render-error');
 if(/(?:^|\n|\\n)[0-9a-f]+:E\{[\s\S]{0,512}?"digest"/.test(html))errors.push('rsc-error-record');
 const document=html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ');
 if(!/<\/body\s*>\s*<\/html\s*>/i.test(document)||!/<h1(?:\s[^>]*)?>[^]*?<\/h1\s*>/i.test(document))errors.push('incomplete-rendered-document');
 const visible=document.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:amp|lt|gt|quot|#39);/g,' ').replace(/\s+/g,' ').trim();
 if(!/<html\b/i.test(html)||!/<body\b/i.test(html)||!/<h1(?:\s|>)/i.test(html))errors.push('missing-rendered-document');
 if(visible.length<80)errors.push('empty-rendered-body');
 for(const text of expectedText)if(!visible.toLowerCase().includes(text.toLowerCase()))errors.push('missing-required-content');
 return {ok:errors.length===0,errors:[...new Set(errors)],visibleCharacters:visible.length};
}
export async function boundedResponseBytes(response,max=5000000){const reader=response.body?.getReader();if(!reader)return new Uint8Array();const chunks=[];let length=0;try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>max)throw Error('Public response exceeds bounded health limit');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}const result=new Uint8Array(length);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}return result;}
