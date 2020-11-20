/*  Drop handler by DrSnuggles
    License : WTFPL 2.0, Beerware Revision 42
    updated version
*/
"use strict"

var dropHandler = (function(my) {

  my.init = (dropArea, callback, progress) => {

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
      dropArea.addEventListener(e, preventDefaults, false)
    })

    function preventDefaults (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    dropArea.addEventListener('drop', handleDrop, false)

    function handleDrop(e) {
      let file = e.dataTransfer.files[0] // just use first dropped file right now, maybe add playlist support
      let reader = new FileReader()
      reader.onload = function(ev) {
        callback({name: file.name, type: file.type, data: ev.target.result})
      }
      if (progress) {
        reader.onprogress = function(e) {
          let prog = (e.lengthComputable) ? (e.loaded / e.total * 100).toFixed(1)+'%' : e.loaded
          progress(prog)
        }
      }
      let fType = file.type.substr(0,5)
      if (fType === 'image') {
        reader.readAsDataURL(file)
      } else {
        reader.readAsArrayBuffer(file)
      }
    }

  } // my.init

  return my

}(dropHandler || {}))
