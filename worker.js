importScripts("./node_modules/gl-matrix/gl-matrix.js");

let { mat3, mat4, vec2, vec3, vec4 } = glMatrix;

const limit = (out,v,l)=>{
  const len = vec3.length(v);
  return vec3.scale(out, v, len>l ? l/len : 1);
}
const setMag = (out,v,m)=> vec3.scale(out,v,m/vec3.len(v));

let boids;
let buffers = {};
let xdir;
let zero;
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


  doCalc(data);

  if(data.noReply) return;

  // Seems like explicitly copying and transfering the buffers is slower...
  // self.postMessage({ buffers }, Object.entries(buffers).map(([name, buffer])=>buffer.buffer.slice()));
  self.postMessage({ buffers });
});
let prevT;

function doCalc(data){

  // delta time
  const now = performance.now()/1000;
  const dt = Math.max(Math.min(now-prevT,1/10),1/60);
  prevT = now;

  // mousepos is target
  const target = data.sceneMousePos;
  if(!target) return;

  boids.forEach((boid,idx)=>{
    // const viewRange = 40;
    // const others = boids.filter(o=>o!=boid && vec3.dist(o.a_pos, boid.a_pos) < viewRange);
    const maxForce = 1000;
    const maxSpeed = 400;

    const steering = vec3.create();
    vec3.sub(steering, target, boid.a_pos);

    limit(steering, steering, maxForce);
    limit(boid.a_dir, boid.a_dir, maxSpeed);

    vec3.scale(steering, steering, dt);

    vec3.add(boid.a_dir,boid.a_dir, steering);
    vec3.add(boid.a_pos,boid.a_pos, vec3.scale(vec3.create(), boid.a_dir, dt));
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
