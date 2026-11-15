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

export function openStreetMapHtml(providers, location, mapType = 'standard', selectedId = null) {
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
html,body,#map{height:100%;margin:0;background:#101817}
#status{z-index:1000;position:absolute;top:46%;left:10%;right:10%;text-align:center;font:15px system-ui;color:#285a45}
.leaflet-control-zoom{display:none!important}
.leaflet-tile{filter:${mapType === 'standard' ? 'brightness(.62) invert(1) hue-rotate(180deg) saturate(.55) brightness(.78)' : 'none'}}
.leaflet-control-attribution{font-size:9px!important}
.cq-marker{background:none;border:0}
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
    const markerSvg=function(width,height,blur,circleRadius,circleStroke){
      return '<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 34 44">' +
        '<defs><filter id="g" x="-80%" y="-80%" width="260%" height="260%">' +
        '<feGaussianBlur stdDeviation="'+blur+'" result="b"/>' +
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
        '<path d="M17 2C8.7 2 2 8.7 2 17c0 11 15 25 15 25s15-14 15-25C32 8.7 25.3 2 17 2Z" ' +
        'fill="#1FE5A0" stroke="#E8FFF6" stroke-width="1.5" filter="url(#g)"/>' +
        '<circle cx="17" cy="17" r="'+circleRadius+'" fill="#06251A" stroke="#FFFFFF" stroke-width="'+circleStroke+'"/>' +
        '</svg>';
    };
    const markerIcons={
      regular:L.divIcon({html:markerSvg(34,44,'2.4','5.5','1.5'),className:'cq-marker',iconSize:[34,44],iconAnchor:[17,43],tooltipAnchor:[0,-40]}),
      selected:L.divIcon({html:markerSvg(46,58,'2.8','6.5','1.8'),className:'cq-marker',iconSize:[46,58],iconAnchor:[23,57],tooltipAnchor:[0,-52]})
    };
    const markers={};
    window.setSelectedProvider=function(id){
      points.forEach(function(point){
        const marker=markers[point.id];if(!marker)return;
        const active=point.id===String(id);
        marker.setIcon(active?markerIcons.selected:markerIcons.regular);
        marker.setZIndexOffset(active?1000:0);
      });
    };
    points.forEach(function(point){
      const label=document.createElement('span');label.textContent=point.name;
      const marker=L.marker([point.latitude,point.longitude],{icon:markerIcons.regular}).addTo(map).bindTooltip(label);
      markers[point.id]=marker;
      marker.on('click',function(){window.setSelectedProvider(point.id);send({type:'select',id:point.id});});
    });
    window.setSelectedProvider(${serialize(selectedId == null ? '' : String(selectedId))});
    if(points.length && !${Boolean(location)})map.fitBounds(points.map(function(point){return [point.latitude,point.longitude];}),{paddingTopLeft:[36,160],paddingBottomRight:[36,190],maxZoom:14});
    map.on('moveend',function(){const c=map.getCenter(),b=map.getBounds();send({type:'region',region:{latitude:c.lat,longitude:c.lng,latitudeDelta:b.getNorth()-b.getSouth(),longitudeDelta:b.getEast()-b.getWest()}});});
    document.getElementById('status').remove();send({type:'ready'});
  }</script></body></html>`;
}
