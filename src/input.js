class EventEmitter{
  constructor(){
    this.callbacks = {}
  }

  on(event, cb){
    if(!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(cb)
  }

  emit(event, data){
    let cbs = this.callbacks[event]
    if(cbs){
      cbs.forEach(cb => cb(data))
    }
  }
}

export class MouseDrag extends EventEmitter{
  constructor(target = window){
    super();

    // bind on* functions so we can add/remove eventlisteners
    Object.getOwnPropertyNames(MouseDrag.prototype).forEach(func=>{
      if(func.slice(0,2)!='on') return;
      this[func]=this[func].bind(this);
    });

    this.target = target;
    target.addEventListener('mousedown',this.ondown);
  }
  release(){
    this.target.removeEventListener('mousedown', this.ondown);
  }

  // private methods
  startListen(){
    this.unListen();
    window.addEventListener('mousemove',this.onmove);
    window.addEventListener('mouseup',this.onup);
  }
  unListen(){
    window.removeEventListener('mousemove',this.onmove);
    window.removeEventListener('mouseup',this.onup);
  }
  ondown(e){
    this.button = e.button;
    // this.downPos = [e.clientX, e.clientY];
    // this.movement = [0,0];
    this.emit('down', {
      x:e.clientX, y:e.clientY,
      dx:e.movementX, dy:e.movementY,
      button:this.button,
    });
    this.startListen();
    this.moved = false;
  }
  onmove(e){
    // this.movement[0] += e.movementX;
    // this.movement[1] += e.movementY;
    // console.log((e.clientX-this.downPos[0])-this.movement[0], 
    //             (e.clientY-this.downPos[1])-this.movement[1]);
    this.emit('move', {
      x:e.clientX, y:e.clientY,
      dx:e.movementX, dy:e.movementY,
      button:this.button,
    });
    if(Math.abs(e.movementX)+Math.abs(e.movementY)>1) this.moved=true;
  }
  onup(e){
    if(this.button != e.button) return;
    const data = {
      x:e.clientX, y:e.clientY,
      dx:e.movementX, dy:e.movementY,
      button:this.button,
    };
    if(this.moved) this.emit('up', data);
    else           this.emit('click', data);
    this.unListen();
  }
}

// disable context menu
window.addEventListener('contextmenu',e=>e.preventDefault());

// key states
let keyStates;
export function getKeyStates(){
  if(keyStates) return keyStates;
  keyStates = {};
  window.addEventListener('keydown',e=>{
    if(e.repeat) return;
    keyStates[e.code] = true;
  });
  window.addEventListener('keyup',e=>{
    if(e.repeat) return;
    delete keyStates[e.code];
  });

  return keyStates;
}

const m = (e,a,s)=>(Object.assign(e.style,s),Object.assign(e,a));
const s = (e,s)=>(Object.assign(e.style,s),e);
const C = document.createElement.bind(document);
let boxSelectListeners = [];
let boxSelectMouseDrag = null;
/**
 * Start listening to box selection
 * @param onSelect {function} gets called when selection is done
 * @returns {function} release function to stop listening
 */
export function onBoxSelection(onSelect, onClick){
  boxSelectListeners.push(onSelect);
  const release = ()=>{
    boxSelectListeners.splice(boxSelectListeners.indexOf(onSelect),1);
    if(boxSelectListeners.length>0) return;
    boxSelectMouseDrag.release();
    boxSelectMouseDrag = null;
  }
  if(boxSelectMouseDrag) return release;
  let selectDiv = s(C('div'),{
    pointerEvents:'none',
    position:'absolute',
    border:'1px solid grey',
    top:0, left:0
  });
  var mouse = new MouseDrag();
  mouse.on('down',({x,y,button})=>{
    if(button!=0) return
    document.body.appendChild(selectDiv);
    m(selectDiv, {x,y}, {
      left:x, top:y,
      width:0, height:0
    });
  });
  mouse.on('move',({x,y})=>{
    s(selectDiv, {
      left:`${Math.min(selectDiv.x,x)}px`,
      top:`${Math.min(selectDiv.y,y)}px`,
      width:`${Math.abs(selectDiv.x-x)}px`,
      height:`${Math.abs(selectDiv.y-y)}px`
    });
  });
  mouse.on('up',({x,y,button})=>{
    if(button!=0) return
    document.body.removeChild(selectDiv);
    let _x, _y, rect = [
      _x=Math.min(selectDiv.x,x),
      _y=Math.min(selectDiv.y,y),
      Math.max(selectDiv.x,x)-_x,
      Math.max(selectDiv.y,y)-_y
    ]
    onSelect(rect);
  });
  mouse.on('click',({x,y,button})=>{
    onClick&&onClick({x,y,button});
    if(button!=0) return
    document.body.removeChild(selectDiv);
  });
  return release;
}
