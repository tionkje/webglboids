
import "../node_modules/gl-matrix/gl-matrix.js";
const { vec3, vec2 } = glMatrix;
const { max, min } = Math;

export function lineSegmentToQuad(start,end,width){
  var dir = vec3.sub(vec3.create(),end,start);
  return vectorToQuad(start, dir, width);
}

export function vectorToQuad(start,dir,width){
  var up = vec3.fromValues(dir[1],-dir[0],dir[2]);
  vec3.normalize(up,up);
  var up = vec3.scale(up, up, width);
  var down = vec3.scale(vec3.create(), up, -1);
  var up2 = vec3.add(vec3.create(), up, dir);
  var down2 = vec3.add(vec3.create(), down, dir);
  return [up, up2, down, down2].map(x=>vec3.add(x,x,start));
}

export function distanceLineSegmentToPoint(start,end,point){
  const l2 = vec2.squaredDistance(start,end);
  if(l2===0) return vec2.distance(point,start);
  let dir = vec2.create();
  vec2.sub(dir, end,start);
  let t = vec2.dot(vec2.sub(vec2.create(),point,start), dir) / l2;
  t = max(0,min(1,t));
  let proj = vec2.scale(vec2.create(), dir, t);
  vec2.add(proj, proj, start);
  return vec2.distance(point, proj);
}
