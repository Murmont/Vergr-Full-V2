export const TIERS = {
  free: { id:'free', name:'Free', price:0, color:'#7B82A8', icon:'person', features:['Ads','25MB uploads','720p','50 media/day'] },
  lite: { id:'lite', name:'Lite', price:0.99, color:'#7B6FFF', icon:'bolt', features:['No ads','100MB uploads','1080p','+10 coins/mo'] },
  pro: { id:'pro', name:'Pro', price:2.99, color:'#F5C542', icon:'workspace_premium', features:['No ads','500MB uploads','4K','+30 coins/mo'] },
};
export const TIER_COMPARISON = [
  { feature:'Ads', free:'Yes', lite:'No', pro:'No' },
  { feature:'Upload limit', free:'25MB', lite:'100MB', pro:'500MB' },
  { feature:'Video quality', free:'720p', lite:'1080p', pro:'4K' },
  { feature:'Monthly coins', free:'0', lite:'10', pro:'30' },
];
export default TIERS;
export const getTierConfig = (t) => TIERS[t] || TIERS.free;
export const checkFeatureAccess = (tier, feature) => { const a={free:{ads:true,maxUpload:25,maxQuality:'720p',mediaPerDay:50,monthlyCoins:0},lite:{ads:false,maxUpload:100,maxQuality:'1080p',mediaPerDay:200,monthlyCoins:10},pro:{ads:false,maxUpload:500,maxQuality:'4K',mediaPerDay:Infinity,monthlyCoins:30}}; return a[tier]?.[feature]??a.free[feature]; };
export const checkFileSizeAccess = (tier, fileSize) => { const isBytes=fileSize>1000; const mb=isBytes?fileSize/1024/1024:fileSize; const lim={free:25,lite:100,pro:500}; const max=lim[tier]||lim.free; return { allowed:mb<=max, message:mb>max?'File too large. Max '+max+'MB for '+tier+' tier.':'OK', maxMB:max }; };
