import * as Shapes from "./src/shapes.js";
import { InstancedRenderer } from "./src/instanced.js"
import { MouseDrag, onBoxSelection } from "./src/input.js"
import { screenToPlane } from "./src/ray.js"
import undent from './src/undent.js';
import { createPropFilter } from './src/util.js';
import { Camera } from './src/camera.js';
const { mat3, mat4, vec2, vec3, vec4 } = glMatrix;

const canvas = document.querySelector('canvas');
const gl = canvas.getContext("webgl2");
if(!gl) throw new Error("No GL For you!");
window.gl = gl

const camera = new Camera();

function resize(){
  if(canvas.width == canvas.clientHeight && 
    canvas.height == canvas.clientHeight) return;

  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight

  camera.resize(canvas.width, canvas.height);

}
resize();
window.addEventListener('resize',resize);

const worker = new Worker('./worker.js',{type:'module'});

const shapes = [];
const mousePosShape = new Shapes.QuadRenderer(gl);
mousePosShape.setColor([0,1,0,0.5]);
shapes.push(mousePosShape);

const obstacles = [];
function createObstacle(pos, radius){
  const obstacle = new Shapes.CircleRenderer(gl);
  obstacle.setColor([0,0,1,.2]);
  obstacle.setRadius(radius);
  obstacle.setPosition(pos);
  shapes.push(obstacle);
  obstacles.push(obstacle);
}
createObstacle([canvas.width/2,canvas.height/2,0], 10);

for(var i=0;i<50;i++)
  createObstacle([Math.random()*canvas.width,Math.random()*canvas.height,0], Math.random()*100+10);

const debugShapes = [];


function createBoidInst(){
  return {
    a_color:new Float32Array([Math.random(), Math.random(), Math.random(), 1]),
    a_dir:new Float32Array([1,0,0]),
    a_pos:new Float32Array([Math.random()*gl.canvas.width,Math.random()*gl.canvas.height,0]),
    a_scale: new Float32Array([10]),
  }
}


let boidCloud
function init(numBoids){
  boidCloud = new InstancedRenderer(gl);
  window.boidCloud = boidCloud;
  boidCloud.loaded = 0;
  boidCloud.instances = Array(numBoids).fill().map(createBoidInst)


  boidCloud.uniformDefs = {
    u_viewProj:{}
  }
  boidCloud.uniforms = {};

  boidCloud.attribDefs = {
    a_position:{ },
    a_color:{instanced:1},
    a_pos:{instanced:1, dynamic:true},
    a_dir:{instanced:1, dynamic:true},
    a_scale:{instanced:1, dynamic:true},
  }
  boidCloud.attribs = {
    // create a triangle with a front direction where 0,0 is in the center(ish)
    a_position: new Float32Array([
      1, 0,
      -1, -0.5,
      -1,  0.5,
    ]),
  }

  boidCloud.vertexShaderSource = undent`
    #version 300 es
    in vec2 a_position;
    in vec4 a_color;
    in vec3 a_pos;
    in vec3 a_dir;
    in float a_scale;
    uniform mat4 u_viewProj;
    out vec4 v_color;
    mat4 identity(){ return mat4(1,0,0,0,  0,1,0,0,  0,0,1,0,  0,0,0,1); }
    void main() {
      vec4 position = vec4(a_position, 0, 1);

      vec3 dir = normalize(a_dir);

      mat4 mat = mat4(dir,0, vec3(-dir.y,dir.x,dir.z),0, 0,0,1,0, a_pos,1) // rotation/translation
               * mat4(a_scale,0,0,0, 0,a_scale,0,0, 0,0,1,0, 0,0,0,1); // scale

      gl_Position = u_viewProj*mat*position;

      v_color = a_color;
    }
  `;
 
  boidCloud.fragmentShaderSource = undent`
    #version 300 es
    precision highp float;
    in vec4 v_color;
    out vec4 outColor;
    void main() {
      outColor = v_color;
    }
  `;

  sendToWorker();
}


