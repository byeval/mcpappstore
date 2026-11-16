import {parseEntities} from 'parse-entities';
// A focused HTML tokenizer, not an href substring match. Attribute values use the
// existing locked Markdown dependency's HTML character-reference parser.
export function extractCanonicalLink(html){
 const links=[];let offset=0,head=true;const inert=[];
 const headTags=new Set(['html','head','base','basefont','bgsound','link','meta','title','noscript','noframes','style','script','template']);
 const rawTags=new Set(['script','style','title','textarea','xmp','iframe','noembed','noframes']);
 const inertTags=new Set([...rawTags,'template','noscript','svg','math']);
 while(offset<html.length){
  const start=html.indexOf('<',offset);if(start<0)break;if(!inert.length&&html.slice(offset,start).trim())head=false;
  if(html.startsWith('<!--',start)){const end=html.indexOf('-->',start+4);if(end<0)break;offset=end+3;continue;}
  let cursor=start+1,quote=null;for(;cursor<html.length;cursor++){const ch=html[cursor];if(quote){if(ch===quote)quote=null;}else if(ch==='"'||ch==="'")quote=ch;else if(ch==='>')break;}
  if(cursor===html.length)break;const token=html.slice(start+1,cursor);offset=cursor+1;
  if(/^!|^\?/.test(token))continue;
  const tagMatch=/^(\/)?([A-Za-z][A-Za-z0-9:-]*)(?=[\s/]|$)/.exec(token);if(!tagMatch)continue;const closing=!!tagMatch[1],tag=tagMatch[2].toLowerCase();
  if(closing){if(inert.length){if(inert.at(-1)===tag)inert.pop();}else if(tag==='head'||tag==='body')head=false;continue;}
  if(inert.length){if(inertTags.has(tag))inert.push(tag);}else{if(!headTags.has(tag))head=false;if(inertTags.has(tag))inert.push(tag);}
  if(rawTags.has(tag)){const close=new RegExp('</'+tag+'(?=[\\s>])[^>]*>','ig');close.lastIndex=offset;const end=close.exec(html);if(!end)break;offset=close.lastIndex;if(inert.at(-1)===tag)inert.pop();continue;}
  if(inert.length||!head||tag!=='link')continue;
  const attrs=new Map();let index=tagMatch[0].length,valid=true;
  while(index<token.length){while(/\s/.test(token[index]??'')&&index<token.length)index++;if(index>=token.length||token.slice(index).trim()==='/')break;const name=/^[^\s"'<>/=]+/.exec(token.slice(index));if(!name){valid=false;break;}const key=name[0].toLowerCase();index+=name[0].length;while(/\s/.test(token[index]??'')&&index<token.length)index++;let value='';if(token[index]==='='){index++;while(/\s/.test(token[index]??'')&&index<token.length)index++;if(token[index]==='"'||token[index]==="'"){const delimiter=token[index++],end=token.indexOf(delimiter,index);if(end<0){valid=false;break;}value=token.slice(index,end);index=end+1;}else{const unquoted=/^[^\s"'=<>`]+/.exec(token.slice(index));if(!unquoted){valid=false;break;}value=unquoted[0];index+=value.length;}}
   if(attrs.has(key)){valid=false;break;}attrs.set(key,parseEntities(value,{attribute:true}));
  }
  if(valid&&(attrs.get('rel')??'').trim().toLowerCase()==='canonical')links.push(attrs.get('href')??'');
 }
 return links.length===1&&links[0] ? links[0] : null;
}
