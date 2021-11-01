
import "../node_modules/gl-matrix/gl-matrix.js";
const { vec3 } = glMatrix;

export function lineSegmentToQuad(start,end,width){
  var dir = vec3.sub(vec3.create(),end,start);
  var up = vec3.fromValues(dir[1],-dir[0],dir[2]);
  vec3.normalize(up,up);
  var up = vec3.scale(up, up, width);
  var down = vec3.scale(vec3.create(), up, -1);
  var up2 = vec3.add(vec3.create(), up, dir);
  var down2 = vec3.add(vec3.create(), down, dir);
  return [up, up2, down, down2].map(x=>vec3.add(x,x,start));
}