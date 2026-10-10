export function mapPoints(providers = []) {
  return providers
    .filter(
      (provider) =>
        Number.isFinite(provider.baseLatitude) &&
        Number.isFinite(provider.baseLongitude) &&
        Math.abs(provider.baseLatitude) <= 90 &&
        Math.abs(provider.baseLongitude) <= 180,
    )
    .map((provider) => ({
      id: String(provider.id),
      name: provider.name,
      latitude: provider.baseLatitude,
      longitude: provider.baseLongitude,
    }));
}

export function openStreetMapHtml(providers, location, mapType = 'standard') {
  const points = mapPoints(providers);
  const serialize = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
  const center =
    location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
      ? [location.latitude, location.longitude]
      : [53.1, -1.65];
  return `<!doctype html><html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<style>
html,body,#map{height:100%;margin:0;background:#edf2eb}
#status{z-index:1000;position:absolute;top:46%;left:10%;right:10%;text-align:center;font:15px system-ui;color:#285a45}
.leaflet-control-zoom{margin-top:160px!important}
.leaflet-control-attribution{font-size:9px!important}
</style>
</head>
<body>
<div id="status">Loading map…</div>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script>
  function send(value){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(value));else window.parent.postMessage(value,'*');}
  if(typeof L==='undefined'){document.getElementById('status').textContent='Map could not load. Check your connection and retry.';send({type:'error'});}else{
    const points=${serialize(points)};const map=L.map('map',{zoomControl:true}).setView(${serialize(center)},${location ? 12 : 6});
    const satellite=${mapType === 'satellite'};
    const tileUrl=satellite ? 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const credit=satellite ? 'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    let loadedTiles=0,failedTiles=0;
    const tiles=L.tileLayer(tileUrl,{maxZoom:19,attribution:credit}).addTo(map);
    tiles.on('tileload',function(){loadedTiles++;});
    tiles.on('tileerror',function(){failedTiles++;});
    tiles.once('load',function(){if(loadedTiles===0&&failedTiles>0)send({type:'warning'});});
    points.forEach(function(point){const label=document.createElement('span');label.textContent=point.name;L.marker([point.latitude,point.longitude]).addTo(map).bindTooltip(label).on('click',function(){send({type:'select',id:point.id});});});
    if(points.length && !${Boolean(location)})map.fitBounds(points.map(function(point){return [point.latitude,point.longitude];}),{paddingTopLeft:[36,160],paddingBottomRight:[36,190],maxZoom:14});
    map.on('moveend',function(){const c=map.getCenter(),b=map.getBounds();send({type:'region',region:{latitude:c.lat,longitude:c.lng,latitudeDelta:b.getNorth()-b.getSouth(),longitudeDelta:b.getEast()-b.getWest()}});});
    document.getElementById('status').remove();send({type:'ready'});
  }</script></body></html>`;
}