function sendToWorker(){
  // call load to make sure the buffers are filled in
  boidCloud.load();


  const attribNames = [ 'a_pos', 'a_dir' ];
  const attribNamePropFilter = createPropFilter(attribNames);
  const ctx = { 
    origin: location.origin, 
    boids: boidCloud.instances.map(attribNamePropFilter),
    buffers: attribNamePropFilter(boidCloud.attribs),
    width: gl.canvas.width,
    height: gl.canvas.height,
    obstacles: obstacles.map(createPropFilter(['position','radius'])),
    noReply:true,
  };
  // Seems like explicitly copying and transfering the buffers is slower...
  // worker.postMessage(ctx,Object.values(ctx.buffers).map(x=>x.buffer.slice()));
  worker.postMessage(ctx);
}

canvas.addEventListener('click',e=>{
  boidCloud.loaded = 0;
  const oldLen = boidCloud.instances.length;
  for(let i=0;i<oldLen;i++) boidCloud.instances[i+oldLen] = createBoidInst();
  sendToWorker();
  console.log(boidCloud.instances.length);
});

canvas.addEventListener('contextmenu',e=>{
  boidCloud.instances.length/=2;
  boidCloud.loaded = 0;
  sendToWorker();
  e.preventDefault();
  console.log(boidCloud.instances.length);
});
onBoxSelection(rect=>{
  console.log(rect);
});
const mouseDrag = new MouseDrag(canvas);
mouseDrag.on('move',e=>{
  if(e.button!=2) return;
  mat4.translate(camera.camMat, camera.camMat, vec3.fromValues(-e.dx, -e.dy, 0));
  camera.viewChanged=1;
});

let mousePos = new Float32Array(3);
mousePos[0] = canvas.width/2;
mousePos[1] = canvas.height/2;

function onMouseMove(e){
  mousePos[0] = e.clientX;
  mousePos[1] = e.clientY;
  // mousePos[2] = -200;

}
canvas.addEventListener('mousemove', onMouseMove);


// Draw
let workerPromise;
async function renderScene(numBoids){

  camera.update();

  const plane = vec4.fromValues(0,0,1,0);
  const sceneMousePos = screenToPlane(mousePos, plane, vec2.fromValues(gl.canvas.width,gl.canvas.height), camera.invViewProj);
  var s = 30;
  mousePosShape.setRect(sceneMousePos[0]-s/2,sceneMousePos[1]-s/2,s,s);


  // await prev frame receive
  await workerPromise;

  // start listening to next data from worker
  workerPromise = new Promise(cb=>{
    worker.addEventListener('message', ({data})=>{
      debugShapes.length=0;
      if(data.debugShapes)
        debugShapes.push(...data.debugShapes.map(Shapes.createShapeRenderer));
      Object.entries(data.buffers).forEach(([name,data])=>{
        if(boidCloud.attribs[name].length != data.length) return; // data length changed, propably invalid
        boidCloud.attribs[name].set(data);
      });
      cb();
    },{once:true});
  });

  // send data (that changes) to worker to start this frames work
  const ctx = {}
  ctx.sceneMousePos = sceneMousePos;
  worker.postMessage(ctx);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.enable(gl.CULL_FACE);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  boidCloud.uniforms.u_viewProj = camera.viewProj;
  boidCloud.render();

  shapes.concat(debugShapes).forEach(shape=>{
    shape.setViewProj(camera.viewProj);
    shape.render();
  });
}

 /*
import { findMaxNr } from "./src/performance.js"
const props = { minNr:70000, maxNr:100000, samples:10, init, loop:renderScene, finish }
const measures = [];
function finish(nr){
  measures.push(nr);
  const N = measures.length;
  const mean = measures.reduce((a,b)=>a+b)/N;
  const SD = Math.sqrt(measures.reduce((a,b)=>a+(b-mean)**2,0)/N);
  console.log('>>',nr, ` -- N:${N} mean:${mean.toFixed(2)} SD:${SD.toFixed(3)}`);
  props.minNr = nr-5000;
  props.maxNr = nr+5000;
  findMaxNr(props);
}

findMaxNr(props);
/*/
const nr = 2**1;
console.log(nr);
init(nr);
let startT = 0;
let cFrame = 0;
let fps = '..';
async function loop(){
  cFrame++;

  var now = performance.now();
  if(now - startT > 500){
    fps = ( cFrame / (now-startT) * 1000).toFixed(1);
    startT = performance.now();
    cFrame = 0;
    window.document.title = window.document.title.replace(/ FPS:.*$/,'')+' FPS:'+fps;
  }

  await renderScene(nr);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
//*/




