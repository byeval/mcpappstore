export const HOME_PATHS=Object.freeze(['/','/es','/fr','/de','/ru','/zh-hans','/ja','/ko']);
export function extendHomeForwardChecks(base){
 const homes=HOME_PATHS.map(path=>({path,status:200,delivery:'astro-static',contentTypePrefix:'text/html',renderedBody:true,canonical:'https://mcpapp.net'+path}));
 return {...base,publicChecks:[...base.publicChecks,...homes,{path:'/en/app/viator',status:410}],baselineChecks:[...base.baselineChecks,...homes.map(({delivery,canonical,...check})=>check)]};
}
export function assertForwardWriteDeadline(deadline,now=Date.now()){
 if(deadline!==null&&(!Number.isFinite(deadline)||now>=deadline))throw Error('Forward transition authorization expired before production write');
}
