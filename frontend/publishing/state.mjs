export function validateState(state){
 if(!state||typeof state.revision!=='string'||!/^[A-Za-z0-9._:-]{1,200}$/.test(state.revision)||!Array.isArray(state.blockedPaths)||state.blockedPaths.some(p=>typeof p!=='string'||!p.startsWith('/')||(/[?#%]/.test(p)||p.includes('\\')||p.includes('\0'))||p.includes('//')||(p.length>1&&p.endsWith('/'))||p.split('/').some(s=>s==='.'||s==='..'))||!Number.isFinite(state.updatedAt))throw Error('Missing/invalid authoritative publication state');
 return state;
}
