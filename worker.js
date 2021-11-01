import * as Shapes from "./src/shapes.js"

import "./node_modules/gl-matrix/gl-matrix.js";
let { mat3, mat4, vec2, vec3, vec4 } = glMatrix;

import { distanceLineSegmentToPoint } from './src/geoUtil.js';
const limit = (out,v,l)=>{
  const len = vec3.length(v);
  return vec3.scale(out, v, len>l ? l/len : 1);
}
const setMag = (out,v,m)=> vec3.scale(out,v,m/vec3.len(v));

let boids;
let obstacles;
let buffers = {};
let xdir;
let zero;
let debugShapes = [];
self.addEventListener('message',({data})=>{

  // init
  if(!xdir){
    xdir = vec3.fromValues(1,0,0);
    zero = vec3.create();
  }
  if(data.boids){
    boids = data.boids;
    buffers = data.buffers;
  }
  if(data.obstacles) obstacles = data.obstacles;


  debugShapes = [];
  doCalc(data);

  if(data.noReply) return console.log(data);

  // Seems like explicitly copying and transfering the buffers is slower...
  // self.postMessage({ buffers }, Object.entries(buffers).map(([name, buffer])=>buffer.buffer.slice()));
  self.postMessage({ buffers, debugShapes });
});
let prevT;

const red = [1,0,0,.4];
const circle = (props,color=red)=>debugShapes.push(Shapes.circle(props, color));
const rect = (props,color=red)=>debugShapes.push(Shapes.rect(props, color));
const line = (props,color=red)=>debugShapes.push(Shapes.line(props, color));
const vector = (props,color=red)=>debugShapes.push(Shapes.vector(props, color));


const seek = (out, pos, target)=>vec3.sub(out, target, pos);
const obstacleAvoid = (out, obstacles, pos, vel, len, width)=>{
  var minDist = Infinity;
  obstacles.forEach(o=>{
    // o.radius; o.position;
    // if(debugEnabled) line([pos, o.position, 2]);
    var start = pos;
    var dir = vec3.create();
    vec3.normalize(dir,vel);
    vec3.scale(dir, dir, len);
    var end = vec3.add(vec3.create(), pos, dir);

    var dist = distanceLineSegmentToPoint(start, end, o.position);

    var hit = dist < o.radius +width;
    // if(debugEnabled) line([start,end,width],hit?[1,0,0,1]:[0,1,0,1]);
    if(!hit) return;
    if(dist > minDist) return;
    minDist = dist;

    var bdir = vec3.create();
    vec3.normalize(bdir, vel);
    var odir = vec3.create();
    vec3.sub(odir, o.position, pos);
    var d = vec3.dot(odir, bdir);
    vec3.scale(bdir, bdir, d);
    vec3.sub(out,bdir, odir);
    // if(debugEnabled) vector([start,out,7],[0,0,1,1]);
  });
  return out;
}
let debugEnabled = false;

function doCalc(data){

  // delta time
  const now = performance.now()/1000;
  const dt = Math.max(Math.min(now-prevT,1/10),1/60);
  prevT = now;

  // mousepos is target
  const target = data.sceneMousePos;
  if(!target) return;

  boids.forEach((boid,idx)=>{
    debugEnabled = idx===0;
    // const viewRange = 40;
    // const others = boids.filter(o=>o!=boid && vec3.dist(o.a_pos, boid.a_pos) < viewRange);
    const maxForce = 1000;
    const maxSpeed = 400;

    const steering = vec3.create();

    var os = obstacleAvoid(vec3.create(), obstacles, boid.a_pos, boid.a_dir, 400, 7)
    vec3.add(steering, steering, os);
    if(vec3.length(steering) == 0)
      vec3.add(steering, steering, seek(vec3.create, boid.a_pos, target));

    setMag(steering, steering, maxForce);
    // if(debugEnabled) vector([boid.a_pos,steering,7],[0,1,1,1]);

    // apply steer on dir
    limit(steering, steering, maxForce);
    vec3.scale(steering, steering, dt);
    vec3.add(boid.a_dir,boid.a_dir, steering);

    // apply dir on position
    limit(boid.a_dir, boid.a_dir, maxSpeed);
    const speed = vec3.create();
    vec3.scale(speed, boid.a_dir, dt);
    vec3.add(boid.a_pos,boid.a_pos, speed);

    if(idx==0){
      // circle([1,0,0,.5],boid.a_pos, 10);
      // rect([1,0,0,.5],[boid.a_pos[0],boid.a_pos[1], 40, 40]);
      // line([boid.a_pos,vec3.add(vec3.create(),boid.a_pos,boid.a_dir), 1]);
    }
  });



  /*
    const rot = Math.sin(performance.now()/1000)*Math.PI;

    boids.forEach((boid, idx)=>{
      const factor = (idx+1)/(boids.length+1);
      boid.a_pos[0] = data.width/2;
      boid.a_pos[1] = data.height*factor;
      boid.a_pos[2] = 100*factor;
      // boid.a_pos[2] = 200*factor;
      // boid.a_pos[2] = factor;
      vec3.rotateZ(boid.a_dir, xdir, zero, rot*factor);
      vec3.normalize(boid.a_dir,boid.a_dir);
      // boid.a_scale[0] = 200;
      // boid.a_scale[0] = factor*200;
    });
    */
    }
