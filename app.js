/* SynchroChecker by DrSnuggles 2020

*/
"use strict"

//
// Force SSL
//
if (location.protocol !== 'https:') {
  location.replace(`https:${location.href.substring(location.protocol.length)}`);
}

//
// Synchro
//
var synchro = (function(my){
  var bgImg = new Image(), // the background image as an offscreen canvas
  bgRatio, // aspect ratio
  scale, // scale factor
  ctx, // video context, the visual canvas
  rect = {x:670, y:664, w:145, h:43}, // MonaLisa: a rect around the lips
  //rect = {x:1130, y:655, w:245, h:110}, // Samia: a rect around the lips
  mouse,
  poly = [],
  lips, // cropped area
  amp = 40, // amplitude of max level
  lastVol = 0,
  actx,
  mic,
  anal, // the analyser node
  userGestures = ['change', 'click', 'contextmenu', 'dblclick', 'mouseup', 'pointerup', 'reset', 'submit', 'touchend'], // browsers need gesture before accessing userMedia
  rAF,
  debug = false

  // RMB
  document.oncontextmenu = () => {
    if (poly.length > 0) crop()
    return false
  }

  //
  // document init
  //
  onload = () => {
    // html body
    document.body.innerHTML = `
    <style>
      body{
        margin:0;
        background:#000
      }
    </style>
    <canvas id="canv" style="display:none;position:absolute"></canvas>
    <div id="tb"></div>`

    ctx = canv.getContext('2d')
    ctx.imageSmoothingEnabled = true
    //ctx.globalCompositeOperation = 'destination-over';

    //
    // Events
    //
    addEventListener('resize', resizer)
    canv.addEventListener('mousemove', (e) =>{
      mouse = {x: e.offsetX, y: e.offsetY}
    })
    canv.addEventListener('click', (e) =>{
      poly.push({x: e.offsetX/scale, y: e.offsetY/scale})
    })

    // dropHandler
    dropHandler.init(window, fileDropped, fileProgress)

    // use std image
    loadImage('monalisa.webp')

    // finally start the render loop
    renderLoop()

  } // doc init

  //
  // user gesture event
  //
  userGestures.forEach(i => {
    addEventListener(i, gestureEvent, false)
  })
  function gestureEvent(){
    // detach userGesture listener
    userGestures.forEach(i => {
      removeEventListener(i, gestureEvent)
    })

    actx = new AudioContext()
    anal = actx.createAnalyser()
    anal.fftSize = 32 // min is enough for meter

    // start microphone
    navigator.mediaDevices.getUserMedia({audio:true})
    .then(gotLocalMediaStream)
    .catch(handleLocalMediaStreamError);
    function gotLocalMediaStream(stream){
      var tmp = stream.getAudioTracks()[0].getSettings()
      if (debug) {
        Object.entries(tmp).forEach(([key, value]) => {
          if (debug) console.log(key, value)
        })
      }

      // attach
      mic = actx.createMediaStreamSource(stream)
      mic.connect(anal)
      // anal.connect(actx.destination)

    }
    function handleLocalMediaStreamError(e){
      //console.error(e)
      console.info('looks like you have no microphone')
    }

  }


  //
  // Helper functions
  //
  function log(txt){
    if (debug) console.log(`[${new Date().toISOString()}]: ${txt}`)
  }
  function resizer(){
    // make img fit and keep aspect ratio
    var screenRatio = innerWidth / (innerHeight - tb.clientHeight)
    if (screenRatio < bgRatio) {
      // use width
      canv.style.width = innerWidth +'px'
      canv.style.height = 'auto'
      canv.style.left = 0
      // align center
      canv.style.left = 0
      canv.style.top = (innerHeight - canv.clientHeight)/2 +'px'
    } else {
      // use height
      canv.style.height = innerHeight - tb.clientHeight +'px'
      canv.style.width = 'auto'
      // align hor center
      canv.style.left = (innerWidth - canv.clientWidth)/2 +'px'
      canv.style.top = 0
    }
  }
  function getVolume(){
    if (!anal) return 0
    let buf = new Float32Array(anal.fftSize)
    anal.getFloatTimeDomainData(buf)

    // rms
    let sum = 0
    for (let i=0; i<buf.length; i++) {
    	let x = buf[i]
    	sum += x * x
    }

    lastVol = Math.sqrt(sum / buf.length) + lastVol*.7 // dont fall to fast
    return lastVol
  }

  //
  // drop
  //
  function fileDropped(o){
    let fType = o.type.substr(0, 5)
    if (fType === 'image') {
      poly = []
      loadImage(o.data)
    } else if (fType === 'audio') {
      loadAudio(o.data)
    } else {
      log('Found file type:'+ fType)
    }
  }
  function fileProgress(o){
    log('File progress: '+ o)
  }

  function loadImage(src) {
    // copy imgData to canvas
    bgImg.onload = function(e) {
      canv.width = bgImg.width
      canv.height = bgImg.height
      canv.style.display = 'block'
      bgRatio = canv.width / canv.height
      ctx.drawImage(bgImg, 0, 0)

      resizer()

      // just some infos
      if (debug) {
        // data:image/png;base64,
        console.log('PNG size: '+ ((canv.toDataURL('image/png').length-22)*3/4/1024).toFixed(1) +' kB')
        // data:image/jpeg;base64,
        console.log('JPEG size: '+ ((canv.toDataURL('image/jpeg', .99).length-23)*3/4/1024).toFixed(1) +' kB')
        // data:image/webp;base64,
        console.log('WebP size: '+ ((canv.toDataURL('image/webp', .99).length-23)*3/4/1024).toFixed(1) +' kB')
      }

    } // img.onload

    bgImg.src = src
  }
  function crop(){
    // aka keyHole
    log('crop')
    ctx.save()

    //ctx.drawImage(bgImg, 0, 0)// draw bg
    ctx.clearRect(0, 0, canv.width, canv.height)
    //ctx.globalCompositeOperation = 'destination-out'
    let path = new Path2D()
    //ctx.beginPath()
    let minX = poly[0].x
    let maxX = minX
    let minY = poly[0].y
    let maxY = minY
    path.moveTo(poly[0].x, poly[0].y)
    for (let i = 1; i < poly.length; i++) {
      minX = Math.min(minX, poly[i].x)
      maxX = Math.max(maxX, poly[i].x)
      minY = Math.min(minY, poly[i].y)
      maxY = Math.max(maxY, poly[i].y)
      path.lineTo(poly[i].x, poly[i].y)
    }
    //ctx.stroke()
    //ctx.clip()
    //console.log(path, minX, minY, maxX-minX, maxY-minY)
    ctx.clip(path)
    rect = {x: minX, y: minY, w: maxX-minX, h: maxY-minY}

    ctx.drawImage(bgImg, 0, 0)// draw bg
    // now we have image through keyhole
    // lips = ctx.getImageData(0, 0, canv.width, canv.height)
    lips = new Image()
    /*
    lips.onload = (e) => {
      console.log(lips)
    }
    */
    lips.src = canv.toDataURL()

    // would be nice to have some bounding rect but then i need to save minX,minY for postioning

    // reset vars
    poly = []
    ctx.restore()


//ctx.globalCompositeOperation = 'destination-out';
    //cancelAnimationFrame(rAF)
  }

  function loadAudio(dat){
    //console.log(dat)
    actx.decodeAudioData(dat, (buf)=>{
      //console.log(buf)
      let src = actx.createBufferSource()
      src.buffer = buf
      if (typeof mic !== 'undefined') mic.disconnect(anal)
      src.connect(anal)
      anal.connect(actx.destination)
      src.loop = true
      src.start(0)

    }, (e)=>{console.error(e)})

  }

  //
  // Render loop
  //
  function renderLoop(){
    rAF = requestAnimationFrame(renderLoop)
    //console.log('renderLoop')
    scale = canv.clientWidth / canv.width

    // clear old
    //if (lips) ctx.clearRect(0, 0, canv.width, canv.height)

    // draw bg
    /*if (!lips)*/
    ctx.drawImage(bgImg, 0, 0)

    // draw lips
    var vol = getVolume()
    //if (lips) ctx.putImageData(lips, 0, 0, canv.width, canv.height, 0-(vol*amp), 0-(vol*amp), canv.width+(2*vol*amp), canv.height+(2*vol*amp))
    if (lips) {
      //ctx.drawImage(lips, rect.x, rect.y, rect.w, rect.h, rect.x-(vol*amp), rect.y-(vol*amp), rect.w+(2*vol*amp), rect.h+(2*vol*amp))
      //ctx.drawImage(lips, 0, 0, lips.naturalWidth, lips.naturalHeight, 0-(vol*amp), 0-(vol*amp), lips.naturalWidth+(2*vol*amp), lips.naturalHeight+(2*vol*amp))
      //console.log(0, 0, lips.naturalWidth, lips.naturalHeight, 0-(vol*amp), 0-(vol*amp), lips.naturalWidth+(2*vol*amp), lips.naturalHeight+(2*vol*amp))
      ctx.drawImage(lips, rect.x, rect.y, rect.w, rect.h, rect.x-(vol*amp), rect.y-(vol*amp), rect.w+(2*vol*amp), rect.h+(2*vol*amp))
    } else {
      //use simple rect
      ctx.drawImage(bgImg, rect.x, rect.y, rect.w, rect.h, rect.x-(vol*amp), rect.y-(vol*amp), rect.w+(2*vol*amp), rect.h+(2*vol*amp))
    }

    // draw polygon
    if (poly.length > 0) {
      ctx.strokeStyle = '#FFF'
      ctx.lineWidth = 2/scale
      ctx.beginPath()
      ctx.moveTo(poly[0].x, poly[0].y)
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i].x, poly[i].y)
      }
      ctx.lineTo(mouse.x/scale, mouse.y/scale)
      ctx.stroke()
    }

    // draw rect around the lips
    if (debug) {
      // lips rect
      //ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
      // meter
      ctx.fillRect(0, 0, vol*canv.width, 10)
    }

    //ctx.stroke()

  }

  return my

}(synchro || {}))
