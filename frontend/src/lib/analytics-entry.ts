import {startCloudflareAnalytics,startGoogleAnalytics} from './browser-analytics';
// The marker is emitted by server/build code only for an explicitly approved
// production build. Its absence makes preview/test builds a strict no-op.
export function initializeProductionAnalytics(){
 const element=document.getElementById('mcpapp-production-analytics');
 if(!element)return ()=>{};
 const measurementId=element.dataset.measurementId;
 if(!measurementId)return ()=>{};
 const token=element.dataset.cloudflareToken;
 if(token)startCloudflareAnalytics(token);
 return startGoogleAnalytics(measurementId);
}
