/* SynchroChecker by DrSnuggles 2020

*/

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
  rect = {x:1130, y:655, w:245, h:110}, // a rect around the lips
  //rect = {x:670, y:664, w:145, h:43}, // a rect around the lips
  amp = 40, // amplitude of max level
  lastVol = 0,
  actx = new AudioContext(),
  anal, // the analyser node
  userGestures = ['mousedown', 'touchstart', 'dragend'], // browsers need gesture before accessing userMedia
  debug = false

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
    <canvas id="canv"></canvas>
    <div id="tb"></div>`

    // copy imgData to canvas
    ctx = canv.getContext('2d')
    bgImg.onload = function(e) {
      canv.width = bgImg.width
      canv.height = bgImg.height
      canv.style.position = 'absolute'
      bgRatio = canv.width / canv.height
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(bgImg, 0, 0)

      //
      // Events
      //
      addEventListener('resize', resizer)
      canv.addEventListener('mousemove', (e) =>{
        mouse = {x: e.offsetX, y: e.offsetY}
      })
      canv.addEventListener('click', () =>{
      })

      // just some infos
      if (debug) {
        //console.log(canv.toDataURL('image/png'))
        //console.log(canv.toDataURL('image/jpeg'))
        //console.log(canv.toDataURL('image/webp'))
        // data:image/png;base64,
        console.log('PNG size: '+ ((canv.toDataURL('image/png').length-22)*3/4/1024).toFixed(1) +' kB')
        // data:image/jpeg;base64,
        console.log('JPEG size: '+ ((canv.toDataURL('image/jpeg', .99).length-23)*3/4/1024).toFixed(1) +' kB')
        // data:image/webp;base64,
        console.log('WebP size: '+ ((canv.toDataURL('image/webp', .99).length-23)*3/4/1024).toFixed(1) +' kB')
      }

      // finally start the render loop
      resizer()
      requestAnimationFrame(renderLoop)
    } // img.onload
    var tmp = 'samia.webp'
    //var tmp = 'monalisa.webp'

    bgImg.src = tmp
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

    // start microphone
    navigator.mediaDevices.getUserMedia({audio:true})
    .then(gotLocalMediaStream)
    .catch(handleLocalMediaStreamError);
    function gotLocalMediaStream(stream){
      var tmp = stream.getAudioTracks()[0].getSettings()
      if (debug) {
        Object.entries(tmp).forEach(([key, value]) => {
          console.log(key, value)
        })
      }

      // attach
      var src = actx.createMediaStreamSource(stream)
      //meter = createAudioMeter()
      anal = actx.createAnalyser()
      anal.fftSize = 32 // min is enough for meter
      src.connect(anal)
      // anal.connect(actx.destination)

    }
    function handleLocalMediaStreamError(e){
      console.error(e)
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
  // Render loop
  //
  function renderLoop() {
    requestAnimationFrame(renderLoop)

    scale = canv.clientWidth / canv.width

    // clear old
    //ctx.clearRect(0, 0, canv.width, canv.height)

    // draw bg
    ctx.drawImage(bgImg, 0, 0)

    // draw lips
    var vol = getVolume()
    ctx.drawImage(bgImg, rect.x, rect.y, rect.w, rect.h, rect.x-(vol*amp), rect.y-(vol*amp), rect.w+(2*vol*amp), rect.h+(2*vol*amp))

    // draw rect around the lips
    if (debug) {
      // lips rect
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
      // meter
      ctx.fillRect(0, 0, vol*canv.width, 10)
    }

    //ctx.stroke()

  }

  return my

}(synchro || {}))
